# Data Model: Member Permission Distribution (Issue #288)

## Core Types

### `MemberPermissionDistributionSection`

```typescript
export interface MemberPermissionDistributionSection {
  kind: 'member-permission-distribution'
  applicability: MemberPermissionApplicability
  adminCount: number | null              // injected from stale-admins section
  memberCount: number | null             // from /orgs/{org}/members?role=member
  outsideCollaboratorCount: number | null // from /orgs/{org}/outside_collaborators
  totalCount: number | null              // sum of the above (null if any component is null)
  adminRatio: number | null              // adminCount / totalCount (null if totalCount is null or 0)
  flag: PermissionFlag | null            // set when thresholds exceeded
  unavailableReasons: MemberPermissionUnavailableReason[]
  resolvedAt: string                     // ISO timestamp
}
```

### `MemberPermissionApplicability`

```typescript
export type MemberPermissionApplicability =
  | 'applicable'
  | 'not-applicable-non-org'
  | 'member-list-unavailable'
  | 'partial'                 // some counts available, others not
```

### `PermissionFlag`

```typescript
export interface PermissionFlag {
  kind: 'admin-heavy'
  thresholdBreached: 'ratio' | 'absolute-count' | 'both'
  message: string             // human-readable, e.g. "Admin ratio (25%) exceeds 10% threshold"
}
```

### `MemberPermissionUnavailableReason`

```typescript
export type MemberPermissionUnavailableReason =
  | 'member-list-rate-limited'
  | 'member-list-auth-failed'
  | 'member-list-scope-insufficient'
  | 'collaborator-list-rate-limited'
  | 'collaborator-list-auth-failed'
  | 'collaborator-list-scope-insufficient'
  | 'network'
  | 'unknown'
```

### `RoleCounts` (internal computation type)

```typescript
interface RoleCounts {
  adminCount: number
  memberCount: number
  outsideCollaboratorCount: number
}
```

---

## Config additions (`lib/config/governance.ts`)

```typescript
/** Provisional — to be calibrated via issue #152 */
export const ADMIN_RATIO_FLAG_THRESHOLD = 0.10

/** Flag fires when admin count exceeds this in a small org */
export const ADMIN_COUNT_SMALL_ORG_THRESHOLD = 5

/** Orgs with ≤ this many total members are considered "small" */
export const SMALL_ORG_SIZE_THRESHOLD = 25
```

---

## Flag evaluation logic (`lib/governance/member-permissions.ts`)

```typescript
export function evaluatePermissionFlag(
  adminCount: number,
  totalCount: number,
  config: {
    ratioThreshold: number     // e.g. 0.10
    smallOrgAdminThreshold: number  // e.g. 5
    smallOrgSizeThreshold: number   // e.g. 25
  }
): PermissionFlag | null
```

**Thresholds (both evaluated; either triggers the flag):**

| Condition | Trigger |
|---|---|
| `adminCount / totalCount > ratioThreshold` | ratio breach |
| `totalCount <= smallOrgSizeThreshold && adminCount > smallOrgAdminThreshold` | absolute-count breach |
| Both conditions true | `thresholdBreached: 'both'` |

---

## State transitions

```
ownerType = 'User' ──────────────────────────────→ applicability: 'not-applicable-non-org'
ownerType = 'Organization'
  └─ member fetch fails entirely ─────────────────→ applicability: 'member-list-unavailable'
  └─ member fetch ok, collaborator fetch fails ───→ applicability: 'partial' (outsideCollaboratorCount: null)
  └─ all fetches ok ───────────────────────────────→ applicability: 'applicable'
      └─ flag eval → PermissionFlag | null
```
