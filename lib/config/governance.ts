/** Provisional — to be calibrated against real org data tracked in issue #152 */
export const ADMIN_RATIO_FLAG_THRESHOLD = 0.10

/** Orgs with more than this many admins trigger the flag when org size ≤ SMALL_ORG_SIZE_THRESHOLD */
export const ADMIN_COUNT_SMALL_ORG_THRESHOLD = 5

/** Orgs with this many members or fewer are considered "small" for admin-count flagging */
export const SMALL_ORG_SIZE_THRESHOLD = 25

export const STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS = [30, 60, 90, 180, 365] as const

export type StaleAdminThresholdDays = (typeof STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS)[number]

export const STALE_ADMIN_THRESHOLD_DAYS: StaleAdminThresholdDays = 90

export function isValidStaleAdminThreshold(n: unknown): n is StaleAdminThresholdDays {
  if (typeof n !== 'number') return false
  if (!Number.isInteger(n)) return false
  return (STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS as readonly number[]).includes(n)
}
