import type { SecurityResult } from '@/lib/security/analysis-result'

export type Unavailable = 'unavailable'
export const CONTRIBUTOR_WINDOW_DAYS = [30, 60, 90, 180, 365] as const
export type ContributorWindowDays = (typeof CONTRIBUTOR_WINDOW_DAYS)[number]
export const ACTIVITY_WINDOW_DAYS = [30, 60, 90, 180, 365] as const
export type ActivityWindowDays = (typeof ACTIVITY_WINDOW_DAYS)[number]

export interface ContributorWindowMetrics {
  uniqueCommitAuthors: number | Unavailable
  commitCountsByAuthor: Record<string, number> | Unavailable
  repeatContributors: number | Unavailable
  newContributors: number | Unavailable
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
  staleIssueRatio: number | Unavailable
  medianTimeToMergeHours: number | Unavailable
  medianTimeToCloseHours: number | Unavailable
}

export interface ResponsivenessMetrics {
  issueFirstResponseMedianHours: number | Unavailable
  issueFirstResponseP90Hours: number | Unavailable
  prFirstReviewMedianHours: number | Unavailable
  prFirstReviewP90Hours: number | Unavailable
  issueResolutionMedianHours: number | Unavailable
  issueResolutionP90Hours: number | Unavailable
  prMergeMedianHours: number | Unavailable
  prMergeP90Hours: number | Unavailable
  issueResolutionRate: number | Unavailable
  contributorResponseRate: number | Unavailable
  botResponseRatio: number | Unavailable
  humanResponseRatio: number | Unavailable
  staleIssueRatio: number | Unavailable
  stalePrRatio: number | Unavailable
  prReviewDepth: number | Unavailable
  issuesClosedWithoutCommentRatio: number | Unavailable
  openIssueCount: number | Unavailable
  openPullRequestCount: number | Unavailable
}

export interface DocumentationFileCheck {
  name:
    | 'readme'
    | 'license'
    | 'contributing'
    | 'code_of_conduct'
    | 'security'
    | 'changelog'
    | 'issue_templates'
    | 'pull_request_template'
    | 'governance'
  found: boolean
  path: string | null
}

export type LicensePermissivenessTier = 'Permissive' | 'Weak Copyleft' | 'Copyleft'

export interface LicenseDetection {
  spdxId: string | null
  name: string | null
  osiApproved: boolean
  permissivenessTier: LicensePermissivenessTier | null
}

export interface ContributorAgreementSignal {
  signedOffByRatio: number | null
  dcoOrClaBot: boolean
  enforced: boolean
}

export interface LicensingResult {
  license: LicenseDetection
  additionalLicenses: LicenseDetection[]
  contributorAgreement: ContributorAgreementSignal
}

export interface ReadmeSectionCheck {
  name: 'description' | 'installation' | 'usage' | 'contributing' | 'license'
  detected: boolean
}

export interface DocumentationResult {
  fileChecks: DocumentationFileCheck[]
  readmeSections: ReadmeSectionCheck[]
  readmeContent: string | null
}

export type InclusiveNamingCheckType = 'branch' | 'description' | 'topic'

export type InclusiveNamingSeverity =
  | 'Replace immediately'
  | 'Recommended to replace'
  | 'Consider replacing'

export interface InclusiveNamingCheck {
  checkType: InclusiveNamingCheckType
  term: string
  passed: boolean
  tier: 1 | 2 | 3 | null
  severity: InclusiveNamingSeverity | null
  replacements: string[]
  context: string | null
}

export interface InclusiveNamingResult {
  defaultBranchName: string | null
  branchCheck: InclusiveNamingCheck
  metadataChecks: InclusiveNamingCheck[]
}

export interface InclusiveNamingRecommendation {
  bucket: 'documentation'
  category: 'inclusive_naming'
  item: string
  weight: number
  text: string
  tier: 1 | 2 | 3
  severity: InclusiveNamingSeverity
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
  totalContributorsSource?: 'api' | 'commit-history'
  maintainerCount: number | Unavailable
  commitCountsByAuthor: Record<string, number> | Unavailable
  commitCountsByExperimentalOrg: Record<string, number> | Unavailable
  experimentalAttributedAuthors90d: number | Unavailable
  experimentalUnattributedAuthors90d: number | Unavailable
  contributorMetricsByWindow?: Record<ContributorWindowDays, ContributorWindowMetrics>
  activityMetricsByWindow?: Record<ActivityWindowDays, ActivityWindowMetrics>
  responsivenessMetricsByWindow?: Record<ActivityWindowDays, ResponsivenessMetrics>
  responsivenessMetrics?: ResponsivenessMetrics
  staleIssueRatio?: number | Unavailable
  medianTimeToMergeHours?: number | Unavailable
  medianTimeToCloseHours?: number | Unavailable
  issueFirstResponseTimestamps: string[] | Unavailable
  issueCloseTimestamps: string[] | Unavailable
  prMergeTimestamps: string[] | Unavailable
  documentationResult: DocumentationResult | Unavailable
  licensingResult: LicensingResult | Unavailable
  defaultBranchName: string | Unavailable
  topics: string[]
  inclusiveNamingResult: InclusiveNamingResult | Unavailable
  securityResult: SecurityResult | Unavailable
  // Community signals (P2-F05 / #70). Optional — absent on fixtures predating
  // this feature. Set by the analyzer to either the resolved value or
  // 'unavailable' per Constitution §II (no estimation).
  hasIssueTemplates?: boolean | Unavailable
  hasPullRequestTemplate?: boolean | Unavailable
  hasFundingConfig?: boolean | Unavailable
  hasDiscussionsEnabled?: boolean | Unavailable
  discussionsCountWindow?: number | Unavailable
  discussionsWindowDays?: ActivityWindowDays | Unavailable
  // Raw `createdAt` timestamps for recent discussions, paginated to cover
  // the full 365d window (or truncated at a safety cap — see
  // `discussionsRecentTruncated`). Preserved so the Activity-tab Discussions
  // card can recompute counts per selected window without re-running
  // analysis (issue #194). Gated on `hasDiscussionsEnabled === true`;
  // otherwise 'unavailable'.
  discussionsRecentCreatedAt?: string[] | Unavailable
  // True when pagination stopped at the safety cap (MAX_DISCUSSION_PAGES)
  // while still inside the 365d window — counts for large windows should
  // be rendered as e.g. `N+` rather than implying an exact total.
  discussionsRecentTruncated?: boolean
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
