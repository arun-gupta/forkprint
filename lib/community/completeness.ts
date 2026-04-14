import type { AnalysisResult, Unavailable } from '@/lib/analyzer/analysis-result'
import type { ScoreTone } from '@/specs/008-metric-cards/contracts/metric-card-props'
import { percentileToTone } from '@/lib/scoring/config-loader'

/**
 * Community completeness readout (P2-F05 / #70).
 *
 * This is a **derived summary**, not a composite-weighted bucket. It counts
 * how many of the seven community signals are present, expresses the ratio
 * as a percentile against the peer bracket, and reports the tone. It does
 * not feed the composite OSS Health Score — that is guarded by
 * `lib/scoring/health-score.test.ts`.
 *
 * Equal weighting across all seven signals per research.md Q3. Signals in
 * 'unknown' state (API access denied, pre-feature fixtures) are excluded
 * from both numerator and denominator — FR-016.
 */

export type CommunitySignalKey =
  | 'code_of_conduct'
  | 'issue_templates'
  | 'pull_request_template'
  | 'codeowners'
  | 'governance'
  | 'funding'
  | 'discussions_enabled'

export interface CommunityCompleteness {
  present: CommunitySignalKey[]
  missing: CommunitySignalKey[]
  unknown: CommunitySignalKey[]
  /** present.length / (present.length + missing.length); null when denominator is zero. */
  ratio: number | null
  /** Percentile rank against peers; null when ratio is null. */
  percentile: number | null
  tone: ScoreTone
}

type Presence = boolean | 'unknown'

/**
 * Derives a per-signal presence triple from an AnalysisResult.
 */
function extractSignalPresence(result: AnalysisResult): Record<CommunitySignalKey, Presence> {
  const fromDocFile = (name: string): Presence => {
    if (result.documentationResult === 'unavailable') return 'unknown'
    const check = result.documentationResult.fileChecks.find((c) => c.name === name)
    return check ? check.found : 'unknown'
  }

  return {
    code_of_conduct: fromDocFile('code_of_conduct'),
    issue_templates: booleanOrUnknown(result.hasIssueTemplates),
    pull_request_template: booleanOrUnknown(result.hasPullRequestTemplate),
    // CODEOWNERS presence is inferred from maintainerCount — a positive count
    // means a public maintainer file was parsed (CODEOWNERS / MAINTAINERS /
    // OWNERS / GOVERNANCE.md). If the count is unavailable we can't tell.
    codeowners: maintainerCountPresence(result.maintainerCount),
    // GOVERNANCE.md file is not currently captured in fileChecks; mark unknown
    // for now. When a dedicated field is added this can return present/missing.
    governance: 'unknown',
    funding: booleanOrUnknown(result.hasFundingConfig),
    discussions_enabled: booleanOrUnknown(result.hasDiscussionsEnabled),
  }
}

function booleanOrUnknown(value: boolean | Unavailable | undefined): Presence {
  if (value === true) return true
  if (value === false) return false
  return 'unknown'
}

function maintainerCountPresence(count: number | Unavailable): Presence {
  if (count === 'unavailable') return 'unknown'
  return count > 0
}

/**
 * Compute the community completeness readout.
 */
export function computeCommunityCompleteness(result: AnalysisResult): CommunityCompleteness {
  const presence = extractSignalPresence(result)
  const present: CommunitySignalKey[] = []
  const missing: CommunitySignalKey[] = []
  const unknown: CommunitySignalKey[] = []

  for (const [key, value] of Object.entries(presence) as Array<[CommunitySignalKey, Presence]>) {
    if (value === true) present.push(key)
    else if (value === false) missing.push(key)
    else unknown.push(key)
  }

  const denominator = present.length + missing.length
  if (denominator === 0) {
    return { present, missing, unknown, ratio: null, percentile: null, tone: 'neutral' }
  }

  const ratio = present.length / denominator
  // Without per-bracket calibration for community-completeness ratios yet
  // (tracked in #152), map ratio → percentile linearly. Good enough for a
  // derived readout — the real host-bucket scoring happens in US2.
  const percentile = Math.max(0, Math.min(99, Math.round(ratio * 99)))

  return {
    present,
    missing,
    unknown,
    ratio,
    percentile,
    tone: percentileToTone(percentile),
  }
}
