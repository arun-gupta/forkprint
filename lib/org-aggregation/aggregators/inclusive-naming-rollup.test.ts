import { describe, expect, it } from 'vitest'
import type { AnalysisResult, InclusiveNamingCheck } from '@/lib/analyzer/analysis-result'
import { inclusiveNamingRollupAggregator } from './inclusive-naming-rollup'

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

function makeCheck(overrides: Partial<InclusiveNamingCheck> = {}): InclusiveNamingCheck {
  return {
    checkType: 'branch',
    term: 'master',
    passed: true,
    tier: null,
    severity: null,
    replacements: [],
    context: null,
    ...overrides,
  }
}

describe('inclusiveNamingRollupAggregator — FR-023', () => {
  it('typical: sums violations by tier across repos', () => {
    const results = [
      partialResult('o/alpha', {
        inclusiveNamingResult: {
          defaultBranchName: 'master',
          branchCheck: makeCheck({ passed: false, tier: 1, severity: 'Replace immediately' }),
          metadataChecks: [
            makeCheck({ checkType: 'description', term: 'whitelist', passed: false, tier: 2, severity: 'Recommended to replace' }),
          ],
        },
      }),
      partialResult('o/bravo', {
        inclusiveNamingResult: {
          defaultBranchName: 'main',
          branchCheck: makeCheck({ passed: true }),
          metadataChecks: [
            makeCheck({ checkType: 'topic', term: 'dummy', passed: false, tier: 3, severity: 'Consider replacing' }),
          ],
        },
      }),
      partialResult('o/charlie', {
        inclusiveNamingResult: {
          defaultBranchName: 'main',
          branchCheck: makeCheck({ passed: true }),
          metadataChecks: [],
        },
      }),
    ]
    const panel = inclusiveNamingRollupAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(3)
    expect(panel.value).not.toBeNull()

    expect(panel.value!.tier1).toBe(1)
    expect(panel.value!.tier2).toBe(1)
    expect(panel.value!.tier3).toBe(1)
    expect(panel.value!.reposWithAnyViolation).toBe(2)
  })

  it('all-unavailable: every repo lacks inclusiveNamingResult -> panel is unavailable', () => {
    const results = [
      partialResult('o/alpha', { inclusiveNamingResult: 'unavailable' }),
      partialResult('o/bravo', { inclusiveNamingResult: 'unavailable' }),
    ]
    const panel = inclusiveNamingRollupAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: unavailable repos excluded, available ones still contribute', () => {
    const results = [
      partialResult('o/alpha', {
        inclusiveNamingResult: {
          defaultBranchName: 'master',
          branchCheck: makeCheck({ passed: false, tier: 1, severity: 'Replace immediately' }),
          metadataChecks: [],
        },
      }),
      partialResult('o/bravo', { inclusiveNamingResult: 'unavailable' }),
      partialResult('o/charlie', {
        inclusiveNamingResult: {
          defaultBranchName: 'main',
          branchCheck: makeCheck({ passed: true }),
          metadataChecks: [],
        },
      }),
    ]
    const panel = inclusiveNamingRollupAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value!.tier1).toBe(1)
    expect(panel.value!.tier2).toBe(0)
    expect(panel.value!.tier3).toBe(0)
    expect(panel.value!.reposWithAnyViolation).toBe(1)
  })

  it('empty: results array is empty -> in-progress with null value', () => {
    const panel = inclusiveNamingRollupAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })
})
