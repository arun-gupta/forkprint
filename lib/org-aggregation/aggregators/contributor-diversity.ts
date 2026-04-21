import type { AnalysisResult, ContributorWindowMetrics } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '../types'
import type {
  Aggregator,
  ContributorDiversityValue,
  ContributorDiversityWindow,
  ContributorDiversityWindowValue,
} from './types'
import { CONTRIBUTOR_DIVERSITY_WINDOWS } from './types'

function computeWindow(
  results: AnalysisResult[],
  window: ContributorDiversityWindow,
): ContributorDiversityWindowValue {
  const union = new Map<string, number>()
  let contributingReposCount = 0

  for (const r of results) {
    const w = (r as AnalysisResult).contributorMetricsByWindow?.[window] as
      | ContributorWindowMetrics
      | undefined
    if (!w) continue
    const counts = w.commitCountsByAuthor
    if (!counts || counts === 'unavailable') continue
    contributingReposCount++
    for (const [author, count] of Object.entries(counts)) {
      union.set(author, (union.get(author) ?? 0) + count)
    }
  }

  const sorted = Array.from(union.values()).sort((a, b) => b - a)
  const total = sorted.reduce((s, n) => s + n, 0)
  const uniqueAuthors = sorted.length

  let topTwentyPercentShare: number | null = null
  let elephantFactor: number | null = null
  if (uniqueAuthors > 0 && total > 0) {
    const topCount = Math.max(1, Math.ceil(uniqueAuthors * 0.2))
    const topSum = sorted.slice(0, topCount).reduce((s, n) => s + n, 0)
    topTwentyPercentShare = topSum / total
    let covered = 0
    let ef = 0
    const half = total / 2
    for (const count of sorted) {
      ef++
      covered += count
      if (covered >= half) break
    }
    elephantFactor = ef
  }

  // Org-level composition: derived from the SAME windowed commitCountsByAuthor
  // union used for uniqueAuthorsAcrossOrg, so repeat + oneTime reconciles to
  // `uniqueAuthors` by construction.
  let repeatContributors: number | null = null
  let oneTimeContributors: number | null = null
  if (uniqueAuthors > 0) {
    repeatContributors = 0
    oneTimeContributors = 0
    for (const count of union.values()) {
      if (count >= 2) repeatContributors++
      else if (count === 1) oneTimeContributors++
    }
  }

  return {
    topTwentyPercentShare,
    elephantFactor,
    uniqueAuthorsAcrossOrg: uniqueAuthors > 0 ? uniqueAuthors : null,
    composition: {
      repeatContributors,
      oneTimeContributors,
      total: uniqueAuthors > 0 ? uniqueAuthors : null,
    },
    contributingReposCount,
  }
}

/**
 * FR-008: Project-wide contributor diversity across all five time windows
 * (30 / 60 / 90 / 180 / 365 days). The panel UI picks one window to display.
 *
 * Pure function. Repos with `unavailable` inputs for a window are excluded
 * from that window's computation but remain available to others.
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

  const byWindow = Object.fromEntries(
    CONTRIBUTOR_DIVERSITY_WINDOWS.map((w) => [w, computeWindow(results, w)]),
  ) as Record<ContributorDiversityWindow, ContributorDiversityWindowValue>

  const anyContributing = CONTRIBUTOR_DIVERSITY_WINDOWS.some(
    (w) => byWindow[w].contributingReposCount > 0,
  )
  if (!anyContributing) {
    return {
      panelId: 'contributor-diversity',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'unavailable',
      value: null,
    }
  }

  // The overall panel's contributingReposCount is the maximum across windows
  // (the broadest coverage) so the "X of N" label reflects the best-case set.
  const maxContributing = Math.max(
    ...CONTRIBUTOR_DIVERSITY_WINDOWS.map((w) => byWindow[w].contributingReposCount),
  )

  return {
    panelId: 'contributor-diversity',
    contributingReposCount: maxContributing,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: {
      defaultWindow: 90,
      byWindow,
    },
  }
}
