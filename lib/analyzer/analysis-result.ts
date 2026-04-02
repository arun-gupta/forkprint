export type Unavailable = 'unavailable'
export const CONTRIBUTOR_WINDOW_DAYS = [30, 60, 90, 180, 365] as const
export type ContributorWindowDays = (typeof CONTRIBUTOR_WINDOW_DAYS)[number]
export const ACTIVITY_WINDOW_DAYS = [30, 60, 90, 180, 365] as const
export type ActivityWindowDays = (typeof ACTIVITY_WINDOW_DAYS)[number]

export interface ContributorWindowMetrics {
  uniqueCommitAuthors: number | Unavailable
  commitCountsByAuthor: Record<string, number> | Unavailable
  commitCountsByExperimentalOrg: Record<string, number> | Unavailable
  experimentalAttributedAuthors: number | Unavailable
  experimentalUnattributedAuthors: number | Unavailable
}

export interface ActivityWindowMetrics {
  commits: number | Unavailable
  prsOpened: number | Unavailable
  prsMerged: number | Unavailable
  issuesOpened: number | Unavailable
  issuesClosed: number | Unavailable
  releases: number | Unavailable
}

export interface AnalysisResult {
  repo: string
  name: string | Unavailable
  description: string | Unavailable
  createdAt: string | Unavailable
  primaryLanguage: string | Unavailable
  stars: number | Unavailable
  forks: number | Unavailable
  watchers: number | Unavailable
  commits30d: number | Unavailable
  commits90d: number | Unavailable
  releases12mo: number | Unavailable
  prsOpened90d: number | Unavailable
  prsMerged90d: number | Unavailable
  issuesOpen: number | Unavailable
  issuesClosed90d: number | Unavailable
  uniqueCommitAuthors90d: number | Unavailable
  totalContributors: number | Unavailable
  maintainerCount: number | Unavailable
  commitCountsByAuthor: Record<string, number> | Unavailable
  commitCountsByExperimentalOrg: Record<string, number> | Unavailable
  experimentalAttributedAuthors90d: number | Unavailable
  experimentalUnattributedAuthors90d: number | Unavailable
  contributorMetricsByWindow?: Record<ContributorWindowDays, ContributorWindowMetrics>
  activityMetricsByWindow?: Record<ActivityWindowDays, ActivityWindowMetrics>
  issueFirstResponseTimestamps: string[] | Unavailable
  issueCloseTimestamps: string[] | Unavailable
  prMergeTimestamps: string[] | Unavailable
  missingFields: string[]
}

export interface RepositoryFetchFailure {
  repo: string
  reason: string
  code: string
}

export interface AnalysisDiagnostic {
  level: 'warn' | 'error'
  repo: string
  source: string
  message: string
  status?: number
  retryAfter?: number | Unavailable
}

export interface RateLimitState {
  remaining: number | Unavailable
  resetAt: string | Unavailable
  retryAfter: number | Unavailable
}

export interface AnalyzeResponse {
  results: AnalysisResult[]
  failures: RepositoryFetchFailure[]
  rateLimit: RateLimitState | null
  diagnostics?: AnalysisDiagnostic[]
}

export interface AnalyzeInput {
  repos: string[]
  token: string
}
