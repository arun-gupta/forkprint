import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '../types'
import type { Aggregator, InactiveReposValue } from './types'

/**
 * FR-029: Identify repos with zero commits in 90 days (best available
 * proxy for the configurable inactivity window).
 *
 * Pure function. No I/O. Repos whose `commits90d` is 'unavailable'
 * are excluded from evaluation.
 */
export const inactiveReposAggregator: Aggregator<InactiveReposValue> = (
  results,
  context,
): AggregatePanel<InactiveReposValue> => {
  if (results.length === 0) {
    return {
      panelId: 'inactive-repos',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'in-progress',
      value: null,
    }
  }

  const inactive: { repo: string; lastCommitAt: Date | null }[] = []
  let contributingReposCount = 0

  for (const r of results) {
    const commits90d = (r as AnalysisResult).commits90d
    if (commits90d === 'unavailable' || commits90d === undefined) continue
    contributingReposCount++
    if (commits90d === 0) {
      inactive.push({ repo: r.repo, lastCommitAt: null })
    }
  }

  if (contributingReposCount === 0) {
    return {
      panelId: 'inactive-repos',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'unavailable',
      value: null,
    }
  }

  // Sort inactive repos alphabetically
  inactive.sort((a, b) => a.repo.localeCompare(b.repo))

  return {
    panelId: 'inactive-repos',
    contributingReposCount,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: {
      windowMonths: context.inactiveRepoWindowMonths,
      repos: inactive,
    },
  }
}
