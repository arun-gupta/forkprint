import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import {
  ATTENTION_BANDS,
  BUILDER_ENGAGEMENT_BANDS,
  REACH_BANDS,
  type AttentionTier,
  type EngagementTier,
  type ReachTier,
  classifyFromBands,
} from './spectrum-config'

export interface EcosystemSpectrumProfile {
  reachTier: ReachTier
  engagementTier: EngagementTier
  attentionTier: AttentionTier
  forkRate: number
  watcherRate: number
  forkRateLabel: string
  watcherRateLabel: string
}

export function buildSpectrumProfile(result: AnalysisResult): EcosystemSpectrumProfile | null {
  if (
    typeof result.stars !== 'number' ||
    typeof result.forks !== 'number' ||
    typeof result.watchers !== 'number' ||
    result.stars <= 0
  ) {
    return null
  }

  const forkRate = (result.forks / result.stars) * 100
  const watcherRate = (result.watchers / result.stars) * 100

  return {
    reachTier: classifyFromBands(result.stars, REACH_BANDS),
    engagementTier: classifyFromBands(forkRate, BUILDER_ENGAGEMENT_BANDS),
    attentionTier: classifyFromBands(watcherRate, ATTENTION_BANDS),
    forkRate,
    watcherRate,
    forkRateLabel: formatRateLabel(forkRate),
    watcherRateLabel: formatRateLabel(watcherRate),
  }
}

export function buildSpectrumProfiles(results: AnalysisResult[]) {
  return Object.fromEntries(
    results
      .map((result) => [result.repo, buildSpectrumProfile(result)] as const)
      .filter((entry): entry is readonly [string, EcosystemSpectrumProfile] => entry[1] !== null),
  )
}

function formatRateLabel(value: number) {
  return `${value.toFixed(1)}%`
}
