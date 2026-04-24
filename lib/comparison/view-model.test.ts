import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildResult as _buildResult } from '@/lib/testing/fixtures'
import {
  buildComparisonSections,
  getComparisonLimitMessage,
  getDefaultAnchorRepo,
  limitComparedResults,
  selectComparedResults,
  sortComparisonRows,
  sortComparedResults,
} from './view-model'

describe('comparison/view-model', () => {
  it('defaults the anchor repo to the first successful result', () => {
    const results = [buildResult('facebook/react'), buildResult('vercel/next.js')]

    expect(getDefaultAnchorRepo(results)).toBe('facebook/react')
  })

  it('builds only enabled sections and attributes', () => {
    const sections = buildComparisonSections([buildResult('facebook/react'), buildResult('vercel/next.js')], {
      enabledSections: ['activity'],
      enabledAttributes: ['pr-merge-rate'],
    })

    expect(sections).toHaveLength(1)
    expect(sections[0]?.id).toBe('activity')
    expect(sections[0]?.rows).toHaveLength(1)
    expect(sections[0]?.rows[0]?.attributeId).toBe('pr-merge-rate')
  })

  it('computes median values across the compared repos', () => {
    const sections = buildComparisonSections([
      buildResult('facebook/react', { stars: 100 }),
      buildResult('vercel/next.js', { stars: 200 }),
      buildResult('microsoft/typescript', { stars: 300 }),
    ], {
      enabledSections: ['overview'],
      enabledAttributes: ['stars'],
    })

    expect(sections[0]?.rows[0]?.medianDisplay).toBe('200')
  })

  it('produces anchor-based delta messages and statuses', () => {
    const sections = buildComparisonSections([
      buildResult('facebook/react', { activityMetricsByWindow: windowMetrics({ prsOpened: 10, prsMerged: 8 }) }),
      buildResult('vercel/next.js', { activityMetricsByWindow: windowMetrics({ prsOpened: 10, prsMerged: 4 }) }),
    ], {
      anchorRepo: 'facebook/react',
      enabledSections: ['activity'],
      enabledAttributes: ['pr-merge-rate'],
    })

    const row = sections[0]?.rows[0]
    expect(row?.cells[0]).toMatchObject({ repo: 'facebook/react', status: 'neutral' })
    expect(row?.cells[1]?.deltaDisplay).toBe('-40.0 pts vs anchor (-50%)')
    expect(row?.cells[1]?.status).toBe('worse')
  })

  it('sorts compared results by any visible attribute with unavailable values last', () => {
    const sorted = sortComparedResults(
      [
        buildResult('z/repo', { stars: 'unavailable' }),
        buildResult('a/repo', { stars: 100 }),
        buildResult('b/repo', { stars: 200 }),
      ],
      'stars',
      'desc',
    )

    expect(sorted.map((result) => result.repo)).toEqual(['b/repo', 'a/repo', 'z/repo'])
  })

  it('caps compared results at four repositories', () => {
    const limited = limitComparedResults([
      buildResult('one/repo'),
      buildResult('two/repo'),
      buildResult('three/repo'),
      buildResult('four/repo'),
      buildResult('five/repo'),
    ])

    expect(limited).toHaveLength(4)
    expect(limited.map((result) => result.repo)).toEqual(['one/repo', 'two/repo', 'three/repo', 'four/repo'])
  })

  it('returns clear cap messaging', () => {
    expect(getComparisonLimitMessage(3)).toMatch(/up to 4 repositories/i)
    expect(getComparisonLimitMessage(5)).toMatch(/showing the first 4 of 5/i)
  })

  describe('selectComparedResults', () => {
    it('falls back to the first four results when no participants are provided', () => {
      const selected = selectComparedResults([
        buildResult('one/repo'),
        buildResult('two/repo'),
        buildResult('three/repo'),
        buildResult('four/repo'),
        buildResult('five/repo'),
      ])

      expect(selected.map((result) => result.repo)).toEqual(['one/repo', 'two/repo', 'three/repo', 'four/repo'])
    })

    it('filters to participants regardless of their order, preserving results order', () => {
      const selected = selectComparedResults(
        [
          buildResult('one/repo'),
          buildResult('two/repo'),
          buildResult('three/repo'),
          buildResult('four/repo'),
          buildResult('five/repo'),
        ],
        ['five/repo', 'one/repo', 'three/repo'],
      )

      expect(selected.map((result) => result.repo)).toEqual(['one/repo', 'three/repo', 'five/repo'])
    })

    it('still caps at four even if participants has more entries', () => {
      const selected = selectComparedResults(
        Array.from({ length: 6 }, (_, i) => buildResult(`repo-${i}/r`)),
        ['repo-0/r', 'repo-1/r', 'repo-2/r', 'repo-3/r', 'repo-4/r'],
      )

      expect(selected).toHaveLength(4)
    })

    it('ignores participant entries that are not in results', () => {
      const selected = selectComparedResults(
        [buildResult('one/repo'), buildResult('two/repo')],
        ['one/repo', 'missing/repo'],
      )

      expect(selected.map((result) => result.repo)).toEqual(['one/repo'])
    })
  })

  it('sorts comparison rows by a repo column with unavailable values last', () => {
    const sections = buildComparisonSections([buildResult('facebook/react'), buildResult('vercel/next.js')], {
      enabledSections: ['overview'],
      enabledAttributes: ['stars', 'fork-rate'],
    })

    const sortedRows = sortComparisonRows(sections[0]!.rows, { type: 'repo', repo: 'facebook/react' }, 'desc')
    expect(sortedRows.map((row) => row.attributeId)).toEqual(['stars', 'fork-rate'])
  })

  it('sorts comparison rows by median value', () => {
    const sections = buildComparisonSections([
      buildResult('facebook/react', { stars: 100, forks: 50 }),
      buildResult('vercel/next.js', { stars: 200, forks: 60 }),
    ], {
      enabledSections: ['overview'],
      enabledAttributes: ['stars', 'forks'],
    })

    const sortedRows = sortComparisonRows(sections[0]!.rows, { type: 'median' }, 'asc')
    expect(sortedRows.map((row) => row.attributeId)).toEqual(['forks', 'stars'])
  })
})

function buildResult(repo: string, overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return _buildResult({
    repo,
    stars: 100,
    forks: 25,
    prsOpened90d: 4,
    prsMerged90d: 3,
    ...overrides,
  })
}

function windowMetrics(overrides: Partial<NonNullable<AnalysisResult['activityMetricsByWindow']>[90]> = {}) {
  return {
    30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 12, medianTimeToCloseHours: 24 },
    60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2, staleIssueRatio: 0.15, medianTimeToMergeHours: 18, medianTimeToCloseHours: 30 },
    90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 3, staleIssueRatio: 0.2, medianTimeToMergeHours: 24, medianTimeToCloseHours: 36, ...overrides },
    180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4, staleIssueRatio: 0.3, medianTimeToMergeHours: 48, medianTimeToCloseHours: 72 },
    365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6, staleIssueRatio: 0.4, medianTimeToMergeHours: 96, medianTimeToCloseHours: 144 },
  } as NonNullable<AnalysisResult['activityMetricsByWindow']>
}
