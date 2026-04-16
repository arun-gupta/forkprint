import type { AnalysisResult, InclusiveNamingCheck } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '../types'
import type { Aggregator, InclusiveNamingRollupValue } from './types'

/**
 * FR-023: Inclusive naming violation rollup across the org.
 *
 * Sums tier-1/2/3 violations across all repos and counts how many
 * repos have at least one violation. A "violation" is an
 * InclusiveNamingCheck where `passed === false` and `tier` is non-null.
 *
 * Pure function. No I/O. Repos whose `inclusiveNamingResult` is
 * 'unavailable' are excluded from the tally.
 */
export const inclusiveNamingRollupAggregator: Aggregator<InclusiveNamingRollupValue> = (
  results,
  context,
): AggregatePanel<InclusiveNamingRollupValue> => {
  if (results.length === 0) {
    return {
      panelId: 'inclusive-naming-rollup',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'in-progress',
      value: null,
    }
  }

  let contributingReposCount = 0
  let tier1 = 0
  let tier2 = 0
  let tier3 = 0
  let reposWithAnyViolation = 0

  for (const r of results) {
    const inr = (r as AnalysisResult).inclusiveNamingResult
    if (!inr || inr === 'unavailable') continue

    contributingReposCount++

    const allChecks: InclusiveNamingCheck[] = [inr.branchCheck, ...inr.metadataChecks]
    let repoHasViolation = false

    for (const check of allChecks) {
      if (!check.passed && check.tier !== null) {
        repoHasViolation = true
        switch (check.tier) {
          case 1:
            tier1++
            break
          case 2:
            tier2++
            break
          case 3:
            tier3++
            break
        }
      }
    }

    if (repoHasViolation) {
      reposWithAnyViolation++
    }
  }

  if (contributingReposCount === 0) {
    return {
      panelId: 'inclusive-naming-rollup',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'unavailable',
      value: null,
    }
  }

  return {
    panelId: 'inclusive-naming-rollup',
    contributingReposCount,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: { tier1, tier2, tier3, reposWithAnyViolation },
  }
}
