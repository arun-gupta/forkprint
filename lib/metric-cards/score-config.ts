import type { ScoreBadgeProps, ScoreCategory, ScoreTone, ScoreValue } from '@/specs/008-metric-cards/contracts/metric-card-props'

export interface ScoreBadgeDefinition extends ScoreBadgeProps {
  description: string
}

const PENDING_VALUE: ScoreValue = 'Not scored yet'
const PENDING_TONE: ScoreTone = 'neutral'

export const SCORE_CATEGORIES: ScoreCategory[] = ['Evolution', 'Contribution Dynamics', 'Responsiveness']

export const DEFAULT_SCORE_BADGES: ScoreBadgeDefinition[] = [
  {
    category: 'Evolution',
    value: PENDING_VALUE,
    tone: PENDING_TONE,
    description: 'Score will populate when evolution scoring lands in P1-F08.',
  },
  {
    category: 'Contribution Dynamics',
    value: PENDING_VALUE,
    tone: PENDING_TONE,
    description: 'Score will populate when contribution dynamics scoring lands in P1-F09.',
  },
  {
    category: 'Responsiveness',
    value: PENDING_VALUE,
    tone: PENDING_TONE,
    description: 'Score will populate when responsiveness scoring lands in P1-F10.',
  },
]

export function getDefaultScoreBadges(): ScoreBadgeDefinition[] {
  return DEFAULT_SCORE_BADGES.map((badge) => ({ ...badge }))
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
