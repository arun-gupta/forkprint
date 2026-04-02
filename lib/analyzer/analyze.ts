import type {
  AnalysisResult,
  AnalyzeInput,
  AnalyzeResponse,
  ContributorWindowDays,
  ContributorWindowMetrics,
  RateLimitState,
  RepositoryFetchFailure,
  Unavailable,
} from './analysis-result'
import { CONTRIBUTOR_WINDOW_DAYS } from './analysis-result'
import { queryGitHubGraphQL } from './github-graphql'
import { fetchContributorCount, fetchMaintainerCount, fetchPublicUserOrganizations } from './github-rest'
import { REPO_ACTIVITY_QUERY, REPO_COMMIT_HISTORY_PAGE_QUERY, REPO_OVERVIEW_QUERY } from './queries'

interface RepoOverviewResponse {
  repository: {
    name: string
    description: string | null
    createdAt: string
    primaryLanguage: { name: string } | null
    stargazerCount: number
    forkCount: number
    watchers: { totalCount: number }
    issues: { totalCount: number }
  } | null
}

interface RepoActivityResponse {
  repository: {
    defaultBranchRef: {
      target: {
        recent30: { totalCount: number }
        recent90: { totalCount: number }
        recent365Commits: CommitHistoryConnection | null
      } | null
    } | null
  } | null
  prsOpened: { issueCount: number }
  prsMerged: { issueCount: number }
  issuesClosed: { issueCount: number }
}

interface RepoCommitHistoryPageResponse {
  repository: {
    defaultBranchRef: {
      target: {
        recent365Commits: CommitHistoryConnection | null
      } | null
    } | null
  } | null
}

interface CommitHistoryConnection {
  pageInfo: {
    hasNextPage: boolean
    endCursor: string | null
  }
  nodes: CommitNode[]
}

interface CommitNode {
  authoredDate: string
  author: {
    name: string | null
    email: string | null
    user: {
      login: string
    } | null
  } | null
}

const UNAVAILABLE_FIELDS: Array<keyof AnalysisResult> = [
  'releases12mo',
  'uniqueCommitAuthors90d',
  'totalContributors',
  'maintainerCount',
  'commitCountsByAuthor',
  'commitCountsByExperimentalOrg',
  'experimentalAttributedAuthors90d',
  'experimentalUnattributedAuthors90d',
  'issueFirstResponseTimestamps',
  'issueCloseTimestamps',
  'prMergeTimestamps',
]

export async function analyze(input: AnalyzeInput): Promise<AnalyzeResponse> {
  const results: AnalysisResult[] = []
  const failures: RepositoryFetchFailure[] = []
  let latestRateLimit: RateLimitState | null = null

  for (const repo of input.repos) {
    const [owner, name] = repo.split('/')

    try {
      const overview = await queryGitHubGraphQL<RepoOverviewResponse>(input.token, REPO_OVERVIEW_QUERY, {
        owner,
        name,
      })
      latestRateLimit = overview.rateLimit ?? latestRateLimit

      if (!overview.data.repository) {
        failures.push({
          repo,
          reason: 'Repository could not be analyzed.',
          code: 'NOT_FOUND',
        })
        continue
      }

      const now = new Date()
      const since30 = new Date(now)
      since30.setDate(now.getDate() - 30)
      const since90 = new Date(now)
      since90.setDate(now.getDate() - 90)
      const since365 = new Date(now)
      since365.setDate(now.getDate() - 365)
      const repoSearch = `${owner}/${name}`

      const activity = await queryGitHubGraphQL<RepoActivityResponse>(input.token, REPO_ACTIVITY_QUERY, {
        owner,
        name,
        since30: since30.toISOString(),
        since90: since90.toISOString(),
        since365: since365.toISOString(),
        prsOpenedQuery: `repo:${repoSearch} is:pr created:>=${since90.toISOString().slice(0, 10)}`,
        prsMergedQuery: `repo:${repoSearch} is:pr is:merged merged:>=${since90.toISOString().slice(0, 10)}`,
        issuesClosedQuery: `repo:${repoSearch} is:issue closed:>=${since90.toISOString().slice(0, 10)}`,
      })
      latestRateLimit = activity.rateLimit ?? latestRateLimit

      const contributorCount = await fetchContributorCount(input.token, owner, name).catch((error) => {
        latestRateLimit = extractRateLimitFromError(error) ?? latestRateLimit

        return {
          data: 'unavailable' as const,
          rateLimit: extractRateLimitFromError(error),
        }
      })
      latestRateLimit = contributorCount.rateLimit ?? latestRateLimit

      const maintainerCount = await fetchMaintainerCount(input.token, owner, name).catch((error) => {
        latestRateLimit = extractRateLimitFromError(error) ?? latestRateLimit

        return {
          data: 'unavailable' as const,
          rateLimit: extractRateLimitFromError(error),
        }
      })
      latestRateLimit = maintainerCount.rateLimit ?? latestRateLimit

      const commitHistory = await collectRecentCommitHistory({
        token: input.token,
        owner,
        name,
        since365: since365.toISOString(),
        initialConnection: activity.data.repository?.defaultBranchRef?.target?.recent365Commits ?? null,
      })
      latestRateLimit = commitHistory.rateLimit ?? latestRateLimit

      const contributorMetricsByWindow = buildContributorMetricsByWindow(commitHistory.nodes, now)
      const experimentalOrgAttribution = await buildExperimentalOrganizationCommitCountsByWindow(input.token, commitHistory.nodes, now)
      latestRateLimit = experimentalOrgAttribution.rateLimit ?? latestRateLimit

      results.push(
        buildAnalysisResult(
          repo,
          overview.data,
          activity.data,
          contributorMetricsByWindow,
          contributorCount.data,
          maintainerCount.data,
          experimentalOrgAttribution.data,
        ),
      )
    } catch (error) {
      latestRateLimit = latestRateLimit ?? extractRateLimitFromError(error)
      failures.push(buildFailure(repo, error))
    }
  }

  return {
    results,
    failures,
    rateLimit: latestRateLimit,
  }
}

function extractRateLimitFromError(error: unknown): RateLimitState | null {
  const maybeError = error as Error & { status?: number; retryAfter?: number | Unavailable }

  if (maybeError.status !== 403 && maybeError.retryAfter == null) {
    return null
  }

  return {
    remaining: 'unavailable',
    resetAt: 'unavailable',
    retryAfter: maybeError.retryAfter ?? 'unavailable',
  }
}

function buildAnalysisResult(
  repo: string,
  overview: RepoOverviewResponse,
  activity: RepoActivityResponse,
  contributorMetricsByWindow: Record<ContributorWindowDays, ContributorWindowMetrics>,
  totalContributorCount: number | Unavailable,
  maintainerCount: number | Unavailable,
  experimentalMetricsByWindow: Record<ContributorWindowDays, ContributorWindowMetrics>,
): AnalysisResult {
  const defaultBranchTarget = activity.repository?.defaultBranchRef?.target
  const contributorMetrics = contributorMetricsByWindow[90]
  const experimentalMetrics = experimentalMetricsByWindow[90]
  const missingFields = [...UNAVAILABLE_FIELDS].filter((field) => {
    if (field === 'uniqueCommitAuthors90d') {
      return contributorMetrics.uniqueCommitAuthors === 'unavailable'
    }

    if (field === 'commitCountsByAuthor') {
      return contributorMetrics.commitCountsByAuthor === 'unavailable'
    }

    if (field === 'totalContributors') {
      return totalContributorCount === 'unavailable'
    }

    if (field === 'maintainerCount') {
      return maintainerCount === 'unavailable'
    }

    if (field === 'commitCountsByExperimentalOrg') {
      return experimentalMetrics.commitCountsByExperimentalOrg === 'unavailable'
    }

    if (field === 'experimentalAttributedAuthors90d') {
      return experimentalMetrics.experimentalAttributedAuthors === 'unavailable'
    }

    if (field === 'experimentalUnattributedAuthors90d') {
      return experimentalMetrics.experimentalUnattributedAuthors === 'unavailable'
    }

    return true
  })

  return {
    repo,
    name: overview.repository?.name ?? 'unavailable',
    description: overview.repository?.description ?? 'unavailable',
    createdAt: overview.repository?.createdAt ?? 'unavailable',
    primaryLanguage: overview.repository?.primaryLanguage?.name ?? 'unavailable',
    stars: overview.repository?.stargazerCount ?? 'unavailable',
    forks: overview.repository?.forkCount ?? 'unavailable',
    watchers: overview.repository?.watchers.totalCount ?? 'unavailable',
    commits30d: defaultBranchTarget?.recent30.totalCount ?? 'unavailable',
    commits90d: defaultBranchTarget?.recent90.totalCount ?? 'unavailable',
    releases12mo: 'unavailable',
    prsOpened90d: activity.prsOpened.issueCount,
    prsMerged90d: activity.prsMerged.issueCount,
    issuesOpen: overview.repository?.issues.totalCount ?? 'unavailable',
    issuesClosed90d: activity.issuesClosed.issueCount,
    uniqueCommitAuthors90d: contributorMetrics.uniqueCommitAuthors,
    totalContributors: totalContributorCount,
    maintainerCount,
    commitCountsByAuthor: contributorMetrics.commitCountsByAuthor,
    commitCountsByExperimentalOrg: experimentalMetrics.commitCountsByExperimentalOrg,
    experimentalAttributedAuthors90d: experimentalMetrics.experimentalAttributedAuthors,
    experimentalUnattributedAuthors90d: experimentalMetrics.experimentalUnattributedAuthors,
    contributorMetricsByWindow: Object.fromEntries(
      CONTRIBUTOR_WINDOW_DAYS.map((windowDays) => [
        windowDays,
        {
          ...contributorMetricsByWindow[windowDays],
          commitCountsByExperimentalOrg: experimentalMetricsByWindow[windowDays].commitCountsByExperimentalOrg,
          experimentalAttributedAuthors: experimentalMetricsByWindow[windowDays].experimentalAttributedAuthors,
          experimentalUnattributedAuthors: experimentalMetricsByWindow[windowDays].experimentalUnattributedAuthors,
        },
      ]),
    ) as Record<ContributorWindowDays, ContributorWindowMetrics>,
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    missingFields,
  }
}

async function buildExperimentalOrganizationCommitCountsByWindow(
  token: string,
  recentCommitNodes: CommitNode[],
  now: Date,
): Promise<{
  data: Record<ContributorWindowDays, ContributorWindowMetrics>
  rateLimit: RateLimitState | null
}> {
  if (recentCommitNodes.length === 0) {
    return {
      data: createUnavailableContributorWindowMetrics(),
      rateLimit: null,
    }
  }

  const uniqueLogins = new Set<string>()
  for (const node of recentCommitNodes) {
    const login = node.author?.user?.login?.trim()
    if (login) {
      uniqueLogins.add(login)
    }
  }

  let rateLimit: RateLimitState | null = null
  const organizationByLogin = new Map<string, string | null>()

  for (const login of uniqueLogins) {
    const response = await fetchPublicUserOrganizations(token, login).catch((error) => ({
      data: 'unavailable' as const,
      rateLimit: extractRateLimitFromError(error),
    }))
    rateLimit = response.rateLimit ?? rateLimit

    if (response.data === 'unavailable') {
      organizationByLogin.set(login, null)
      continue
    }

    const [org] = response.data
    organizationByLogin.set(login, org ?? null)
  }

  return {
    data: buildExperimentalMetricsByWindow(recentCommitNodes, organizationByLogin, now),
    rateLimit,
  }
}

async function collectRecentCommitHistory({
  token,
  owner,
  name,
  since365,
  initialConnection,
}: {
  token: string
  owner: string
  name: string
  since365: string
  initialConnection: CommitHistoryConnection | null
}): Promise<{ nodes: CommitNode[]; rateLimit: RateLimitState | null }> {
  if (!initialConnection) {
    return { nodes: [], rateLimit: null }
  }

  const nodes = [...initialConnection.nodes]
  let rateLimit: RateLimitState | null = null
  let hasNextPage = initialConnection.pageInfo.hasNextPage
  let cursor = initialConnection.pageInfo.endCursor

  while (hasNextPage && cursor) {
    const response = await queryGitHubGraphQL<RepoCommitHistoryPageResponse>(token, REPO_COMMIT_HISTORY_PAGE_QUERY, {
      owner,
      name,
      since365,
      after: cursor,
    })

    rateLimit = response.rateLimit ?? rateLimit

    const connection = response.data.repository?.defaultBranchRef?.target?.recent365Commits
    if (!connection) {
      break
    }

    nodes.push(...connection.nodes)
    hasNextPage = connection.pageInfo.hasNextPage
    cursor = connection.pageInfo.endCursor
  }

  return { nodes, rateLimit }
}

function buildContributorMetricsByWindow(
  recentCommitNodes: CommitNode[],
  now: Date,
): Record<ContributorWindowDays, ContributorWindowMetrics> {
  return Object.fromEntries(
    CONTRIBUTOR_WINDOW_DAYS.map((windowDays) => {
      const windowNodes = filterCommitNodesByWindow(recentCommitNodes, now, windowDays)
      const metrics = buildContributorMetrics(windowNodes)

      return [
        windowDays,
        {
          ...metrics,
          commitCountsByExperimentalOrg: 'unavailable',
          experimentalAttributedAuthors: 'unavailable',
          experimentalUnattributedAuthors: 'unavailable',
        },
      ]
    }),
  ) as Record<ContributorWindowDays, ContributorWindowMetrics>
}

function buildContributorMetrics(recentCommitNodes: CommitNode[]): Pick<ContributorWindowMetrics, 'uniqueCommitAuthors' | 'commitCountsByAuthor'> {
  if (recentCommitNodes.length === 0) {
    return {
      uniqueCommitAuthors: 'unavailable',
      commitCountsByAuthor: 'unavailable',
    }
  }

  const commitCountsByAuthor = new Map<string, number>()

  for (const node of recentCommitNodes) {
    const actorKey = getCommitActorKey(node)

    if (!actorKey) {
      return {
        uniqueCommitAuthors: 'unavailable',
        commitCountsByAuthor: 'unavailable',
      }
    }

    commitCountsByAuthor.set(actorKey, (commitCountsByAuthor.get(actorKey) ?? 0) + 1)
  }

  return {
    uniqueCommitAuthors: commitCountsByAuthor.size,
    commitCountsByAuthor: Object.fromEntries(commitCountsByAuthor.entries()),
  }
}

function createUnavailableContributorWindowMetrics(): Record<ContributorWindowDays, ContributorWindowMetrics> {
  return Object.fromEntries(
    CONTRIBUTOR_WINDOW_DAYS.map((windowDays) => [
      windowDays,
      {
        uniqueCommitAuthors: 'unavailable',
        commitCountsByAuthor: 'unavailable',
        commitCountsByExperimentalOrg: 'unavailable',
        experimentalAttributedAuthors: 'unavailable',
        experimentalUnattributedAuthors: 'unavailable',
      },
    ]),
  ) as Record<ContributorWindowDays, ContributorWindowMetrics>
}

function buildExperimentalMetricsByWindow(
  recentCommitNodes: CommitNode[],
  organizationByLogin: Map<string, string | null>,
  now: Date,
): Record<ContributorWindowDays, ContributorWindowMetrics> {
  return Object.fromEntries(
    CONTRIBUTOR_WINDOW_DAYS.map((windowDays) => {
      const windowNodes = filterCommitNodesByWindow(recentCommitNodes, now, windowDays)
      if (windowNodes.length === 0) {
        return [
          windowDays,
          {
            uniqueCommitAuthors: 'unavailable',
            commitCountsByAuthor: 'unavailable',
            commitCountsByExperimentalOrg: 'unavailable',
            experimentalAttributedAuthors: 'unavailable',
            experimentalUnattributedAuthors: 'unavailable',
          },
        ]
      }

      const commitCountsByExperimentalOrg = new Map<string, number>()
      const attributedAuthors = new Set<string>()
      const unattributedAuthors = new Set<string>()
      let sawResolvableAuthor = false

      for (const node of windowNodes) {
        const actorKey = getCommitActorKey(node)
        if (!actorKey) {
          continue
        }
        sawResolvableAuthor = true

        const login = node.author?.user?.login?.trim()
        if (!login) {
          unattributedAuthors.add(actorKey)
          continue
        }

        const org = organizationByLogin.get(login) ?? null
        if (!org) {
          unattributedAuthors.add(actorKey)
          continue
        }

        attributedAuthors.add(actorKey)
        commitCountsByExperimentalOrg.set(org, (commitCountsByExperimentalOrg.get(org) ?? 0) + 1)
      }

      return [
        windowDays,
        {
          uniqueCommitAuthors: 'unavailable',
          commitCountsByAuthor: 'unavailable',
          commitCountsByExperimentalOrg:
            sawResolvableAuthor && commitCountsByExperimentalOrg.size > 0
              ? Object.fromEntries(commitCountsByExperimentalOrg.entries())
              : 'unavailable',
          experimentalAttributedAuthors: sawResolvableAuthor ? attributedAuthors.size : 'unavailable',
          experimentalUnattributedAuthors: sawResolvableAuthor ? unattributedAuthors.size : 'unavailable',
        },
      ]
    }),
  ) as Record<ContributorWindowDays, ContributorWindowMetrics>
}

function filterCommitNodesByWindow(recentCommitNodes: CommitNode[], now: Date, windowDays: ContributorWindowDays) {
  const cutoff = new Date(now)
  cutoff.setDate(now.getDate() - windowDays)

  return recentCommitNodes.filter((node) => {
    const authoredDate = Date.parse(node.authoredDate)
    if (Number.isNaN(authoredDate)) {
      return false
    }

    return authoredDate >= cutoff.getTime()
  })
}

function getCommitActorKey(node: CommitNode): string | null {
  const login = node.author?.user?.login?.trim()
  if (login) {
    return `login:${login}`
  }

  const email = node.author?.email?.trim()
  if (email) {
    return `email:${email.toLowerCase()}`
  }

  const name = node.author?.name?.trim()
  if (name) {
    return `name:${name.toLowerCase()}`
  }

  return null
}

function buildFailure(repo: string, error: unknown): RepositoryFetchFailure {
  const maybeError = error as Error & { status?: number; retryAfter?: number | Unavailable }
  const message = maybeError?.message?.toLowerCase() ?? ''

  if (message.includes('not found')) {
    return { repo, reason: 'Repository could not be analyzed.', code: 'NOT_FOUND' }
  }

  if (maybeError.status === 401) {
    return { repo, reason: 'GitHub rejected the provided token.', code: 'UNAUTHORIZED' }
  }

  if (maybeError.status === 403 || message.includes('rate limit')) {
    return { repo, reason: 'GitHub rate limit prevented analysis.', code: 'RATE_LIMITED' }
  }

  return { repo, reason: 'Repository could not be analyzed.', code: 'FETCH_FAILED' }
}
