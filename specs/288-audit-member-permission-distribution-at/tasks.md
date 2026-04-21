# Tasks: Audit Member Permission Distribution at Org Level

**Input**: Design documents from `/specs/288-audit-member-permission-distribution-at/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: TDD is mandatory per constitution §XI. Test tasks appear before their implementation tasks in every phase.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add threshold config constants — required by all downstream phases.

- [X] T001 Add `ADMIN_RATIO_FLAG_THRESHOLD` (0.10), `ADMIN_COUNT_SMALL_ORG_THRESHOLD` (5), and `SMALL_ORG_SIZE_THRESHOLD` (25) constants with calibration note (issue #152) to `lib/config/governance.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Types, flag logic, REST fetchers, and API route — shared infrastructure that all three user stories depend on.

⚠️ **CRITICAL**: No user story phase can begin until this phase is complete.

### Tests first (write and verify FAIL before implementing)

- [X] T002 Write unit tests for `MemberPermissionDistributionSection` type shape, `evaluatePermissionFlag()` boundary conditions (ratio >10%, absolute >5 in small org, both-breach, no-breach), and `'partial'` applicability in `lib/governance/member-permissions.test.ts`
- [X] T003 [P] Write unit tests for `fetchOrgMembers(token, org)` (happy path, pagination, rate-limit, auth-failed, scope-insufficient) in `lib/analyzer/github-rest.test.ts`
- [X] T004 [P] Write unit tests for `fetchOrgOutsideCollaborators(token, org)` (happy path, pagination, rate-limit, auth-failed) in `lib/analyzer/github-rest.test.ts`
- [X] T005 Write route tests covering: N/A for ownerType=User, member-list-unavailable, partial (collaborator fails), applicable with counts, correct JSON shape `{ section: MemberPermissionDistributionSection }` in `app/api/org/member-permissions/route.test.ts`

### Implementation

- [X] T006 Implement `MemberPermissionDistributionSection`, `PermissionFlag`, `MemberPermissionApplicability`, `MemberPermissionUnavailableReason` types and `evaluatePermissionFlag()` pure function in `lib/governance/member-permissions.ts` — verify T002 passes
- [X] T007 [P] Implement `fetchOrgMembers(token, org)` with pagination in `lib/analyzer/github-rest.ts` following the `fetchOrgAdmins` pattern — verify T003 passes
- [X] T008 [P] Implement `fetchOrgOutsideCollaborators(token, org)` with pagination in `lib/analyzer/github-rest.ts` — verify T004 passes
- [X] T009 Implement `GET /api/org/member-permissions` route in `app/api/org/member-permissions/route.ts`: fetch role=member and outside_collaborators only (NOT role=admin), build section, apply flag logic — verify T005 passes

**Checkpoint**: All foundational tests pass. User story phases can now begin.

---

## Phase 3: User Story 1 — View Role Distribution on Org Page (Priority: P1) 🎯 MVP

**Goal**: Panel shows admin / member / outside-collaborator counts + percentages; renders "N/A" for non-org inputs.

**Independent Test**: Navigate to any analyzed org in the app → Governance tab → "Member permission distribution" panel shows three role counts with percentages. Analyze a user-owned repo → panel shows "N/A".

### Tests first

- [X] T010 Write hook tests for `useMemberPermissionDistribution`: loading state, section returned, error state, N/A passthrough in `components/shared/hooks/useMemberPermissionDistribution.test.ts`
- [X] T011 Write panel component tests for: counts + percentages rendered, N/A state rendered, loading skeleton, unavailable state showing "Unavailable" (not zero) in `components/org-summary/panels/MemberPermissionDistributionPanel.test.tsx`

### Implementation

- [X] T012 [US1] Implement `useMemberPermissionDistribution(options)` hook calling `/api/org/member-permissions` in `components/shared/hooks/useMemberPermissionDistribution.ts` — verify T010 passes
- [X] T013 [US1] Implement `MemberPermissionDistributionPanel` component (counts, percentages, N/A state, loading skeleton, unavailable state) in `components/org-summary/panels/MemberPermissionDistributionPanel.tsx` — verify T011 passes
- [X] T014 [US1] Inject `<MemberPermissionDistributionPanel>` into the governance bucket in `components/org-summary/OrgBucketContent.tsx`, passing `org`, `ownerType`, `token`, and `adminCount` derived from the stale-admins section (`staleAdminsSection?.admins.length ?? null`)

**Checkpoint**: US1 fully functional. Org Governance tab shows role distribution panel.

---

## Phase 4: User Story 2 — Admin-Heavy Flag (Priority: P2)

**Goal**: Panel shows a visible warning badge when admin ratio >10% or >5 admins in an org ≤25 members.

**Independent Test**: Analyze an org where admin ratio exceeds 10% → warning badge appears. Analyze an org within threshold → no badge.

### Tests first

- [X] T015 [US2] Add panel tests for flag rendering: ratio-breach scenario, absolute-count-breach scenario, both-breach scenario, no-flag scenario, and boundary case (exactly 10%) in `components/org-summary/panels/MemberPermissionDistributionPanel.test.tsx`

### Implementation

- [X] T016 [US2] Add flag badge rendering to `MemberPermissionDistributionPanel.tsx` — shows warning with threshold-breached message when `section.flag` is present — verify T015 passes

**Checkpoint**: US1 + US2 functional. Warning badge appears correctly for over-privileged orgs.

---

## Phase 5: User Story 3 — Links to Member Lists (Priority: P3)

**Goal**: Each role count is a link that opens the corresponding filtered GitHub members page in a new tab.

**Independent Test**: Click the admin count → `https://github.com/orgs/{org}/people?query=role%3Aowner` opens in new tab. No links rendered in N/A state.

### Tests first

- [X] T017 [US3] Add panel tests for link rendering: admin count links to correct URL, member count links to correct URL, N/A state renders no links in `components/org-summary/panels/MemberPermissionDistributionPanel.test.tsx`

### Implementation

- [X] T018 [US3] Add `<a href=... target="_blank" rel="noreferrer">` wrapping to role count elements in `MemberPermissionDistributionPanel.tsx`; links absent in N/A and unavailable states — verify T017 passes

**Checkpoint**: All three user stories functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T019 [P] Write Playwright E2E test covering: (a) org input → Governance tab → distribution panel with counts visible, (b) non-org input → N/A panel, (c) if a test org with >10% admins is accessible → flag badge visible in `e2e/member-permission-distribution.spec.ts`
- [X] T020 Update `docs/DEVELOPMENT.md` Phase 2 feature order table to add a row for issue #288 (status: ✅ Done once merged)
- [X] T021 Run `npm test && npm run lint && npm run build` and fix any failures
- [X] T022 Run `@dod-verifier` against this branch and resolve any BLOCKED items before opening PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story phases
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 3 (flag renders inside the panel built in US1)
- **Phase 5 (US3)**: Depends on Phase 3 (links render inside the panel built in US1)
- **Phase 6 (Polish)**: Depends on Phases 3–5

### Within Each Phase

- Test tasks MUST be written and FAIL before corresponding implementation tasks
- T003 and T004 can run in parallel (different fetcher functions)
- T007 and T008 can run in parallel (after T003/T004 respectively)
- T010 and T011 can run in parallel (hook tests vs panel tests)

### Parallel Opportunities

```bash
# Phase 2 — write tests in parallel:
T003: fetchOrgMembers tests
T004: fetchOrgOutsideCollaborators tests

# Phase 2 — implement fetchers in parallel (after tests):
T007: fetchOrgMembers impl
T008: fetchOrgOutsideCollaborators impl

# Phase 3 — write tests in parallel:
T010: hook tests
T011: panel tests
```

---

## Implementation Strategy

### MVP (Phase 1 + 2 + 3 only)

1. T001 — add config
2. T002–T009 — foundational types, fetchers, route (TDD)
3. T010–T014 — hook, panel, integration (TDD)
4. **Validate**: Governance tab shows role distribution for a real org

### Incremental Delivery

1. MVP → role distribution panel live
2. Add US2 (T015–T016) → admin-heavy flag visible
3. Add US3 (T017–T018) → role counts become links
4. Polish + E2E (T019–T022) → PR-ready

---

## Notes

- `[P]` = can run in parallel with other `[P]` tasks in the same phase (different files, no inter-dependency)
- `[US1/2/3]` = maps task to specific user story for traceability
- Admin count is NOT fetched by the new API route — it flows from the stale-admins section via `OrgBucketContent` prop (see T014 and research.md Decision 1)
- The 10% ratio threshold is provisional; see issue #152 for calibration tracking
