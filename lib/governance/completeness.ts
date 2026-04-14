import type { AnalysisResult, Unavailable } from '@/lib/analyzer/analysis-result'
import type { ScoreTone } from '@/specs/008-metric-cards/contracts/metric-card-props'
import { percentileToTone } from '@/lib/scoring/config-loader'

/**
 * Governance completeness readout (#191).
 *
 * Cross-cutting summary — counts how many of the eight governance signals
 * are present. Equal weighting. Unknowns excluded from numerator and
 * denominator (same convention as the Community lens). Does not feed the
 * composite OSS Health Score.
 */

export type GovernanceSignalKey =
  | 'license'
  | 'contributing'
  | 'code_of_conduct'
  | 'security'
  | 'changelog'
  | 'branch_protection'
  | 'code_review'
  | 'maintainers'

export interface GovernanceCompleteness {
  present: GovernanceSignalKey[]
  missing: GovernanceSignalKey[]
  unknown: GovernanceSignalKey[]
  ratio: number | null
  percentile: number | null
  tone: ScoreTone
}

type Presence = boolean | 'unknown'

// Scorecard check pass threshold — matches the SecurityView UI convention
// (score >= 7 = green). score === -1 means "indeterminate" → unknown.
const SCORECARD_PASS_THRESHOLD = 7

function extractSignalPresence(result: AnalysisResult): Record<GovernanceSignalKey, Presence> {
  const fromDocFile = (name: string): Presence => {
    if (result.documentationResult === 'unavailable') return 'unknown'
    const check = result.documentationResult.fileChecks.find((c) => c.name === name)
    return check ? check.found : 'unknown'
  }

  const branchProtection: Presence = (() => {
    if (result.securityResult === 'unavailable') return 'unknown'
    const bp = result.securityResult.directChecks.find((c) => c.name === 'branch_protection')
    if (!bp || bp.detected === 'unavailable') return 'unknown'
    return bp.detected
  })()

  const codeReview: Presence = (() => {
    if (result.securityResult === 'unavailable') return 'unknown'
    if (result.securityResult.scorecard === 'unavailable') return 'unknown'
    const check = result.securityResult.scorecard.checks.find((c) => c.name === 'Code-Review')
    if (!check || check.score === -1) return 'unknown'
    return check.score >= SCORECARD_PASS_THRESHOLD
  })()

  return {
    license: fromDocFile('license'),
    contributing: fromDocFile('contributing'),
    code_of_conduct: fromDocFile('code_of_conduct'),
    security: fromDocFile('security'),
    changelog: fromDocFile('changelog'),
    branch_protection: branchProtection,
    code_review: codeReview,
    maintainers: maintainerCountPresence(result.maintainerCount),
  }
}

function maintainerCountPresence(count: number | Unavailable): Presence {
  if (count === 'unavailable') return 'unknown'
  return count > 0
}

export function computeGovernanceCompleteness(result: AnalysisResult): GovernanceCompleteness {
  const presence = extractSignalPresence(result)
  const present: GovernanceSignalKey[] = []
  const missing: GovernanceSignalKey[] = []
  const unknown: GovernanceSignalKey[] = []

  for (const [key, value] of Object.entries(presence) as Array<[GovernanceSignalKey, Presence]>) {
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

  return {
    present,
    missing,
    unknown,
    ratio,
    percentile,
    tone: percentileToTone(percentile),
  }
}
