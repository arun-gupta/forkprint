import type { ScoreTone, ScoreValue } from '@/specs/008-metric-cards/contracts/metric-card-props'

export interface ResponsivenessMetricProps {
  label: string
  value: string
  detail?: string
  helpText?: string
  isPrimary?: boolean
}

export interface ResponsivenessPaneProps {
  title:
    | 'Issue & PR response time'
    | 'Resolution metrics'
    | 'Maintainer activity signals'
    | 'Volume & backlog health'
    | 'Engagement quality signals'
  metrics: ResponsivenessMetricProps[]
}

export interface ResponsivenessScoreHelpProps {
  title: string
  description: string
  weightedCategories: Array<{
    label: string
    weightLabel: string
  }>
}

export interface ResponsivenessScoreProps {
  category: 'Responsiveness'
  value: ScoreValue
  tone: ScoreTone
  description: string
  help: ResponsivenessScoreHelpProps
}

export interface ResponsivenessSectionProps {
  repo: string
  panes: ResponsivenessPaneProps[]
  score: ResponsivenessScoreProps
  missingFields: string[]
}
