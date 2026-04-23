import { describe, expect, it } from 'vitest'
import { getRateLimitSeverity } from './rate-limit'

describe('getRateLimitSeverity', () => {
  it('returns null when remaining is above 50%', () => {
    expect(getRateLimitSeverity(2600, 5000)).toBeNull() // 52%
    expect(getRateLimitSeverity(5000, 5000)).toBeNull() // 100%
    expect(getRateLimitSeverity(2551, 5000)).toBeNull() // 51.02% → floors to 51
  })

  it('shows amber banner at exactly 50%', () => {
    expect(getRateLimitSeverity(2500, 5000)).toEqual({
      pct: 50,
      level: 'amber',
      isCountdown: false,
    })
  })

  it('shows amber banner between 31% and 50%', () => {
    const result = getRateLimitSeverity(1800, 5000) // 36%
    expect(result).toMatchObject({ level: 'amber', isCountdown: false })

    const result2 = getRateLimitSeverity(1550, 5000) // 31%
    expect(result2).toMatchObject({ level: 'amber', isCountdown: false })
  })

  it('shows orange banner between 11% and 30%', () => {
    const result = getRateLimitSeverity(1500, 5000) // 30%
    expect(result).toMatchObject({ level: 'orange', isCountdown: false })

    const result2 = getRateLimitSeverity(1000, 5000) // 20%
    expect(result2).toMatchObject({ level: 'orange', isCountdown: false })

    const result3 = getRateLimitSeverity(550, 5000) // 11%
    expect(result3).toMatchObject({ level: 'orange', isCountdown: false })
  })

  it('shows red banner with countdown at 10% and below', () => {
    expect(getRateLimitSeverity(500, 5000)).toEqual({
      pct: 10,
      level: 'red',
      isCountdown: true,
    })

    expect(getRateLimitSeverity(1, 5000)).toMatchObject({
      level: 'red',
      isCountdown: true,
    })

    expect(getRateLimitSeverity(0, 5000)).toEqual({
      pct: 0,
      level: 'red',
      isCountdown: true,
    })
  })

  it('returns null for a zero limit to avoid division by zero', () => {
    expect(getRateLimitSeverity(0, 0)).toBeNull()
  })

  it('exposes the computed percentage in the result', () => {
    const result = getRateLimitSeverity(1750, 5000) // 35%
    expect(result?.pct).toBe(35)
    expect(result?.level).toBe('amber')
  })
})
