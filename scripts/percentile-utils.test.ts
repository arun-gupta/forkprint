import { describe, expect, it } from 'vitest'
import { computePercentiles } from './percentile-utils'

// Reference implementation of the old Math.ceil nearest-rank method used in
// calibrate-legacy.ts and calibrate.ts before DRY-05 consolidation.
function legacyPercentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((p / 100) * sorted.length) - 1
  return Math.round(sorted[Math.max(0, index)]! * 1000) / 1000
}

function legacyPercentiles(values: number[]) {
  return {
    p25: legacyPercentile(values, 25),
    p50: legacyPercentile(values, 50),
    p75: legacyPercentile(values, 75),
    p90: legacyPercentile(values, 90),
  }
}

describe('computePercentiles', () => {
  describe('algorithm divergence from legacy Math.ceil method', () => {
    it('produces different p25 for a 10-element distribution', () => {
      const dist = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      // legacy: Math.ceil(0.25 * 10) - 1 = index 2 → value 3
      // linear: 0.25 * 9 = 2.25 → interpolate(3, 4, 0.25) = 3.25
      expect(legacyPercentiles(dist).p25).toBe(3)
      expect(computePercentiles(dist).p25).toBe(3.25)
      expect(computePercentiles(dist).p25).not.toBe(legacyPercentiles(dist).p25)
    })

    it('produces different p90 for a 10-element distribution', () => {
      const dist = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      // legacy: Math.ceil(0.9 * 10) - 1 = index 8 → value 9
      // linear: 0.9 * 9 = 8.1 → interpolate(9, 10, 0.1) = 9.1
      expect(legacyPercentiles(dist).p90).toBe(9)
      expect(computePercentiles(dist).p90).toBe(9.1)
    })

    it('agrees with legacy at exact rank boundaries (single-element)', () => {
      expect(computePercentiles([42]).p50).toBe(42)
      expect(legacyPercentiles([42]).p50).toBe(42)
    })
  })

  describe('edge cases', () => {
    it('returns zeros for an empty array', () => {
      expect(computePercentiles([])).toEqual({ p25: 0, p50: 0, p75: 0, p90: 0 })
    })

    it('returns the single value for all percentiles when n=1', () => {
      expect(computePercentiles([7])).toEqual({ p25: 7, p50: 7, p75: 7, p90: 7 })
    })

    it('sorts the input before computing (order-independent)', () => {
      const asc = [1, 2, 3, 4, 5]
      const desc = [5, 4, 3, 2, 1]
      expect(computePercentiles(asc)).toEqual(computePercentiles(desc))
    })

    it('rounds to 3 decimal places', () => {
      // 0.25 * 4 = 1.0 → exact, no fractional rounding needed
      const result = computePercentiles([1, 2, 3, 4, 5])
      expect(result.p25.toString()).toMatch(/^\d+(\.\d{1,3})?$/)
    })
  })

  describe('known values', () => {
    it('computes correct percentiles for [1..10]', () => {
      const result = computePercentiles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      expect(result.p25).toBe(3.25)
      expect(result.p50).toBe(5.5)
      expect(result.p75).toBe(7.75)
      expect(result.p90).toBe(9.1)
    })

    it('computes correct percentiles for a two-element array', () => {
      const result = computePercentiles([0, 100])
      expect(result.p25).toBe(25)
      expect(result.p50).toBe(50)
      expect(result.p75).toBe(75)
      expect(result.p90).toBe(90)
    })
  })
})
