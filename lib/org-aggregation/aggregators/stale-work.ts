import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '../types'
import type { Aggregator, StaleWorkValue } from './types'

/**
 * FR-026: Stale-work rollup across the org.
 *
 * Sums open issues and open PRs (using `prsOpened90d` as best proxy)
 * across all repos, and computes a weighted average of `staleIssueRatio`
 * weighted by each repo's `issuesOpen`.
 *
 * Pure function. No I/O.
 */
export const staleWorkAggregator: Aggregator<StaleWorkValue> = (
  results,
  context,
): AggregatePanel<StaleWorkValue> => {
  if (results.length === 0) {
    return {
      panelId: 'stale-work',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'in-progress',
      value: null,
    }
  }

  let totalOpenIssues = 0
  let totalOpenPullRequests = 0
  let contributingReposCount = 0

  // For weighted average of staleIssueRatio
  let weightedSum = 0
  let weightTotal = 0

  for (const r of results) {
    const ar = r as AnalysisResult
    const issues = ar.issuesOpen
    if (typeof issues !== 'number') continue

    contributingReposCount++
    totalOpenIssues += issues

    const prs = ar.prsOpened90d
    if (typeof prs === 'number') {
      totalOpenPullRequests += prs
    }

    const ratio = ar.staleIssueRatio
    if (typeof ratio === 'number' && issues > 0) {
      weightedSum += ratio * issues
      weightTotal += issues
    }
  }

  if (contributingReposCount === 0) {
    return {
      panelId: 'stale-work',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'unavailable',
      value: null,
    }
  }

  const weightedStaleIssueRatio = weightTotal > 0 ? weightedSum / weightTotal : null

  return {
    panelId: 'stale-work',
    contributingReposCount,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: {
      totalOpenIssues,
      totalOpenPullRequests,
      weightedStaleIssueRatio,
    },
  }
}
