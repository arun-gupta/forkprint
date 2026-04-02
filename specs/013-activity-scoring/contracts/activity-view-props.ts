import type { ScoreTone, ScoreValue } from '@/specs/008-metric-cards/contracts/metric-card-props'

export type ActivityWindowKey = '30d' | '60d' | '90d' | '180d' | '12mo'

export interface ActivityWindowOption {
  key: ActivityWindowKey
  label: '30d' | '60d' | '90d' | '180d' | '12 months'
  days: 30 | 60 | 90 | 180 | 365
}

export interface ActivityMetricProps {
  label: string
  value: string
  detail?: string
  helpText?: string
  isPrimary?: boolean
}

export interface ActivityScoreHelpProps {
  title: string
  description: string
  weightedFactors: Array<{
    label: string
    weightLabel: string
  }>
}

export interface ActivityScoreProps {
  category: 'Activity'
  value: ScoreValue
  tone: ScoreTone
  description: string
  help: ActivityScoreHelpProps
}

export interface ActivitySectionProps {
  repo: string
  window: ActivityWindowOption
  metrics: ActivityMetricProps[]
  fixedCommitWindows: Array<{
    label: 'Commits (30d)' | 'Commits (90d)' | 'Commits (180d)'
    value: string
  }>
  score: ActivityScoreProps
  missingFields: string[]
}
