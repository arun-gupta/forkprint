/**
 * P2-F08 Accessibility & Onboarding — TypeScript contracts
 *
 * These types define the shape of the new signals added to AnalysisResult
 * and the community completeness extension. They are the authoritative
 * interface contract between the analyzer, scoring, UI, and export layers.
 */

import type { Unavailable } from '@/lib/analyzer/analysis-result'

// ─── AnalysisResult additions ────────────────────────────────────────────────

/**
 * Count of open issues carrying any recognised onboarding label.
 * 0 means no such issues exist (not the same as unavailable).
 * 'unavailable' means the API query could not be completed.
 */
export type GoodFirstIssueCount = number | Unavailable

/**
 * True when any primary dev-environment setup file is present:
 * .devcontainer/, .devcontainer.json, docker-compose.yml, docker-compose.yaml
 */
export type DevEnvironmentSetup = boolean | Unavailable

/**
 * True when .gitpod.yml is present at the repository root.
 * Bonus-only: presence adds marginal lift; absence carries no penalty.
 */
export type GitpodPresent = boolean | Unavailable

/**
 * Ratio (0–1) of PRs with authorAssociation === 'FIRST_TIME_CONTRIBUTOR'
 * that were merged, within the 365-day fetch window.
 * 'unavailable' when fewer than 3 qualifying PRs exist in the window.
 */
export type NewContributorPRAcceptanceRate = number | Unavailable

// ─── Community signal key extension ──────────────────────────────────────────

/**
 * New keys added to CommunitySignalKey for community completeness scoring.
 */
export type OnboardingCommunitySignalKey =
  | 'good_first_issues'
  | 'dev_environment_setup'
  | 'new_contributor_acceptance'

// ─── Onboarding tag domain ────────────────────────────────────────────────────

export type OnboardingDomain = 'doc_file' | 'readme_section' | 'contributors_metric'

// ─── Score config thresholds (defined in shared config, not hardcoded) ────────

export interface OnboardingScoreThresholds {
  /** Minimum acceptance rate (0–1) for new_contributor_acceptance → 'present' */
  newContributorAcceptanceFloor: number
  /** Minimum qualifying PR count before acceptance rate is computed (else 'unavailable') */
  newContributorMinSampleSize: number
}

// Default values (overridable via shared config):
// newContributorAcceptanceFloor: 0.5
// newContributorMinSampleSize: 3
