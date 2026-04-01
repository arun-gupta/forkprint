import { describe, expect, it } from 'vitest'
import { buildBubbleChartPoints, buildEcosystemRows } from '@/lib/ecosystem-map/chart-data'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

describe('buildEcosystemRows', () => {
  it('formats visible ecosystem metrics for successful repositories', () => {
    const results = [
      buildResult({
        repo: 'facebook/react',
        stars: 244295,
        forks: 50872,
        watchers: 6660,
      }),
    ]

    expect(buildEcosystemRows(results)).toEqual([
      {
        repo: 'facebook/react',
        starsLabel: '244,295',
        forksLabel: '50,872',
        watchersLabel: '6,660',
        classificationLabel: null,
        plotStatusNote: null,
      },
    ])
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

    expect(buildEcosystemRows(results)).toEqual([
      {
        repo: 'facebook/react',
        starsLabel: 'unavailable',
        forksLabel: '50,872',
        watchersLabel: 'unavailable',
        classificationLabel: null,
        plotStatusNote: 'Could not plot this repository because ecosystem metrics were incomplete.',
      },
    ])
  })

  it('builds bubble chart points only for plot-eligible repositories', () => {
    const results = [
      buildResult({
        repo: 'facebook/react',
        stars: 244295,
        forks: 50872,
        watchers: 6660,
      }),
      buildResult({
        repo: 'vercel/next.js',
        stars: 'unavailable',
        forks: 12000,
        watchers: 2000,
      }),
    ]

    expect(buildBubbleChartPoints(results)).toEqual([
      {
        repo: 'facebook/react',
        x: 244295,
        y: 50872,
        r: 20,
      },
    ])
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
    commitCountsByAuthor: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}
