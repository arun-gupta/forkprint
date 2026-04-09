import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

export type ScoreValue = number | 'Not scored yet' | 'Insufficient verified public data'
export type ScoreTone = 'success' | 'warning' | 'danger' | 'neutral'
export type ScoreCategory = 'Activity' | 'Sustainability' | 'Responsiveness'

export interface ScoreBadgeProps {
  category: ScoreCategory
  value: ScoreValue
  tone: ScoreTone
}

export interface MetricCardProfile {
  reachPercentile: number
  reachLabel: string
  engagementPercentile: number
  engagementLabel: string
  engagementRate: number | 'unavailable'
  attentionPercentile: number
  attentionLabel: string
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
