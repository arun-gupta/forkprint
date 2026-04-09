import calibrationData from './calibration-data.json'
import type { Unavailable } from '@/lib/analyzer/analysis-result'

export type BracketKey = 'emerging' | 'growing' | 'established' | 'popular'

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
}

export function getBracket(stars: number | Unavailable): BracketKey {
  if (stars === 'unavailable' || stars < 100) return 'emerging'
  if (stars < 1000) return 'growing'
  if (stars < 10000) return 'established'
  return 'popular'
}

export function getCalibration(bracket: BracketKey): BracketCalibration {
  return calibrationData.brackets[bracket] as BracketCalibration
}

export function getCalibrationForStars(stars: number | Unavailable): BracketCalibration {
  return getCalibration(getBracket(stars))
}

export function getCalibrationMeta() {
  return {
    generated: calibrationData.generated,
    source: calibrationData.source,
    sampleSizes: calibrationData.sampleSizes,
  }
}

export function getBracketLabel(stars: number | Unavailable): string {
  const bracket = getBracket(stars)
  const labels: Record<BracketKey, string> = {
    emerging: 'Emerging (10–99 stars)',
    growing: 'Growing (100–999 stars)',
    established: 'Established (1k–10k stars)',
    popular: 'Popular (10k+ stars)',
  }
  return labels[bracket]
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

/**
 * Formats a percentile with directional wording:
 *   p >= 50 → "Top X%" (e.g. 72 → "Top 28%")
 *   p < 50  → "Bottom X%" (e.g. 1 → "Bottom 1%")
 */
export function formatPercentileLabel(p: number): string {
  const n = Math.round(p)
  if (n >= 50) return `Top ${100 - n}%`
  return `Bottom ${n}%`
}

/** Maps a percentile to a ScoreTone for UI coloring. */
export function percentileToTone(p: number): import('@/specs/008-metric-cards/contracts/metric-card-props').ScoreTone {
  if (p >= 75) return 'success'
  if (p >= 40) return 'warning'
  return 'danger'
}
