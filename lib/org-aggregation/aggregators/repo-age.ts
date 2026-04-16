import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '../types'
import type { Aggregator, RepoAgeValue } from './types'

/**
 * FR-028: Identify the newest and oldest repositories in the org by
 * their `createdAt` date.
 *
 * Pure function. No I/O. Repos whose `createdAt` is 'unavailable' or
 * does not parse to a valid Date are excluded.
 */
export const repoAgeAggregator: Aggregator<RepoAgeValue> = (
  results,
  context,
): AggregatePanel<RepoAgeValue> => {
  if (results.length === 0) {
    return {
      panelId: 'repo-age',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'in-progress',
      value: null,
    }
  }

  const parsed: { repo: string; createdAt: Date }[] = []

  for (const r of results) {
    const raw = (r as AnalysisResult).createdAt
    if (!raw || raw === 'unavailable') continue
    const d = new Date(raw)
    if (isNaN(d.getTime())) continue
    parsed.push({ repo: r.repo, createdAt: d })
  }

  const contributingReposCount = parsed.length
  if (contributingReposCount === 0) {
    return {
      panelId: 'repo-age',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'unavailable',
      value: null,
    }
  }

  let newest = parsed[0]
  let oldest = parsed[0]

  for (const entry of parsed) {
    if (entry.createdAt.getTime() > newest.createdAt.getTime()) newest = entry
    if (entry.createdAt.getTime() < oldest.createdAt.getTime()) oldest = entry
  }

  return {
    panelId: 'repo-age',
    contributingReposCount,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: {
      newest: { repo: newest.repo, createdAt: newest.createdAt },
      oldest: { repo: oldest.repo, createdAt: oldest.createdAt },
    },
  }
}
