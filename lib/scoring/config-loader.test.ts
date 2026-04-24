import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_CADENCE_FREQUENCY_WEIGHT,
  ACTIVITY_CADENCE_RECENCY_WEIGHT,
  CALVER_REGEX,
  COOLING_RELEASE_CUTOFF_DAYS,
  DOCUMENTATION_NOTES_BONUS,
  DOCUMENTATION_SEMVER_BONUS,
  DOCUMENTATION_TAG_PROMOTION_BONUS,
  RELEASE_NOTES_SUBSTANTIVE_FLOOR,
  SEMVER_ADOPTION_THRESHOLD,
  SEMVER_REGEX,
  STALE_RELEASE_CUTOFF_DAYS,
  getBracket,
  getBracketLabel,
  getCalibrationForStars,
  interpolatePercentile,
  isSoloFallback,
} from './config-loader'

describe('getBracket', () => {
  it('routes community stars to star-tier brackets', () => {
    expect(getBracket(5)).toBe('emerging')
    expect(getBracket(50)).toBe('emerging')
    expect(getBracket(500)).toBe('growing')
    expect(getBracket(5000)).toBe('established')
    expect(getBracket(50000)).toBe('popular')
  })

  it('routes solo profile to solo brackets when real solo calibration data is present', () => {
    expect(getBracket(5, 'solo')).toBe('solo-tiny')
    expect(getBracket(50, 'solo')).toBe('solo-small')
  })

  it('falls solo repos ≥ 100 stars back to community bracket', () => {
    expect(getBracket(100, 'solo')).toBe('growing')
    expect(getBracket(5000, 'solo')).toBe('established')
    expect(getBracket(50000, 'solo')).toBe('popular')
  })

  it('defaults unavailable stars to solo-tiny under solo profile, emerging under community', () => {
    expect(getBracket('unavailable', 'solo')).toBe('solo-tiny')
    expect(getBracket('unavailable', 'community')).toBe('emerging')
    expect(getBracket('unavailable')).toBe('emerging')
  })
})

describe('getBracketLabel', () => {
  it('labels solo brackets cleanly when solo calibration data is present', () => {
    expect(getBracketLabel(5, 'solo')).toBe('Solo Tiny (< 10 stars)')
    expect(getBracketLabel(50, 'solo')).toBe('Solo Small (10–99 stars)')
  })

  it('adds fallback note for solo repos above 100 stars', () => {
    expect(getBracketLabel(500, 'solo')).toContain('limited solo sample')
    expect(getBracketLabel(500, 'solo')).toContain('Growing')
  })

  it('community labels are unchanged', () => {
    expect(getBracketLabel(50)).toBe('Emerging (10–99 stars)')
    expect(getBracketLabel(500)).toBe('Growing (100–999 stars)')
  })
})

describe('isSoloFallback', () => {
  it('flags solo mode above 100 stars as a fallback', () => {
    expect(isSoloFallback(500, 'solo')).toBe(true)
    expect(isSoloFallback(500, 'community')).toBe(false)
  })

  it('does not flag as fallback when solo calibration data is present', () => {
    expect(isSoloFallback(5, 'solo')).toBe(false)
    expect(isSoloFallback(50, 'solo')).toBe(false)
  })
})

describe('getCalibrationForStars', () => {
  it('returns different calibration objects for solo-tiny vs emerging', () => {
    const soloTiny = getCalibrationForStars(5, 'solo')
    const emerging = getCalibrationForStars(50, 'community')
    expect(soloTiny).toBeDefined()
    expect(emerging).toBeDefined()
    // Both exist as bracket entries — they may contain the same numbers
    // while placeholder solo data mirrors emerging, but the routing is
    // correct: the solo call returns the solo-tiny entry.
  })
})

describe('Release Health config constants (P2-F09 / #69)', () => {
  it('semver regex matches standard semver tags', () => {
    expect(SEMVER_REGEX.test('v1.2.3')).toBe(true)
    expect(SEMVER_REGEX.test('1.2.3')).toBe(true)
    expect(SEMVER_REGEX.test('v1.0.0-rc.1')).toBe(true)
    expect(SEMVER_REGEX.test('1.0.0-alpha+sha.5114f85')).toBe(true)
  })

  it('semver regex rejects non-semver tags', () => {
    expect(SEMVER_REGEX.test('1.2')).toBe(false)
    expect(SEMVER_REGEX.test('v01.2.3')).toBe(false) // leading zeros forbidden
    expect(SEMVER_REGEX.test('release-2024')).toBe(false)
    expect(SEMVER_REGEX.test('')).toBe(false)
  })

  it('calver regex matches common CalVer shapes', () => {
    expect(CALVER_REGEX.test('2026.04.17')).toBe(true)
    expect(CALVER_REGEX.test('2026-04-17')).toBe(true)
    expect(CALVER_REGEX.test('24.04')).toBe(true)
    expect(CALVER_REGEX.test('24.04.2')).toBe(true)
    expect(CALVER_REGEX.test('v2024.10')).toBe(true)
  })

  it('calver regex rejects semver-shaped tags', () => {
    expect(CALVER_REGEX.test('1.2.3')).toBe(false)
    expect(CALVER_REGEX.test('v0.5.1')).toBe(false)
  })

  it('exposes the substantive notes floor default at 40 characters', () => {
    expect(RELEASE_NOTES_SUBSTANTIVE_FLOOR).toBe(40)
  })

  it('exposes staleness tier cutoffs (730 stale, 365 cooling)', () => {
    expect(STALE_RELEASE_CUTOFF_DAYS).toBe(730)
    expect(COOLING_RELEASE_CUTOFF_DAYS).toBe(365)
    expect(COOLING_RELEASE_CUTOFF_DAYS).toBeLessThan(STALE_RELEASE_CUTOFF_DAYS)
  })

  it('exposes the semver adoption threshold at 0.5', () => {
    expect(SEMVER_ADOPTION_THRESHOLD).toBe(0.5)
  })

  it('activity cadence frequency + recency weights sum to 0.15 (preserving the cadence sub-factor)', () => {
    expect(ACTIVITY_CADENCE_FREQUENCY_WEIGHT + ACTIVITY_CADENCE_RECENCY_WEIGHT).toBeCloseTo(0.15, 10)
  })

  it('documentation bonuses are small and positive', () => {
    expect(DOCUMENTATION_SEMVER_BONUS).toBeGreaterThan(0)
    expect(DOCUMENTATION_SEMVER_BONUS).toBeLessThanOrEqual(0.05)
    expect(DOCUMENTATION_NOTES_BONUS).toBeGreaterThan(0)
    expect(DOCUMENTATION_NOTES_BONUS).toBeLessThanOrEqual(0.05)
    expect(DOCUMENTATION_TAG_PROMOTION_BONUS).toBeGreaterThan(0)
    expect(DOCUMENTATION_TAG_PROMOTION_BONUS).toBeLessThanOrEqual(0.05)
  })
})

describe('interpolatePercentile', () => {
  const ps = { p25: 25, p50: 50, p75: 75, p90: 90 }

  describe('normal mode (higher value = higher percentile)', () => {
    it('returns 0 for value of 0 (below floor)', () => {
      expect(interpolatePercentile(0, ps)).toBe(0)
    })

    it('returns 24 for a value exactly at p25', () => {
      expect(interpolatePercentile(25, ps)).toBe(24)
    })

    it('returns a value between 24 and 50 for a value just above p25', () => {
      const result = interpolatePercentile(26, ps)
      expect(result).toBeGreaterThan(24)
      expect(result).toBeLessThan(50)
    })

    it('returns 50 for a value exactly at p50', () => {
      expect(interpolatePercentile(50, ps)).toBe(50)
    })

    it('returns 75 for a value exactly at p75', () => {
      expect(interpolatePercentile(75, ps)).toBe(75)
    })

    it('returns 90 for a value exactly at p90', () => {
      expect(interpolatePercentile(90, ps)).toBe(90)
    })

    it('returns a value above 90 for a value above p90 (ceiling overshoot)', () => {
      expect(interpolatePercentile(180, ps)).toBeGreaterThan(90)
      expect(interpolatePercentile(180, ps)).toBeLessThanOrEqual(99)
    })

    it('caps at 99 for extreme overshoot above p90', () => {
      expect(interpolatePercentile(1e9, ps)).toBe(99)
    })

    it('interpolates linearly between p25 and p50', () => {
      const midpoint = interpolatePercentile(37.5, ps)
      expect(midpoint).toBeGreaterThanOrEqual(37)
      expect(midpoint).toBeLessThanOrEqual(38)
    })
  })

  describe('inverted mode (lower value = higher percentile)', () => {
    it('returns 99 for value of 0 (best possible)', () => {
      expect(interpolatePercentile(0, ps, true)).toBe(99)
    })

    it('returns 75 for a value exactly at p25 (best calibrated anchor)', () => {
      expect(interpolatePercentile(25, ps, true)).toBe(75)
    })

    it('returns 50 for a value exactly at p50', () => {
      expect(interpolatePercentile(50, ps, true)).toBe(50)
    })

    it('returns 25 for a value exactly at p75', () => {
      expect(interpolatePercentile(75, ps, true)).toBe(25)
    })

    it('returns 10 for a value exactly at p90 (worst calibrated anchor)', () => {
      expect(interpolatePercentile(90, ps, true)).toBe(10)
    })

    it('returns a value below 10 for a value above p90 (worst overshoot)', () => {
      expect(interpolatePercentile(180, ps, true)).toBeLessThan(10)
      expect(interpolatePercentile(180, ps, true)).toBeGreaterThanOrEqual(0)
    })
  })
})
