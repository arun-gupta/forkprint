import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

export interface EcosystemMapProps {
  results: AnalysisResult[]
}

export interface EcosystemProfileRowViewModel {
  repo: string
  stars: number | 'unavailable'
  forks: number | 'unavailable'
  watchers: number | 'unavailable'
  builderEngagementRate: number | 'unavailable'
  attentionRate: number | 'unavailable'
  missingEcosystemMetrics: Array<'stars' | 'forks' | 'watchers'>
}

export interface EcosystemSpectrumProfileViewModel {
  reachTier: 'Emerging' | 'Growing' | 'Strong' | 'Exceptional' | null
  engagementTier: 'Light' | 'Healthy' | 'Strong' | 'Exceptional' | null
  attentionTier: 'Light' | 'Active' | 'Strong' | 'Exceptional' | null
  forkRateLabel: string | null
  watcherRateLabel: string | null
}

export interface SpectrumConfigViewModel {
  reachLegend: string
  builderEngagementLegend: string
  attentionLegend: string
}
