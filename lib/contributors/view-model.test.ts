import { describe, expect, it } from 'vitest'
import { buildContributorsViewModels } from './view-model'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

describe('contributors/view-model', () => {
  it('builds core and sustainability rows for each repository', () => {
    const section = buildContributorsViewModels([
      buildResult({
        totalContributors: 12,
        maintainerCount: 3,
        commitCountsByAuthor: {
          'login:alice': 4,
          'login:bob': 3,
          'login:carol': 2,
          'login:dave': 1,
          'login:erin': 1,
        },
        commitCountsByExperimentalOrg: {
          meta: 7,
          openai: 3,
          vercel: 1,
        },
        experimentalAttributedAuthors90d: 4,
        experimentalUnattributedAuthors90d: 1,
        uniqueCommitAuthors90d: 5,
      }),
    ])[0]!

    expect(section.repo).toBe('facebook/react')
    expect(section.windowDays).toBe(90)
    expect(section.coreMetrics.find((metric) => metric.label === 'Contributor composition')?.hoverText).toMatch(
      /including anonymous contributors/i,
    )
    expect(section.coreMetrics.find((metric) => metric.label === 'Contributor composition')?.value).toBe('12')
    expect(section.coreMetrics.find((metric) => metric.label === 'Contributor composition')?.secondaryValue).toBe(
      'GitHub API contributors',
    )
    expect(section.coreMetrics.find((metric) => metric.label === 'Contributor composition')?.supportingText).toBe(
      '3 repeat, 2 one-time, 7 inactive',
    )
    expect(section.coreMetrics.find((metric) => metric.label === 'Contributor composition')?.breakdown).toEqual({
      segments: [
        { label: 'Repeat', value: 3, tone: 'strong' },
        { label: 'One-time', value: 2, tone: 'medium' },
        { label: 'Inactive', value: 7, tone: 'light' },
      ],
    })
    expect(section.coreMetrics.find((metric) => metric.label === 'GitHub API contributors')).toBeUndefined()
    expect(section.coreMetrics.find((metric) => metric.label === 'Active contributors (90d)')).toBeUndefined()
    expect(section.coreMetrics.find((metric) => metric.label === 'Contribution concentration')).toBeUndefined()
    expect(section.heatmap[0]?.contributor).toBe('alice')
    expect(section.heatmap.map((cell) => cell.intensity)).toEqual(['max', 'higher', 'high', 'low', 'low'])
    expect(section.sustainabilityMetrics.find((metric) => metric.label === 'Top 20% contributor share')?.value).toBe('36.4%')
    expect(section.sustainabilityMetrics.find((metric) => metric.label === 'Top 20% contributor share')?.supportingText).toBe(
      '1 of 5 active contributors',
    )
    expect(section.sustainabilityMetrics.find((metric) => metric.label === 'Scored contributor group')).toBeUndefined()
    expect(section.sustainabilityMetrics.find((metric) => metric.label === 'Inactive contributors')).toBeUndefined()
    expect(section.sustainabilityMetrics.find((metric) => metric.label === 'Maintainer count')?.value).toBe('3')
    expect(section.sustainabilityMetrics.find((metric) => metric.label === 'Occasional contributors')).toBeUndefined()
    expect(section.sustainabilityMetrics.find((metric) => metric.label === 'Types of contributions')?.value).toBe('Commits, Pull requests, Issues')
    expect(section.experimentalMetrics.find((metric) => metric.label === 'Elephant Factor')?.value).toBe('1')
    expect(section.experimentalMetrics.find((metric) => metric.label === 'Single-vendor dependency ratio')?.value).toBe('63.6%')
    expect(section.experimentalHeatmap.map((cell) => cell.contributor)).toEqual(['meta', 'openai', 'vercel'])
    expect(section.experimentalHeatmap[0]?.commitsLabel).toBe('7 attributed commits')
  })

  it('keeps unavailable contributor values explicit', () => {
    const section = buildContributorsViewModels([buildResult({ commitCountsByAuthor: 'unavailable' })])[0]!

    expect(section.coreMetrics.find((metric) => metric.label === 'Contribution concentration')).toBeUndefined()
    expect(section.heatmap).toEqual([])
    expect(section.sustainabilityScore.value).toBe('Insufficient verified public data')
    expect(section.missingData).toContain('Contribution concentration')
    expect(section.missingData).toContain('Maintainer count')
    expect(section.missingData).not.toContain('Inactive contributors')
    expect(section.missingData).not.toContain('Occasional contributors')
  })

  it('excludes detected bot accounts from recent-commit metrics by default', () => {
    const section = buildContributorsViewModels([
      buildResult({
        totalContributors: 'unavailable',
        uniqueCommitAuthors90d: 4,
        commitCountsByAuthor: {
          'login:alice': 4,
          'login:dependabot[bot]': 3,
          'login:k8s-ci-robot': 2,
          'login:bob': 1,
        },
      }),
    ])[0]!

    expect(section.coreMetrics.find((metric) => metric.label === 'Contributor composition')?.supportingText).toBe('1 repeat, 1 one-time')
    expect(section.heatmap.map((cell) => cell.contributor)).toEqual(['alice', 'bob'])
    expect(section.botModeSummary).toMatch(/excluded from recent-commit contributor metrics for the last 90 days by default/i)
  })

  it('can include detected bot accounts in recent-commit metrics when requested', () => {
    const section = buildContributorsViewModels(
      [
        buildResult({
          totalContributors: 'unavailable',
          uniqueCommitAuthors90d: 4,
          commitCountsByAuthor: {
            'login:alice': 4,
            'login:dependabot[bot]': 3,
            'login:k8s-ci-robot': 2,
            'login:bob': 1,
          },
        }),
      ],
      { includeBots: true },
    )[0]!

    expect(section.coreMetrics.find((metric) => metric.label === 'Contributor composition')?.supportingText).toBe('3 repeat, 1 one-time')
    expect(section.heatmap.map((cell) => cell.contributor)).toEqual(['alice', 'dependabot[bot]', 'k8s-ci-robot', 'bob'])
    expect(section.botModeSummary).toMatch(/including detected bot accounts/i)
  })

  it('uses precomputed contributor metrics for a non-default window when requested', () => {
    const section = buildContributorsViewModels(
      [
        buildResult({
          totalContributors: 12,
          contributorMetricsByWindow: {
            30: {
              uniqueCommitAuthors: 2,
              commitCountsByAuthor: { 'login:alice': 3, 'login:bob': 1 },
              commitCountsByExperimentalOrg: 'unavailable',
              experimentalAttributedAuthors: 'unavailable',
              experimentalUnattributedAuthors: 'unavailable',
            },
            60: {
              uniqueCommitAuthors: 3,
              commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 2, 'login:carol': 1 },
              commitCountsByExperimentalOrg: 'unavailable',
              experimentalAttributedAuthors: 'unavailable',
              experimentalUnattributedAuthors: 'unavailable',
            },
            90: {
              uniqueCommitAuthors: 5,
              commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 },
              commitCountsByExperimentalOrg: 'unavailable',
              experimentalAttributedAuthors: 'unavailable',
              experimentalUnattributedAuthors: 'unavailable',
            },
            180: {
              uniqueCommitAuthors: 5,
              commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 },
              commitCountsByExperimentalOrg: 'unavailable',
              experimentalAttributedAuthors: 'unavailable',
              experimentalUnattributedAuthors: 'unavailable',
            },
            365: {
              uniqueCommitAuthors: 5,
              commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 },
              commitCountsByExperimentalOrg: 'unavailable',
              experimentalAttributedAuthors: 'unavailable',
              experimentalUnattributedAuthors: 'unavailable',
            },
          },
        }),
      ],
      { windowDays: 30 },
    )[0]!

    expect(section.windowDays).toBe(30)
    expect(section.coreMetrics.find((metric) => metric.label === 'Contributor composition')?.supportingText).toBe('1 repeat, 1 one-time, 10 inactive')
    expect(section.sustainabilityMetrics.find((metric) => metric.label === 'Top 20% contributor share')?.supportingText).toBe(
      '1 of 2 active contributors',
    )
  })
})

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo: 'facebook/react',
    name: 'react',
    description: 'The library for web and native user interfaces.',
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
    uniqueCommitAuthors90d: 2,
    totalContributors: 'unavailable',
    maintainerCount: 'unavailable',
    commitCountsByAuthor: {
      'login:alice': 2,
      'login:bob': 1,
    },
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}
