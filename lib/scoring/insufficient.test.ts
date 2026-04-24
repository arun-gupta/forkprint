import { describe, expect, it } from 'vitest'
import { buildResult } from '@/lib/testing/fixtures'
import { getActivityScore } from '@/lib/activity/score-config'
import { getResponsivenessScore } from '@/lib/responsiveness/score-config'
import { getContributorsScore } from '@/lib/contributors/score-config'

describe('insufficient score value parity', () => {
  it('all scoring modules return the same value string when all inputs are unavailable', () => {
    const result = buildResult()
    expect(getActivityScore(result).value).toBe('Insufficient verified public data')
    expect(getResponsivenessScore(result).value).toBe('Insufficient verified public data')
    expect(getContributorsScore(result).value).toBe('Insufficient verified public data')
  })

  it('all scoring modules return neutral tone when all inputs are unavailable', () => {
    const result = buildResult()
    expect(getActivityScore(result).tone).toBe('neutral')
    expect(getResponsivenessScore(result).tone).toBe('neutral')
    expect(getContributorsScore(result).tone).toBe('neutral')
  })
})
