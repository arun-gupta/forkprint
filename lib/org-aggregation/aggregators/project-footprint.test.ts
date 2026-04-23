import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { projectFootprintAggregator } from './project-footprint'

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

function with365Contributors(
  repo: string,
  commitCountsByAuthor: Record<string, number>,
  extra: Partial<AnalysisResult> = {},
): AnalysisResult {
  return partialResult(repo, {
    contributorMetricsByWindow: {
      30: { uniqueCommitAuthors: 'unavailable', commitCountsByAuthor: 'unavailable', repeatContributors: 'unavailable', newContributors: 'unavailable', commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      60: { uniqueCommitAuthors: 'unavailable', commitCountsByAuthor: 'unavailable', repeatContributors: 'unavailable', newContributors: 'unavailable', commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      90: { uniqueCommitAuthors: 'unavailable', commitCountsByAuthor: 'unavailable', repeatContributors: 'unavailable', newContributors: 'unavailable', commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      180: { uniqueCommitAuthors: 'unavailable', commitCountsByAuthor: 'unavailable', repeatContributors: 'unavailable', newContributors: 'unavailable', commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      365: { uniqueCommitAuthors: Object.keys(commitCountsByAuthor).length, commitCountsByAuthor, repeatContributors: 'unavailable', newContributors: 'unavailable', commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
    },
    ...extra,
  })
}

const CONTEXT = { totalReposInRun: 3, flagshipRepos: [], inactiveRepoWindowMonths: 12 }

describe('projectFootprintAggregator — FR-019', () => {
  it('deduplicates contributors across repos: 3 humans in 5 repos shows 3 not 6', () => {
    // alice and bob appear in two repos each; carol in one — 3 unique total
    const results = [
      with365Contributors('o/repo-a', { alice: 10, bob: 5 }, { stars: 100, forks: 10, watchers: 20 }),
      with365Contributors('o/repo-b', { alice: 3, carol: 8 }, { stars: 50, forks: 5, watchers: 10 }),
      with365Contributors('o/repo-c', { bob: 2 }, { stars: 200, forks: 30, watchers: 60 }),
    ]
    const panel = projectFootprintAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.value?.totalContributors).toBe(3)
    expect(panel.value?.totalStars).toBe(350)
    expect(panel.value?.totalForks).toBe(45)
    expect(panel.value?.totalWatchers).toBe(90)
  })

  it('all-365d-unavailable: every repo lacks 365d contributor data → totalContributors is unavailable', () => {
    const results = [
      partialResult('o/alpha', { stars: 100, forks: 10, watchers: 20 }),
      partialResult('o/bravo', { stars: 200, forks: 20, watchers: 40 }),
    ]
    const panel = projectFootprintAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('final')
    expect(panel.value?.totalContributors).toBe('unavailable')
    expect(panel.value?.totalStars).toBe(300)
  })

  it('partial 365d availability: unions repos that have data, ignores unavailable repos', () => {
    const results = [
      with365Contributors('o/has-data', { alice: 5, bob: 3 }, { stars: 100 }),
      partialResult('o/no-data', { stars: 200 }), // no 365d contributors
    ]
    const panel = projectFootprintAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('final')
    expect(panel.value?.totalContributors).toBe(2) // alice + bob from the one repo that has data
    expect(panel.value?.totalStars).toBe(300)
  })

  it('all-fields-unavailable: every repo has all four fields unavailable → panel is unavailable', () => {
    const results = [
      partialResult('o/alpha'),
      partialResult('o/bravo'),
    ]
    const panel = projectFootprintAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed availability: repos with some unavailable star/fork/watcher fields still contribute', () => {
    const results = [
      with365Contributors('o/alpha', { alice: 10 }, { stars: 100, watchers: 50 }),
      partialResult('o/bravo'), // all unavailable — excluded
      with365Contributors('o/charlie', { alice: 3, bob: 5 }, { forks: 5 }),
    ]
    const panel = projectFootprintAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value?.totalStars).toBe(100)
    expect(panel.value?.totalForks).toBe(5)
    expect(panel.value?.totalWatchers).toBe(50)
    expect(panel.value?.totalContributors).toBe(2) // alice + bob (alice deduped)
  })

  it('empty: results array is empty → in-progress with null value', () => {
    const panel = projectFootprintAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })
})
