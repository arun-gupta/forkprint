import type { StaleAdminThresholdDays } from '@/lib/config/governance'

export type StaleAdminClassification =
  | 'active'
  | 'stale'
  | 'no-public-activity'
  | 'unavailable'

export type StaleAdminActivitySource = 'public-events' | 'org-commit-search'

export type StaleAdminUnavailableReason =
  | 'admin-account-404'
  | 'events-fetch-failed'
  | 'commit-search-failed'
  | 'rate-limited'

export type StaleAdminMode =
  | 'baseline'
  | 'elevated-effective'
  | 'elevated-ineffective'

export interface StaleAdminRecord {
  username: string
  classification: StaleAdminClassification
  lastActivityAt: string | null
  lastActivitySource: StaleAdminActivitySource | null
  unavailableReason: StaleAdminUnavailableReason | null
}

export type StaleAdminsApplicability =
  | 'applicable'
  | 'not-applicable-non-org'
  | 'admin-list-unavailable'

export type AdminListUnavailableReason =
  | 'rate-limited'
  | 'auth-failed'
  | 'network'
  | 'scope-insufficient'
  | 'unknown'

export interface StaleAdminsSection {
  kind: 'stale-admins'
  applicability: StaleAdminsApplicability
  mode: StaleAdminMode
  thresholdDays: StaleAdminThresholdDays
  admins: StaleAdminRecord[]
  adminListUnavailableReason?: AdminListUnavailableReason
  resolvedAt: string
}

export interface AdminActivityInput {
  username: string
  lastActivityAt: string | null
  lastActivitySource: StaleAdminActivitySource | null
  error: StaleAdminUnavailableReason | null
}

const DAY_MS = 86_400_000

export function classifyAdmin(
  input: AdminActivityInput,
  thresholdDays: StaleAdminThresholdDays,
  now: Date,
): StaleAdminRecord {
  if (input.error) {
    return {
      username: input.username,
      classification: 'unavailable',
      lastActivityAt: null,
      lastActivitySource: null,
      unavailableReason: input.error,
    }
  }

  if (!input.lastActivityAt) {
    return {
      username: input.username,
      classification: 'no-public-activity',
      lastActivityAt: null,
      lastActivitySource: null,
      unavailableReason: null,
    }
  }

  const lastMs = Date.parse(input.lastActivityAt)
  const ageDays = (now.getTime() - lastMs) / DAY_MS
  const classification: StaleAdminClassification =
    ageDays > thresholdDays ? 'stale' : 'active'

  return {
    username: input.username,
    classification,
    lastActivityAt: input.lastActivityAt,
    lastActivitySource: input.lastActivitySource,
    unavailableReason: null,
  }
}
