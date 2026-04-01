import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

export interface VisibleMetricRow {
  repo: string
  starsLabel: string
  forksLabel: string
  watchersLabel: string
  classificationLabel: string | null
  plotStatusNote: string | null
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

function formatMetric(value: number | 'unavailable') {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value)
  }

  return value
}
