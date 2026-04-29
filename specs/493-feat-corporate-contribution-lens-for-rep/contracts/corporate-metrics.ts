/**
 * Public contracts for the corporate contribution lens (issue #493).
 *
 * These interfaces are the stable boundary between:
 *   - lib/corporate/compute-corporate-metrics.ts  (pure computation)
 *   - components/contributors/CorporateContributionPanel.tsx  (UI)
 *
 * MUST NOT import from react, next/*, or any component.
 */

import type { ContributorWindowDays } from '@/lib/analyzer/analysis-result'

/** Derived signals from a single company name input. */
export interface CorporateCompanyInput {
  /** Raw value the user typed, e.g. "microsoft" or "microsoft.com" */
  companyName: string
  /** Lowercased GitHub org handle (TLD stripped), e.g. "microsoft" */
  orgHandle: string
  /** Lowercased email domain, e.g. "microsoft.com" */
  emailDomain: string
}

/** Corporate contribution metrics for one analyzed repository. */
export interface CorporateRepoMetrics {
  repo: string
  /**
   * Commits attributed to the company in the active window via either signal.
   * 'unavailable' only when org-membership data could not be collected and no
   * email-based actors were present (both signals entirely missing).
   */
  corporateCommits: number | 'unavailable'
  /** Unique committer identities attributed to the company in the active window. */
  corporateAuthors: number | 'unavailable'
  /**
   * corporateCommits / totalCommits × 100, rounded to one decimal place.
   * 'unavailable' when totalCommits is unavailable.
   */
  corporatePct: number | 'unavailable'
}

/** Full result of the corporate lens computation for a set of repos. */
export interface CorporateLensResult {
  company: CorporateCompanyInput
  windowDays: ContributorWindowDays
  perRepo: CorporateRepoMetrics[]
  summary: {
    /** Sum of per-repo corporate commits (only repos with available data). */
    totalCorporateCommits: number
    /** Unique committer identities de-duplicated across all repos. */
    totalCorporateAuthors: number
    /**
     * totalCorporateCommits / totalCommitsAcrossRepos × 100.
     * 'unavailable' when no repo has available total-commit data.
     */
    overallCorporatePct: number | 'unavailable'
  }
}

/** Props for the CorporateContributionPanel UI component. */
export interface CorporateContributionPanelProps {
  results: import('@/lib/analyzer/analysis-result').AnalysisResult[]
  windowDays: ContributorWindowDays
}
