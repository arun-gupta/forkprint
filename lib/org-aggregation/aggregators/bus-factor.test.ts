import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { busFactorAggregator } from './bus-factor'
import { buildResult } from '@/lib/testing/fixtures'

function partialResult(repo: string, override: Partial<AnalysisResult> = {}): AnalysisResult {
  return buildResult({ repo, name: repo, ...override })
}

const CONTEXT = { totalReposInRun: 3, flagshipRepos: [], inactiveRepoWindowMonths: 12 }

describe('busFactorAggregator — FR-027', () => {
  it('typical: flags repos where top author > 50% and sorts descending', () => {
    const results = [
      partialResult('o/alpha', {
        commitCountsByAuthor: { alice: 80, bob: 20 }, // 80% — flagged
      }),
      partialResult('o/bravo', {
        commitCountsByAuthor: { carol: 30, dave: 30, eve: 40 }, // 40% — not flagged
      }),
      partialResult('o/charlie', {
        commitCountsByAuthor: { frank: 90, grace: 10 }, // 90% — flagged
      }),
    ]
    const panel = busFactorAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.panelId).toBe('bus-factor')
    expect(panel.contributingReposCount).toBe(3)
    expect(panel.value).not.toBeNull()
    expect(panel.value!.threshold).toBe(0.5)
    expect(panel.value!.highConcentrationRepos).toHaveLength(2)
    // Sorted descending by topAuthorShare: charlie (0.9) then alpha (0.8)
    expect(panel.value!.highConcentrationRepos[0].repo).toBe('o/charlie')
    expect(panel.value!.highConcentrationRepos[0].topAuthorShare).toBeCloseTo(0.9)
    expect(panel.value!.highConcentrationRepos[1].repo).toBe('o/alpha')
    expect(panel.value!.highConcentrationRepos[1].topAuthorShare).toBeCloseTo(0.8)
  })

  it('all-unavailable: every repo lacks commitCountsByAuthor → panel is unavailable', () => {
    const results = [
      partialResult('o/alpha', { commitCountsByAuthor: 'unavailable' }),
      partialResult('o/bravo', { commitCountsByAuthor: 'unavailable' }),
    ]
    const panel = busFactorAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: unavailable repos excluded; no repo exceeds threshold → empty list', () => {
    const results = [
      partialResult('o/alpha', {
        commitCountsByAuthor: { alice: 25, bob: 25, carol: 25, dave: 25 }, // 25% each
      }),
      partialResult('o/bravo', { commitCountsByAuthor: 'unavailable' }),
      partialResult('o/charlie', {
        commitCountsByAuthor: { eve: 50, frank: 50 }, // exactly 50% — not > threshold
      }),
    ]
    const panel = busFactorAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value!.highConcentrationRepos).toHaveLength(0)
  })

  it('empty: results array is empty → in-progress with null value', () => {
    const panel = busFactorAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })
})
