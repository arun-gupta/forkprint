import { describe, it, expect } from 'vitest'
import { buildResult as baseResult } from '@/lib/testing/fixtures'
import { getContributorsScore } from '@/lib/contributors/score-config'
import { getActivityScore } from '@/lib/activity/score-config'
import { MATURITY_CONFIG } from './config-loader'

describe('Contributors age-guard (P2-F11)', () => {
  it('renders "Insufficient" when ageInDays is below the Resilience threshold', () => {
    const result = baseResult({ ageInDays: MATURITY_CONFIG.minimumResilienceScoringAgeDays - 1 })
    const score = getContributorsScore(result)
    expect(score.value).toBe('Insufficient verified public data')
    expect(score.summary).toContain(`${MATURITY_CONFIG.minimumResilienceScoringAgeDays} d`)
  })

  it('does NOT fire when ageInDays is above the threshold', () => {
    const result = baseResult({ ageInDays: MATURITY_CONFIG.minimumResilienceScoringAgeDays + 1 })
    const score = getContributorsScore(result)
    // Falls through to normal scoring — may be numeric or 'Insufficient' for
    // other (non-age) reasons; the guard's summary text must NOT be present.
    if (score.value === 'Insufficient verified public data') {
      expect(score.summary).not.toContain(`${MATURITY_CONFIG.minimumResilienceScoringAgeDays} d`)
    }
  })

  it('does NOT fire when ageInDays is unavailable', () => {
    const result = baseResult({ ageInDays: 'unavailable' as const })
    const score = getContributorsScore(result)
    if (score.value === 'Insufficient verified public data') {
      expect(score.summary).not.toContain(`${MATURITY_CONFIG.minimumResilienceScoringAgeDays} d`)
    }
  })
})

describe('Activity age-guard (P2-F11)', () => {
  it('renders "Insufficient" when ageInDays is below the Activity threshold', () => {
    const result = baseResult({ ageInDays: MATURITY_CONFIG.minimumActivityScoringAgeDays - 1 })
    const score = getActivityScore(result)
    expect(score.value).toBe('Insufficient verified public data')
    expect(score.summary).toContain(`${MATURITY_CONFIG.minimumActivityScoringAgeDays} d`)
  })

  it('does NOT fire when ageInDays is above the threshold', () => {
    const result = baseResult({ ageInDays: MATURITY_CONFIG.minimumActivityScoringAgeDays + 1 })
    const score = getActivityScore(result)
    if (score.value === 'Insufficient verified public data') {
      expect(score.summary).not.toContain(`${MATURITY_CONFIG.minimumActivityScoringAgeDays} d`)
    }
  })

  it('does NOT fire when ageInDays is unavailable', () => {
    const result = baseResult({ ageInDays: 'unavailable' as const })
    const score = getActivityScore(result)
    if (score.value === 'Insufficient verified public data') {
      expect(score.summary).not.toContain(`${MATURITY_CONFIG.minimumActivityScoringAgeDays} d`)
    }
  })
})
