/**
 * Contract: Member Permission Distribution (Issue #288)
 *
 * API route: GET /api/org/member-permissions?org={org}&ownerType={ownerType}
 * Response:  { section: MemberPermissionDistributionSection }
 *
 * Note: adminCount is NOT fetched by this route — it is injected by the parent
 * component (OrgBucketContent) from the stale-admins section to avoid a
 * duplicate GET /orgs/{org}/members?role=admin call (FR-007).
 */

export type MemberPermissionApplicability =
  | 'applicable'
  | 'not-applicable-non-org'
  | 'member-list-unavailable'
  | 'partial'

export type MemberPermissionUnavailableReason =
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
  /** Injected from stale-admins section by parent — null when stale-admins not yet loaded */
  adminCount: number | null
  /** From GET /orgs/{org}/members?role=member */
  memberCount: number | null
  /** From GET /orgs/{org}/outside_collaborators */
  outsideCollaboratorCount: number | null
  /** Sum of adminCount + memberCount + outsideCollaboratorCount; null if any is null */
  totalCount: number | null
  /** adminCount / totalCount; null if totalCount is null or 0 */
  adminRatio: number | null
  /** Present when either threshold is exceeded */
  flag: PermissionFlag | null
  unavailableReasons: MemberPermissionUnavailableReason[]
  resolvedAt: string
}

/** API response shape */
export interface MemberPermissionApiResponse {
  section: MemberPermissionDistributionSection
}

/** Props for MemberPermissionDistributionPanel */
export interface MemberPermissionDistributionPanelProps {
  org: string
  ownerType: 'Organization' | 'User'
  token: string | null
  /** Admin count from stale-admins section; null while stale-admins is loading */
  adminCount: number | null
  /** For tests and demo fixtures */
  sectionOverride?: MemberPermissionDistributionSection
  loadingOverride?: boolean
}
