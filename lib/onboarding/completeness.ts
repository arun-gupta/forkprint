import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { ScoreTone } from '@/specs/008-metric-cards/contracts/metric-card-props'
import { newContributorAcceptanceFloor } from '@/lib/community/score-config'
import { percentileToTone } from '@/lib/scoring/config-loader'

export type OnboardingSignalKey =
  | 'good_first_issues'
  | 'dev_environment_setup'
  | 'new_contributor_acceptance'
  | 'issue_templates'
  | 'pull_request_template'
  | 'contributing'
  | 'code_of_conduct'
  | 'readme_installation'
  | 'readme_contributing'

export interface OnboardingCompleteness {
  present: OnboardingSignalKey[]
  missing: OnboardingSignalKey[]
  unknown: OnboardingSignalKey[]
  /** present / (present + missing); null when denominator is zero */
  ratio: number | null
  /** Percentile rank; null when ratio is null */
  percentile: number | null
  tone: ScoreTone
}

type Presence = boolean | 'unknown'

function contributorPresence(result: AnalysisResult): Record<'good_first_issues' | 'dev_environment_setup' | 'new_contributor_acceptance', Presence> {
  const gfi = result.goodFirstIssueCount
  const des = result.devEnvironmentSetup
  const ncpa = result.newContributorPRAcceptanceRate

  return {
    good_first_issues: gfi === 'unavailable' || gfi === undefined ? 'unknown' : gfi >= 1,
    dev_environment_setup: des === 'unavailable' || des === undefined ? 'unknown' : des,
    new_contributor_acceptance: ncpa === 'unavailable' || ncpa === undefined ? 'unknown' : ncpa >= newContributorAcceptanceFloor,
  }
}

function docFilePresence(result: AnalysisResult): Record<'issue_templates' | 'pull_request_template' | 'contributing' | 'code_of_conduct', Presence> {
  if (result.documentationResult === 'unavailable') {
    return { issue_templates: 'unknown', pull_request_template: 'unknown', contributing: 'unknown', code_of_conduct: 'unknown' }
  }
  const byName = new Map(result.documentationResult.fileChecks.map((f) => [f.name as string, f.found]))
  const get = (name: string): Presence => {
    const found = byName.get(name)
    return found === undefined ? 'unknown' : found
  }
  return {
    issue_templates: get('issue_templates'),
    pull_request_template: get('pull_request_template'),
    contributing: get('contributing'),
    code_of_conduct: get('code_of_conduct'),
  }
}

function readmeSectionPresence(result: AnalysisResult): Record<'readme_installation' | 'readme_contributing', Presence> {
  if (result.documentationResult === 'unavailable') {
    return { readme_installation: 'unknown', readme_contributing: 'unknown' }
  }
  const byName = new Map(result.documentationResult.readmeSections.map((s) => [s.name as string, s.detected]))
  const get = (name: string): Presence => {
    const detected = byName.get(name)
    return detected === undefined ? 'unknown' : detected
  }
  return {
    readme_installation: get('installation'),
    readme_contributing: get('contributing'),
  }
}

function ratioToPercentile(ratio: number): number {
  // Linear approximation — same approach as release-health until bracket
  // calibration data is available.
  return Math.round(ratio * 100)
}

export function computeOnboardingCompleteness(result: AnalysisResult): OnboardingCompleteness {
  const signals: Record<OnboardingSignalKey, Presence> = {
    ...contributorPresence(result),
    ...docFilePresence(result),
    ...readmeSectionPresence(result),
  }

  const present: OnboardingSignalKey[] = []
  const missing: OnboardingSignalKey[] = []
  const unknown: OnboardingSignalKey[] = []

  for (const [key, presence] of Object.entries(signals) as [OnboardingSignalKey, Presence][]) {
    if (presence === 'unknown') unknown.push(key)
    else if (presence) present.push(key)
    else missing.push(key)
  }

  const denominator = present.length + missing.length
  const ratio = denominator === 0 ? null : present.length / denominator
  const percentile = ratio === null ? null : ratioToPercentile(ratio)
  const tone: ScoreTone = ratio === null ? 'neutral' : percentileToTone(percentile ?? 0)

  return { present, missing, unknown, ratio, percentile, tone }
}
