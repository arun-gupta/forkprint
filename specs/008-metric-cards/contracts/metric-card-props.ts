import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AttentionTier, EngagementTier, ReachTier } from '@/lib/ecosystem-map/spectrum-config'

export type ScoreValue = number | 'Not scored yet' | 'Insufficient verified public data'
export type ScoreTone = 'success' | 'warning' | 'danger' | 'neutral'
export type ScoreCategory = 'Activity' | 'Sustainability' | 'Responsiveness'

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
}

export interface MetricCardsOverviewProps {
  results: AnalysisResult[]
}
