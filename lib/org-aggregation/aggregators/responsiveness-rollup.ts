import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '../types'
import type { Aggregator, ResponsivenessRollupValue } from './types'

/**
 * FR-021: Weighted-median responsiveness rollup across all repos in the org.
 *
 * Two metrics:
 *   - weightedMedianFirstResponseHours: weighted by issuesOpen (repo issue volume)
 *   - weightedMedianPrMergeHours: weighted by prsMerged90d (repo merge volume)
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

  const firstResponsePairs: { value: number; weight: number }[] = []
  const prMergePairs: { value: number; weight: number }[] = []
  let contributingReposCount = 0

  for (const r of results) {
    const ar = r as AnalysisResult
    let contributes = false

    // First response hours — weighted by issuesOpen
    const firstResponse = ar.responsivenessMetrics?.issueFirstResponseMedianHours
    if (typeof firstResponse === 'number') {
      const issuesOpen = typeof ar.issuesOpen === 'number' && ar.issuesOpen > 0 ? ar.issuesOpen : 1
      firstResponsePairs.push({ value: firstResponse, weight: issuesOpen })
      contributes = true
    }

    // PR merge hours — weighted by prsMerged90d
    const mergeHours = ar.medianTimeToMergeHours
    if (typeof mergeHours === 'number') {
      const prsMerged = typeof ar.prsMerged90d === 'number' && ar.prsMerged90d > 0 ? ar.prsMerged90d : 1
      prMergePairs.push({ value: mergeHours, weight: prsMerged })
      contributes = true
    }

    if (contributes) contributingReposCount++
  }

  if (contributingReposCount === 0) {
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
    contributingReposCount,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: {
      weightedMedianFirstResponseHours: weightedMedian(firstResponsePairs),
      weightedMedianPrMergeHours: weightedMedian(prMergePairs),
    },
  }
}
