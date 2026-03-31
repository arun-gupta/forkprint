export type Unavailable = 'unavailable'

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
  commitCountsByAuthor: Record<string, number> | Unavailable
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

export interface RateLimitState {
  remaining: number | Unavailable
  resetAt: string | Unavailable
  retryAfter: number | Unavailable
}

export interface AnalyzeResponse {
  results: AnalysisResult[]
  failures: RepositoryFetchFailure[]
  rateLimit: RateLimitState | null
}

export interface AnalyzeInput {
  repos: string[]
  token: string
}
