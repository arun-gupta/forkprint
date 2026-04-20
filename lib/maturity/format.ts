/**
 * Shared maturity-signal formatting utilities (P2-F11 / #74).
 *
 * These functions are consumed by lib/metric-cards/view-model.ts,
 * lib/export/markdown-export.ts, and lib/comparison/sections.ts.
 * They are pure and framework-agnostic (constitution §IV).
 */

/**
 * Formats an `ageInDays` value as a human-readable duration string.
 * Returns '—' for unavailable/undefined inputs.
 */
export function formatMaturityAge(value: number | 'unavailable' | undefined): string {
  if (typeof value !== 'number') return '—'
  if (value < 30) return `${Math.round(value)} d`
  if (value < 365) return `${Math.round(value / 30.4375)} mo`
  const years = value / 365.25
  return `${years.toFixed(years >= 10 ? 0 : 1)} yr`
}

/**
 * Formats an age-normalized rate field (`starsPerYear`, `contributorsPerYear`,
 * or `commitsPerMonthLifetime`). Returns:
 * - '—' for unavailable/undefined
 * - 'Too new to normalize' for 'too-new'
 * - A formatted number with the supplied unit suffix otherwise
 */
export function formatNormalizedRate(
  value: number | 'too-new' | 'unavailable' | undefined,
  unit: '/yr' | '/mo',
): string {
  if (value === undefined || value === 'unavailable') return '—'
  if (value === 'too-new') return 'Too new to normalize'
  const formatted = value >= 100
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)
  return `${formatted} ${unit}`
}

/**
 * Formats a `growthTrajectory` value for display.
 * Returns 'Insufficient verified public data' for unavailable/undefined inputs.
 */
export function formatGrowthTrajectory(
  value: 'accelerating' | 'stable' | 'declining' | 'unavailable' | undefined,
): string {
  if (value === undefined || value === 'unavailable') return 'Insufficient verified public data'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/**
 * Maps a `growthTrajectory` value to a sort-stable ordinal for comparison tables.
 * 'accelerating' → 2, 'stable' → 1, 'declining' → 0, anything else → 'unavailable'.
 */
export function trajectoryToOrdinal(
  value: 'accelerating' | 'stable' | 'declining' | 'unavailable' | undefined,
): 0 | 1 | 2 | 'unavailable' {
  if (value === 'accelerating') return 2
  if (value === 'stable') return 1
  if (value === 'declining') return 0
  return 'unavailable'
}
