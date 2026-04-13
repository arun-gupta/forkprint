import type {
  ActivityWindowDays,
  ActivityWindowMetrics,
  AnalysisDiagnostic,
  AnalysisResult,
  AnalyzeInput,
  AnalyzeResponse,
  ContributorWindowDays,
  ContributorWindowMetrics,
  DocumentationFileCheck,
  DocumentationResult,
  RateLimitState,
  ReadmeSectionCheck,
  ResponsivenessMetrics,
  RepositoryFetchFailure,
  Unavailable,
} from './analysis-result'
import { CONTRIBUTOR_WINDOW_DAYS } from './analysis-result'
import { queryGitHubGraphQL } from './github-graphql'
import { fetchContributorCount, fetchMaintainerCount, fetchPublicUserOrganizations } from './github-rest'
import { REPO_COMMIT_AND_RELEASES_QUERY, REPO_ACTIVITY_COUNTS_QUERY, REPO_COMMIT_HISTORY_PAGE_QUERY, REPO_OVERVIEW_QUERY, REPO_RESPONSIVENESS_METADATA_QUERY, buildResponsivenessDetailQuery } from './queries'
import { extractLicensingResult, type LicenseFileInfo } from './extract-licensing'

interface DocBlob {
  text?: string
  oid?: string
}

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
    pullRequests?: { totalCount: number }
    licenseInfo?: { spdxId: string | null; name: string | null } | null
    docReadmeMd?: DocBlob | null
    docReadmeLower?: DocBlob | null
    docReadmeRst?: DocBlob | null
    docReadmeTxt?: DocBlob | null
    docReadmePlain?: DocBlob | null
    docLicense?: DocBlob | null
    docLicenseMd?: DocBlob | null
    docLicenseTxt?: DocBlob | null
    docCopying?: DocBlob | null
    docLicenseMit?: DocBlob | null
    docLicenseApache?: DocBlob | null
    docLicenseBsd?: DocBlob | null
    docContributing?: DocBlob | null
    docContributingRst?: DocBlob | null
    docContributingTxt?: DocBlob | null
    docCodeOfConduct?: DocBlob | null
    docCodeOfConductRst?: DocBlob | null
    docCodeOfConductTxt?: DocBlob | null
    docLicenseRst?: DocBlob | null
    docSecurity?: DocBlob | null
    docSecurityRst?: DocBlob | null
    docChangelog?: DocBlob | null
    docChangelogPlain?: DocBlob | null
    docChanges?: DocBlob | null
    docChangesRst?: DocBlob | null
    docHistory?: DocBlob | null
    docNews?: DocBlob | null
    workflowDir?: {
      entries: Array<{
        name: string
        object: { text: string } | null
      }>
    } | null
  } | null
}

interface RepoCommitAndReleasesResponse {
  repository: {
    releases: {
      nodes: Array<{
        createdAt: string
        publishedAt: string | null
      }>
    }
    defaultBranchRef: {
      target: {
        recent30: { totalCount: number }
        recent60: { totalCount: number }
        recent90: { totalCount: number }
        recent180: { totalCount: number }
        recent365Commits: CommitHistoryConnection | null
      } | null
    } | null
  } | null
}

interface SearchCount { issueCount: number }

interface RepoActivityCountsResponse {
  prsOpened30: SearchCount
  prsOpened60: SearchCount
  prsOpened90: SearchCount
  prsOpened180: SearchCount
  prsOpened365: SearchCount
  prsMerged30: SearchCount
  prsMerged60: SearchCount
  prsMerged90: SearchCount
  prsMerged180: SearchCount
  prsMerged365: SearchCount
  issuesOpened30: SearchCount
  issuesOpened60: SearchCount
  issuesOpened90: SearchCount
  issuesOpened180: SearchCount
  issuesOpened365: SearchCount
  issuesClosed30: SearchCount
  issuesClosed60: SearchCount
  issuesClosed90: SearchCount
  issuesClosed180: SearchCount
  issuesClosed365: SearchCount
  staleIssues30: SearchCount
  staleIssues60: SearchCount
  staleIssues90: SearchCount
  staleIssues180: SearchCount
  staleIssues365: SearchCount
  recentMergedPullRequests: {
    nodes: Array<{
      createdAt: string
      mergedAt: string | null
    }>
  }
  recentClosedIssues: {
    nodes: Array<{
      createdAt: string
      closedAt: string | null
    }>
  }
}

type RepoActivityResponse = RepoCommitAndReleasesResponse & RepoActivityCountsResponse

interface SearchActorNode {
  login: string | null
}

interface SearchCommentNode {
  createdAt: string
  author: SearchActorNode | null
}

interface SearchReviewNode {
  createdAt: string
  author: SearchActorNode | null
}

interface ResponsivenessIssueNode {
  createdAt: string
  closedAt?: string | null
  author: SearchActorNode | null
  comments: {
    totalCount: number
    nodes: SearchCommentNode[]
  }
}

interface ResponsivenessPullRequestNode {
  createdAt: string
  author: SearchActorNode | null
  comments: {
    totalCount: number
    nodes: SearchCommentNode[]
  }
  reviews: {
    totalCount: number
    nodes: SearchReviewNode[]
  }
}

// Pass 1 metadata types — no nested comment/review nodes
interface MetadataIssueNode {
  id: string
  createdAt: string
  closedAt?: string | null
  author: SearchActorNode | null
  comments: { totalCount: number }
}

interface MetadataPullRequestNode {
  id: string
  createdAt: string
  author: SearchActorNode | null
  comments: { totalCount: number }
  reviews: { totalCount: number }
}

interface RepoResponsivenessMetadataResponse {
  recentCreatedIssues: { nodes: MetadataIssueNode[] }
  recentClosedIssues: { nodes: MetadataIssueNode[] }
  recentCreatedPullRequests: { nodes: MetadataPullRequestNode[] }
  recentMergedPullRequests: { nodes: Array<{ createdAt: string; mergedAt: string | null }> }
  staleOpenPullRequests30: { issueCount: number }
  staleOpenPullRequests60: { issueCount: number }
  staleOpenPullRequests90: { issueCount: number }
  staleOpenPullRequests180: { issueCount: number }
  staleOpenPullRequests365: { issueCount: number }
}

// Pass 2 detail node — returned by node() queries
interface DetailNode {
  id: string
  createdAt: string
  author: SearchActorNode | null
  comments?: { totalCount: number; nodes: SearchCommentNode[] }
  reviews?: { totalCount: number; nodes: SearchReviewNode[] }
}

interface RepoResponsivenessResponse {
  recentCreatedIssues: {
    nodes: ResponsivenessIssueNode[]
  }
  recentClosedIssues: {
    nodes: ResponsivenessIssueNode[]
  }
  recentCreatedPullRequests: {
    nodes: ResponsivenessPullRequestNode[]
  }
  recentMergedPullRequests: {
    nodes: Array<{
      createdAt: string
      mergedAt: string | null
    }>
  }
  staleOpenPullRequests30: {
    issueCount: number
  }
  staleOpenPullRequests60: {
    issueCount: number
  }
  staleOpenPullRequests90: {
    issueCount: number
  }
  staleOpenPullRequests180: {
    issueCount: number
  }
  staleOpenPullRequests365: {
    issueCount: number
  }
}

interface LegacyRepoActivityResponse {
  prsOpened?: { issueCount: number }
  prsMerged?: { issueCount: number }
  issuesClosed?: { issueCount: number }
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
  message?: string
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
  const diagnostics: AnalysisDiagnostic[] = []
  let latestRateLimit: RateLimitState | null = null

  for (const repo of input.repos) {
    const [owner, name] = repo.split('/')
    const repoStart = Date.now()

    try {
      console.log(`[analyzer] ${repo} — fetching overview`)
      const overview = await queryGitHubGraphQL<RepoOverviewResponse>(input.token, REPO_OVERVIEW_QUERY, {
        owner,
        name,
      })
      latestRateLimit = overview.rateLimit ?? latestRateLimit

      if (!overview.data.repository) {
        console.warn(`[analyzer] ${repo} — not found, skipping`)
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
      const since60 = new Date(now)
      since60.setDate(now.getDate() - 60)
      const since180 = new Date(now)
      since180.setDate(now.getDate() - 180)
      const since365 = new Date(now)
      since365.setDate(now.getDate() - 365)
      const staleBefore30 = new Date(now)
      staleBefore30.setDate(now.getDate() - 30)
      const staleBefore60 = new Date(now)
      staleBefore60.setDate(now.getDate() - 60)
      const staleBefore90 = new Date(now)
      staleBefore90.setDate(now.getDate() - 90)
      const staleBefore180 = new Date(now)
      staleBefore180.setDate(now.getDate() - 180)
      const staleBefore365 = new Date(now)
      staleBefore365.setDate(now.getDate() - 365)
      const repoSearch = `${owner}/${name}`

      // Pass 1: Commit history + releases (lightweight — no search queries)
      console.log(`[analyzer] ${repo} — pass 1: commit history + releases`)
      const commitAndReleases = await queryGitHubGraphQL<RepoCommitAndReleasesResponse>(input.token, REPO_COMMIT_AND_RELEASES_QUERY, {
        owner,
        name,
        since30: since30.toISOString(),
        since60: since60.toISOString(),
        since90: since90.toISOString(),
        since180: since180.toISOString(),
        since365: since365.toISOString(),
      })
      latestRateLimit = commitAndReleases.rateLimit ?? latestRateLimit

      // Pass 2: Search-based PR/issue counts (may hit RESOURCE_LIMITS_EXCEEDED)
      console.log(`[analyzer] ${repo} — pass 2: activity counts (search-based)`)
      const searchVariables = {
        prsOpened30Query: buildSearchQuery(repoSearch, 'is:pr', 'created', since30),
        prsOpened60Query: buildSearchQuery(repoSearch, 'is:pr', 'created', since60),
        prsOpened90Query: buildSearchQuery(repoSearch, 'is:pr', 'created', since90),
        prsOpened180Query: buildSearchQuery(repoSearch, 'is:pr', 'created', since180),
        prsOpened365Query: buildSearchQuery(repoSearch, 'is:pr', 'created', since365),
        prsMerged30Query: buildSearchQuery(repoSearch, 'is:pr is:merged', 'merged', since30),
        prsMerged60Query: buildSearchQuery(repoSearch, 'is:pr is:merged', 'merged', since60),
        prsMerged90Query: buildSearchQuery(repoSearch, 'is:pr is:merged', 'merged', since90),
        prsMerged180Query: buildSearchQuery(repoSearch, 'is:pr is:merged', 'merged', since180),
        prsMerged365Query: buildSearchQuery(repoSearch, 'is:pr is:merged', 'merged', since365),
        issuesOpened30Query: buildSearchQuery(repoSearch, 'is:issue', 'created', since30),
        issuesOpened60Query: buildSearchQuery(repoSearch, 'is:issue', 'created', since60),
        issuesOpened90Query: buildSearchQuery(repoSearch, 'is:issue', 'created', since90),
        issuesOpened180Query: buildSearchQuery(repoSearch, 'is:issue', 'created', since180),
        issuesOpened365Query: buildSearchQuery(repoSearch, 'is:issue', 'created', since365),
        issuesClosed30Query: buildSearchQuery(repoSearch, 'is:issue', 'closed', since30),
        issuesClosed60Query: buildSearchQuery(repoSearch, 'is:issue', 'closed', since60),
        issuesClosed90Query: buildSearchQuery(repoSearch, 'is:issue', 'closed', since90),
        issuesClosed180Query: buildSearchQuery(repoSearch, 'is:issue', 'closed', since180),
        issuesClosed365Query: buildSearchQuery(repoSearch, 'is:issue', 'closed', since365),
        staleIssues30Query: buildOpenIssuesOlderThanQuery(repoSearch, staleBefore30),
        staleIssues60Query: buildOpenIssuesOlderThanQuery(repoSearch, staleBefore60),
        staleIssues90Query: buildOpenIssuesOlderThanQuery(repoSearch, staleBefore90),
        staleIssues180Query: buildOpenIssuesOlderThanQuery(repoSearch, staleBefore180),
        staleIssues365Query: buildOpenIssuesOlderThanQuery(repoSearch, staleBefore365),
      }

      let activityCounts: RepoActivityCountsResponse
      try {
        const countsResponse = await queryGitHubGraphQL<RepoActivityCountsResponse>(input.token, REPO_ACTIVITY_COUNTS_QUERY, searchVariables)
        latestRateLimit = countsResponse.rateLimit ?? latestRateLimit
        activityCounts = countsResponse.data
      } catch (countsError) {
        latestRateLimit = extractRateLimitFromError(countsError) ?? latestRateLimit
        diagnostics.push(buildDiagnostic(repo, 'github-graphql:activity-counts', countsError))
        activityCounts = buildUnavailableActivityCounts()
      }

      // Merge pass 1 + pass 2 into the combined activity response
      const activity = {
        data: { ...commitAndReleases.data, ...activityCounts } as RepoActivityResponse,
        rateLimit: latestRateLimit,
      }

      console.log(`[analyzer] ${repo} — fetching responsiveness metrics`)
      const responsiveness = await fetchResponsivenessTwoPass(
        input.token,
        {
          issuesCreated365Query: buildSearchQuery(repoSearch, 'is:issue', 'created', since365),
          issuesClosed365Query: buildSearchQuery(repoSearch, 'is:issue', 'closed', since365),
          prsCreated365Query: buildSearchQuery(repoSearch, 'is:pr', 'created', since365),
          prsMerged365Query: buildSearchQuery(repoSearch, 'is:pr is:merged', 'merged', since365),
          stalePrs30Query: buildOpenPullRequestsOlderThanQuery(repoSearch, staleBefore30),
          stalePrs60Query: buildOpenPullRequestsOlderThanQuery(repoSearch, staleBefore60),
          stalePrs90Query: buildOpenPullRequestsOlderThanQuery(repoSearch, staleBefore90),
          stalePrs180Query: buildOpenPullRequestsOlderThanQuery(repoSearch, staleBefore180),
          stalePrs365Query: buildOpenPullRequestsOlderThanQuery(repoSearch, staleBefore365),
        },
        diagnostics,
        repo,
      )
      latestRateLimit = responsiveness.rateLimit ?? latestRateLimit

      console.log(`[analyzer] ${repo} — fetching contributor + maintainer counts`)
      const contributorCount = await fetchContributorCount(input.token, owner, name).catch((error) => {
        latestRateLimit = extractRateLimitFromError(error) ?? latestRateLimit
        diagnostics.push(buildDiagnostic(repo, 'github-rest:contributors', error))

        return {
          data: 'unavailable' as const,
          rateLimit: extractRateLimitFromError(error),
        }
      })
      latestRateLimit = contributorCount.rateLimit ?? latestRateLimit

      const maintainerCount = await fetchMaintainerCount(input.token, owner, name).catch((error) => {
        latestRateLimit = extractRateLimitFromError(error) ?? latestRateLimit
        diagnostics.push(buildDiagnostic(repo, 'github-rest:maintainers', error))

        return {
          data: 'unavailable' as const,
          rateLimit: extractRateLimitFromError(error),
        }
      })
      latestRateLimit = maintainerCount.rateLimit ?? latestRateLimit

      console.log(`[analyzer] ${repo} — collecting commit history`)
      const commitHistory = await collectRecentCommitHistory({
        token: input.token,
        owner,
        name,
        since365: since365.toISOString(),
        initialConnection: activity.data.repository?.defaultBranchRef?.target?.recent365Commits ?? null,
      })
      latestRateLimit = commitHistory.rateLimit ?? latestRateLimit

      const contributorMetricsByWindow = buildContributorMetricsByWindow(commitHistory.nodes, now)
      const activityMetricsByWindow = buildActivityMetricsByWindow(
        activity.data,
        now,
        commitHistory.nodes,
        overview.data.repository?.issues.totalCount,
      )
      const experimentalOrgAttribution = await buildExperimentalOrganizationCommitCountsByWindow(input.token, commitHistory.nodes, now)
      latestRateLimit = experimentalOrgAttribution.rateLimit ?? latestRateLimit

      results.push(
        buildAnalysisResult(
          repo,
          overview.data,
          activity.data,
          responsiveness.data,
          contributorMetricsByWindow,
          activityMetricsByWindow,
          contributorCount.data,
          maintainerCount.data,
          experimentalOrgAttribution.data,
          commitHistory.nodes,
        ),
      )
      const repoElapsed = ((Date.now() - repoStart) / 1000).toFixed(1)
      console.log(`[analyzer] ${repo} — done in ${repoElapsed}s`)
    } catch (error) {
      const repoElapsed = ((Date.now() - repoStart) / 1000).toFixed(1)
      console.error(`[analyzer] ${repo} — failed after ${repoElapsed}s:`, error)
      latestRateLimit = latestRateLimit ?? extractRateLimitFromError(error)
      diagnostics.push(buildDiagnostic(repo, 'analyze', error, 'error'))
      failures.push(buildFailure(repo, error))
    }
  }

  return {
    results,
    failures,
    rateLimit: latestRateLimit,
    diagnostics,
  }
}

interface ResponseSignal {
  firstResponderKind: 'bot' | 'human' | null
  firstHumanResponseAt: string | null
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
  responsiveness: RepoResponsivenessResponse,
  contributorMetricsByWindow: Record<ContributorWindowDays, ContributorWindowMetrics>,
  activityMetricsByWindow: Record<ActivityWindowDays, ActivityWindowMetrics>,
  totalContributorCount: number | Unavailable,
  maintainerCount: number | Unavailable,
  experimentalMetricsByWindow: Record<ContributorWindowDays, ContributorWindowMetrics>,
  recentCommitNodes: CommitNode[],
): AnalysisResult {
  const defaultBranchTarget = activity.repository?.defaultBranchRef?.target
  const legacyActivity = activity as RepoActivityResponse & LegacyRepoActivityResponse
  const contributorMetrics = contributorMetricsByWindow[90]
  const experimentalMetrics = experimentalMetricsByWindow[90]
  const responsivenessMetricsByWindow = buildResponsivenessMetricsByWindow(
    responsiveness,
    activityMetricsByWindow,
    overview.repository?.issues.totalCount,
    overview.repository?.pullRequests?.totalCount,
  )
  const responsivenessMetrics = responsivenessMetricsByWindow[90]
  const issueFirstResponseTimestamps = collectIssueFirstResponseTimestamps(responsiveness.recentCreatedIssues?.nodes ?? [], 90)
  const issueCloseTimestamps = collectIssueCloseTimestamps(responsiveness.recentClosedIssues?.nodes ?? [], 90)
  const prMergeTimestamps = collectPullRequestMergeTimestamps(responsiveness.recentMergedPullRequests?.nodes ?? [], 90)
  const missingFields = [...UNAVAILABLE_FIELDS].filter((field) => {
    if (field === 'releases12mo') {
      return activityMetricsByWindow[365].releases === 'unavailable'
    }

    if (field === 'uniqueCommitAuthors90d') {
      return contributorMetrics.uniqueCommitAuthors === 'unavailable'
    }

    if (field === 'commitCountsByAuthor') {
      return contributorMetrics.commitCountsByAuthor === 'unavailable'
    }

    if (field === 'totalContributors') {
      const resolvedTotal = totalContributorCount !== 'unavailable'
        ? totalContributorCount
        : contributorMetricsByWindow[365].uniqueCommitAuthors !== 'unavailable' && contributorMetricsByWindow[365].uniqueCommitAuthors > 0
          ? contributorMetricsByWindow[365].uniqueCommitAuthors
          : 'unavailable'
      return resolvedTotal === 'unavailable'
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

    if (field === 'issueFirstResponseTimestamps') {
      return issueFirstResponseTimestamps === 'unavailable'
    }

    if (field === 'issueCloseTimestamps') {
      return issueCloseTimestamps === 'unavailable'
    }

    if (field === 'prMergeTimestamps') {
      return prMergeTimestamps === 'unavailable'
    }

    return false
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
    releases12mo: activityMetricsByWindow[365].releases,
    prsOpened90d: activity.prsOpened90?.issueCount ?? legacyActivity.prsOpened?.issueCount ?? 'unavailable',
    prsMerged90d: activity.prsMerged90?.issueCount ?? legacyActivity.prsMerged?.issueCount ?? 'unavailable',
    issuesOpen: overview.repository?.issues.totalCount ?? 'unavailable',
    issuesClosed90d: activity.issuesClosed90?.issueCount ?? legacyActivity.issuesClosed?.issueCount ?? 'unavailable',
    uniqueCommitAuthors90d: contributorMetrics.uniqueCommitAuthors,
    totalContributors: totalContributorCount !== 'unavailable'
      ? totalContributorCount
      : contributorMetricsByWindow[365].uniqueCommitAuthors !== 'unavailable' && contributorMetricsByWindow[365].uniqueCommitAuthors > 0
        ? contributorMetricsByWindow[365].uniqueCommitAuthors
        : 'unavailable',
    totalContributorsSource: totalContributorCount !== 'unavailable' ? 'api' : 'commit-history',
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
    activityMetricsByWindow,
    responsivenessMetricsByWindow,
    responsivenessMetrics,
    staleIssueRatio: activityMetricsByWindow[90].staleIssueRatio,
    medianTimeToMergeHours: activityMetricsByWindow[90].medianTimeToMergeHours,
    medianTimeToCloseHours: activityMetricsByWindow[90].medianTimeToCloseHours,
    documentationResult: extractDocumentationResult(overview.repository),
    licensingResult: overview.repository
      ? (() => {
          const repo = overview.repository
          // Collect license file content for SPDX expression parsing
          const licenseFileContent =
            repo.docLicense?.text ?? repo.docLicenseMd?.text ?? repo.docLicenseTxt?.text ??
            repo.docLicenseRst?.text ?? repo.docCopying?.text ?? null
          // Collect additional license files (LICENSE-MIT, LICENSE-APACHE, etc.)
          const additionalLicenseFiles: LicenseFileInfo[] = [
            { suffix: 'MIT', content: repo.docLicenseMit?.text ?? null },
            { suffix: 'APACHE', content: repo.docLicenseApache?.text ?? null },
            { suffix: 'BSD', content: repo.docLicenseBsd?.text ?? null },
          ]
          return extractLicensingResult(
            repo.licenseInfo ?? null,
            recentCommitNodes.filter((n): n is CommitNode & { message: string } => typeof n.message === 'string'),
            repo.workflowDir ?? null,
            licenseFileContent,
            additionalLicenseFiles,
          )
        })()
      : 'unavailable',
    issueFirstResponseTimestamps,
    issueCloseTimestamps,
    prMergeTimestamps,
    missingFields,
  }
}

function extractDocumentationResult(repo: RepoOverviewResponse['repository']): DocumentationResult | Unavailable {
  if (!repo) return 'unavailable'

  const findFirst = (...aliases: (DocBlob | null | undefined)[]): DocBlob | null =>
    aliases.find((a) => a != null) ?? null

  const readmeBlob = findFirst(repo.docReadmeMd, repo.docReadmeLower, repo.docReadmeRst, repo.docReadmeTxt, repo.docReadmePlain)
  const licenseBlob = findFirst(repo.docLicense, repo.docLicenseMd, repo.docLicenseTxt, repo.docLicenseRst, repo.docCopying, repo.docLicenseMit, repo.docLicenseApache, repo.docLicenseBsd)
  const contributingBlob = findFirst(repo.docContributing, repo.docContributingRst, repo.docContributingTxt)
  const codeOfConductBlob = findFirst(repo.docCodeOfConduct, repo.docCodeOfConductRst, repo.docCodeOfConductTxt)
  const securityBlob = findFirst(repo.docSecurity, repo.docSecurityRst)
  const changelogBlob = findFirst(repo.docChangelog, repo.docChangelogPlain, repo.docChanges, repo.docChangesRst, repo.docHistory, repo.docNews)

  const readmePathMap: [string, DocBlob | null | undefined][] = [
    ['README.md', repo.docReadmeMd], ['readme.md', repo.docReadmeLower], ['README.rst', repo.docReadmeRst],
    ['README.txt', repo.docReadmeTxt], ['README', repo.docReadmePlain],
  ]
  const licensePathMap: [string, DocBlob | null | undefined][] = [
    ['LICENSE', repo.docLicense], ['LICENSE.md', repo.docLicenseMd], ['LICENSE.txt', repo.docLicenseTxt], ['LICENSE.rst', repo.docLicenseRst], ['COPYING', repo.docCopying],
    ['LICENSE-MIT', repo.docLicenseMit], ['LICENSE-APACHE', repo.docLicenseApache], ['LICENSE-BSD', repo.docLicenseBsd],
  ]
  const contributingPathMap: [string, DocBlob | null | undefined][] = [
    ['CONTRIBUTING.md', repo.docContributing], ['CONTRIBUTING.rst', repo.docContributingRst], ['CONTRIBUTING.txt', repo.docContributingTxt],
  ]
  const changelogPathMap: [string, DocBlob | null | undefined][] = [
    ['CHANGELOG.md', repo.docChangelog], ['CHANGELOG', repo.docChangelogPlain], ['CHANGES.md', repo.docChanges],
    ['CHANGES.rst', repo.docChangesRst], ['HISTORY.md', repo.docHistory], ['NEWS.md', repo.docNews],
  ]

  function foundPath(pathMap: [string, DocBlob | null | undefined][]): string | null {
    for (const [path, blob] of pathMap) {
      if (blob != null) return path
    }
    return null
  }

  const readmeContent = readmeBlob?.text ?? null

  const fileChecks: DocumentationFileCheck[] = [
    { name: 'readme', found: readmeBlob !== null, path: foundPath(readmePathMap) },
    { name: 'license', found: licenseBlob !== null, path: foundPath(licensePathMap) },
    { name: 'contributing', found: contributingBlob !== null, path: foundPath(contributingPathMap) },
    { name: 'code_of_conduct', found: codeOfConductBlob !== null, path: foundPath([['CODE_OF_CONDUCT.md', repo.docCodeOfConduct], ['CODE_OF_CONDUCT.rst', repo.docCodeOfConductRst], ['CODE_OF_CONDUCT.txt', repo.docCodeOfConductTxt]]) },
    { name: 'security', found: securityBlob !== null, path: foundPath([['SECURITY.md', repo.docSecurity], ['SECURITY.rst', repo.docSecurityRst]]) },
    { name: 'changelog', found: changelogBlob !== null, path: foundPath(changelogPathMap) },
  ]

  const readmeSections = detectReadmeSections(readmeContent)

  return { fileChecks, readmeSections, readmeContent }
}

// Matches both Markdown headings (## Title) and RST headings (Title\n====)
function sectionPatterns(keyword: RegExp): RegExp[] {
  return [
    new RegExp(`^#+\\s*${keyword.source}`, 'im'),               // Markdown: ## Keyword
    new RegExp(`^(${keyword.source})[^\\n]*\\n[=\\-~^"]+$`, 'im'), // RST: Keyword\n======
  ]
}

const SECTION_PATTERNS: Array<{ name: ReadmeSectionCheck['name']; patterns: RegExp[] }> = [
  { name: 'description', patterns: sectionPatterns(/(?:about|overview|description|introduction|what is|features)/) },
  { name: 'installation', patterns: sectionPatterns(/(?:install(?:ation|ing)?|setup|getting\s*started|quick\s*start)/) },
  { name: 'usage', patterns: sectionPatterns(/(?:usage|examples?|how\s*to\s*use|tutorial|demo)/) },
  { name: 'contributing', patterns: sectionPatterns(/(?:contribut(?:ing|e|ors?)|how\s*to\s*contribute)/) },
  { name: 'license', patterns: sectionPatterns(/licen[sc]e/) },
]

function detectReadmeSections(content: string | null): ReadmeSectionCheck[] {
  if (!content) {
    return SECTION_PATTERNS.map(({ name }) => ({ name, detected: false }))
  }

  // Treat the first non-empty paragraph as a description if no explicit heading
  const hasDescriptionHeading = SECTION_PATTERNS[0]!.patterns.some((p) => p.test(content))
  const firstParagraph = content.split('\n').find((line) => line.trim().length > 0 && !line.startsWith('#'))
  const hasImplicitDescription = !hasDescriptionHeading && firstParagraph != null && firstParagraph.trim().length > 20

  return SECTION_PATTERNS.map(({ name, patterns }) => {
    if (name === 'description') {
      return { name, detected: hasDescriptionHeading || hasImplicitDescription }
    }
    return { name, detected: patterns.some((p) => p.test(content)) }
  })
}

function buildSearchQuery(repoSearch: string, qualifiers: string, dateField: 'created' | 'merged' | 'closed', since: Date) {
  return `repo:${repoSearch} ${qualifiers} ${dateField}:>=${since.toISOString().slice(0, 10)}`
}

function buildOpenIssuesOlderThanQuery(repoSearch: string, before: Date) {
  return `repo:${repoSearch} is:issue is:open created:<${before.toISOString().slice(0, 10)}`
}

function buildOpenPullRequestsOlderThanQuery(repoSearch: string, before: Date) {
  return `repo:${repoSearch} is:pr is:open created:<${before.toISOString().slice(0, 10)}`
}

// ─── Two-pass responsiveness fetch ───────────────────────────────────────────

const DETAIL_BATCH_SIZE = 10

async function fetchResponsivenessTwoPass(
  token: string,
  variables: Record<string, string>,
  diagnostics: Array<{ repo: string; source: string; message: string }>,
  repo: string,
): Promise<{ data: RepoResponsivenessResponse; rateLimit: RateLimitState | null }> {
  // Pass 1: Lightweight metadata query
  const metadataResult = await queryGitHubGraphQL<RepoResponsivenessMetadataResponse>(
    token,
    REPO_RESPONSIVENESS_METADATA_QUERY,
    variables,
  ).catch((error) => {
    diagnostics.push(buildDiagnostic(repo, 'github-graphql:responsiveness-metadata', error))
    return null
  })

  if (!metadataResult) {
    return { data: createUnavailableResponsivenessResponse(), rateLimit: null }
  }

  const metadata = metadataResult.data

  // Collect node IDs that need detail fetching (issues with comments, PRs with comments/reviews)
  const detailRequests: Array<{ id: string; type: 'issue' | 'pr' }> = []

  for (const issue of metadata.recentCreatedIssues?.nodes ?? []) {
    if (issue?.id && issue.comments?.totalCount > 0) {
      detailRequests.push({ id: issue.id, type: 'issue' })
    }
  }
  for (const issue of metadata.recentClosedIssues?.nodes ?? []) {
    if (issue?.id && issue.comments?.totalCount > 0) {
      detailRequests.push({ id: issue.id, type: 'issue' })
    }
  }
  for (const pr of metadata.recentCreatedPullRequests?.nodes ?? []) {
    if (pr?.id && (pr.comments?.totalCount > 0 || pr.reviews?.totalCount > 0)) {
      detailRequests.push({ id: pr.id, type: 'pr' })
    }
  }

  // Deduplicate by id
  const seen = new Set<string>()
  const uniqueRequests = detailRequests.filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })

  // Pass 2: Fetch comment/review details in batches
  const detailMap = new Map<string, DetailNode>()
  let latestRateLimit = metadataResult.rateLimit

  for (let i = 0; i < uniqueRequests.length; i += DETAIL_BATCH_SIZE) {
    const batch = uniqueRequests.slice(i, i + DETAIL_BATCH_SIZE)
    const detailQuery = buildResponsivenessDetailQuery(batch)

    const detailResult = await queryGitHubGraphQL<Record<string, DetailNode | null>>(
      token,
      detailQuery,
      {},
    ).catch((error) => {
      diagnostics.push(buildDiagnostic(repo, 'github-graphql:responsiveness-detail', error))
      return null
    })

    if (detailResult) {
      latestRateLimit = detailResult.rateLimit ?? latestRateLimit
      for (let j = 0; j < batch.length; j++) {
        const node = detailResult.data[`node${j}`]
        if (node?.id) {
          detailMap.set(node.id, node)
        }
      }
    }
  }

  // Merge metadata + details into the full response shape
  const response = mergeResponsivenessData(metadata, detailMap)

  return { data: response, rateLimit: latestRateLimit }
}

function mergeResponsivenessData(
  metadata: RepoResponsivenessMetadataResponse,
  detailMap: Map<string, DetailNode>,
): RepoResponsivenessResponse {
  function enrichIssue(meta: MetadataIssueNode): ResponsivenessIssueNode {
    const detail = detailMap.get(meta.id)
    return {
      createdAt: meta.createdAt,
      closedAt: meta.closedAt,
      author: meta.author,
      comments: detail?.comments ?? { totalCount: meta.comments.totalCount, nodes: [] },
    }
  }

  function enrichPR(meta: MetadataPullRequestNode): ResponsivenessPullRequestNode {
    const detail = detailMap.get(meta.id)
    return {
      createdAt: meta.createdAt,
      author: meta.author,
      comments: detail?.comments ?? { totalCount: meta.comments.totalCount, nodes: [] },
      reviews: detail?.reviews ?? { totalCount: meta.reviews.totalCount, nodes: [] },
    }
  }

  return {
    recentCreatedIssues: {
      nodes: (metadata.recentCreatedIssues?.nodes ?? []).filter(Boolean).map(enrichIssue),
    },
    recentClosedIssues: {
      nodes: (metadata.recentClosedIssues?.nodes ?? []).filter(Boolean).map(enrichIssue),
    },
    recentCreatedPullRequests: {
      nodes: (metadata.recentCreatedPullRequests?.nodes ?? []).filter(Boolean).map(enrichPR),
    },
    recentMergedPullRequests: metadata.recentMergedPullRequests,
    staleOpenPullRequests30: metadata.staleOpenPullRequests30,
    staleOpenPullRequests60: metadata.staleOpenPullRequests60,
    staleOpenPullRequests90: metadata.staleOpenPullRequests90,
    staleOpenPullRequests180: metadata.staleOpenPullRequests180,
    staleOpenPullRequests365: metadata.staleOpenPullRequests365,
  }
}

function createUnavailableResponsivenessResponse(): RepoResponsivenessResponse {
  return {
    recentCreatedIssues: { nodes: [] },
    recentClosedIssues: { nodes: [] },
    recentCreatedPullRequests: { nodes: [] },
    recentMergedPullRequests: { nodes: [] },
    staleOpenPullRequests30: { issueCount: 0 },
    staleOpenPullRequests60: { issueCount: 0 },
    staleOpenPullRequests90: { issueCount: 0 },
    staleOpenPullRequests180: { issueCount: 0 },
    staleOpenPullRequests365: { issueCount: 0 },
  }
}

function buildResponsivenessMetricsByWindow(
  responsiveness: RepoResponsivenessResponse,
  activityMetricsByWindow: Record<ActivityWindowDays, ActivityWindowMetrics>,
  openIssueCount: number | undefined,
  openPullRequestCount: number | undefined,
): Record<ActivityWindowDays, ResponsivenessMetrics> {
  const recentCreatedIssues = responsiveness.recentCreatedIssues?.nodes ?? []
  const recentClosedIssues = responsiveness.recentClosedIssues?.nodes ?? []
  const recentCreatedPullRequests = responsiveness.recentCreatedPullRequests?.nodes ?? []
  const recentMergedPullRequests = responsiveness.recentMergedPullRequests?.nodes ?? []

  return {
    30: buildResponsivenessMetricsForWindow(
      30,
      recentCreatedIssues,
      recentClosedIssues,
      recentCreatedPullRequests,
      recentMergedPullRequests,
      activityMetricsByWindow[30],
      responsiveness.staleOpenPullRequests30?.issueCount,
      openIssueCount,
      openPullRequestCount,
    ),
    60: buildResponsivenessMetricsForWindow(
      60,
      recentCreatedIssues,
      recentClosedIssues,
      recentCreatedPullRequests,
      recentMergedPullRequests,
      activityMetricsByWindow[60],
      responsiveness.staleOpenPullRequests60?.issueCount,
      openIssueCount,
      openPullRequestCount,
    ),
    90: buildResponsivenessMetricsForWindow(
      90,
      recentCreatedIssues,
      recentClosedIssues,
      recentCreatedPullRequests,
      recentMergedPullRequests,
      activityMetricsByWindow[90],
      responsiveness.staleOpenPullRequests90?.issueCount,
      openIssueCount,
      openPullRequestCount,
    ),
    180: buildResponsivenessMetricsForWindow(
      180,
      recentCreatedIssues,
      recentClosedIssues,
      recentCreatedPullRequests,
      recentMergedPullRequests,
      activityMetricsByWindow[180],
      responsiveness.staleOpenPullRequests180?.issueCount,
      openIssueCount,
      openPullRequestCount,
    ),
    365: buildResponsivenessMetricsForWindow(
      365,
      recentCreatedIssues,
      recentClosedIssues,
      recentCreatedPullRequests,
      recentMergedPullRequests,
      activityMetricsByWindow[365],
      responsiveness.staleOpenPullRequests365?.issueCount,
      openIssueCount,
      openPullRequestCount,
    ),
  }
}

function buildResponsivenessMetricsForWindow(
  windowDays: ActivityWindowDays,
  recentCreatedIssues: ResponsivenessIssueNode[],
  recentClosedIssues: ResponsivenessIssueNode[],
  recentCreatedPullRequests: ResponsivenessPullRequestNode[],
  recentMergedPullRequests: Array<{ createdAt: string; mergedAt: string | null }>,
  activityMetrics: ActivityWindowMetrics,
  staleOpenPullRequestCount: number | undefined,
  openIssueCount: number | undefined,
  openPullRequestCount: number | undefined,
): ResponsivenessMetrics {
  const issueNodesInWindow = filterNodesByStartDate(recentCreatedIssues, windowDays)
  const closedIssueNodesInWindow = filterNodesByEndDate(recentClosedIssues, 'closedAt', windowDays)
  const createdPullRequestsInWindow = filterNodesByStartDate(recentCreatedPullRequests, windowDays)
  const mergedPullRequestsInWindow = filterNodesByEndDate(recentMergedPullRequests, 'mergedAt', windowDays)

  const issueFirstResponseDurations = issueNodesInWindow
    .map((issue) => getIssueFirstResponseDurationHours(issue))
    .filter((value): value is number => value != null)
  const prFirstReviewDurations = createdPullRequestsInWindow
    .map((pullRequest) => getPullRequestFirstReviewDurationHours(pullRequest))
    .filter((value): value is number => value != null)
  const issueResolutionDurations = closedIssueNodesInWindow
    .map((issue) => getDurationHours(issue.createdAt, issue.closedAt ?? null))
    .filter((value): value is number => value != null)
  const prMergeDurations = mergedPullRequestsInWindow
    .map((pullRequest) => getDurationHours(pullRequest.createdAt, pullRequest.mergedAt))
    .filter((value): value is number => value != null)

  const interactionSignals = [
    ...issueNodesInWindow.map((issue) => getResponseSignal(issue.author?.login ?? null, issue.comments.nodes)),
    ...createdPullRequestsInWindow.map((pullRequest) =>
      getResponseSignal(pullRequest.author?.login ?? null, [...pullRequest.comments.nodes, ...pullRequest.reviews.nodes]),
    ),
  ].filter((signal): signal is ResponseSignal => signal != null)

  const itemsWithHumanResponse = interactionSignals.filter((signal) => signal.firstHumanResponseAt != null).length
  const itemsWithBotFirstResponse = interactionSignals.filter((signal) => signal.firstResponderKind === 'bot').length
  const itemsWithHumanFirstResponse = interactionSignals.filter((signal) => signal.firstResponderKind === 'human').length
  const itemsWithAnyFirstResponse = interactionSignals.filter((signal) => signal.firstResponderKind != null).length

  return {
    issueFirstResponseMedianHours: computeMedian(issueFirstResponseDurations),
    issueFirstResponseP90Hours: computePercentile(issueFirstResponseDurations, 0.9),
    prFirstReviewMedianHours: computeMedian(prFirstReviewDurations),
    prFirstReviewP90Hours: computePercentile(prFirstReviewDurations, 0.9),
    issueResolutionMedianHours: computeMedian(issueResolutionDurations),
    issueResolutionP90Hours: computePercentile(issueResolutionDurations, 0.9),
    prMergeMedianHours: computeMedian(prMergeDurations),
    prMergeP90Hours: computePercentile(prMergeDurations, 0.9),
    issueResolutionRate: computeRatio(activityMetrics.issuesClosed, activityMetrics.issuesOpened),
    contributorResponseRate:
      interactionSignals.length > 0 ? itemsWithHumanResponse / interactionSignals.length : 'unavailable',
    botResponseRatio: itemsWithAnyFirstResponse > 0 ? itemsWithBotFirstResponse / itemsWithAnyFirstResponse : 'unavailable',
    humanResponseRatio: itemsWithAnyFirstResponse > 0 ? itemsWithHumanFirstResponse / itemsWithAnyFirstResponse : 'unavailable',
    staleIssueRatio: activityMetrics.staleIssueRatio,
    stalePrRatio: computeStaleItemRatio(staleOpenPullRequestCount, openPullRequestCount),
    prReviewDepth:
      createdPullRequestsInWindow.length > 0
        ? createdPullRequestsInWindow.reduce((total, pullRequest) => total + pullRequest.reviews.totalCount, 0) /
          createdPullRequestsInWindow.length
        : 'unavailable',
    issuesClosedWithoutCommentRatio:
      closedIssueNodesInWindow.length > 0
        ? closedIssueNodesInWindow.filter((issue) => issue.comments.totalCount === 0).length / closedIssueNodesInWindow.length
        : 'unavailable',
    openIssueCount: typeof openIssueCount === 'number' ? openIssueCount : 'unavailable',
    openPullRequestCount: typeof openPullRequestCount === 'number' ? openPullRequestCount : 'unavailable',
  }
}

function buildActivityMetricsByWindow(
  activity: RepoActivityResponse,
  now: Date,
  recentCommitNodes: CommitNode[],
  openIssueCount: number | undefined,
): Record<ActivityWindowDays, ActivityWindowMetrics> {
  const legacyActivity = activity as RepoActivityResponse & LegacyRepoActivityResponse
  const defaultBranchTarget = activity.repository?.defaultBranchRef?.target
  const releaseDates =
    activity.repository?.releases?.nodes?.map((release) => release.publishedAt ?? release.createdAt).filter((value): value is string => Boolean(value)) ??
    []

  const commitCountsByWindow: Record<ActivityWindowDays, number | Unavailable> = {
    30: defaultBranchTarget?.recent30?.totalCount ?? 'unavailable',
    60: defaultBranchTarget?.recent60?.totalCount ?? 'unavailable',
    90: defaultBranchTarget?.recent90?.totalCount ?? 'unavailable',
    180: defaultBranchTarget?.recent180?.totalCount ?? 'unavailable',
    365: recentCommitNodes.length > 0 ? recentCommitNodes.length : defaultBranchTarget?.recent365Commits?.nodes.length ?? 'unavailable',
  }

  const mergedPullRequestNodes = activity.recentMergedPullRequests?.nodes ?? []
  const closedIssueNodes = activity.recentClosedIssues?.nodes ?? []

  return {
    30: {
      commits: commitCountsByWindow[30],
      prsOpened: activity.prsOpened30?.issueCount ?? 'unavailable',
      prsMerged: activity.prsMerged30?.issueCount ?? 'unavailable',
      issuesOpened: activity.issuesOpened30?.issueCount ?? 'unavailable',
      issuesClosed: activity.issuesClosed30?.issueCount ?? 'unavailable',
      releases: countReleaseDatesWithinWindow(releaseDates, now, 30),
      staleIssueRatio: computeStaleIssueRatio(activity.staleIssues30?.issueCount, openIssueCount),
      medianTimeToMergeHours: computeMedianDurationHoursWithinWindow(mergedPullRequestNodes, 'mergedAt', now, 30),
      medianTimeToCloseHours: computeMedianDurationHoursWithinWindow(closedIssueNodes, 'closedAt', now, 30),
    },
    60: {
      commits: commitCountsByWindow[60],
      prsOpened: activity.prsOpened60?.issueCount ?? 'unavailable',
      prsMerged: activity.prsMerged60?.issueCount ?? 'unavailable',
      issuesOpened: activity.issuesOpened60?.issueCount ?? 'unavailable',
      issuesClosed: activity.issuesClosed60?.issueCount ?? 'unavailable',
      releases: countReleaseDatesWithinWindow(releaseDates, now, 60),
      staleIssueRatio: computeStaleIssueRatio(activity.staleIssues60?.issueCount, openIssueCount),
      medianTimeToMergeHours: computeMedianDurationHoursWithinWindow(mergedPullRequestNodes, 'mergedAt', now, 60),
      medianTimeToCloseHours: computeMedianDurationHoursWithinWindow(closedIssueNodes, 'closedAt', now, 60),
    },
    90: {
      commits: commitCountsByWindow[90],
      prsOpened: activity.prsOpened90?.issueCount ?? legacyActivity.prsOpened?.issueCount ?? 'unavailable',
      prsMerged: activity.prsMerged90?.issueCount ?? legacyActivity.prsMerged?.issueCount ?? 'unavailable',
      issuesOpened: activity.issuesOpened90?.issueCount ?? 'unavailable',
      issuesClosed: activity.issuesClosed90?.issueCount ?? legacyActivity.issuesClosed?.issueCount ?? 'unavailable',
      releases: countReleaseDatesWithinWindow(releaseDates, now, 90),
      staleIssueRatio: computeStaleIssueRatio(activity.staleIssues90?.issueCount, openIssueCount),
      medianTimeToMergeHours: computeMedianDurationHoursWithinWindow(mergedPullRequestNodes, 'mergedAt', now, 90),
      medianTimeToCloseHours: computeMedianDurationHoursWithinWindow(closedIssueNodes, 'closedAt', now, 90),
    },
    180: {
      commits: commitCountsByWindow[180],
      prsOpened: activity.prsOpened180?.issueCount ?? 'unavailable',
      prsMerged: activity.prsMerged180?.issueCount ?? 'unavailable',
      issuesOpened: activity.issuesOpened180?.issueCount ?? 'unavailable',
      issuesClosed: activity.issuesClosed180?.issueCount ?? 'unavailable',
      releases: countReleaseDatesWithinWindow(releaseDates, now, 180),
      staleIssueRatio: computeStaleIssueRatio(activity.staleIssues180?.issueCount, openIssueCount),
      medianTimeToMergeHours: computeMedianDurationHoursWithinWindow(mergedPullRequestNodes, 'mergedAt', now, 180),
      medianTimeToCloseHours: computeMedianDurationHoursWithinWindow(closedIssueNodes, 'closedAt', now, 180),
    },
    365: {
      commits: commitCountsByWindow[365],
      prsOpened: activity.prsOpened365?.issueCount ?? 'unavailable',
      prsMerged: activity.prsMerged365?.issueCount ?? 'unavailable',
      issuesOpened: activity.issuesOpened365?.issueCount ?? 'unavailable',
      issuesClosed: activity.issuesClosed365?.issueCount ?? 'unavailable',
      releases: countReleaseDatesWithinWindow(releaseDates, now, 365),
      staleIssueRatio: computeStaleIssueRatio(activity.staleIssues365?.issueCount, openIssueCount),
      medianTimeToMergeHours: computeMedianDurationHoursWithinWindow(mergedPullRequestNodes, 'mergedAt', now, 365),
      medianTimeToCloseHours: computeMedianDurationHoursWithinWindow(closedIssueNodes, 'closedAt', now, 365),
    },
  }
}

function countReleaseDatesWithinWindow(releaseDates: string[], now: Date, windowDays: ActivityWindowDays): number | Unavailable {
  if (releaseDates.length === 0) {
    return 0
  }

  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - windowDays)

  return releaseDates.filter((value) => {
    const date = new Date(value)
    return !Number.isNaN(date.getTime()) && date >= cutoff
  }).length
}

function computeStaleIssueRatio(staleIssueCount: number | undefined, openIssueCount: number | undefined): number | Unavailable {
  if (typeof staleIssueCount !== 'number' || typeof openIssueCount !== 'number' || openIssueCount <= 0) {
    return 'unavailable'
  }

  return staleIssueCount / openIssueCount
}

function computeStaleItemRatio(staleItemCount: number | undefined, openItemCount: number | undefined): number | Unavailable {
  if (typeof staleItemCount !== 'number' || typeof openItemCount !== 'number' || openItemCount <= 0) {
    return 'unavailable'
  }

  return staleItemCount / openItemCount
}

function collectIssueFirstResponseTimestamps(issues: ResponsivenessIssueNode[], windowDays: ActivityWindowDays): string[] | Unavailable {
  const timestamps = filterNodesByStartDate(issues, windowDays)
    .map((issue) => getFirstNonAuthorInteraction(issue.author?.login ?? null, issue.comments.nodes)?.createdAt ?? null)
    .filter((value): value is string => Boolean(value))

  return timestamps.length > 0 ? timestamps : 'unavailable'
}

function collectIssueCloseTimestamps(issues: ResponsivenessIssueNode[], windowDays: ActivityWindowDays): string[] | Unavailable {
  const timestamps = filterNodesByEndDate(issues, 'closedAt', windowDays)
    .map((issue) => issue.closedAt)
    .filter((value): value is string => Boolean(value))
  return timestamps.length > 0 ? timestamps : 'unavailable'
}

function collectPullRequestMergeTimestamps(
  pullRequests: Array<{
    createdAt: string
    mergedAt: string | null
  }>,
  windowDays: ActivityWindowDays,
): string[] | Unavailable {
  const timestamps = filterNodesByEndDate(pullRequests, 'mergedAt', windowDays)
    .map((pullRequest) => pullRequest.mergedAt)
    .filter((value): value is string => Boolean(value))
  return timestamps.length > 0 ? timestamps : 'unavailable'
}

function computeMedianDurationHours<T extends { createdAt: string }>(
  nodes: Array<T & Record<string, string | null>> | undefined,
  endField: string,
): number | Unavailable {
  if (!nodes?.length) {
    return 'unavailable'
  }

  const durations = nodes
    .map((node) => {
      const createdAt = new Date(node.createdAt)
      const endValue = node[endField]
      const endedAt = typeof endValue === 'string' ? new Date(endValue) : null

      if (Number.isNaN(createdAt.getTime()) || !endedAt || Number.isNaN(endedAt.getTime()) || endedAt < createdAt) {
        return null
      }

      return (endedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    })
    .filter((value): value is number => value != null)
    .sort((left, right) => left - right)

  if (durations.length === 0) {
    return 'unavailable'
  }

  const middle = Math.floor(durations.length / 2)
  if (durations.length % 2 === 1) {
    return durations[middle] ?? 'unavailable'
  }

  const lower = durations[middle - 1]
  const upper = durations[middle]
  if (lower == null || upper == null) {
    return 'unavailable'
  }

  return (lower + upper) / 2
}

function computeMedian(values: number[]): number | Unavailable {
  if (values.length === 0) {
    return 'unavailable'
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 'unavailable'
  }

  const lower = sorted[middle - 1]
  const upper = sorted[middle]
  if (lower == null || upper == null) {
    return 'unavailable'
  }

  return (lower + upper) / 2
}

function computePercentile(values: number[], percentile: number): number | Unavailable {
  if (values.length === 0) {
    return 'unavailable'
  }

  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.max(0, Math.ceil(sorted.length * percentile) - 1)
  return sorted[index] ?? 'unavailable'
}

function computeRatio(numerator: number | Unavailable, denominator: number | Unavailable): number | Unavailable {
  if (typeof numerator !== 'number' || typeof denominator !== 'number' || denominator <= 0) {
    return 'unavailable'
  }

  return numerator / denominator
}

function getIssueFirstResponseDurationHours(issue: ResponsivenessIssueNode): number | null {
  return getDurationHours(issue.createdAt, getFirstNonAuthorInteraction(issue.author?.login ?? null, issue.comments.nodes)?.createdAt ?? null)
}

function getPullRequestFirstReviewDurationHours(pullRequest: ResponsivenessPullRequestNode): number | null {
  const firstReview = getFirstNonAuthorInteraction(pullRequest.author?.login ?? null, pullRequest.reviews.nodes)
  return getDurationHours(pullRequest.createdAt, firstReview?.createdAt ?? null)
}

function getResponseSignal(
  authorLogin: string | null,
  interactions: Array<{ createdAt: string; author: SearchActorNode | null }>,
): ResponseSignal | null {
  const firstResponse = getFirstNonAuthorInteraction(authorLogin, interactions)
  if (!firstResponse) {
    return {
      firstResponderKind: null,
      firstHumanResponseAt: null,
    }
  }

  return {
    firstResponderKind: isBotLogin(firstResponse.author?.login ?? null) ? 'bot' : 'human',
    firstHumanResponseAt: isBotLogin(firstResponse.author?.login ?? null) ? null : firstResponse.createdAt,
  }
}

function getFirstNonAuthorInteraction<T extends { createdAt: string; author: SearchActorNode | null }>(
  authorLogin: string | null,
  interactions: T[],
): T | null {
  const createdAtSorted = [...interactions].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  )

  for (const interaction of createdAtSorted) {
    const responderLogin = interaction.author?.login ?? null
    if (!responderLogin || responderLogin === authorLogin) {
      continue
    }

    return interaction
  }

  return null
}

function getDurationHours(start: string, end: string | null): number | null {
  if (!end) {
    return null
  }

  const startedAt = new Date(start)
  const endedAt = new Date(end)

  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime()) || endedAt < startedAt) {
    return null
  }

  return (endedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60)
}

function filterNodesByStartDate<T extends { createdAt: string }>(nodes: T[], windowDays: ActivityWindowDays) {
  const cutoffTime = getWindowCutoffTime(windowDays)

  return nodes.filter((node) => {
    const createdAt = new Date(node.createdAt).getTime()
    return !Number.isNaN(createdAt) && createdAt >= cutoffTime
  })
}

function filterNodesByEndDate<T extends object, K extends keyof T>(
  nodes: T[],
  endField: K,
  windowDays: ActivityWindowDays,
) {
  const cutoffTime = getWindowCutoffTime(windowDays)

  return nodes.filter((node) => {
    const endValue = node[endField]
    if (typeof endValue !== 'string') {
      return false
    }

    const endedAt = new Date(endValue).getTime()
    return !Number.isNaN(endedAt) && endedAt >= cutoffTime
  })
}

function getWindowCutoffTime(windowDays: ActivityWindowDays) {
  return Date.now() - windowDays * 24 * 60 * 60 * 1000
}

function isBotLogin(login: string | null) {
  if (!login) {
    return false
  }

  return login.includes('[bot]') || login.endsWith('-bot')
}

function computeMedianDurationHoursWithinWindow<T extends { createdAt: string }>(
  nodes: Array<T & Record<string, string | null>>,
  endField: string,
  now: Date,
  windowDays: ActivityWindowDays,
): number | Unavailable {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - windowDays)

  const windowNodes = nodes.filter((node) => {
    const endValue = node[endField]
    if (typeof endValue !== 'string') {
      return false
    }

    const endDate = new Date(endValue)
    return !Number.isNaN(endDate.getTime()) && endDate >= cutoff
  })

  return computeMedianDurationHours(windowNodes, endField)
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
  const organizationsByLogin = new Map<string, string[]>()

  for (const login of uniqueLogins) {
    const response = await fetchPublicUserOrganizations(token, login).catch((error) => ({
      data: 'unavailable' as const,
      rateLimit: extractRateLimitFromError(error),
    }))
    rateLimit = response.rateLimit ?? rateLimit

    if (response.data === 'unavailable') {
      organizationsByLogin.set(login, [])
      continue
    }

    organizationsByLogin.set(login, response.data)
  }

  return {
    data: buildExperimentalMetricsByWindow(recentCommitNodes, organizationsByLogin, now),
    rateLimit,
  }
}

// Cap commit history pagination to avoid extremely long analysis times
// for repos like torvalds/linux (50,000+ commits/year). 2,000 commits
// is enough to identify unique contributors and compute accurate ratios.
const MAX_COMMIT_HISTORY_NODES = 2000

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

  while (hasNextPage && cursor && nodes.length < MAX_COMMIT_HISTORY_NODES) {
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
  const earliestContributionByAuthor = buildEarliestContributionByAuthor(recentCommitNodes)

  return Object.fromEntries(
    CONTRIBUTOR_WINDOW_DAYS.map((windowDays) => {
      const windowNodes = filterCommitNodesByWindow(recentCommitNodes, now, windowDays)
      const metrics = buildContributorMetrics(windowNodes, earliestContributionByAuthor, now, windowDays)

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

function buildContributorMetrics(
  recentCommitNodes: CommitNode[],
  earliestContributionByAuthor: Map<string, number> | Unavailable,
  now: Date,
  windowDays: ContributorWindowDays,
): Pick<ContributorWindowMetrics, 'uniqueCommitAuthors' | 'commitCountsByAuthor' | 'repeatContributors' | 'newContributors'> {
  if (recentCommitNodes.length === 0) {
    return {
      uniqueCommitAuthors: 0,
      commitCountsByAuthor: {},
      repeatContributors: 0,
      newContributors: 0,
    }
  }

  const commitCountsByAuthor = new Map<string, number>()

  for (const node of recentCommitNodes) {
    const actorKey = getCommitActorKey(node)

    if (!actorKey) {
      return {
        uniqueCommitAuthors: 'unavailable',
        commitCountsByAuthor: 'unavailable',
        repeatContributors: 'unavailable',
        newContributors: 'unavailable',
      }
    }

    commitCountsByAuthor.set(actorKey, (commitCountsByAuthor.get(actorKey) ?? 0) + 1)
  }

  const repeatContributors = Array.from(commitCountsByAuthor.values()).filter((count) => count > 1).length
  const newContributorCutoff = new Date(now)
  newContributorCutoff.setDate(now.getDate() - windowDays)

  const newContributors =
    earliestContributionByAuthor === 'unavailable'
      ? 'unavailable'
      : Array.from(commitCountsByAuthor.keys()).filter((actorKey) => {
          const firstSeenAt = earliestContributionByAuthor.get(actorKey)
          return typeof firstSeenAt === 'number' && firstSeenAt >= newContributorCutoff.getTime()
        }).length

  return {
    uniqueCommitAuthors: commitCountsByAuthor.size,
    commitCountsByAuthor: Object.fromEntries(commitCountsByAuthor.entries()),
    repeatContributors,
    newContributors,
  }
}

function createUnavailableContributorWindowMetrics(): Record<ContributorWindowDays, ContributorWindowMetrics> {
  return Object.fromEntries(
    CONTRIBUTOR_WINDOW_DAYS.map((windowDays) => [
      windowDays,
      {
        uniqueCommitAuthors: 'unavailable',
        commitCountsByAuthor: 'unavailable',
        repeatContributors: 'unavailable',
        newContributors: 'unavailable',
        commitCountsByExperimentalOrg: 'unavailable',
        experimentalAttributedAuthors: 'unavailable',
        experimentalUnattributedAuthors: 'unavailable',
      },
    ]),
  ) as Record<ContributorWindowDays, ContributorWindowMetrics>
}

function buildExperimentalMetricsByWindow(
  recentCommitNodes: CommitNode[],
  organizationsByLogin: Map<string, string[]>,
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
            repeatContributors: 'unavailable',
            newContributors: 'unavailable',
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

        const orgs = organizationsByLogin.get(login) ?? []
        if (orgs.length === 0) {
          unattributedAuthors.add(actorKey)
          continue
        }

        attributedAuthors.add(actorKey)
        // Attribute commit to all public organizations the contributor belongs to
        for (const org of orgs) {
          commitCountsByExperimentalOrg.set(org, (commitCountsByExperimentalOrg.get(org) ?? 0) + 1)
        }
      }

      // Include unaffiliated commits in the org map for transparent reporting
      if (unattributedAuthors.size > 0 && sawResolvableAuthor) {
        let unaffiliatedCommits = 0
        for (const node of windowNodes) {
          const actorKey = getCommitActorKey(node)
          if (actorKey && unattributedAuthors.has(actorKey)) {
            unaffiliatedCommits++
          }
        }
        if (unaffiliatedCommits > 0) {
          commitCountsByExperimentalOrg.set('Unaffiliated', unaffiliatedCommits)
        }
      }

      return [
        windowDays,
        {
          uniqueCommitAuthors: 'unavailable',
          commitCountsByAuthor: 'unavailable',
          repeatContributors: 'unavailable',
          newContributors: 'unavailable',
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

function buildEarliestContributionByAuthor(recentCommitNodes: CommitNode[]): Map<string, number> | Unavailable {
  if (recentCommitNodes.length === 0) {
    return 'unavailable'
  }

  const earliestContributionByAuthor = new Map<string, number>()

  for (const node of recentCommitNodes) {
    const actorKey = getCommitActorKey(node)
    const authoredAt = Date.parse(node.authoredDate)

    if (!actorKey || Number.isNaN(authoredAt)) {
      return 'unavailable'
    }

    const currentEarliest = earliestContributionByAuthor.get(actorKey)
    if (currentEarliest == null || authoredAt < currentEarliest) {
      earliestContributionByAuthor.set(actorKey, authoredAt)
    }
  }

  return earliestContributionByAuthor
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

function buildUnavailableActivityCounts(): RepoActivityCountsResponse {
  const unavailable = { issueCount: 0 }
  return {
    prsOpened30: unavailable, prsOpened60: unavailable, prsOpened90: unavailable, prsOpened180: unavailable, prsOpened365: unavailable,
    prsMerged30: unavailable, prsMerged60: unavailable, prsMerged90: unavailable, prsMerged180: unavailable, prsMerged365: unavailable,
    issuesOpened30: unavailable, issuesOpened60: unavailable, issuesOpened90: unavailable, issuesOpened180: unavailable, issuesOpened365: unavailable,
    issuesClosed30: unavailable, issuesClosed60: unavailable, issuesClosed90: unavailable, issuesClosed180: unavailable, issuesClosed365: unavailable,
    staleIssues30: unavailable, staleIssues60: unavailable, staleIssues90: unavailable, staleIssues180: unavailable, staleIssues365: unavailable,
    recentMergedPullRequests: { nodes: [] },
    recentClosedIssues: { nodes: [] },
  }
}

function buildDiagnostic(
  repo: string,
  source: string,
  error: unknown,
  level: AnalysisDiagnostic['level'] = 'warn',
): AnalysisDiagnostic {
  const maybeError = error as Error & { status?: number; retryAfter?: number | Unavailable }

  return {
    level,
    repo,
    source,
    message: maybeError?.message ?? 'Unknown analysis error',
    status: maybeError.status,
    retryAfter: maybeError.retryAfter,
  }
}
