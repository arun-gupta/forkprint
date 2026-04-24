import calibrationData from './calibration-data.json'
import type { Unavailable } from '@/lib/analyzer/analysis-result'

/**
 * Percentile gate below which sub-factor recommendations are emitted. At or
 * above this threshold a sub-factor is considered to be doing fine and the
 * recommendation is suppressed — silent-when-good. See issue #230.
 */
export const RECOMMENDATION_PERCENTILE_GATE = 50

/**
 * Release Health (P2-F09 / #69) shared config — thresholds and weights used by
 * `lib/release-health/*`, `lib/activity/score-config.ts`, and
 * `lib/documentation/score-config.ts`. Per-bracket calibration for the five
 * numeric signals is deferred to #152; these values are tunable there.
 */
export const SEMVER_REGEX =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
export const CALVER_REGEX = /^v?(?:\d{4}[.-]\d{1,2}(?:[.-]\d{1,3})?|\d{2}\.\d{1,2}(?:\.\d{1,3})?)$/
export const RELEASE_NOTES_SUBSTANTIVE_FLOOR = 40
export const STALE_RELEASE_CUTOFF_DAYS = 730
export const COOLING_RELEASE_CUTOFF_DAYS = 365
export const SEMVER_ADOPTION_THRESHOLD = 0.5
/** Sum of these two weights stays at 0.15 — the existing Activity cadence sub-factor allocation. */
export const ACTIVITY_CADENCE_FREQUENCY_WEIGHT = 0.10
export const ACTIVITY_CADENCE_RECENCY_WEIGHT = 0.05
export const DOCUMENTATION_SEMVER_BONUS = 0.03
export const DOCUMENTATION_NOTES_BONUS = 0.02
export const DOCUMENTATION_TAG_PROMOTION_BONUS = 0.02
export const ACTIVITY_LONG_GAP_ALERT_DAYS = 45

/**
 * Composite OSS Health Score bucket weights (constitution §VI).
 * These must sum to 1.0 and are the authoritative values — health-score.ts
 * imports and re-exports them for backward compatibility.
 */
export const WEIGHTS = {
  activity: 0.25,
  responsiveness: 0.25,
  contributors: 0.23,
  documentation: 0.12,
  security: 0.15,
} as const

/**
 * Project Maturity (P2-F11 / #74) — shared config consumed by the analyzer,
 * Activity + Resilience scoring, and the metric-card view-model.
 *
 * All knobs live here so the constitution §VI rule is satisfied — thresholds
 * are not inline in logic or components.
 */
export const MATURITY_CONFIG = {
  /** Min age before stars/year, contributors/year, commits/month are computed. */
  minimumNormalizationAgeDays: 90,
  /** Min age before a growth trajectory label is assigned. */
  minimumTrajectoryAgeDays: 730,
  /** Recent/lifetime ratio ≥ this → 'accelerating'. */
  acceleratingRatio: 1.25,
  /** Recent/lifetime ratio ≤ this → 'declining'. */
  decliningRatio: 0.75,
  /** Activity score renders "Insufficient" below this age. */
  minimumActivityScoringAgeDays: 90,
  /** Resilience score renders "Insufficient" below this age. */
  minimumResilienceScoringAgeDays: 180,
  /** Community brackets split into -young (< N) and -mature (≥ N). */
  ageStratumBoundaryDays: 730,
} as const

export type CommunityTier = 'emerging' | 'growing' | 'established' | 'popular'
export type AgeStratum = 'young' | 'mature'

export type BracketKey =
  | 'solo-tiny'
  | 'solo-small'
  | CommunityTier
  | `${CommunityTier}-${AgeStratum}`

/** Profile override used by the scorecard to route solo repos to solo brackets. */
export type CalibrationProfile = 'community' | 'solo'

export interface PercentileSet {
  p25: number
  p50: number
  p75: number
  p90: number
}

export interface BracketCalibration {
  sampleSize: number
  stars: PercentileSet
  forks: PercentileSet
  watchers: PercentileSet
  forkRate: PercentileSet
  watcherRate: PercentileSet
  prMergeRate: PercentileSet
  issueClosureRate: PercentileSet
  staleIssueRatio: PercentileSet
  stalePrRatio: PercentileSet
  medianTimeToMergeHours: PercentileSet
  medianTimeToCloseHours: PercentileSet
  issueFirstResponseMedianHours: PercentileSet
  issueFirstResponseP90Hours: PercentileSet
  prFirstReviewMedianHours: PercentileSet
  prFirstReviewP90Hours: PercentileSet
  issueResolutionMedianHours: PercentileSet
  issueResolutionP90Hours: PercentileSet
  prMergeMedianHours: PercentileSet
  prMergeP90Hours: PercentileSet
  issueResolutionRate: PercentileSet
  contributorResponseRate: PercentileSet
  humanResponseRatio: PercentileSet
  botResponseRatio: PercentileSet
  prReviewDepth: PercentileSet
  issuesClosedWithoutCommentRatio: PercentileSet
  topContributorShare: PercentileSet
  documentationScore?: PercentileSet
  activeWeeksRatio?: PercentileSet
  commitRegularity?: PercentileSet
  // Project Maturity (P2-F11 / #74). Optional — populated per stratum once
  // calibration re-samples under #152. When absent, the UI cohort caption
  // degrades gracefully (omits the context line).
  starsPerYear?: PercentileSet
  contributorsPerYear?: PercentileSet
  commitsPerMonth?: PercentileSet
}

/**
 * True when a solo bracket has calibration data collected from real solo
 * repos (sampleSize > 0). Placeholder entries (sampleSize: 0) are treated
 * as unavailable so the routing falls back to the community bracket and
 * users aren't shown percentiles against fabricated anchors. See issue #229.
 */
function soloBracketHasData(bracket: 'solo-tiny' | 'solo-small'): boolean {
  const entry = calibrationData.brackets[bracket] as { sampleSize?: number } | undefined
  return !!entry && typeof entry.sampleSize === 'number' && entry.sampleSize > 0
}

export function getBracket(stars: number | Unavailable, profile: CalibrationProfile = 'community'): BracketKey {
  if (profile === 'solo') {
    if (stars === 'unavailable' || stars < 10) {
      if (soloBracketHasData('solo-tiny')) return 'solo-tiny'
    } else if (stars < 100) {
      if (soloBracketHasData('solo-small')) return 'solo-small'
    }
    // Solo repos with ≥ 100 stars, or solo repos whose bracket has not yet
    // been calibrated, fall back to the nearest community bracket.
  }
  if (stars === 'unavailable' || stars < 100) return 'emerging'
  if (stars < 1000) return 'growing'
  if (stars < 10000) return 'established'
  return 'popular'
}

/** Resolves the community tier a given star count maps to, ignoring profile. */
function communityTierForStars(stars: number | Unavailable): CommunityTier {
  if (stars === 'unavailable' || stars < 100) return 'emerging'
  if (stars < 1000) return 'growing'
  if (stars < 10000) return 'established'
  return 'popular'
}

/** True when a stratified community bracket has real calibration data. */
function stratifiedBracketHasData(bracket: BracketKey): boolean {
  const entry = (calibrationData.brackets as Record<string, { sampleSize?: number } | undefined>)[bracket]
  return !!entry && typeof entry.sampleSize === 'number' && entry.sampleSize > 0
}

/**
 * Age-aware bracket routing (P2-F11 / #74). Routes to `-young` / `-mature`
 * stratum when calibration data for that stratum is available; otherwise
 * falls back to the unstratified community bracket. Solo profile bypasses
 * stratification (solo brackets encode the dominant cohort signal already).
 */
export function getMaturityBracket(
  stars: number | Unavailable,
  ageInDays: number | Unavailable,
  profile: CalibrationProfile = 'community',
): BracketKey {
  const soloOrCommunity = getBracket(stars, profile)
  if (soloOrCommunity === 'solo-tiny' || soloOrCommunity === 'solo-small') {
    return soloOrCommunity
  }
  if (ageInDays === 'unavailable') return soloOrCommunity
  const tier = communityTierForStars(stars)
  const stratum: AgeStratum = ageInDays < MATURITY_CONFIG.ageStratumBoundaryDays ? 'young' : 'mature'
  const stratified = `${tier}-${stratum}` as BracketKey
  return stratifiedBracketHasData(stratified) ? stratified : soloOrCommunity
}

export function getCalibration(bracket: BracketKey): BracketCalibration {
  return calibrationData.brackets[bracket] as BracketCalibration
}

export function getCalibrationForStars(
  stars: number | Unavailable,
  profile: CalibrationProfile = 'community',
): BracketCalibration {
  return getCalibration(getBracket(stars, profile))
}

export function getCalibrationMeta() {
  return {
    generated: calibrationData.generated,
    source: calibrationData.source,
    sampleSizes: calibrationData.sampleSizes,
  }
}

const BRACKET_LABELS: Record<BracketKey, string> = {
  'solo-tiny': 'Solo Tiny (< 10 stars)',
  'solo-small': 'Solo Small (10–99 stars)',
  emerging: 'Emerging (10–99 stars)',
  growing: 'Growing (100–999 stars)',
  established: 'Established (1k–10k stars)',
  popular: 'Popular (10k+ stars)',
  'emerging-young': 'Emerging · < 2 yrs',
  'emerging-mature': 'Emerging · ≥ 2 yrs',
  'growing-young': 'Growing · < 2 yrs',
  'growing-mature': 'Growing · ≥ 2 yrs',
  'established-young': 'Established · < 2 yrs',
  'established-mature': 'Established · ≥ 2 yrs',
  'popular-young': 'Popular · < 2 yrs',
  'popular-mature': 'Popular · ≥ 2 yrs',
}

/**
 * Label for an age-aware bracket lookup. Matches `getMaturityBracket` —
 * when the stratum has no data, the unstratified label is returned.
 */
export function getMaturityBracketLabel(
  stars: number | Unavailable,
  ageInDays: number | Unavailable,
  profile: CalibrationProfile = 'community',
): string {
  const bracket = getMaturityBracket(stars, ageInDays, profile)
  if (profile === 'solo' && isSoloFallback(stars, profile)) {
    return `${BRACKET_LABELS[bracket]} — limited solo sample`
  }
  return BRACKET_LABELS[bracket]
}

/**
 * Returns true when the caller requested a solo profile but the repo fell
 * back to a community bracket — either because stars ≥ 100, or because the
 * matching solo bracket has not yet been calibrated (sampleSize = 0). The
 * scorecard uses this to add a "limited solo sample" note next to the label.
 */
export function isSoloFallback(stars: number | Unavailable, profile: CalibrationProfile): boolean {
  if (profile !== 'solo') return false
  if (typeof stars === 'number' && stars >= 100) return true
  if (stars === 'unavailable' || stars < 10) return !soloBracketHasData('solo-tiny')
  return !soloBracketHasData('solo-small')
}

/**
 * Intended bracket for display purposes. In solo mode with stars < 100 this
 * returns the solo bracket regardless of whether real solo calibration data
 * has been collected — the label reflects the user's cohort. The calibration
 * lookup (getCalibrationForStars) may still fall back to community anchors
 * until solo sampling completes; isSoloFallback signals when that's the case.
 */
function intendedBracket(stars: number | Unavailable, profile: CalibrationProfile): BracketKey {
  if (profile === 'solo') {
    if (stars === 'unavailable' || stars < 10) return 'solo-tiny'
    if (stars < 100) return 'solo-small'
  }
  return getBracket(stars, 'community')
}

export function getBracketLabel(
  stars: number | Unavailable,
  profile: CalibrationProfile = 'community',
): string {
  const base = BRACKET_LABELS[intendedBracket(stars, profile)]
  if (isSoloFallback(stars, profile)) {
    return `${base} — limited solo sample`
  }
  return base
}

/**
 * Interpolates a continuous percentile (0–99) from a value and calibration anchors.
 *
 * Linearly interpolates between p25/p50/p75/p90 to estimate where the value
 * falls in the distribution. Values below p25 scale 0–24, above p90 scale 90–99.
 *
 * When `inverted` is true (for metrics where lower is better, like duration or
 * concentration), a value at p25 means "better than 75% of repos" = 75th percentile.
 */
export function interpolatePercentile(value: number, ps: PercentileSet, inverted = false): number {
  if (inverted) {
    // Flip: low value = high percentile. Remap by inverting position.
    // At or below p25 (best) → 75+; at or above p90 (worst) → 10-
    const anchors: [number, number][] = [
      [ps.p90, 10],
      [ps.p75, 25],
      [ps.p50, 50],
      [ps.p25, 75],
    ]

    if (value >= ps.p90) {
      // Worse than p90 → 0–10
      const overshoot = ps.p90 > 0 ? Math.min((value - ps.p90) / ps.p90, 1) : 1
      return Math.round(10 * (1 - overshoot))
    }

    for (let i = 0; i < anchors.length - 1; i++) {
      const [valHigh, pLow] = anchors[i]!
      const [valLow, pHigh] = anchors[i + 1]!
      if (value >= valLow! && value <= valHigh!) {
        const range = valHigh! - valLow!
        const t = range > 0 ? (valHigh! - value) / range : 0.5
        return Math.round(pLow! + t * (pHigh! - pLow!))
      }
    }

    // Below p25 (best) → 75–99
    if (ps.p25 > 0) {
      const t = Math.min(1, (ps.p25 - value) / ps.p25)
      return Math.round(75 + t * 24)
    }
    return 99
  }

  // Normal: higher value = higher percentile
  if (value <= ps.p25) {
    const t = ps.p25 > 0 ? Math.min(1, value / ps.p25) : 0
    return Math.round(t * 24)
  }

  const anchors: [number, number][] = [
    [ps.p25, 25],
    [ps.p50, 50],
    [ps.p75, 75],
    [ps.p90, 90],
  ]

  for (let i = 0; i < anchors.length - 1; i++) {
    const [valLow, pLow] = anchors[i]!
    const [valHigh, pHigh] = anchors[i + 1]!
    if (value >= valLow! && value <= valHigh!) {
      const range = valHigh! - valLow!
      const t = range > 0 ? (value - valLow!) / range : 0.5
      return Math.round(pLow! + t * (pHigh! - pLow!))
    }
  }

  // Above p90 → 90–99
  if (ps.p90 > 0) {
    const overshoot = Math.min((value - ps.p90) / ps.p90, 1)
    return Math.round(90 + overshoot * 9)
  }
  return 99
}

/** Formats a percentile as "47th percentile" with correct ordinal suffix. */
export function formatPercentileLabel(p: number): string {
  const n = Math.round(p)
  const lastTwo = n % 100
  let suffix = 'th'
  if (lastTwo < 11 || lastTwo > 13) {
    switch (n % 10) {
      case 1: suffix = 'st'; break
      case 2: suffix = 'nd'; break
      case 3: suffix = 'rd'; break
    }
  }
  return `${n}${suffix} percentile`
}

/** @deprecated Use formatPercentileLabel instead */
export const formatPercentileOrdinal = formatPercentileLabel

/** Maps a percentile to a ScoreTone for UI coloring. */
export function percentileToTone(p: number): import('@/specs/008-metric-cards/contracts/metric-card-props').ScoreTone {
  if (p >= 75) return 'success'
  if (p >= 40) return 'warning'
  return 'danger'
}
