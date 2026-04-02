import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getDefaultScoreBadges, getScoreBadges, scoreToneClass } from './score-config'

describe('score-config', () => {
  it('returns one default badge per CHAOSS category', () => {
    const badges = getDefaultScoreBadges()

    expect(badges).toHaveLength(3)
    expect(badges.map((badge) => badge.category)).toEqual([
      'Evolution',
      'Sustainability',
      'Responsiveness',
    ])
    expect(badges.every((badge) => badge.value === 'Not scored yet')).toBe(true)
  })

  it('maps tones to consistent classes', () => {
    expect(scoreToneClass('success')).toContain('emerald')
    expect(scoreToneClass('warning')).toContain('amber')
    expect(scoreToneClass('danger')).toContain('red')
    expect(scoreToneClass('neutral')).toContain('slate')
  })

  it('replaces the sustainability placeholder when a real score is available', () => {
    const badges = getScoreBadges(buildResult())

    expect(badges.find((badge) => badge.category === 'Sustainability')?.value).toBe('Medium')
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
    uniqueCommitAuthors90d: 4,
    totalContributors: 'unavailable',
    maintainerCount: 'unavailable',
    commitCountsByAuthor: {
      'login:alice': 5,
      'login:bob': 2,
      'login:carol': 1,
      'login:dave': 1,
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
