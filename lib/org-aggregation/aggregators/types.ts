/**
 * Aggregator function signatures and per-panel value types.
 *
 * Source of truth: specs/231-org-aggregation/contracts/aggregator-contracts.ts
 * Keep in sync.
 *
 * MUST NOT import from react, next/*, or components/*.
 */

import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel, FlagshipMarker } from '../types'

// --------------------------------------------------------------------
// Per-panel value types
// --------------------------------------------------------------------

export const CONTRIBUTOR_DIVERSITY_WINDOWS = [30, 60, 90, 180, 365] as const
export type ContributorDiversityWindow = (typeof CONTRIBUTOR_DIVERSITY_WINDOWS)[number]

export type ContributorDiversityWindowValue = {
  topTwentyPercentShare: number | null
  elephantFactor: number | null
  uniqueAuthorsAcrossOrg: number | null
  /**
   * Org-level composition derived from the windowed `commitCountsByAuthor`
   * union. Total reconciles with `uniqueAuthorsAcrossOrg` by construction:
   * repeat + oneTime === uniqueAuthorsAcrossOrg.
   *
   * No "inactive" category at org level — per-repo `totalContributors`
   * (all-time, not deduped across repos) can't be summed into a meaningful
   * project-wide denominator, so we don't try.
   */
  composition: {
    repeatContributors: number | null
    oneTimeContributors: number | null
    total: number | null
  }
  contributingReposCount: number
}

export type ContributorDiversityValue = {
  defaultWindow: ContributorDiversityWindow
  byWindow: Record<ContributorDiversityWindow, ContributorDiversityWindowValue>
}

export type MaintainerToken = {
  token: string
  kind: 'user' | 'team'
}

export type MaintainersValue = {
  projectWide: { token: string; kind: 'user' | 'team'; reposListed: string[] }[]
  perRepo: { repo: string; tokens: MaintainerToken[] }[]
}

export type OrgAffiliationsValue = {
  perOrg: { org: string; commits: number }[]
  attributedAuthorCount: number
  unattributedAuthorCount: number
}

export type ReleaseCadenceValue = {
  totalReleases12mo: number
  perFlagship: { repo: string; releases12mo: number }[]
}

export type SecurityRollupValue = {
  perRepo: { repo: string; score: number | 'unavailable' }[]
  worstScore: number | null
  directChecks: {
    securityPolicy: { present: number; total: number }
    dependabot: { present: number; total: number }
    ciCd: { present: number; total: number }
    branchProtection: { present: number; total: number }
  } | null
}

export type GovernanceValue = {
  orgLevel: { repo: string; present: boolean } | null
  perRepo: { repo: string; present: boolean }[]
}

export type AdoptersValue = {
  flagshipUsed: string | null
  entries: string[]
}

export type ProjectFootprintValue = {
  totalStars: number
  totalForks: number
  totalWatchers: number
  totalContributors: number
}

export type ActivityRollupValue = {
  totalCommits12mo: number
  totalPrsMerged12mo: number
  totalIssuesClosed12mo: number
  mostActiveRepo: { repo: string; commits: number } | null
  leastActiveRepo: { repo: string; commits: number } | null
}

export type ResponsivenessRollupValue = {
  weightedMedianFirstResponseHours: number | null
  weightedMedianPrMergeHours: number | null
}

export type LicenseConsistencyValue = {
  perLicense: { spdxId: string; count: number; osiApproved: boolean }[]
  perRepo: { repo: string; spdxId: string; osiApproved: boolean }[]
  nonOsiCount: number
}

export type InclusiveNamingRollupValue = {
  tier1: number
  tier2: number
  tier3: number
  reposWithAnyViolation: number
}

export type DocumentationCoverageValue = {
  perCheck: { name: string; presentInPercent: number; presentReposCount: number }[]
}

export type LanguagesValue = {
  perLanguage: { language: string; repoCount: number }[]
}

export type StaleWorkValue = {
  totalOpenIssues: number
  totalOpenPullRequests: number
  weightedStaleIssueRatio: number | null
}

export type BusFactorValue = {
  highConcentrationRepos: { repo: string; topAuthorShare: number }[]
  threshold: number
}

export type RepoAgeValue = {
  newest: { repo: string; createdAt: Date } | null
  oldest: { repo: string; createdAt: Date } | null
}

export type InactiveReposValue = {
  windowMonths: number
  repos: { repo: string; lastCommitAt: Date | null }[]
}

// Org-level recommendations (issue #359).
// Catalog-derived identity for each aggregated recommendation, grouped by
// CHAOSS dimension. Five-bucket union mirrors the per-repo Recommendations
// view taxonomy (components/recommendations/RecommendationsView.tsx).

export type OrgRecommendationBucket =
  | 'Activity'
  | 'Responsiveness'
  | 'Contributors'
  | 'Documentation'
  | 'Security'

// Render order used by OrgRecommendationsPanel. The aggregator sorts flat
// items by this bucket order first, then affectedRepoCount desc, then id asc.
export const ORG_RECOMMENDATION_BUCKET_ORDER: readonly OrgRecommendationBucket[] = [
  'Activity',
  'Responsiveness',
  'Contributors',
  'Documentation',
  'Security',
]

export interface OrgRecommendationEntry {
  // Catalog ID (e.g. "SEC-3") when the key is cataloged, otherwise
  // `UNCAT:<rawKey>` so uncataloged keys survive with stable identity.
  id: string
  bucket: OrgRecommendationBucket
  title: string
  affectedRepoCount: number
  // `owner/repo` slugs, alphabetical (case-insensitive). Length equals
  // affectedRepoCount by construction.
  affectedRepos: string[]
}

export interface OrgRecommendationsValue {
  // Flat list, pre-sorted [bucket-order asc, affectedRepoCount desc, id asc].
  items: OrgRecommendationEntry[]
  // Count of successfully analyzed repos that contributed to this panel.
  analyzedReposCount: number
}

// --------------------------------------------------------------------
// Aggregator function signatures
// --------------------------------------------------------------------

export interface AggregationContext {
  totalReposInRun: number
  flagshipRepos: FlagshipMarker[]
  inactiveRepoWindowMonths: number
}

export type Aggregator<T> = (
  results: AnalysisResult[],
  context: AggregationContext,
) => AggregatePanel<T>
