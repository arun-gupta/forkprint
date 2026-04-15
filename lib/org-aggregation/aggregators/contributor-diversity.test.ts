import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregationContext } from './types'
import { contributorDiversityAggregator } from './contributor-diversity'

function stub(repo: string, commitCountsByAuthor: Record<string, number> | 'unavailable'): AnalysisResult {
  return {
    repo,
    commitCountsByAuthor,
  } as unknown as AnalysisResult
}

function ctx(totalReposInRun = 3): AggregationContext {
  return { totalReposInRun, flagshipRepos: [], inactiveRepoWindowMonths: 12 }
}

describe('contributorDiversityAggregator — 4 mandatory cases', () => {
  it('typical: union of commit counts; top-20% share and elephant factor computed across org', () => {
    const results = [
      stub('o/a', { alice: 60, bob: 20, carol: 10, dave: 10 }),
      stub('o/b', { alice: 40, erin: 30, frank: 30 }),
    ]
    const panel = contributorDiversityAggregator(results, ctx(2))
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value?.uniqueAuthorsAcrossOrg).toBe(6)
    // Total commits: alice=100, bob=20, carol=10, dave=10, erin=30, frank=30 = 200
    // Top 20% = ceil(6 * 0.2) = 2 authors: alice(100) + erin=frank=30 → top-2 is alice + (erin or frank)
    // Top-2 sum = 100 + 30 = 130 → share = 0.65
    expect(panel.value?.topTwentyPercentShare).toBeCloseTo(0.65, 2)
    // Elephant factor = min authors to cover 50% of 200 = 100; alice alone = 100 → 1
    expect(panel.value?.elephantFactor).toBe(1)
  })

  it('all-unavailable: every repo unavailable → status unavailable, value null', () => {
    const results = [
      stub('o/a', 'unavailable'),
      stub('o/b', 'unavailable'),
    ]
    const panel = contributorDiversityAggregator(results, ctx(2))
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: some unavailable → status final; only available repos contribute', () => {
    const results = [
      stub('o/a', { alice: 100 }),
      stub('o/b', 'unavailable'),
    ]
    const panel = contributorDiversityAggregator(results, ctx(2))
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(1)
    expect(panel.value?.uniqueAuthorsAcrossOrg).toBe(1)
    expect(panel.value?.elephantFactor).toBe(1)
    expect(panel.value?.topTwentyPercentShare).toBe(1)
  })

  it('empty: no results → status in-progress, value null', () => {
    const panel = contributorDiversityAggregator([], ctx(5))
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })
})

describe('contributorDiversityAggregator — FR-008 specifics', () => {
  it('same author across multiple repos is unioned (commit counts summed)', () => {
    const results = [
      stub('o/a', { alice: 10 }),
      stub('o/b', { alice: 90 }),
    ]
    const panel = contributorDiversityAggregator(results, ctx(2))
    expect(panel.value?.uniqueAuthorsAcrossOrg).toBe(1)
    expect(panel.value?.topTwentyPercentShare).toBe(1)
  })
})
