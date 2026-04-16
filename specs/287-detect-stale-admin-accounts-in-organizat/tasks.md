---
description: "Task list for feature 287 — Stale Admin Detection"
---

# Tasks: Stale Admin Detection (#287)

**Input**: Design documents from `/specs/287-detect-stale-admin-accounts-in-organizat/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Constitution Section XI makes TDD NON-NEGOTIABLE. Every implementation task is preceded by a failing test task. Tests are **required**, not optional, throughout this feature.

**Organization**: Tasks are grouped by user story from `spec.md`. Each user story can be delivered as an independent increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Exact absolute or repo-relative file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Trivial initialization. The repo already has TypeScript, Next.js, Vitest, and Playwright configured — no new tooling.

- [X] T001 Reserve a row for this feature in the Phase 2 implementation-order table at `docs/DEVELOPMENT.md` (leave Status blank; will be flipped to ✅ Done in Phase N). The feature ID is `P2-F13` or the next free identifier in the table at implementation time.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Framework-agnostic logic and REST helpers that every user story depends on. No user-story work begins until this phase is complete.

**⚠️ CRITICAL**: All of Phase 2 must be green (tests + lint + typecheck) before Phase 3 begins.

### Threshold config

- [X] T002 [P] Write failing unit tests at `lib/config/governance.test.ts` covering: (a) `STALE_ADMIN_THRESHOLD_DAYS` equals 90; (b) `STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS` is exactly `[30,60,90,180,365]`; (c) `isValidStaleAdminThreshold` accepts each allowed value and rejects `0`, `-1`, `77`, `'90'`, `null`, `undefined`.
- [X] T003 Implement `lib/config/governance.ts` exporting `STALE_ADMIN_ALLOWED_THRESHOLDS_DAYS` (as `const`), `StaleAdminThresholdDays` type, `STALE_ADMIN_THRESHOLD_DAYS = 90`, and `isValidStaleAdminThreshold(n: unknown)`. Make T002 pass.

### Pure classifier + shared types

- [X] T004 [P] Write failing unit tests at `lib/governance/stale-admins.test.ts` covering `classifyAdmin(input, thresholdDays, now)` for every branch of the state machine in `data-model.md`: (a) active at exact boundary (age = threshold → active); (b) stale one day past boundary; (c) `no-public-activity` when both sources empty and no error; (d) `unavailable` when `error === 'rate-limited'` even if a timestamp is present; (e) `unavailable` for `admin-account-404`; (f) union-state invariants (e.g. `lastActivityAt` is null iff classification is `no-public-activity` or `unavailable`).
- [X] T005 Implement `lib/governance/stale-admins.ts` exporting the types from `specs/287-detect-stale-admin-accounts-in-organizat/contracts/stale-admin-types.ts` and the pure `classifyAdmin()` function. No Next.js, React, or `fetch` imports in this file. Make T004 pass.

### REST helpers (extend `lib/analyzer/github-rest.ts`)

- [X] T006 [P] Write failing unit tests for `fetchOrgAdmins(org, token)` in `lib/analyzer/github-rest.test.ts` (extend if it exists; create if not): (a) sends `GET /orgs/{org}/members?role=admin&per_page=100` with the bearer token; (b) follows `Link: rel="next"` and concatenates pages; (c) maps 403+rate-limit headers to `{ kind: 'rate-limited' }`; (d) maps 401 to `auth-failed`; (e) maps 404 to `unknown`; (f) maps network error to `network`.
- [X] T007 [P] Write failing unit tests for `fetchUserPublicEvents(username, token)` in `lib/analyzer/github-rest.test.ts`: (a) reads `response[0].created_at`; (b) returns `null` timestamp on empty array; (c) maps 404 to `admin-account-404`; (d) 403+rate-limit → `rate-limited`; (e) other failures → `events-fetch-failed`.
- [X] T008 [P] Write failing unit tests for `fetchUserLatestOrgCommit(username, org, token)` in `lib/analyzer/github-rest.test.ts`: (a) hits `/search/commits?q=author:{u}+org:{o}&sort=author-date&order=desc&per_page=1`; (b) reads `items[0].commit.author.date`; (c) returns `null` on `total_count === 0`; (d) 403+rate-limit → `rate-limited`; (e) 422/5xx → `commit-search-failed`.
- [X] T009 [P] Write failing unit tests for `fetchUserOrgMembership(username, org, token)` in `lib/analyzer/github-rest.test.ts`: (a) 200 + `state:'active'` → `{ isMember: true }`; (b) 404 → `{ isMember: false }`; (c) any other failure → `{ isMember: false, reason: 'unknown' }` (honest conservative default).
- [X] T010 Implement `fetchOrgAdmins`, `fetchUserPublicEvents`, `fetchUserLatestOrgCommit`, and `fetchUserOrgMembership` in `lib/analyzer/github-rest.ts`. Reuse the existing concurrency-cap / rate-limit-header pattern already in the file. Make T006–T009 pass.

### AuthContext scope surfacing (needed by US1 baseline too, for the mode indicator's `baseline` display)

- [X] T011 [P] Write failing unit test at `components/auth/AuthContext.test.tsx` (extend if it exists) asserting the session object exposes a `scopes: readonly string[]` field and a `hasScope(name)` helper that returns `true` only for granted scopes. Default on a baseline sign-in is `['public_repo']`.
- [X] T012 Extend `components/auth/AuthContext.tsx` (and the OAuth callback plumbing at `app/api/auth/callback/route.ts` as needed) to parse the space-separated `scope` field from the token-grant response and store it on the session. Make T011 pass. **No token logging is added.**

**Checkpoint**: Foundation is green. Every user story can now start.

---

## Phase 3: User Story 1 — Spot stale admins on an organization at a glance (Priority: P1) 🎯 MVP

**Goal**: On the org-summary view, every publicly-listed admin of the analyzed org renders with their most-recent public-activity timestamp and a clearly visible "stale" flag when past the configured threshold.

**Independent Test**: Sign in baseline (no elevation checkbox), analyze a public org that has a mix of recently-active and long-inactive publicly-listed admins. Verify each admin row renders with a timestamp and that only admins past threshold carry the stale flag.

### Tests for User Story 1 (TDD — write first, expect RED)

- [X] T013 [P] [US1] Write failing unit tests at `lib/org-aggregation/aggregators/stale-admins.test.ts` for `buildStaleAdminsSection(ctx)` on the baseline path: (a) calls `fetchOrgAdmins` once; (b) for each returned admin, calls `fetchUserPublicEvents` and falls back to `fetchUserLatestOrgCommit` when events are empty; (c) returns a `StaleAdminsSection` with `mode: 'baseline'`, `applicability: 'applicable'`, one `StaleAdminRecord` per admin, `thresholdDays: 90`; (d) a single admin's fetch failure yields that admin's record as `unavailable` while other admins classify normally (per-admin error isolation, Constitution X.5); (e) `fetchOrgAdmins` failure yields `applicability: 'admin-list-unavailable'` with a mapped reason; (f) membership probe is NOT called on the baseline path.
- [X] T014 [P] [US1] Write failing React Testing Library tests at `components/org-summary/panels/StaleAdminsPanel.test.tsx` covering the baseline-mode rendering: (a) renders one row per admin with username and classification; (b) shows the last-activity timestamp for `active` and `stale` rows; (c) `stale` rows carry a visible stale badge (a specific test id / accessible name — not a color-only signal); (d) mode indicator reads "Baseline — public admins only".

### Implementation for User Story 1

- [X] T015 [US1] Implement `lib/org-aggregation/aggregators/stale-admins.ts` exporting `buildStaleAdminsSection(ctx)`. Baseline path only in this task (elevated path lands in US3). Wire per-admin concurrency via the existing bounded pool in `lib/analyzer/github-rest.ts`. Make T013 pass.
- [X] T016 [US1] Register the aggregator by exporting it from `lib/org-aggregation/aggregators/index.ts` and wiring it into `lib/org-aggregation/view-model.ts` so it is invoked during an org run. Do not change existing aggregator outputs.
- [X] T017 [P] [US1] Implement `components/org-summary/panels/StaleAdminsPanel.tsx` rendering baseline-mode content: mode indicator, threshold tooltip text (sourced from `lib/config/governance.ts` — **no literals**), admin rows with classification and last-activity timestamp. Make T014 pass.
- [X] T018 [US1] Register `StaleAdminsPanel` in `components/org-summary/panels/registry.tsx` under the Governance bucket with the label "Org admin activity" (distinct from the existing `GovernancePanel`).
- [X] T019 [US1] Write a Playwright E2E at `e2e/stale-admins.spec.ts` covering the baseline happy path: sign in (using the existing dev-mode auth path), analyze an org with at least one stale public admin and one active public admin, assert the panel renders both rows and the stale badge is present on exactly the stale admin's row.

**Checkpoint**: US1 green. MVP is shippable: publicly-listed stale admins render with timestamps and a flag on the org view.

---

## Phase 4: User Story 2 — "No public activity" is visually distinct from "stale" (Priority: P1)

**Goal**: Admins with no available public activity render in a neutral "no public activity" state that cannot be confused with "stale" by a user scanning the panel.

**Independent Test**: In the same org used for US1, introduce (or choose) an admin whose public events and commit-search both return empty. Verify that admin renders in a distinct state — distinct text, distinct badge/treatment — from any stale admin on the same page.

### Tests for User Story 2 (TDD — write first, expect RED)

- [X] T020 [P] [US2] Extend `components/org-summary/panels/StaleAdminsPanel.test.tsx` with: (a) a `no-public-activity` row uses different accessible text and a different badge than a `stale` row; (b) an `unavailable` row uses yet a third distinct treatment; (c) a snapshot-style assertion that stale rows and no-public-activity rows never share the same CSS token / badge component.

### Implementation for User Story 2

- [X] T021 [US2] Update `components/org-summary/panels/StaleAdminsPanel.tsx` row rendering so `no-public-activity`, `stale`, `active`, and `unavailable` are visually and textually distinct. Satisfy FR-005 and the constitution's Accuracy Policy (II.2). Make T020 pass.
- [X] T022 [US2] Extend the Playwright test in `e2e/stale-admins.spec.ts` to assert the page contains a `no-public-activity` admin row and that its accessible name does not match the accessible name of any stale row on the same page.

**Checkpoint**: US2 green. Core feature honest-by-default.

---

## Phase 5: User Story 3 — Opt in to a deeper admin view (Priority: P2)

**Goal**: A landing-page checkbox opts the next sign-in into a broader GitHub scope (`read:org`). When the signed-in user is a member of the analyzed org, the panel lists all admins (public + concealed) and shows an `elevated-effective` mode indicator. When not a member, the panel lists only public admins and discloses that the grant did not widen the view for this org.

**Independent Test**: Sign in with the checkbox checked, approve the broader GitHub consent, analyze an org you belong to that has concealed admins. Verify concealed admins appear. Sign out. Sign back in without checking the box. Verify concealed admins disappear.

### Tests for User Story 3 (TDD — write first, expect RED)

- [X] T023 [P] [US3] Write failing unit tests at `app/api/auth/login/route.test.ts` (new file; use the existing Next.js route-testing pattern or a direct handler invocation): (a) no query → redirect scope is `public_repo`; (b) `?elevated=1` → redirect scope is `public_repo read:org`; (c) `?elevated=0` → scope is `public_repo`; (d) scope string is never logged.
- [X] T024 [P] [US3] Extend `components/auth/AuthGate.test.tsx` (or create it) with tests for the unauthenticated branch rendering: (a) an opt-in checkbox appears with a label that discloses "broader GitHub permission"; (b) checking the box causes the sign-in link target to include `?elevated=1`; (c) leaving the box unchecked preserves the existing sign-in URL.
- [X] T025 [P] [US3] Extend `lib/org-aggregation/aggregators/stale-admins.test.ts` with elevated-path cases: (a) when `session.scopes` includes `read:org` and membership probe returns `isMember: true`, `mode === 'elevated-effective'`; (b) when scopes include `read:org` but probe returns `isMember: false`, `mode === 'elevated-ineffective'`; (c) baseline path (no `read:org`) never calls the membership probe; (d) aggregator output differs only in `mode` and `admins.length` between effective and baseline for the same target (assumes the same fixture).
- [X] T026 [P] [US3] Extend `components/org-summary/panels/StaleAdminsPanel.test.tsx` with mode-indicator tests: (a) `baseline` → "Baseline — public admins only"; (b) `elevated-effective` → "Elevated — includes concealed admins"; (c) `elevated-ineffective` → text that makes clear the grant did not widen the view for this org. Mode text is inside the panel, not only in a tooltip (FR-016).

### Implementation for User Story 3

- [X] T027 [P] [US3] Extend `app/api/auth/login/route.ts` to read the `elevated` query param and build the OAuth scope string accordingly. Do not remove any existing behavior on the unchecked path. Make T023 pass.
- [X] T028 [P] [US3] Extend `components/auth/AuthGate.tsx` to render the opt-in checkbox on the unauthenticated branch and propagate the elevation intent to the sign-in link (append `?elevated=1`). Extend `components/auth/SignInButton.tsx` only if needed for URL composition. Make T024 pass.
- [X] T029 [US3] Extend `lib/org-aggregation/aggregators/stale-admins.ts` to: (a) detect `session.scopes.includes('read:org')`; (b) call `fetchUserOrgMembership` once on the elevated path to compute mode; (c) set `mode` on the returned `StaleAdminsSection` accordingly. Make T025 pass.
- [X] T030 [US3] Extend `components/org-summary/panels/StaleAdminsPanel.tsx` to render the mode indicator text for all three modes (`baseline`, `elevated-effective`, `elevated-ineffective`) inside the panel body. Make T026 pass.
- [X] T031 [US3] Extend `e2e/stale-admins.spec.ts` with the elevated-path scenario: check the opt-in checkbox on the landing page, verify the `/api/auth/login` redirect includes `read:org` in the scope, verify the mode indicator renders `elevated-*` on an org view after sign-in.

**Checkpoint**: US3 green. Deeper-view opt-in works; baseline path still intact.

---

## Phase 6: User Story 4 — Non-organization targets surface N/A (Priority: P2)

**Goal**: A repository owned by a user account (not an org) shows the stale-admin section in an explicit "not applicable for non-organization targets" state. No empty list, no false flag.

**Independent Test**: Analyze a user-owned repo (e.g. `arun-gupta/repo-pulse`). Verify the stale-admin panel renders a clear N/A state.

### Tests for User Story 4 (TDD — write first, expect RED)

- [X] T032 [P] [US4] Extend `lib/org-aggregation/aggregators/stale-admins.test.ts`: when `ctx.ownerType === 'User'`, the aggregator returns `applicability: 'not-applicable-non-org'`, `admins: []`, `mode: 'baseline'`, and does NOT call `fetchOrgAdmins` or any activity fetcher.
- [X] T033 [P] [US4] Extend `components/org-summary/panels/StaleAdminsPanel.test.tsx`: when `applicability === 'not-applicable-non-org'`, the panel renders an explicit N/A explanation and suppresses admin rows, mode indicator, and threshold tooltip.

### Implementation for User Story 4

- [X] T034 [US4] Extend `lib/org-aggregation/aggregators/stale-admins.ts` with the ownership short-circuit. Make T032 pass.
- [X] T035 [US4] Extend `components/org-summary/panels/StaleAdminsPanel.tsx` with the N/A rendering. Make T033 pass.
- [X] T036 [US4] Extend `e2e/stale-admins.spec.ts` with the user-owned repo scenario: analyze a user-owned repo fixture and assert the N/A state renders.

**Checkpoint**: US4 green. Non-org targets do not emit a misleading empty panel.

---

## Phase 7: User Story 5 — Freshness disclosure (Priority: P3)

**Goal**: An in-panel affordance discloses (a) the active stale-threshold in days, sourced from config; (b) that only public activity is evaluated; (c) that underlying GitHub activity is eventually consistent.

**Independent Test**: Hover or expand the affordance on a populated stale-admin panel. Verify the three disclosures. Change the config threshold and verify the disclosed value updates on next render.

### Tests for User Story 5 (TDD — write first, expect RED)

- [X] T037 [P] [US5] Extend `components/org-summary/panels/StaleAdminsPanel.test.tsx`: (a) the disclosure affordance renders the threshold value from `lib/config/governance.ts` verbatim (no literals in the component); (b) it includes the "public activity only" sentence; (c) it includes the "eventually consistent" sentence; (d) if the config constant is changed in the test setup, the rendered threshold value reflects the new value.

### Implementation for User Story 5

- [X] T038 [US5] Extend `components/org-summary/panels/StaleAdminsPanel.tsx` with the disclosure affordance. Import the threshold from `lib/config/governance.ts`. Make T037 pass.
- [X] T039 [US5] Extend `e2e/stale-admins.spec.ts` with a minimal assertion that the disclosure text is reachable on a rendered org view.

**Checkpoint**: US5 green. All five user stories live.

---

## Phase N: Polish & Cross-Cutting Concerns

- [X] T040 [P] Audit `lib/governance/stale-admins.ts`, `lib/org-aggregation/aggregators/stale-admins.ts`, and `components/org-summary/panels/StaleAdminsPanel.tsx` for any numeric literal that duplicates a threshold value (30, 60, 90, 180, 365) and remove it — every such comparison or display must read from `lib/config/governance.ts`. Constitution VI.1 gate.
- [X] T041 [P] Audit all new files for `console.log`, TODO comments, unused exports, or untyped values (Constitution XII Definition of Done). Remove any found.
- [X] T042 [P] Verify no token or scope string is logged anywhere in the new code (Constitution III.7, X.3). Grep for `session.token`, `scopes`, and `Bearer` in the new source files.
- [X] T043 Update `docs/DEVELOPMENT.md` Phase 2 implementation-order table: flip the row created in T001 to `✅ Done`.
- [X] T044 Run `npm test` and fix any regressions surfaced outside this feature's files.
- [X] T045 Run `npx playwright test e2e/stale-admins.spec.ts` and, separately, a sanity `npx playwright test` to ensure no other E2E regressed (auth spec in particular, since `AuthContext` and `AuthGate` were touched).
- [X] T046 Run `npm run lint` and `DEV_GITHUB_PAT= npm run build`; fix any warnings/errors.
- [X] T047 Run through `specs/287-detect-stale-admin-accounts-in-organizat/quickstart.md` manually in the browser on the already-running dev server at http://localhost:3010. Exercise baseline, elevated-effective (org the signed-in user belongs to), elevated-ineffective (org the user does not belong to), and N/A (user-owned repo) paths.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: independent; T001 can happen at any time before merge.
- **Phase 2 (Foundational)**: T002 → T003 (same file), T004 → T005 (same file), T006–T010 can be paralleled across the test-writing phase and then T010 serializes the implementation. T011 → T012 (same files).
- **Phase 3 (US1)**: depends on Phase 2 complete.
- **Phase 4 (US2)**: depends on Phase 3 (extends the same panel file).
- **Phase 5 (US3)**: depends on Phase 2 (auth changes ride on Phase 2's `AuthContext.scopes` surface) and Phase 3 (panel and aggregator exist).
- **Phase 6 (US4)**: depends on Phase 3 (extends aggregator + panel).
- **Phase 7 (US5)**: depends on Phase 3 (extends panel).
- **Phase N (Polish)**: depends on all US phases reaching green.

### Within Each User Story

- Tests first (TDD — Constitution XI.1). Verify RED before implementation begins.
- Models / types / config ladders first, services next, UI last.
- Panel/aggregator changes within a story should be co-located in a single feature branch commit where practical.

### Parallel Opportunities

- All `[P]` tasks within Phase 2 can run in parallel (different files).
- Within a user story, test-writing tasks marked `[P]` can be written in parallel against the contract shape; implementation tasks that touch different files can also parallelize.
- US2, US4, and US5 each extend the same panel file (`StaleAdminsPanel.tsx`). They cannot run truly in parallel on that file — schedule them sequentially or via sequential commits on top of US1.
- The aggregator file is extended by US3 (elevated path) and US4 (ownership short-circuit) — schedule those sequentially.

---

## Parallel Example: Phase 2 Foundational

```bash
# Parallel test-writing wave:
Task T002: Config tests in lib/config/governance.test.ts
Task T004: Classifier tests in lib/governance/stale-admins.test.ts
Task T006: fetchOrgAdmins tests in lib/analyzer/github-rest.test.ts
Task T007: fetchUserPublicEvents tests (same file — coordinate so writes don't collide)
Task T008: fetchUserLatestOrgCommit tests
Task T009: fetchUserOrgMembership tests
Task T011: AuthContext scopes test
```

Follow with the implementation wave (T003, T005, T010, T012).

---

## Implementation Strategy

### MVP first (US1 only)

1. Phase 1 + Phase 2 complete and green.
2. Phase 3 (US1) complete and green.
3. Stop. Open a draft PR. Demo the baseline stale-admin panel on the dev server. Decide whether to continue.

### Incremental delivery

1. MVP (above) → PR-ready demo.
2. Add US2 (honest "no public activity" vs "stale").
3. Add US3 (opt-in elevated view).
4. Add US4 (N/A for non-org targets).
5. Add US5 (disclosure affordance).
6. Phase N polish → open PR (not merge).

### Solo execution (this worktree)

All phases in sequence on the same branch, no parallel contributors. TDD discipline preserved: write each task's tests first and verify RED before turning them GREEN.

---

## Notes

- `[P]` = different files, no dependencies on incomplete tasks.
- `[Story]` = which user story (US1–US5) the task belongs to.
- Every user story above is independently testable — halting at any checkpoint produces a working, valuable slice.
- No scoring integration in this feature; stale-admin signal is a governance observation surface (FR-012).
- No README change needed — the feature is an internal panel extension on an existing page with no new setup steps for end users.
