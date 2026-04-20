import { describe, it, expect } from 'vitest'
import {
  MATURITY_CONFIG,
  getBracket,
  getMaturityBracket,
  getMaturityBracketLabel,
} from './config-loader'

describe('MATURITY_CONFIG', () => {
  it('exposes the six documented age thresholds and two ratios', () => {
    expect(MATURITY_CONFIG.minimumNormalizationAgeDays).toBeGreaterThan(0)
    expect(MATURITY_CONFIG.minimumTrajectoryAgeDays).toBeGreaterThanOrEqual(MATURITY_CONFIG.minimumNormalizationAgeDays)
    expect(MATURITY_CONFIG.minimumActivityScoringAgeDays).toBeGreaterThan(0)
    expect(MATURITY_CONFIG.minimumResilienceScoringAgeDays).toBeGreaterThanOrEqual(MATURITY_CONFIG.minimumActivityScoringAgeDays)
    expect(MATURITY_CONFIG.acceleratingRatio).toBeGreaterThan(1)
    expect(MATURITY_CONFIG.decliningRatio).toBeLessThan(1)
    expect(MATURITY_CONFIG.ageStratumBoundaryDays).toBeGreaterThan(0)
  })
})

describe('getMaturityBracket — age-aware routing', () => {
  it('falls back to the unstratified community bracket when stratum has no data', () => {
    // Placeholder entries have sampleSize: 0, so routing should fall through
    // to the existing unstratified community bracket until #152 populates.
    expect(getMaturityBracket(500, 200, 'community')).toBe('growing')
    expect(getMaturityBracket(500, 1000, 'community')).toBe('growing')
    expect(getMaturityBracket(50, 200, 'community')).toBe('emerging')
    expect(getMaturityBracket(5000, 1500, 'community')).toBe('established')
    expect(getMaturityBracket(50_000, 2000, 'community')).toBe('popular')
  })

  it('falls back to the unstratified bracket when age is unavailable', () => {
    expect(getMaturityBracket(500, 'unavailable', 'community')).toBe('growing')
    expect(getMaturityBracket(50_000, 'unavailable', 'community')).toBe('popular')
  })

  it('solo profile bypasses age stratification', () => {
    // Solo brackets have no data at sample size 0 by default, so they already
    // fall back to community. The contract here is that solo routing is
    // entirely independent of ageInDays — passing an age never changes the
    // solo-vs-community decision.
    expect(getMaturityBracket(5, 30, 'solo')).toBe(getBracket(5, 'solo'))
    expect(getMaturityBracket(5, 3000, 'solo')).toBe(getBracket(5, 'solo'))
  })

  it('returns the unstratified bracket regardless of age (current state)', () => {
    // Until stratified entries receive real sample data (#152), both young
    // and mature repos route to the same unstratified community bracket.
    const young = getMaturityBracket(500, MATURITY_CONFIG.ageStratumBoundaryDays - 1, 'community')
    const mature = getMaturityBracket(500, MATURITY_CONFIG.ageStratumBoundaryDays + 1, 'community')
    expect(young).toBe('growing')
    expect(mature).toBe('growing')
  })
})

describe('getMaturityBracketLabel', () => {
  it('returns the existing unstratified label when routing falls back', () => {
    expect(getMaturityBracketLabel(500, 200, 'community')).toBe('Growing (100–999 stars)')
    expect(getMaturityBracketLabel(50, 200, 'community')).toBe('Emerging (10–99 stars)')
  })

  it('preserves the solo "limited sample" suffix when appropriate', () => {
    // stars ≥ 100 under solo profile triggers the fallback suffix.
    const label = getMaturityBracketLabel(500, 200, 'solo')
    expect(label).toContain('limited solo sample')
  })
})
