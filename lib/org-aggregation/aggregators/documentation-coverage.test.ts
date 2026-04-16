import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { documentationCoverageAggregator } from './documentation-coverage'

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

describe('documentationCoverageAggregator — FR-024', () => {
  it('typical: computes per-check coverage percentages across repos', () => {
    const results = [
      partialResult('o/alpha', {
        documentationResult: {
          fileChecks: [
            { name: 'readme', found: true, path: 'README.md' },
            { name: 'license', found: true, path: 'LICENSE' },
            { name: 'contributing', found: false, path: null },
          ],
          readmeSections: [],
          readmeContent: null,
        },
      }),
      partialResult('o/bravo', {
        documentationResult: {
          fileChecks: [
            { name: 'readme', found: true, path: 'README.md' },
            { name: 'license', found: false, path: null },
            { name: 'contributing', found: true, path: 'CONTRIBUTING.md' },
          ],
          readmeSections: [],
          readmeContent: null,
        },
      }),
    ]
    const panel = documentationCoverageAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value).not.toBeNull()

    const checks = panel.value!.perCheck
    // Sorted alphabetically by name
    expect(checks.map((c) => c.name)).toEqual(['contributing', 'license', 'readme'])

    const byName = Object.fromEntries(checks.map((c) => [c.name, c]))
    expect(byName.readme.presentReposCount).toBe(2)
    expect(byName.readme.presentInPercent).toBe(100)
    expect(byName.license.presentReposCount).toBe(1)
    expect(byName.license.presentInPercent).toBe(50)
    expect(byName.contributing.presentReposCount).toBe(1)
    expect(byName.contributing.presentInPercent).toBe(50)
  })

  it('all-unavailable: every repo lacks documentationResult -> panel is unavailable', () => {
    const results = [
      partialResult('o/alpha', { documentationResult: 'unavailable' }),
      partialResult('o/bravo', { documentationResult: 'unavailable' }),
    ]
    const panel = documentationCoverageAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: unavailable repos are excluded but available ones still contribute', () => {
    const results = [
      partialResult('o/alpha', {
        documentationResult: {
          fileChecks: [
            { name: 'readme', found: true, path: 'README.md' },
            { name: 'license', found: true, path: 'LICENSE' },
          ],
          readmeSections: [],
          readmeContent: null,
        },
      }),
      partialResult('o/bravo', { documentationResult: 'unavailable' }),
    ]
    const panel = documentationCoverageAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(1)
    expect(panel.value!.perCheck).toHaveLength(2)

    const byName = Object.fromEntries(panel.value!.perCheck.map((c) => [c.name, c]))
    expect(byName.readme.presentInPercent).toBe(100)
    expect(byName.license.presentInPercent).toBe(100)
  })

  it('empty: results array is empty -> in-progress with null value', () => {
    const panel = documentationCoverageAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })
})
