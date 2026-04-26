/**
 * Aggregator function signatures.
 *
 * Each aggregator is a pure, deterministic function over `AnalysisResult[]`.
 * No I/O. No reads from React state. No reads from window.* or any global.
 *
 * Each returns an `AggregatePanel<TPanelValue>` so the UI can render uniformly.
 *
 * MUST NOT import from react, next/*, or components/*.
 */

import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel, FlagshipMarker } from './org-aggregation-types'

// --------------------------------------------------------------------
// Per-panel value types
// --------------------------------------------------------------------

export type ContributorDiversityValue = {
  topTwentyPercentShare: number          // 0..1
  elephantFactor: number                 // count of distinct authors needed to cover 50% of commits
  uniqueAuthorsAcrossOrg: number
}

export type MaintainersValue = {
  projectWide: { token: string; kind: 'user' | 'team'; reposListed: string[] }[]
  perRepo: { repo: string; tokens: { token: string; kind: 'user' | 'team' }[] }[]
}

export type OrgAffiliationsValue = {
  // FR-010 — rendered inside Experimental surface with required warning
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
  orgLevel: { repo: string; present: boolean } | null   // .github repo if it exists
  perRepo: { repo: string; present: boolean }[]
}

export type AdoptersValue = {
  flagshipUsed: string | null
  entries: string[]                       // raw lines/sections; full parsing is #210
}

export type ProjectFootprintValue = {
  totalStars: number
  totalForks: number
  totalWatchers: number
  totalContributors: number | 'unavailable'
}

export type ActivityRollupValue = {
  totalCommits12mo: number
  totalPrsMerged12mo: number
  totalIssuesClosed12mo: number
  mostActiveRepo: { repo: string; commits: number } | null
  leastActiveRepo: { repo: string; commits: number } | null
}

export const CONTRIBUTOR_DIVERSITY_WINDOWS = [30, 60, 90, 180, 365] as const
export type ContributorDiversityWindow = (typeof CONTRIBUTOR_DIVERSITY_WINDOWS)[number]

export type ResponsivenessRollupWindowValue = {
  weightedMedianFirstResponseHours: number | null
  weightedMedianPrMergeHours: number | null
  contributingReposCount: number
}

export type ResponsivenessRollupValue = {
  defaultWindow: ContributorDiversityWindow
  byWindow: Record<ContributorDiversityWindow, ResponsivenessRollupWindowValue>
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
  threshold: number                       // 0.5 per FR-027
}

export type RepoAgeValue = {
  newest: { repo: string; createdAt: Date } | null
  oldest: { repo: string; createdAt: Date } | null
}

export type InactiveReposValue = {
  windowMonths: number                    // from config; default 12 per FR-029
  repos: { repo: string; lastCommitAt: Date | null }[]
}

// --------------------------------------------------------------------
// Aggregator function signatures
// --------------------------------------------------------------------

export interface AggregationContext {
  totalReposInRun: number
  flagshipRepos: FlagshipMarker[]
  inactiveRepoWindowMonths: number        // from config
}

export type Aggregator<T> = (
  results: AnalysisResult[],
  context: AggregationContext,
) => AggregatePanel<T>

// One per panel:
export type ContributorDiversityAggregator = Aggregator<ContributorDiversityValue>
export type MaintainersAggregator = Aggregator<MaintainersValue>
export type OrgAffiliationsAggregator = Aggregator<OrgAffiliationsValue>
export type ReleaseCadenceAggregator = Aggregator<ReleaseCadenceValue>
export type SecurityRollupAggregator = Aggregator<SecurityRollupValue>
export type GovernanceAggregator = Aggregator<GovernanceValue>
export type AdoptersAggregator = Aggregator<AdoptersValue>
export type ProjectFootprintAggregator = Aggregator<ProjectFootprintValue>
export type ActivityRollupAggregator = Aggregator<ActivityRollupValue>
export type ResponsivenessRollupAggregator = Aggregator<ResponsivenessRollupValue>
export type LicenseConsistencyAggregator = Aggregator<LicenseConsistencyValue>
export type InclusiveNamingRollupAggregator = Aggregator<InclusiveNamingRollupValue>
export type DocumentationCoverageAggregator = Aggregator<DocumentationCoverageValue>
export type LanguagesAggregator = Aggregator<LanguagesValue>
export type StaleWorkAggregator = Aggregator<StaleWorkValue>
export type BusFactorAggregator = Aggregator<BusFactorValue>
export type RepoAgeAggregator = Aggregator<RepoAgeValue>
export type InactiveReposAggregator = Aggregator<InactiveReposValue>

// --------------------------------------------------------------------
// Test-coverage contract (TDD per constitution §XI)
//
// Every aggregator MUST have unit tests covering AT LEAST:
//   1. Typical case: 3+ repos with realistic, non-unavailable inputs
//   2. All-unavailable case: every repo returns 'unavailable' for the panel's
//      input → status === 'unavailable', value === null
//   3. Mixed case: some repos available, some unavailable → status === 'final',
//      contributingReposCount reflects only the available subset
//   4. Empty case: results === [] → status === 'in-progress', value === null
// --------------------------------------------------------------------
