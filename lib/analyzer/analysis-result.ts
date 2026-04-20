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
  // Typed token list backing the count. Kind distinguishes individual
  // users from GitHub team handles (`@org/team`). Optional — older
  // fixtures predate this field.
  maintainerTokens?: Array<{ token: string; kind: 'user' | 'team' }> | Unavailable
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
  // Release Health signals (P2-F09 / #69). Optional — absent on fixtures
  // predating this feature. Set by the analyzer to either the resolved object
  // or 'unavailable' per Constitution §II (no estimation). Per-field
  // 'unavailable' is used for individual signals that cannot be computed.
  releaseHealthResult?: ReleaseHealthResult | Unavailable
  // Project Maturity signals (P2-F11 / #74). Optional — absent on fixtures
  // predating this feature. `createdAt` is the sole verified input for
  // `ageInDays`; `lifetimeCommits` is the default branch's
  // `history(first: 0).totalCount`. Normalized fields degrade to 'too-new'
  // when age is below the normalization threshold, and 'unavailable' when
  // any upstream input is missing (constitution §II).
  ageInDays?: number | Unavailable
  lifetimeCommits?: number | Unavailable
  starsPerYear?: number | 'too-new' | Unavailable
  contributorsPerYear?: number | 'too-new' | Unavailable
  commitsPerMonthLifetime?: number | 'too-new' | Unavailable
  commitsPerMonthRecent12mo?: number | Unavailable
  growthTrajectory?: 'accelerating' | 'stable' | 'declining' | Unavailable
  missingFields: string[]
}

export type VersioningScheme = 'semver' | 'calver' | 'unrecognized'

export interface ReleaseHealthResult {
  /** Count of releases analyzed (bounded at 100 by the GraphQL query). */
  totalReleasesAnalyzed: number
  /** Tag count from refs(refPrefix: "refs/tags/"). 'unavailable' when the refs query is denied. */
  totalTags: number | Unavailable
  /** Releases per year over the last 12 months. 'unavailable' when fewer than 2 releases exist. */
  releaseFrequency: number | Unavailable
  /** Days since the most recent release (publishedAt falling back to createdAt). */
  daysSinceLastRelease: number | Unavailable
  /** Share of the most recent 100 releases matching SEMVER_REGEX [0, 1]. */
  semverComplianceRatio: number | Unavailable
  /** Share of releases whose body length clears RELEASE_NOTES_SUBSTANTIVE_FLOOR [0, 1]. */
  releaseNotesQualityRatio: number | Unavailable
  /** Share of tags that never became a release: max(0, totalTags - totalReleases) / max(1, totalTags). */
  tagToReleaseRatio: number | Unavailable
  /** Share of releases with isPrerelease === true. Informational — never scored. */
  preReleaseRatio: number | Unavailable
  /** Dominant versioning scheme. Drives semver vs. CalVer vs. unrecognized recommendation routing. */
  versioningScheme: VersioningScheme | Unavailable
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
  limit: number | Unavailable
  remaining: number | Unavailable
  resetAt: string | Unavailable
  retryAfter: number | Unavailable
}

/** Returns true when remaining calls are at or below 25% of the total limit. */
export function isRateLimitLow(rateLimit: RateLimitState): boolean {
  if (typeof rateLimit.limit !== 'number' || typeof rateLimit.remaining !== 'number') {
    return false
  }
  return rateLimit.remaining <= rateLimit.limit * 0.25
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
