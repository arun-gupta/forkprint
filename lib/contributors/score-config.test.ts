import { describe, expect, it } from 'vitest'
import { computeContributionConcentration, getSustainabilityScore } from './score-config'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

describe('contributors/score-config', () => {
  it('computes contribution concentration from the top 20 percent of contributors', () => {
    expect(
      computeContributionConcentration({
        'login:alice': 5,
        'login:bob': 3,
        'login:carol': 2,
        'login:dave': 1,
        'login:erin': 1,
      }),
    ).toBeCloseTo(5 / 12)
  })

  it('returns a high sustainability score for broadly distributed contributor activity', () => {
    const score = getSustainabilityScore(
      buildResult({
        commitCountsByAuthor: {
          'login:alice': 2,
          'login:bob': 2,
          'login:carol': 2,
          'login:dave': 2,
          'login:erin': 2,
        },
      }),
    )

    expect(score.value).toBe('High')
    expect(score.tone).toBe('success')
  })

  it('returns insufficient data when contributor distribution cannot be verified', () => {
    const score = getSustainabilityScore(buildResult({ commitCountsByAuthor: 'unavailable' }))

    expect(score.value).toBe('Insufficient verified public data')
    expect(score.tone).toBe('neutral')
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
    uniqueCommitAuthors90d: 5,
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
