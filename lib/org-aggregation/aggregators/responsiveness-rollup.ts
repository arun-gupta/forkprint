import type { AnalysisResult, ActivityWindowDays } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '../types'
import type {
  Aggregator,
  ContributorDiversityWindow,
  ResponsivenessRollupValue,
  ResponsivenessRollupWindowValue,
} from './types'
import { CONTRIBUTOR_DIVERSITY_WINDOWS } from './types'

/**
 * FR-021: Weighted-median responsiveness rollup across all repos in the org.
 *
 * Two metrics:
 *   - weightedMedianFirstResponseHours: weighted by openIssueCount (from windowed metrics)
 *   - weightedMedianPrMergeHours: weighted by windowed prsMerged count
 *
 * Weighted median per research R6: sort pairs by value, walk until
 * cumulative weight >= totalWeight / 2.
 *
 * Pure function. No I/O.
 */

export function weightedMedian(pairs: { value: number; weight: number }[]): number | null {
  if (pairs.length === 0) return null
  const sorted = [...pairs].sort((a, b) => a.value - b.value)
  const totalWeight = sorted.reduce((s, p) => s + p.weight, 0)
  if (totalWeight === 0) return null
  let cumulative = 0
  for (const p of sorted) {
    cumulative += p.weight
    if (cumulative >= totalWeight / 2) return p.value
  }
  return sorted[sorted.length - 1].value
}

function computeWindow(
  results: AnalysisResult[],
  window: ActivityWindowDays,
): ResponsivenessRollupWindowValue {
  const firstResponsePairs: { value: number; weight: number }[] = []
  const prMergePairs: { value: number; weight: number }[] = []
  let contributingReposCount = 0

  for (const r of results) {
    const ar = r as AnalysisResult
    let contributes = false

    const windowedMetrics = ar.responsivenessMetricsByWindow?.[window]

    // First response hours from windowed metrics; fall back to legacy field at 90d.
    const firstResponse =
      windowedMetrics?.issueFirstResponseMedianHours ??
      (window === 90 ? ar.responsivenessMetrics?.issueFirstResponseMedianHours : undefined)

    if (typeof firstResponse === 'number') {
      const openIssues =
        typeof windowedMetrics?.openIssueCount === 'number' && windowedMetrics.openIssueCount > 0
          ? windowedMetrics.openIssueCount
          : typeof ar.issuesOpen === 'number' && ar.issuesOpen > 0
            ? ar.issuesOpen
            : 1
      firstResponsePairs.push({ value: firstResponse, weight: openIssues })
      contributes = true
    }

    // PR merge hours from windowed metrics; fall back to legacy top-level field at 90d.
    const mergeHours =
      windowedMetrics?.prMergeMedianHours ??
      (window === 90 ? ar.medianTimeToMergeHours : undefined)

    if (typeof mergeHours === 'number') {
      const activityMetrics = ar.activityMetricsByWindow?.[window]
      const prsMerged =
        typeof activityMetrics?.prsMerged === 'number' && activityMetrics.prsMerged > 0
          ? activityMetrics.prsMerged
          : typeof ar.prsMerged90d === 'number' && ar.prsMerged90d > 0
            ? ar.prsMerged90d
            : 1
      prMergePairs.push({ value: mergeHours, weight: prsMerged })
      contributes = true
    }

    if (contributes) contributingReposCount++
  }

  return {
    weightedMedianFirstResponseHours: weightedMedian(firstResponsePairs),
    weightedMedianPrMergeHours: weightedMedian(prMergePairs),
    contributingReposCount,
  }
}

export const responsivenessRollupAggregator: Aggregator<ResponsivenessRollupValue> = (
  results,
  context,
): AggregatePanel<ResponsivenessRollupValue> => {
  if (results.length === 0) {
    return {
      panelId: 'responsiveness-rollup',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'in-progress',
      value: null,
    }
  }

  const byWindow = Object.fromEntries(
    CONTRIBUTOR_DIVERSITY_WINDOWS.map((w) => [w, computeWindow(results, w)]),
  ) as Record<ContributorDiversityWindow, ResponsivenessRollupWindowValue>

  const maxContributing = Math.max(
    ...CONTRIBUTOR_DIVERSITY_WINDOWS.map((w) => byWindow[w].contributingReposCount),
  )

  if (maxContributing === 0) {
    return {
      panelId: 'responsiveness-rollup',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'unavailable',
      value: null,
    }
  }

  return {
    panelId: 'responsiveness-rollup',
    contributingReposCount: maxContributing,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: {
      defaultWindow: 90,
      byWindow,
    },
  }
}
