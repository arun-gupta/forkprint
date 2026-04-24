import { describe, expect, it } from 'vitest'
import type { AnalysisResult, ContributorWindowMetrics } from '@/lib/analyzer/analysis-result'
import { buildResult } from '@/lib/testing/fixtures'
import type { AggregationContext } from './types'
import { contributorDiversityAggregator } from './contributor-diversity'

type WindowStub = Partial<ContributorWindowMetrics>

function stub(
  repo: string,
  windows: Partial<Record<30 | 60 | 90 | 180 | 365, WindowStub>> = {},
  totalContributors?: number,
): AnalysisResult {
  return buildResult({
    repo,
    contributorMetricsByWindow: windows as AnalysisResult['contributorMetricsByWindow'],
    totalContributors,
  })
}

function ctx(totalReposInRun = 3): AggregationContext {
  return { totalReposInRun, flagshipRepos: [], inactiveRepoWindowMonths: 12 }
}

describe('contributorDiversityAggregator — 4 mandatory cases', () => {
  it('typical: 90d window has data; panel is final, byWindow[90] populated', () => {
    const results = [
      stub(
        'o/a',
        { 90: { commitCountsByAuthor: { alice: 60, bob: 20, carol: 10, dave: 10 } } },
      ),
      stub(
        'o/b',
        { 90: { commitCountsByAuthor: { alice: 40, erin: 30, frank: 30 } } },
      ),
    ]
    const panel = contributorDiversityAggregator(results, ctx(2))
    expect(panel.status).toBe('final')
    const w90 = panel.value?.byWindow[90]
    expect(w90?.uniqueAuthorsAcrossOrg).toBe(6)
    // Top 20% = ceil(6 * 0.2) = 2 authors: alice(100) + (erin|frank)(30)
    // 130 / 200 = 0.65
    expect(w90?.topTwentyPercentShare).toBeCloseTo(0.65, 2)
    expect(w90?.elephantFactor).toBe(1)
  })

  it('all-unavailable: every window empty across every repo → status unavailable', () => {
    const results = [stub('o/a'), stub('o/b')]
    const panel = contributorDiversityAggregator(results, ctx(2))
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
  })

  it('mixed: some repos have window data → status final, contributingReposCount reflects available subset', () => {
    const results = [
      stub('o/a', { 90: { commitCountsByAuthor: { alice: 100 } } }),
      stub('o/b'),
    ]
    const panel = contributorDiversityAggregator(results, ctx(2))
    expect(panel.status).toBe('final')
    expect(panel.value?.byWindow[90].contributingReposCount).toBe(1)
  })

  it('empty: no results → status in-progress, value null', () => {
    const panel = contributorDiversityAggregator([], ctx(5))
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
  })
})

describe('contributorDiversityAggregator — multi-window FR-008', () => {
  it('computes independent values for each window', () => {
    const results = [
      stub('o/a', {
        30: { commitCountsByAuthor: { alice: 10 } },
        90: { commitCountsByAuthor: { alice: 40, bob: 20 } },
        365: { commitCountsByAuthor: { alice: 100, bob: 50, carol: 20 } },
      }),
    ]
    const panel = contributorDiversityAggregator(results, ctx(1))
    expect(panel.status).toBe('final')
    expect(panel.value?.byWindow[30].uniqueAuthorsAcrossOrg).toBe(1)
    expect(panel.value?.byWindow[90].uniqueAuthorsAcrossOrg).toBe(2)
    expect(panel.value?.byWindow[365].uniqueAuthorsAcrossOrg).toBe(3)
  })

  it('rolls up composition from the windowed commitCountsByAuthor union (repeat = ≥2 commits, oneTime = 1 commit)', () => {
    const results = [
      stub('o/a', {
        90: { commitCountsByAuthor: { alice: 5, bob: 1, carol: 10, dave: 1 } },
      }),
    ]
    const panel = contributorDiversityAggregator(results, ctx(1))
    const c = panel.value?.byWindow[90].composition
    expect(c?.total).toBe(4)
    expect(c?.repeatContributors).toBe(2) // alice, carol
    expect(c?.oneTimeContributors).toBe(2) // bob, dave
  })

  it('same author across repos is unioned per window', () => {
    const results = [
      stub('o/a', { 90: { commitCountsByAuthor: { alice: 10 } } }),
      stub('o/b', { 90: { commitCountsByAuthor: { alice: 90 } } }),
    ]
    const panel = contributorDiversityAggregator(results, ctx(2))
    expect(panel.value?.byWindow[90].uniqueAuthorsAcrossOrg).toBe(1)
    expect(panel.value?.byWindow[90].topTwentyPercentShare).toBe(1)
  })
})
