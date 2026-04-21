# Developer Quickstart: Member Permission Distribution (Issue #288)

## What this feature adds

A new panel in the Governance tab showing org role breakdown (admin / member / outside collaborator counts + percentages) with a configurable admin-heavy flag.

## Key files to touch

| File | Change |
|---|---|
| `lib/config/governance.ts` | Add `ADMIN_RATIO_FLAG_THRESHOLD`, `ADMIN_COUNT_SMALL_ORG_THRESHOLD`, `SMALL_ORG_SIZE_THRESHOLD` |
| `lib/governance/member-permissions.ts` | New file: types + `evaluatePermissionFlag()` |
| `lib/analyzer/github-rest.ts` | Add `fetchOrgMembers()` + `fetchOrgOutsideCollaborators()` |
| `app/api/org/member-permissions/route.ts` | New API route |
| `components/shared/hooks/useMemberPermissionDistribution.ts` | New hook |
| `components/org-summary/panels/MemberPermissionDistributionPanel.tsx` | New panel |
| `components/org-summary/OrgBucketContent.tsx` | Inject panel; pass `adminCount` from stale-admins |

## Critical constraint (FR-007)

The admin count must NOT be fetched independently. It comes from the stale-admins section:

```typescript
// In OrgBucketContent.tsx
const { section: staleAdminsSection } = useStaleAdmins(...)
const adminCount =
  staleAdminsSection?.applicability === 'applicable'
    ? staleAdminsSection.admins.length
    : null

// Passed as prop:
<MemberPermissionDistributionPanel adminCount={adminCount} ... />
```

The new `/api/org/member-permissions` route fetches **only** role=member and outside_collaborators.

## API route (new)

```
GET /api/org/member-permissions?org={org}&ownerType={ownerType}
Authorization: Bearer {token}   (server-side only — cookie-based session)
Response: { section: MemberPermissionDistributionSection }
```

## Flag thresholds (provisional)

Both conditions are evaluated independently; either triggers the flag:
- Admin ratio > 10% (tracked for calibration in issue #152)
- Org size ≤ 25 AND admin count > 5

## Running tests

```bash
npx vitest run lib/governance/member-permissions
npx vitest run lib/analyzer/github-rest
npx vitest run app/api/org/member-permissions
npx vitest run components/org-summary/panels/MemberPermissionDistributionPanel
npm run test:e2e -- --grep "member permission"
```
