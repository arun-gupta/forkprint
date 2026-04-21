import {
  ADMIN_RATIO_FLAG_THRESHOLD,
  ADMIN_COUNT_SMALL_ORG_THRESHOLD,
  SMALL_ORG_SIZE_THRESHOLD,
} from '@/lib/config/governance'

export type MemberPermissionApplicability =
  | 'applicable'
  | 'not-applicable-non-org'
  | 'member-list-unavailable'
  | 'partial'

export type MemberPermissionUnavailableReason =
  | 'admin-list-rate-limited'
  | 'admin-list-auth-failed'
  | 'admin-list-scope-insufficient'
  | 'admin-list-possibly-oauth-restricted'
  | 'member-list-rate-limited'
  | 'member-list-auth-failed'
  | 'member-list-scope-insufficient'
  | 'collaborator-list-rate-limited'
  | 'collaborator-list-auth-failed'
  | 'collaborator-list-scope-insufficient'
  | 'network'
  | 'unknown'

export interface PermissionFlag {
  kind: 'admin-heavy'
  thresholdBreached: 'ratio' | 'absolute-count' | 'both'
  message: string
}

export interface MemberPermissionDistributionSection {
  kind: 'member-permission-distribution'
  applicability: MemberPermissionApplicability
  /** Org owners (role=admin) */
  adminCount: number | null
  /** Non-admin org members (total - admins) */
  memberCount: number | null
  /** Public members only (no read:org needed) */
  publicMemberCount: number | null
  /** Public members with avatars — for the collapsible list */
  publicMembers: { login: string; avatarUrl: string }[] | null
  outsideCollaboratorCount: number | null
  unavailableReasons: MemberPermissionUnavailableReason[]
  resolvedAt: string
  /** Pre-computed flag for tests/overrides; otherwise computed by the panel */
  flag?: PermissionFlag | null
}

interface FlagConfig {
  ratioThreshold: number
  smallOrgAdminThreshold: number
  smallOrgSizeThreshold: number
}

export function evaluatePermissionFlag(
  adminCount: number,
  totalCount: number,
  config: FlagConfig = {
    ratioThreshold: ADMIN_RATIO_FLAG_THRESHOLD,
    smallOrgAdminThreshold: ADMIN_COUNT_SMALL_ORG_THRESHOLD,
    smallOrgSizeThreshold: SMALL_ORG_SIZE_THRESHOLD,
  },
): PermissionFlag | null {
  if (totalCount === 0) return null

  const ratio = adminCount / totalCount
  const ratioBreached = ratio > config.ratioThreshold
  const absoluteBreached =
    totalCount <= config.smallOrgSizeThreshold && adminCount > config.smallOrgAdminThreshold

  if (!ratioBreached && !absoluteBreached) return null

  const thresholdBreached: PermissionFlag['thresholdBreached'] =
    ratioBreached && absoluteBreached ? 'both' : ratioBreached ? 'ratio' : 'absolute-count'

  const pct = Math.round(ratio * 100)
  const message =
    ratioBreached
      ? `Admin ratio (${pct}%) exceeds ${Math.round(config.ratioThreshold * 100)}% threshold`
      : `${adminCount} admins in an org of ${totalCount} exceeds the small-org threshold (>${config.smallOrgAdminThreshold} admins)`

  return { kind: 'admin-heavy', thresholdBreached, message }
}
