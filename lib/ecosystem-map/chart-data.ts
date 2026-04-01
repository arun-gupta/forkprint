import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildSpectrumProfiles, type EcosystemSpectrumProfile } from './classification'

export interface VisibleMetricRow {
  repo: string
  starsLabel: string
  forksLabel: string
  watchersLabel: string
  profile: EcosystemSpectrumProfile | null
  plotStatusNote: string | null
}

export interface BubbleChartPoint {
  repo: string
  x: number
  y: number
  r: number
  stars: number
  forks: number
  watchers: number
  forkRate: number
  watcherRate: number
  forkRateLabel: string
  watcherRateLabel: string
  profile: EcosystemSpectrumProfile
}

export function buildEcosystemRows(results: AnalysisResult[]): VisibleMetricRow[] {
  const profiles = buildSpectrumProfiles(results)

  return results.map((result) => {
    const missingMetrics = [
      result.stars === 'unavailable' ? 'stars' : null,
      result.forks === 'unavailable' ? 'forks' : null,
      result.watchers === 'unavailable' ? 'watchers' : null,
    ].filter(Boolean)

    return {
      repo: result.repo,
      starsLabel: formatMetric(result.stars),
      forksLabel: formatMetric(result.forks),
      watchersLabel: formatMetric(result.watchers),
      profile: profiles[result.repo] ?? null,
      plotStatusNote:
        missingMetrics.length > 0
          ? 'Could not plot this repository because ecosystem metrics were incomplete.'
          : null,
    }
  })
}

export function buildBubbleChartPoints(results: AnalysisResult[]): BubbleChartPoint[] {
  const profiles = buildSpectrumProfiles(results)

  return results
    .filter(
      (result): result is AnalysisResult & { stars: number; forks: number; watchers: number } =>
        typeof result.stars === 'number' &&
        typeof result.forks === 'number' &&
        typeof result.watchers === 'number' &&
        result.stars > 0,
    )
    .map((result) => {
      const profile = profiles[result.repo]

      if (!profile) {
        return null
      }

      return {
        repo: result.repo,
        x: result.stars,
        y: profile.forkRate,
        r: scaleBubbleRadius(profile.watcherRate),
        stars: result.stars,
        forks: result.forks,
        watchers: result.watchers,
        forkRate: profile.forkRate,
        watcherRate: profile.watcherRate,
        forkRateLabel: profile.forkRateLabel,
        watcherRateLabel: profile.watcherRateLabel,
        profile,
      }
    })
    .filter((point): point is BubbleChartPoint => point !== null)
}

function formatMetric(value: number | 'unavailable') {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value)
  }

  return value
}

function scaleBubbleRadius(watcherRate: number) {
  if (watcherRate >= 2.5) {
    return 20
  }

  if (watcherRate >= 1.5) {
    return 16
  }

  if (watcherRate >= 0.5) {
    return 12
  }

  return 10
}
