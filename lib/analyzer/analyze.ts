import type {
  AnalysisResult,
  AnalyzeInput,
  AnalyzeResponse,
  RateLimitState,
  RepositoryFetchFailure,
  Unavailable,
} from './analysis-result'
import { queryGitHubGraphQL } from './github-graphql'
import { REPO_ACTIVITY_QUERY, REPO_OVERVIEW_QUERY } from './queries'

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
      } | null
    } | null
  } | null
  prsOpened: { issueCount: number }
  prsMerged: { issueCount: number }
  issuesClosed: { issueCount: number }
}

const UNAVAILABLE_FIELDS: Array<keyof AnalysisResult> = [
  'releases12mo',
  'uniqueCommitAuthors90d',
  'totalContributors',
  'commitCountsByAuthor',
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
      const repoSearch = `${owner}/${name}`

      const activity = await queryGitHubGraphQL<RepoActivityResponse>(input.token, REPO_ACTIVITY_QUERY, {
        owner,
        name,
        since30: since30.toISOString(),
        since90: since90.toISOString(),
        prsOpenedQuery: `repo:${repoSearch} is:pr created:>=${since90.toISOString().slice(0, 10)}`,
        prsMergedQuery: `repo:${repoSearch} is:pr is:merged merged:>=${since90.toISOString().slice(0, 10)}`,
        issuesClosedQuery: `repo:${repoSearch} is:issue closed:>=${since90.toISOString().slice(0, 10)}`,
      })
      latestRateLimit = activity.rateLimit ?? latestRateLimit

      results.push(buildAnalysisResult(repo, overview.data, activity.data))
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
): AnalysisResult {
  const defaultBranchTarget = activity.repository?.defaultBranchRef?.target
  const missingFields = [...UNAVAILABLE_FIELDS]

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
    uniqueCommitAuthors90d: 'unavailable',
    totalContributors: 'unavailable',
    commitCountsByAuthor: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    missingFields,
  }
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
