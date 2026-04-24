import { describe, expect, it } from 'vitest'
import { computeContributionConcentration, getContributorsScore } from './score-config'
import { buildResult } from '@/lib/testing/fixtures'

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

  it('returns a high contributors score for broadly distributed contributor activity', () => {
    const score = getContributorsScore(
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

    expect(typeof score.value).toBe('number')
    expect(score.value).toBeGreaterThanOrEqual(40)
  })

  it('returns insufficient data when contributor distribution cannot be verified', () => {
    const score = getContributorsScore(buildResult({ commitCountsByAuthor: 'unavailable' }))

    expect(score.value).toBe('Insufficient verified public data')
    expect(score.tone).toBe('neutral')
  })
})
