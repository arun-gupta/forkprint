import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

export interface VisibleMetricRow {
  repo: string
  starsLabel: string
  forksLabel: string
  watchersLabel: string
  classificationLabel: string | null
  plotStatusNote: string | null
}

export interface BubbleChartPoint {
  repo: string
  x: number
  y: number
  r: number
}

export function buildEcosystemRows(results: AnalysisResult[]): VisibleMetricRow[] {
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
      classificationLabel: null,
      plotStatusNote:
        missingMetrics.length > 0 ? 'Could not plot this repository because ecosystem metrics were incomplete.' : null,
    }
  })
}

export function buildBubbleChartPoints(results: AnalysisResult[]): BubbleChartPoint[] {
  return results
    .filter(
      (result): result is AnalysisResult & { stars: number; forks: number; watchers: number } =>
        typeof result.stars === 'number' && typeof result.forks === 'number' && typeof result.watchers === 'number',
    )
    .map((result) => ({
      repo: result.repo,
      x: result.stars,
      y: result.forks,
      r: scaleBubbleRadius(result.watchers),
    }))
}

function formatMetric(value: number | 'unavailable') {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value)
  }

  return value
}

function scaleBubbleRadius(watchers: number) {
  if (watchers >= 5000) {
    return 20
  }

  if (watchers >= 2000) {
    return 16
  }

  if (watchers >= 500) {
    return 12
  }

  return 10
}
