import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { ScoreTone } from '@/specs/008-metric-cards/contracts/metric-card-props'
import { computeOnboardingCompleteness, type OnboardingSignalKey } from '@/lib/onboarding/completeness'

export interface OnboardingExportModel {
  score: { present: number; total: number; percentile: number | null; tone: ScoreTone }
  signals: Record<OnboardingSignalKey, { status: 'present' | 'missing' | 'unknown' }>
  goodFirstIssueCount: number | 'unavailable'
  newContributorPRAcceptanceRate: number | 'unavailable'
  gitpodBonus: boolean
}

export function buildOnboardingExportModel(result: AnalysisResult): OnboardingExportModel {
  const completeness = computeOnboardingCompleteness(result)

  const status = (key: string): 'present' | 'missing' | 'unknown' => {
    if ((completeness.present as string[]).includes(key)) return 'present'
    if ((completeness.missing as string[]).includes(key)) return 'missing'
    return 'unknown'
  }

  const total = completeness.present.length + completeness.missing.length + completeness.unknown.length

  return {
    score: {
      present: completeness.present.length,
      total,
      percentile: completeness.percentile,
      tone: completeness.tone,
    },
    signals: {
      good_first_issues: { status: status('good_first_issues') },
      dev_environment_setup: { status: status('dev_environment_setup') },
      new_contributor_acceptance: { status: status('new_contributor_acceptance') },
      issue_templates: { status: status('issue_templates') },
      pull_request_template: { status: status('pull_request_template') },
      contributing: { status: status('contributing') },
      code_of_conduct: { status: status('code_of_conduct') },
      readme_installation: { status: status('readme_installation') },
      readme_contributing: { status: status('readme_contributing') },
    },
    goodFirstIssueCount: result.goodFirstIssueCount === undefined ? 'unavailable' : result.goodFirstIssueCount,
    newContributorPRAcceptanceRate: result.newContributorPRAcceptanceRate === undefined ? 'unavailable' : result.newContributorPRAcceptanceRate,
    gitpodBonus: result.gitpodPresent === true,
  }
}
