export type RateLimitLevel = 'amber' | 'orange' | 'red'

export interface RateLimitSeverity {
  pct: number
  level: RateLimitLevel
  isCountdown: boolean
}

/**
 * Returns the severity of a GitHub rate limit state, or null if the banner
 * should be hidden (> 50% remaining).
 *
 * Thresholds: ≤10% → red + countdown, ≤30% → orange, ≤50% → amber.
 */
export function getRateLimitSeverity(remaining: number, limit: number): RateLimitSeverity | null {
  if (limit <= 0) return null
  const pct = Math.floor((remaining / limit) * 100)
  if (pct > 50) return null
  const isCountdown = pct <= 10
  const level: RateLimitLevel = pct <= 10 ? 'red' : pct <= 30 ? 'orange' : 'amber'
  return { pct, level, isCountdown }
}
