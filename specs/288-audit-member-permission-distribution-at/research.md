# Research: Member Permission Distribution (Issue #288)

## Decision 1: Admin count sharing with Stale Admins panel (FR-007)

**Decision**: `OrgBucketContent` passes the admin count derived from the stale-admins section to the new panel. `/api/org/member-permissions` fetches only role=member and outside_collaborators — NOT role=admin.

**Rationale**: The spec explicitly prohibits a duplicate `GET /orgs/{org}/members?role=admin` call. `OrgBucketContent` already renders both panels and holds the stale-admins hook state, so the admin count (`section.admins.length`) is available without any new fetch. The distribution panel receives `adminCount` as a prop from the parent.

**Alternatives considered**:
- Server-side cache/deduplication: adds complexity with no benefit in a stateless Next.js app.
- Merge both API routes into one: over-fetches activity data and couples unrelated concerns.

---

## Decision 2: Outside collaborator endpoint

**Decision**: Use `GET /orgs/{org}/outside_collaborators?per_page=100` (a single paginated org-level endpoint), not per-repo aggregation.

**Rationale**: The GitHub REST API exposes outside collaborators at the org level directly. The spec's reference to "aggregated across org repos" was an approximation of the underlying data — the actual API call is simpler and more complete. The spec Assumptions section will be updated in the plan notes.

**Alternatives considered**: Per-repo collaborator aggregation (`/repos/{owner}/{repo}/collaborators?affiliation=outside`) — requires iterating all repos, dramatically more API calls, and still may miss collaborators added at the org level.

---

## Decision 3: New REST fetcher functions needed

**Decision**: Add two functions to `lib/analyzer/github-rest.ts`:
- `fetchOrgMembers(token, org)` → `OrgMemberListResult` — calls `GET /orgs/{org}/members?role=member`
- `fetchOrgOutsideCollaborators(token, org)` → `OrgCollaboratorListResult` — calls `GET /orgs/{org}/outside_collaborators`

**Rationale**: No equivalent functions exist. Both follow the established paginated pattern of `fetchOrgAdmins()` exactly. Return types follow `{ kind: 'ok'; members: { login: string }[] }` discriminated union pattern.

---

## Decision 4: Threshold config placement

**Decision**: Extend `lib/config/governance.ts` with:
```
ADMIN_RATIO_FLAG_THRESHOLD = 0.10  (10%, provisional — tracked in issue #152)
ADMIN_COUNT_SMALL_ORG_THRESHOLD = 5  (>5 admins triggers flag in small orgs)
SMALL_ORG_SIZE_THRESHOLD = 25  (org size ≤ 25 = "small org")
```

**Rationale**: FR-006 mandates config-driven thresholds. `lib/config/governance.ts` is the established home for governance-related thresholds (already holds stale-admin day thresholds).

---

## Decision 5: API route architecture

**Decision**: New route at `/app/api/org/member-permissions/route.ts`. Query params: `org`, `ownerType`. Returns `{ section: MemberPermissionDistributionSection }`.

**Rationale**: Follows the established pattern of `/api/org/stale-admins` and `/api/org/two-factor`. The route fetches member count and outside collaborator count only; admin count is injected by the parent component. The route returns a discriminated-union `MemberPermissionDistributionSection` with `applicability` field for N/A and unavailable states.

---

## Decision 6: Flag logic placement

**Decision**: Flag evaluation logic lives in `lib/governance/member-permissions.ts` as a pure function `evaluatePermissionFlag(adminCount, totalCount, config)`.

**Rationale**: Keeps logic independently testable (constitution §XI). Flag logic is ~5 lines but must be unit-tested against threshold boundary conditions.
