import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { releaseCadenceAggregator } from './release-cadence'
import { buildResult } from '@/lib/testing/fixtures'

function partialResult(repo: string, override: Partial<AnalysisResult> = {}): AnalysisResult {
  return buildResult({ repo, name: repo, ...override })
}

const CONTEXT = { totalReposInRun: 3, flagshipRepos: [], inactiveRepoWindowMonths: 12 }

describe('releaseCadenceAggregator — FR-011', () => {
  it('typical: sums releases across repos', () => {
    const results = [
      partialResult('o/alpha', { releases12mo: 5 }),
      partialResult('o/bravo', { releases12mo: 3 }),
      partialResult('o/charlie', { releases12mo: 2 }),
    ]
    const panel = releaseCadenceAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(3)
    expect(panel.value).not.toBeNull()
    expect(panel.value!.totalReleases12mo).toBe(10)
    expect(panel.value!.perFlagship).toEqual([])
  })

  it('all-unavailable: every repo lacks releases12mo → panel is unavailable', () => {
    const results = [
      partialResult('o/alpha', { releases12mo: 'unavailable' }),
      partialResult('o/bravo', { releases12mo: 'unavailable' }),
    ]
    const panel = releaseCadenceAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: unavailable repos are excluded but available ones still contribute', () => {
    const results = [
      partialResult('o/alpha', { releases12mo: 7 }),
      partialResult('o/bravo', { releases12mo: 'unavailable' }),
      partialResult('o/charlie', { releases12mo: 4 }),
    ]
    const panel = releaseCadenceAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value!.totalReleases12mo).toBe(11)
  })

  it('empty: results array is empty → in-progress with null value', () => {
    const panel = releaseCadenceAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('flagship: perFlagship includes flagship repos with available data in rank order', () => {
    const flagshipContext = {
      ...CONTEXT,
      flagshipRepos: [
        { repo: 'o/alpha', source: 'pinned' as const, rank: 0 },
      ],
    }
    const results = [
      partialResult('o/alpha', { releases12mo: 12 }),
      partialResult('o/bravo', { releases12mo: 3 }),
    ]
    const panel = releaseCadenceAggregator(results, flagshipContext)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value!.totalReleases12mo).toBe(15)
    expect(panel.value!.perFlagship).toEqual([
      { repo: 'o/alpha', releases12mo: 12 },
    ])
  })
})
