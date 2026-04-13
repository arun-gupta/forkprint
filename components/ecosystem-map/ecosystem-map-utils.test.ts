import { describe, expect, it } from 'vitest'
import { buildBubbleChartPoints, buildEcosystemRows } from '@/lib/ecosystem-map/chart-data'
import { buildSpectrumProfile } from '@/lib/ecosystem-map/classification'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

describe('ecosystem map helpers', () => {
  it('formats visible ecosystem metrics for successful repositories', () => {
    const results = [
      buildResult({
        repo: 'facebook/react',
        stars: 244295,
        forks: 50872,
        watchers: 6660,
      }),
    ]

    expect(buildEcosystemRows(results)[0]).toMatchObject({
      repo: 'facebook/react',
      starsLabel: '244,295',
      forksLabel: '50,872',
      watchersLabel: '6,660',
      plotStatusNote: null,
    })
  })

  it('keeps unavailable ecosystem metrics explicit instead of guessing values', () => {
    const results = [
      buildResult({
        repo: 'facebook/react',
        stars: 'unavailable',
        forks: 50872,
        watchers: 'unavailable',
      }),
    ]

    expect(buildEcosystemRows(results)[0]).toMatchObject({
      starsLabel: 'unavailable',
      watchersLabel: 'unavailable',
      plotStatusNote: 'Could not plot this repository because ecosystem metrics were incomplete.',
      profile: null,
    })
  })

  it('builds bubble chart points from stars, fork rate, and watcher rate', () => {
    const results = [
      buildResult({
        repo: 'facebook/react',
        stars: 244295,
        forks: 50872,
        watchers: 6660,
      }),
    ]

    expect(buildBubbleChartPoints(results)).toEqual([
      expect.objectContaining({
        repo: 'facebook/react',
        x: 244295,
        y: expect.closeTo((50872 / 244295) * 100, 5),
        stars: 244295,
        forks: 50872,
        watchers: 6660,
        forkRateLabel: '20.8%',
        watcherRateLabel: '2.7%',
      }),
    ])
  })

  it('builds a config-driven spectrum profile', () => {
    const profile = buildSpectrumProfile(
      buildResult({ repo: 'kubernetes/kubernetes', stars: 121419, forks: 42757, watchers: 3181 }),
    )

    expect(profile).toMatchObject({
      forkRateLabel: '35.2%',
      watcherRateLabel: '2.6%',
    })
    expect(typeof profile!.reachPercentile).toBe('number')
    expect(typeof profile!.engagementPercentile).toBe('number')
    expect(typeof profile!.attentionPercentile).toBe('number')
    expect(profile!.reachLabel).toMatch(/\d+\w{2} percentile/)
    expect(profile!.engagementLabel).toMatch(/\d+\w{2} percentile/)
    expect(profile!.attentionLabel).toMatch(/\d+\w{2} percentile/)
  })
})

function buildResult(overrides: Partial<AnalysisResult>): AnalysisResult {
  return {
    repo: 'facebook/react',
    name: 'react',
    description: 'A UI library',
    createdAt: '2013-05-24T16:15:54Z',
    primaryLanguage: 'TypeScript',
    stars: 100,
    forks: 25,
    watchers: 10,
    commits30d: 7,
    commits90d: 18,
    releases12mo: 'unavailable',
    prsOpened90d: 4,
    prsMerged90d: 3,
    issuesOpen: 5,
    issuesClosed90d: 6,
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
    defaultBranchName: 'main',
    topics: [],
    inclusiveNamingResult: {
      defaultBranchName: 'main',
      branchCheck: { checkType: 'branch', term: 'main', passed: true, tier: null, severity: null, replacements: [], context: null },
      metadataChecks: [],
    },
    missingFields: [],
    ...overrides,
  }
}
