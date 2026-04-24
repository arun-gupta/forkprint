import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { activityRollupAggregator } from './activity-rollup'
import { buildResult } from '@/lib/testing/fixtures'

function partialResult(repo: string, override: Partial<AnalysisResult> = {}): AnalysisResult {
  return buildResult({ repo, name: repo, ...override })
}

const CONTEXT = { totalReposInRun: 3, flagshipRepos: [], inactiveRepoWindowMonths: 12 }

describe('activityRollupAggregator — FR-020', () => {
  it('typical: sums commits, PRs, and issues across repos', () => {
    const results = [
      partialResult('o/alpha', { commits90d: 100, prsMerged90d: 20, issuesClosed90d: 10 }),
      partialResult('o/bravo', { commits90d: 50, prsMerged90d: 5, issuesClosed90d: 3 }),
      partialResult('o/charlie', { commits90d: 200, prsMerged90d: 30, issuesClosed90d: 15 }),
    ]
    const panel = activityRollupAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(3)
    expect(panel.value).not.toBeNull()
    expect(panel.value!.totalCommits12mo).toBe(350)
    expect(panel.value!.totalPrsMerged12mo).toBe(55)
    expect(panel.value!.totalIssuesClosed12mo).toBe(28)
  })

  it('all-unavailable: every repo lacks activity data → panel is unavailable', () => {
    const results = [
      partialResult('o/alpha'),
      partialResult('o/bravo'),
    ]
    const panel = activityRollupAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: unavailable repos are excluded but available ones still contribute', () => {
    const results = [
      partialResult('o/alpha', { commits90d: 80, prsMerged90d: 10, issuesClosed90d: 5 }),
      partialResult('o/bravo'), // all unavailable
      partialResult('o/charlie', { commits90d: 40, prsMerged90d: 8, issuesClosed90d: 2 }),
    ]
    const panel = activityRollupAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value!.totalCommits12mo).toBe(120)
    expect(panel.value!.totalPrsMerged12mo).toBe(18)
    expect(panel.value!.totalIssuesClosed12mo).toBe(7)
  })

  it('empty: results array is empty → in-progress with null value', () => {
    const panel = activityRollupAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('most/least active repo: identifies repos with highest and lowest commits', () => {
    const results = [
      partialResult('o/alpha', { commits90d: 50, prsMerged90d: 5, issuesClosed90d: 2 }),
      partialResult('o/bravo', { commits90d: 200, prsMerged90d: 20, issuesClosed90d: 10 }),
      partialResult('o/charlie', { commits90d: 10, prsMerged90d: 1, issuesClosed90d: 0 }),
    ]
    const panel = activityRollupAggregator(results, CONTEXT)
    expect(panel.value!.mostActiveRepo).toEqual({ repo: 'o/bravo', commits: 200 })
    expect(panel.value!.leastActiveRepo).toEqual({ repo: 'o/charlie', commits: 10 })
  })

  it('most/least active are null when all commits90d are unavailable but other fields contribute', () => {
    const results = [
      partialResult('o/alpha', { prsMerged90d: 10 }),
      partialResult('o/bravo', { issuesClosed90d: 5 }),
    ]
    const panel = activityRollupAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value!.totalCommits12mo).toBe(0)
    expect(panel.value!.totalPrsMerged12mo).toBe(10)
    expect(panel.value!.totalIssuesClosed12mo).toBe(5)
    expect(panel.value!.mostActiveRepo).toBeNull()
    expect(panel.value!.leastActiveRepo).toBeNull()
  })
})
