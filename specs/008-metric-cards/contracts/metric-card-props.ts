import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AttentionTier, EngagementTier, ReachTier } from '@/lib/ecosystem-map/spectrum-config'

export type ScoreValue = 'High' | 'Medium' | 'Low' | 'Not scored yet'
export type ScoreTone = 'success' | 'warning' | 'danger' | 'neutral'
export type ScoreCategory = 'Evolution' | 'Contribution Dynamics' | 'Responsiveness'

export interface ScoreBadgeProps {
  category: ScoreCategory
  value: ScoreValue
  tone: ScoreTone
}

export interface MetricCardProfile {
  reachTier: ReachTier
  builderEngagementTier: EngagementTier
  builderEngagementRate: number | 'unavailable'
  attentionTier: AttentionTier
  attentionRate: number | 'unavailable'
}

export interface MetricCardProps {
  result: AnalysisResult
  profile: MetricCardProfile
  scoreBadges: ScoreBadgeProps[]
  expanded: boolean
  onToggle: () => void
}

export interface MetricCardsOverviewProps {
  results: AnalysisResult[]
}
