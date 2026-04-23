import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '../types'
import type { Aggregator, ProjectFootprintValue } from './types'

/**
 * FR-019: Org-level project footprint — sum of stars, forks, watchers,
 * and de-duplicated unique contributors (365d window) across all repos.
 *
 * Pure function. No I/O. Repos where ALL four fields are 'unavailable'
 * are excluded; the panel is 'unavailable' only when zero repos
 * contribute any numeric value.
 *
 * totalContributors uses the 365d commitCountsByAuthor union to avoid
 * double-counting humans who contribute to multiple repos (issue #299).
 * If no repo has 365d commitCountsByAuthor data, totalContributors is
 * 'unavailable' — a misleading sum is worse than a blank.
 */
export const projectFootprintAggregator: Aggregator<ProjectFootprintValue> = (
  results,
  context,
): AggregatePanel<ProjectFootprintValue> => {
  if (results.length === 0) {
    return {
      panelId: 'project-footprint',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'in-progress',
      value: null,
    }
  }

  let totalStars = 0
  let totalForks = 0
  let totalWatchers = 0
  let contributingReposCount = 0

  const authorUnion = new Set<string>()
  let contributorDataRepos = 0

  for (const r of results) {
    const ar = r as AnalysisResult
    const hasStars = typeof ar.stars === 'number'
    const hasForks = typeof ar.forks === 'number'
    const hasWatchers = typeof ar.watchers === 'number'

    const counts = ar.contributorMetricsByWindow?.[365]?.commitCountsByAuthor
    const has365Contributors = counts !== undefined && counts !== 'unavailable'

    if (!hasStars && !hasForks && !hasWatchers && !has365Contributors) continue

    contributingReposCount++
    if (hasStars) totalStars += ar.stars as number
    if (hasForks) totalForks += ar.forks as number
    if (hasWatchers) totalWatchers += ar.watchers as number
    if (has365Contributors) {
      contributorDataRepos++
      for (const author of Object.keys(counts as Record<string, number>)) {
        authorUnion.add(author)
      }
    }
  }

  if (contributingReposCount === 0) {
    return {
      panelId: 'project-footprint',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'unavailable',
      value: null,
    }
  }

  const totalContributors: number | 'unavailable' =
    contributorDataRepos > 0 ? authorUnion.size : 'unavailable'

  return {
    panelId: 'project-footprint',
    contributingReposCount,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: {
      totalStars,
      totalForks,
      totalWatchers,
      totalContributors,
    },
  }
}
