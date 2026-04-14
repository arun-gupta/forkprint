import type { ScoreBadgeProps, ScoreCategory, ScoreTone, ScoreValue } from '@/specs/008-metric-cards/contracts/metric-card-props'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getActivityScore } from '@/lib/activity/score-config'
import { getContributorsScore } from '@/lib/contributors/score-config'
import { getResponsivenessScore } from '@/lib/responsiveness/score-config'
import { getSecurityScore } from '@/lib/security/score-config'

export interface ScoreBadgeDefinition extends ScoreBadgeProps {
  description: string
  detail?: string
}

const PENDING_VALUE: ScoreValue = 'Not scored yet'
const PENDING_TONE: ScoreTone = 'neutral'

export const SCORE_CATEGORIES: ScoreCategory[] = ['Contributors', 'Activity', 'Responsiveness', 'Security']

export const DEFAULT_SCORE_BADGES: ScoreBadgeDefinition[] = [
  {
    category: 'Contributors',
    value: PENDING_VALUE,
    tone: PENDING_TONE,
    description: 'Contributor-diversity score. Based on concentration of commits across contributors.',
  },
  {
    category: 'Activity',
    value: PENDING_VALUE,
    tone: PENDING_TONE,
    description: 'Score will populate when activity scoring lands in P1-F08.',
  },
  {
    category: 'Responsiveness',
    value: PENDING_VALUE,
    tone: PENDING_TONE,
    description: 'Score will populate when responsiveness scoring lands in P1-F10.',
  },
  {
    category: 'Security',
    value: PENDING_VALUE,
    tone: PENDING_TONE,
    description: 'Security posture via OpenSSF Scorecard and direct checks.',
  },
]

export function getDefaultScoreBadges(): ScoreBadgeDefinition[] {
  return DEFAULT_SCORE_BADGES.map((badge) => ({ ...badge }))
}

export function getScoreBadges(result?: AnalysisResult): ScoreBadgeDefinition[] {
  const badges = getDefaultScoreBadges()

  if (!result) {
    return badges
  }

  const activityScore = getActivityScore(result)
  const contributorsScore = getContributorsScore(result)
  const responsivenessScore = getResponsivenessScore(result)
  const securityScore = result.securityResult !== 'unavailable'
    ? getSecurityScore(result.securityResult, result.stars)
    : null
  return badges.map((badge) =>
    badge.category === 'Activity'
      ? {
          ...badge,
          value: activityScore.value,
          tone: activityScore.tone,
          description: activityScore.description,
          detail: getTopFactorDetail(activityScore.weightedFactors),
        }
      : badge.category === 'Contributors'
      ? {
          ...badge,
          value: contributorsScore.value,
          tone: contributorsScore.tone,
          description: contributorsScore.description,
          detail: typeof contributorsScore.contributorCount === 'number'
            ? `${contributorsScore.contributorCount.toLocaleString()} contributors`
            : undefined,
        }
      : badge.category === 'Responsiveness'
      ? {
          ...badge,
          value: responsivenessScore.value,
          tone: responsivenessScore.tone,
          description: responsivenessScore.description,
          detail: getTopFactorDetail(responsivenessScore.weightedCategories),
        }
      : badge.category === 'Security' && securityScore
      ? {
          ...badge,
          value: securityScore.value,
          tone: securityScore.tone,
          description: securityScore.mode === 'scorecard'
            ? 'OpenSSF Scorecard + direct checks'
            : 'Direct security checks only',
          detail: securityScore.mode === 'scorecard' && typeof securityScore.scorecardScore === 'number'
            ? `${(securityScore.scorecardScore * 10).toFixed(1)}/10 Scorecard`
            : 'Direct checks only',
        }
      : badge,
  )
}

function getTopFactorDetail(factors: Array<{ label: string; percentile?: number }>): string | undefined {
  const scored = factors.filter((f): f is { label: string; percentile: number } => typeof f.percentile === 'number')
  if (scored.length === 0) return undefined
  const top = scored.reduce((best, f) => (f.percentile > best.percentile ? f : best))
  return `${top.label} strongest`
}

export function scoreToneClass(tone: ScoreTone) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    case 'danger':
      return 'border-red-200 bg-red-50 text-red-800'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700'
  }
}
