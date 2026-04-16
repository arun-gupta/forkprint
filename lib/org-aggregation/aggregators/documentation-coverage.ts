import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '../types'
import type { Aggregator, DocumentationCoverageValue } from './types'

/**
 * FR-024: Documentation coverage across all repos in the org run.
 *
 * For each contributing repo (documentationResult not 'unavailable'),
 * collects fileChecks, groups by check name, and computes the percentage
 * of repos where each check is present.
 *
 * Pure function. No I/O.
 */
export const documentationCoverageAggregator: Aggregator<DocumentationCoverageValue> = (
  results,
  context,
): AggregatePanel<DocumentationCoverageValue> => {
  if (results.length === 0) {
    return {
      panelId: 'documentation-coverage',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'in-progress',
      value: null,
    }
  }

  // name -> count of repos where found === true
  const checkCounts = new Map<string, number>()
  let contributingReposCount = 0

  for (const r of results) {
    const doc = (r as AnalysisResult).documentationResult
    if (!doc || doc === 'unavailable') continue

    contributingReposCount++
    for (const fc of doc.fileChecks) {
      if (!checkCounts.has(fc.name)) checkCounts.set(fc.name, 0)
      if (fc.found) {
        checkCounts.set(fc.name, checkCounts.get(fc.name)! + 1)
      }
    }
  }

  if (contributingReposCount === 0) {
    return {
      panelId: 'documentation-coverage',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'unavailable',
      value: null,
    }
  }

  const perCheck: DocumentationCoverageValue['perCheck'] = Array.from(checkCounts.entries())
    .map(([name, presentReposCount]) => ({
      name,
      presentReposCount,
      presentInPercent: (presentReposCount / contributingReposCount) * 100,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    panelId: 'documentation-coverage',
    contributingReposCount,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: { perCheck },
  }
}
