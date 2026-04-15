import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '../types'
import type { Aggregator, ContributorDiversityValue } from './types'

/**
 * FR-008: Project-wide contributor diversity.
 *
 * - Union of `commitCountsByAuthor` across repos (same author, summed).
 * - Top-20% share = sum of commits for the top-20% of authors (by count) ÷ total.
 * - Elephant factor = minimum number of authors needed to cover ≥ 50% of commits.
 *
 * Pure function. Repos with `unavailable` commitCountsByAuthor are excluded.
 */
export const contributorDiversityAggregator: Aggregator<ContributorDiversityValue> = (
  results,
  context,
): AggregatePanel<ContributorDiversityValue> => {
  if (results.length === 0) {
    return {
      panelId: 'contributor-diversity',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'in-progress',
      value: null,
    }
  }

  const union = new Map<string, number>()
  let contributingReposCount = 0
  for (const r of results) {
    const counts = (r as AnalysisResult & { commitCountsByAuthor?: unknown }).commitCountsByAuthor
    if (!counts || counts === 'unavailable') continue
    contributingReposCount++
    for (const [author, count] of Object.entries(counts as Record<string, number>)) {
      union.set(author, (union.get(author) ?? 0) + count)
    }
  }

  if (contributingReposCount === 0) {
    return {
      panelId: 'contributor-diversity',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'unavailable',
      value: null,
    }
  }

  const sorted = Array.from(union.values()).sort((a, b) => b - a)
  const total = sorted.reduce((s, n) => s + n, 0)
  const uniqueAuthors = sorted.length

  const topCount = Math.max(1, Math.ceil(uniqueAuthors * 0.2))
  const topSum = sorted.slice(0, topCount).reduce((s, n) => s + n, 0)
  const topTwentyPercentShare = total === 0 ? 0 : topSum / total

  let covered = 0
  let elephantFactor = 0
  const half = total / 2
  for (const count of sorted) {
    elephantFactor++
    covered += count
    if (covered >= half) break
  }

  return {
    panelId: 'contributor-diversity',
    contributingReposCount,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: {
      topTwentyPercentShare,
      elephantFactor,
      uniqueAuthorsAcrossOrg: uniqueAuthors,
    },
  }
}
