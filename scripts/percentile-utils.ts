export interface PercentileSet {
  p25: number
  p50: number
  p75: number
  p90: number
}

/**
 * Computes p25/p50/p75/p90 using linear interpolation between adjacent sorted
 * values. Identical to numpy's default (linear) method. Returns zeros for an
 * empty input.
 */
export function computePercentiles(values: number[]): PercentileSet {
  if (values.length === 0) return { p25: 0, p50: 0, p75: 0, p90: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const at = (p: number): number => {
    const idx = (p / 100) * (sorted.length - 1)
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    if (lo === hi) return sorted[lo]!
    return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo)
  }
  return {
    p25: Math.round(at(25) * 1000) / 1000,
    p50: Math.round(at(50) * 1000) / 1000,
    p75: Math.round(at(75) * 1000) / 1000,
    p90: Math.round(at(90) * 1000) / 1000,
  }
}
