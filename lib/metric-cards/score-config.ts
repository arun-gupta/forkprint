import type { ScoreBadgeProps, ScoreCategory, ScoreTone, ScoreValue } from '@/specs/008-metric-cards/contracts/metric-card-props'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getActivityScore } from '@/lib/activity/score-config'
import { getSustainabilityScore } from '@/lib/contributors/score-config'
import { getResponsivenessScore } from '@/lib/responsiveness/score-config'
import { getSecurityScore } from '@/lib/security/score-config'

export interface ScoreBadgeDefinition extends ScoreBadgeProps {
  description: string
}

const PENDING_VALUE: ScoreValue = 'Not scored yet'
const PENDING_TONE: ScoreTone = 'neutral'

export const SCORE_CATEGORIES: ScoreCategory[] = ['Sustainability', 'Activity', 'Responsiveness', 'Security']

export const DEFAULT_SCORE_BADGES: ScoreBadgeDefinition[] = [
  {
    category: 'Sustainability',
    value: PENDING_VALUE,
    tone: PENDING_TONE,
    description: 'Score will populate when sustainability scoring lands in P1-F09.',
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
  const sustainabilityScore = getSustainabilityScore(result)
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
        }
      : badge.category === 'Sustainability'
      ? {
          ...badge,
          value: sustainabilityScore.value,
          tone: sustainabilityScore.tone,
          description: sustainabilityScore.description,
        }
      : badge.category === 'Responsiveness'
      ? {
          ...badge,
          value: responsivenessScore.value,
          tone: responsivenessScore.tone,
          description: responsivenessScore.description,
        }
      : badge.category === 'Security' && securityScore
      ? {
          ...badge,
          value: securityScore.value,
          tone: securityScore.tone,
          description: securityScore.mode === 'scorecard'
            ? 'OpenSSF Scorecard + direct checks'
            : 'Direct security checks only',
        }
      : badge,
  )
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
