import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '../types'
import type { Aggregator, BusFactorValue } from './types'

/**
 * FR-027: Bus-factor risk detection across the org.
 *
 * For each repo with available `commitCountsByAuthor`, computes the top
 * author's share of total commits. Repos where that share exceeds the
 * threshold (0.5) are flagged as high-concentration.
 *
 * Pure function. No I/O.
 */
export const busFactorAggregator: Aggregator<BusFactorValue> = (
  results,
  context,
): AggregatePanel<BusFactorValue> => {
  const threshold = 0.5

  if (results.length === 0) {
    return {
      panelId: 'bus-factor',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'in-progress',
      value: null,
    }
  }

  const highConcentrationRepos: BusFactorValue['highConcentrationRepos'] = []
  let contributingReposCount = 0

  for (const r of results) {
    const ar = r as AnalysisResult
    const counts = ar.commitCountsByAuthor
    if (!counts || counts === 'unavailable') continue

    const values = Object.values(counts)
    if (values.length === 0) continue

    contributingReposCount++
    const total = values.reduce((sum, v) => sum + v, 0)
    if (total === 0) continue

    const max = Math.max(...values)
    const topAuthorShare = max / total

    if (topAuthorShare > threshold) {
      highConcentrationRepos.push({ repo: r.repo, topAuthorShare })
    }
  }

  if (contributingReposCount === 0) {
    return {
      panelId: 'bus-factor',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'unavailable',
      value: null,
    }
  }

  // Sort descending by topAuthorShare
  highConcentrationRepos.sort((a, b) => b.topAuthorShare - a.topAuthorShare)

  return {
    panelId: 'bus-factor',
    contributingReposCount,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: {
      highConcentrationRepos,
      threshold,
    },
  }
}
