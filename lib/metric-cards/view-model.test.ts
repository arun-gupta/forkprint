import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildMetricCardViewModels } from './view-model'

describe('buildMetricCardViewModels', () => {
  it('builds formatted summary fields and explicit unavailable details', () => {
    const card = buildMetricCardViewModels([
      buildResult({
        repo: 'facebook/react',
        stars: 244295,
        forks: 50872,
        watchers: 6660,
        primaryLanguage: 'unavailable',
        releases12mo: 'unavailable',
        missingFields: ['primaryLanguage', 'releases12mo'],
      }),
    ])[0]!

    expect(card.repo).toBe('facebook/react')
    expect(card.starsLabel).toBe('244,295')
    expect(card.createdAtLabel).toBe('May 24, 2013')
    expect(card.primaryLanguage).toBe('unavailable')
    expect(card.profile?.reachTier).toBe('Exceptional')
    expect(card.scoreBadges).toHaveLength(3)
    expect(card.scoreBadges.find((badge) => badge.category === 'Sustainability')?.value).toBe('Insufficient verified public data')
    expect(card.details.find((detail) => detail.label === 'Releases (12mo)')?.value).toBe('unavailable')
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
    missingFields: [],
    ...overrides,
  }
}
