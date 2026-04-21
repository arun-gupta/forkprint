import type { AnalysisResult, Unavailable } from '@/lib/analyzer/analysis-result'
import type { ScoreTone } from '@/specs/008-metric-cards/contracts/metric-card-props'
import { percentileToTone } from '@/lib/scoring/config-loader'
import { newContributorAcceptanceFloor } from './score-config'

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
  | 'good_first_issues'
  | 'dev_environment_setup'
  | 'new_contributor_acceptance'

export interface CommunityCompleteness {
  present: Array<CommunitySignalKey | 'gitpod_bonus'>
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
    governance: fromDocFile('governance'),
    funding: booleanOrUnknown(result.hasFundingConfig),
    discussions_enabled: booleanOrUnknown(result.hasDiscussionsEnabled),
    good_first_issues: goodFirstIssuesPresence(result.goodFirstIssueCount),
    dev_environment_setup: booleanOrUnknown(result.devEnvironmentSetup),
    new_contributor_acceptance: acceptanceRatePresence(result.newContributorPRAcceptanceRate),
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

function goodFirstIssuesPresence(count: number | Unavailable | undefined): Presence {
  if (count === undefined || count === 'unavailable') return 'unknown'
  return count > 0
}

function acceptanceRatePresence(rate: number | Unavailable | undefined): Presence {
  if (rate === undefined || rate === 'unavailable') return 'unknown'
  return rate >= newContributorAcceptanceFloor
}

/**
 * Compute the community completeness readout.
 */
export function computeCommunityCompleteness(result: AnalysisResult): CommunityCompleteness {
  const presence = extractSignalPresence(result)
  const present: Array<CommunitySignalKey | 'gitpod_bonus'> = []
  const missing: CommunitySignalKey[] = []
  const unknown: CommunitySignalKey[] = []

  for (const [key, value] of Object.entries(presence) as Array<[CommunitySignalKey, Presence]>) {
    if (value === true) present.push(key)
    else if (value === false) missing.push(key)
    else unknown.push(key)
  }

  // Gitpod bonus: presence adds marginal lift without growing the denominator.
  if (result.gitpodPresent === true) {
    present.push('gitpod_bonus')
  }

  const denominator = present.filter((k) => k !== 'gitpod_bonus').length + missing.length
  if (denominator === 0) {
    return { present, missing, unknown, ratio: null, percentile: null, tone: 'neutral' }
  }

  // Gitpod bonus contributes to numerator but not denominator (bonus lift).
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
