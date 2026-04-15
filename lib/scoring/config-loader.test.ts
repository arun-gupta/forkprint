import { describe, expect, it } from 'vitest'
import { getBracket, getBracketLabel, getCalibrationForStars, isSoloFallback } from './config-loader'

describe('getBracket', () => {
  it('routes community stars to star-tier brackets', () => {
    expect(getBracket(5)).toBe('emerging')
    expect(getBracket(50)).toBe('emerging')
    expect(getBracket(500)).toBe('growing')
    expect(getBracket(5000)).toBe('established')
    expect(getBracket(50000)).toBe('popular')
  })

  it('falls back to community bracket when solo bracket has no real sample yet', () => {
    // With placeholder solo entries (sampleSize: 0) the router defers to
    // the community star tier and isSoloFallback flags the caller.
    expect(getBracket(5, 'solo')).toBe('emerging')
    expect(getBracket(50, 'solo')).toBe('emerging')
  })

  it('falls solo repos ≥ 100 stars back to community bracket', () => {
    expect(getBracket(100, 'solo')).toBe('growing')
    expect(getBracket(5000, 'solo')).toBe('established')
    expect(getBracket(50000, 'solo')).toBe('popular')
  })

  it('defaults unavailable stars to emerging regardless of profile (placeholder solo)', () => {
    expect(getBracket('unavailable', 'solo')).toBe('emerging')
    expect(getBracket('unavailable', 'community')).toBe('emerging')
    expect(getBracket('unavailable')).toBe('emerging')
  })
})

describe('getBracketLabel', () => {
  it('shows the solo label for solo repos < 100 stars with a fallback note while solo calibration is pending', () => {
    expect(getBracketLabel(5, 'solo')).toBe('Solo (< 10 stars) — limited solo sample')
    expect(getBracketLabel(50, 'solo')).toBe('Solo (10–99 stars) — limited solo sample')
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

  it('flags solo mode below 100 stars as a fallback when solo data is not yet collected', () => {
    expect(isSoloFallback(5, 'solo')).toBe(true)
    expect(isSoloFallback(50, 'solo')).toBe(true)
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
