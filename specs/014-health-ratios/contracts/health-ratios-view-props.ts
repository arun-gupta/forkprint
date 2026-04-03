import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

export type HealthRatioCategory = 'ecosystem' | 'activity' | 'contributors'

export interface HealthRatioCell {
  repo: string
  value: number | 'unavailable'
  displayValue: string
}

export interface HealthRatioRow {
  id: string
  category: HealthRatioCategory
  label: string
  description: string
  formula: string
  cells: HealthRatioCell[]
}

export interface HealthRatiosViewProps {
  results: AnalysisResult[]
}
