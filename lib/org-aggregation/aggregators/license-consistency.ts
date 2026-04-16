import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '../types'
import type { Aggregator, LicenseConsistencyValue } from './types'

/**
 * FR-022: License consistency across all repos in the org.
 *
 * Groups repos by their primary license SPDX identifier and counts
 * how many repos use each license. Reports how many repos lack an
 * OSI-approved license.
 *
 * Pure function. No I/O. Repos whose `licensingResult` is 'unavailable'
 * are excluded from the tally.
 */
export const licenseConsistencyAggregator: Aggregator<LicenseConsistencyValue> = (
  results,
  context,
): AggregatePanel<LicenseConsistencyValue> => {
  if (results.length === 0) {
    return {
      panelId: 'license-consistency',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'in-progress',
      value: null,
    }
  }

  const counts = new Map<string, { count: number; osiApproved: boolean }>()
  let contributingReposCount = 0
  let nonOsiCount = 0

  for (const r of results) {
    const lr = (r as AnalysisResult).licensingResult
    if (!lr || lr === 'unavailable') continue

    contributingReposCount++

    const spdxId = lr.license.spdxId ?? 'Unknown'
    const osiApproved = lr.license.osiApproved

    const existing = counts.get(spdxId)
    if (existing) {
      existing.count++
    } else {
      counts.set(spdxId, { count: 1, osiApproved })
    }

    if (!osiApproved) {
      nonOsiCount++
    }
  }

  if (contributingReposCount === 0) {
    return {
      panelId: 'license-consistency',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'unavailable',
      value: null,
    }
  }

  const perLicense = Array.from(counts.entries())
    .map(([spdxId, { count, osiApproved }]) => ({ spdxId, count, osiApproved }))
    .sort((a, b) => b.count - a.count || a.spdxId.localeCompare(b.spdxId))

  return {
    panelId: 'license-consistency',
    contributingReposCount,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: { perLicense, nonOsiCount },
  }
}
