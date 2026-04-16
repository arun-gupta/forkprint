export const STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS = [30, 60, 90, 180, 365] as const

export type StaleAdminThresholdDays = (typeof STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS)[number]

export const STALE_ADMIN_THRESHOLD_DAYS: StaleAdminThresholdDays = 90

export function isValidStaleAdminThreshold(n: unknown): n is StaleAdminThresholdDays {
  if (typeof n !== 'number') return false
  if (!Number.isInteger(n)) return false
  return (STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS as readonly number[]).includes(n)
}
