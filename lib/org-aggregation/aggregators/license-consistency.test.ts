import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { licenseConsistencyAggregator } from './license-consistency'

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

describe('licenseConsistencyAggregator — FR-022', () => {
  it('typical: groups repos by license, sorts by count descending', () => {
    const results = [
      partialResult('o/alpha', {
        licensingResult: {
          license: { spdxId: 'Apache-2.0', name: 'Apache License 2.0', osiApproved: true, permissivenessTier: 'Permissive' },
          additionalLicenses: [],
          contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
        },
      }),
      partialResult('o/bravo', {
        licensingResult: {
          license: { spdxId: 'MIT', name: 'MIT License', osiApproved: true, permissivenessTier: 'Permissive' },
          additionalLicenses: [],
          contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
        },
      }),
      partialResult('o/charlie', {
        licensingResult: {
          license: { spdxId: 'Apache-2.0', name: 'Apache License 2.0', osiApproved: true, permissivenessTier: 'Permissive' },
          additionalLicenses: [],
          contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
        },
      }),
    ]
    const panel = licenseConsistencyAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(3)
    expect(panel.value).not.toBeNull()

    // Apache-2.0 appears in 2 repos, MIT in 1 — sorted descending by count
    expect(panel.value!.perLicense).toEqual([
      { spdxId: 'Apache-2.0', count: 2, osiApproved: true },
      { spdxId: 'MIT', count: 1, osiApproved: true },
    ])
    expect(panel.value!.nonOsiCount).toBe(0)
  })

  it('all-unavailable: every repo lacks licensingResult -> panel is unavailable', () => {
    const results = [
      partialResult('o/alpha', { licensingResult: 'unavailable' }),
      partialResult('o/bravo', { licensingResult: 'unavailable' }),
    ]
    const panel = licenseConsistencyAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: unavailable repos excluded, non-OSI repos counted', () => {
    const results = [
      partialResult('o/alpha', {
        licensingResult: {
          license: { spdxId: 'MIT', name: 'MIT License', osiApproved: true, permissivenessTier: 'Permissive' },
          additionalLicenses: [],
          contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
        },
      }),
      partialResult('o/bravo', { licensingResult: 'unavailable' }),
      partialResult('o/charlie', {
        licensingResult: {
          license: { spdxId: null, name: null, osiApproved: false, permissivenessTier: null },
          additionalLicenses: [],
          contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
        },
      }),
    ]
    const panel = licenseConsistencyAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value!.perLicense).toEqual([
      { spdxId: 'MIT', count: 1, osiApproved: true },
      { spdxId: 'Unknown', count: 1, osiApproved: false },
    ])
    expect(panel.value!.nonOsiCount).toBe(1)
  })

  it('empty: results array is empty -> in-progress with null value', () => {
    const panel = licenseConsistencyAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })
})
