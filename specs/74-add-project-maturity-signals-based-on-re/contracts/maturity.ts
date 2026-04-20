/**
 * Contracts for P2-F11 Project Maturity Signals.
 *
 * These type definitions are the behavioral contract the implementation must
 * satisfy. The runtime code in `lib/analyzer/analysis-result.ts`,
 * `lib/scoring/config-loader.ts`, and `lib/metric-cards/view-model.ts` imports
 * — or redeclares identically — these shapes.
 *
 * Do not import this file from production code. It exists to make reviewer
 * expectations inspectable and to keep the spec's entities in one typed place.
 */

export type Unavailable = 'unavailable'
export type TooNew = 'too-new'

/** A value that may be missing or gated by the minimum-age normalization guard. */
export type MaybeNormalized = number | TooNew | Unavailable

/** A value that may only be missing (no age-gate applies). */
export type MaybeAvailable = number | Unavailable

/** Qualitative classification comparing recent vs. lifetime commit cadence. */
export type GrowthTrajectory = 'accelerating' | 'stable' | 'declining' | Unavailable

/** Fields added to AnalysisResult for the maturity feature. */
export interface MaturitySignals {
  ageInDays: MaybeAvailable
  lifetimeCommits: MaybeAvailable
  starsPerYear: MaybeNormalized
  contributorsPerYear: MaybeNormalized
  commitsPerMonthLifetime: MaybeNormalized
  commitsPerMonthRecent12mo: MaybeAvailable
  growthTrajectory: GrowthTrajectory
}

/** Config knobs read by analyzer + scoring + UI. Defined once in config-loader. */
export interface MaturityConfig {
  readonly minimumNormalizationAgeDays: number
  readonly minimumTrajectoryAgeDays: number
  readonly acceleratingRatio: number
  readonly decliningRatio: number
  readonly minimumActivityScoringAgeDays: number
  readonly minimumResilienceScoringAgeDays: number
  readonly ageStratumBoundaryDays: number
}

/** Existing community tier keys (unstratified fallbacks). */
export type CommunityTier = 'emerging' | 'growing' | 'established' | 'popular'

/** Age stratum applied to community tiers. */
export type AgeStratum = 'young' | 'mature'

/** Extended bracket key union (solo keys unchanged, community tiers stratified). */
export type BracketKey =
  | 'solo-tiny'
  | 'solo-small'
  | CommunityTier
  | `${CommunityTier}-${AgeStratum}`

/** Bracket routing input. Stars and profile existed; age is new. */
export interface BracketRoutingInput {
  stars: number | Unavailable
  ageInDays: number | Unavailable
  profile: 'community' | 'solo'
}

/** PercentileSet shape reused verbatim from existing calibration schema. */
export interface PercentileSet {
  p25: number
  p50: number
  p75: number
  p90: number
}

/** Calibration additions to the existing BracketCalibration interface. */
export interface MaturityCalibrationAdditions {
  starsPerYear?: PercentileSet
  contributorsPerYear?: PercentileSet
  commitsPerMonth?: PercentileSet
}

/**
 * Renderer-facing caption shape. The component receives one of these per
 * age-normalized metric and chooses between numeric, "Too new to normalize",
 * or "Unavailable" text based on `value`.
 */
export interface MaturityCaption {
  readonly kind: 'stars-per-year' | 'contributors-per-year' | 'commits-per-month'
  readonly value: MaybeNormalized
  /** Optional cohort context line — null when calibration stratum is missing. */
  readonly cohortContext: string | null
}

/** Trajectory indicator props. */
export interface TrajectoryIndicatorProps {
  readonly trajectory: GrowthTrajectory
  readonly recentCommitsPerMonth: MaybeAvailable
  readonly lifetimeCommitsPerMonth: MaybeAvailable
  readonly ratio: number | null
  /** Whether the minimum-age gate is the reason for unavailable. */
  readonly ageGated: boolean
}
