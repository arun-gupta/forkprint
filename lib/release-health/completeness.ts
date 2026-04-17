import type { AnalysisResult, ReleaseHealthResult, Unavailable } from '@/lib/analyzer/analysis-result'
import {
  COOLING_RELEASE_CUTOFF_DAYS,
  SEMVER_ADOPTION_THRESHOLD,
  STALE_RELEASE_CUTOFF_DAYS,
  percentileToTone,
} from '@/lib/scoring/config-loader'
import type { ScoreTone } from '@/specs/008-metric-cards/contracts/metric-card-props'

/**
 * Release Health completeness readout (P2-F09 / #69).
 *
 * Mirrors `lib/community/completeness.ts`. Counts how many of the five scored
 * release-health signals are present (not merely defined — each has its own
 * threshold below which it is classified as missing). Uses a linear
 * ratio → percentile fallback until per-bracket calibration lands in #152.
 */

export type ReleaseHealthSignalKey =
  | 'release_frequency'
  | 'days_since_last_release'
  | 'semver_compliance'
  | 'release_notes_quality'
  | 'tag_to_release'

export interface ReleaseHealthCompleteness {
  present: ReleaseHealthSignalKey[]
  missing: ReleaseHealthSignalKey[]
  unknown: ReleaseHealthSignalKey[]
  ratio: number | null
  percentile: number | null
  tone: ScoreTone
}

type Presence = boolean | 'unknown'

const NOTES_PRESENT_FLOOR = 0.5
const TAG_PROMOTION_PRESENT_CEILING = 0.3

function classify(rh: ReleaseHealthResult): Record<ReleaseHealthSignalKey, Presence> {
  return {
    release_frequency: classifyFrequency(rh.releaseFrequency, rh.totalReleasesAnalyzed),
    days_since_last_release: classifyRecency(rh.daysSinceLastRelease),
    semver_compliance: classifyRatio(rh.semverComplianceRatio, SEMVER_ADOPTION_THRESHOLD),
    release_notes_quality: classifyRatio(rh.releaseNotesQualityRatio, NOTES_PRESENT_FLOOR),
    tag_to_release: classifyTagPromotion(rh.tagToReleaseRatio),
  }
}

function classifyFrequency(freq: number | Unavailable, totalAnalyzed: number): Presence {
  if (freq === 'unavailable') return totalAnalyzed === 0 ? 'unknown' : false
  return freq >= 1
}

function classifyRecency(days: number | Unavailable): Presence {
  if (days === 'unavailable') return 'unknown'
  if (days >= STALE_RELEASE_CUTOFF_DAYS) return false
  if (days >= COOLING_RELEASE_CUTOFF_DAYS) return false
  return true
}

function classifyRatio(value: number | Unavailable, threshold: number): Presence {
  if (value === 'unavailable') return 'unknown'
  return value >= threshold
}

function classifyTagPromotion(value: number | Unavailable): Presence {
  if (value === 'unavailable') return 'unknown'
  return value <= TAG_PROMOTION_PRESENT_CEILING
}

export function computeReleaseHealthCompleteness(result: AnalysisResult): ReleaseHealthCompleteness {
  const rh = result.releaseHealthResult
  if (!rh || rh === 'unavailable') {
    return { present: [], missing: [], unknown: [], ratio: null, percentile: null, tone: 'neutral' }
  }

  const presence = classify(rh)
  const present: ReleaseHealthSignalKey[] = []
  const missing: ReleaseHealthSignalKey[] = []
  const unknown: ReleaseHealthSignalKey[] = []
  for (const [key, value] of Object.entries(presence) as Array<[ReleaseHealthSignalKey, Presence]>) {
    if (value === true) present.push(key)
    else if (value === false) missing.push(key)
    else unknown.push(key)
  }

  const denominator = present.length + missing.length
  if (denominator === 0) {
    return { present, missing, unknown, ratio: null, percentile: null, tone: 'neutral' }
  }

  const ratio = present.length / denominator
  const percentile = Math.max(0, Math.min(99, Math.round(ratio * 99)))
  return { present, missing, unknown, ratio, percentile, tone: percentileToTone(percentile) }
}
