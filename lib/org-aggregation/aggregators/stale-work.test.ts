import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { staleWorkAggregator } from './stale-work'

function partialResult(repo: string, override: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo,
    name: repo,
    description: 'unavailable',
    createdAt: 'unavailable',
    primaryLanguage: 'unavailable',
    stars: 'unavailable',
    forks: 'unavailable',
    watchers: 'unavailable',
    commits30d: 'unavailable',
    commits90d: 'unavailable',
    releases12mo: 'unavailable',
    prsOpened90d: 'unavailable',
    prsMerged90d: 'unavailable',
    issuesOpen: 'unavailable',
    issuesClosed90d: 'unavailable',
    uniqueCommitAuthors90d: 'unavailable',
    totalContributors: 'unavailable',
    maintainerCount: 'unavailable',
    commitCountsByAuthor: 'unavailable',
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    documentationResult: 'unavailable',
    licensingResult: 'unavailable',
    defaultBranchName: 'unavailable',
    topics: [],
    inclusiveNamingResult: 'unavailable',
    securityResult: 'unavailable',
    missingFields: [],
    ...override,
  } as AnalysisResult
}

const CONTEXT = { totalReposInRun: 3, flagshipRepos: [], inactiveRepoWindowMonths: 12 }

describe('staleWorkAggregator — FR-026', () => {
  it('typical: sums open issues/PRs and computes weighted stale ratio', () => {
    const results = [
      partialResult('o/alpha', { issuesOpen: 100, prsOpened90d: 20, staleIssueRatio: 0.3 }),
      partialResult('o/bravo', { issuesOpen: 200, prsOpened90d: 10, staleIssueRatio: 0.6 }),
      partialResult('o/charlie', { issuesOpen: 50, prsOpened90d: 5, staleIssueRatio: 0.1 }),
    ]
    const panel = staleWorkAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.panelId).toBe('stale-work')
    expect(panel.contributingReposCount).toBe(3)
    expect(panel.value).not.toBeNull()
    expect(panel.value!.totalOpenIssues).toBe(350)
    expect(panel.value!.totalOpenPullRequests).toBe(35)
    // Weighted avg: (0.3*100 + 0.6*200 + 0.1*50) / (100+200+50) = 155/350
    expect(panel.value!.weightedStaleIssueRatio).toBeCloseTo(155 / 350)
  })

  it('all-unavailable: every repo lacks issuesOpen → panel is unavailable', () => {
    const results = [
      partialResult('o/alpha', { issuesOpen: 'unavailable' }),
      partialResult('o/bravo', { issuesOpen: 'unavailable' }),
    ]
    const panel = staleWorkAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: unavailable repos excluded; repos without staleIssueRatio still contribute counts', () => {
    const results = [
      partialResult('o/alpha', { issuesOpen: 80, prsOpened90d: 15, staleIssueRatio: 0.4 }),
      partialResult('o/bravo', { issuesOpen: 'unavailable' }),
      partialResult('o/charlie', { issuesOpen: 20, prsOpened90d: 3 }),
    ]
    const panel = staleWorkAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value!.totalOpenIssues).toBe(100)
    expect(panel.value!.totalOpenPullRequests).toBe(18)
    // Only alpha has staleIssueRatio, weighted by its issuesOpen
    expect(panel.value!.weightedStaleIssueRatio).toBeCloseTo(0.4)
  })

  it('empty: results array is empty → in-progress with null value', () => {
    const panel = staleWorkAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })
})
