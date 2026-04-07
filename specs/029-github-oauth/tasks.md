# Tasks: GitHub OAuth Authentication (P1-F14)

**Input**: Design documents from `/specs/029-github-oauth/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Note**: TDD is mandatory per the constitution (Section XI). Test tasks are written first and must fail before implementation begins.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Environment configuration and removal of superseded code

- [ ] T001 Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` placeholder entries to `.env.example` and document them in `docs/DEPLOYMENT.md`
- [ ] T002 [P] Delete `lib/token-storage.ts` and `lib/token-storage.test.ts`
- [ ] T003 [P] Delete `components/token-input/TokenInput.tsx` and `components/token-input/TokenInput.test.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `AuthContext` must exist before any UI or API work can begin

**⚠️ CRITICAL**: All user story phases depend on this phase

- [ ] T004 Write failing tests for `AuthContext` (initial state null, signOut clears session) in `components/auth/AuthContext.test.tsx`
- [ ] T005 Implement `AuthContext` with `session: AuthSession | null` and `signOut()` in `components/auth/AuthContext.tsx`
- [ ] T006 Verify T004 tests pass
- [ ] T007 Update `app/api/analyze/route.ts` — remove `process.env.GITHUB_TOKEN ??` fallback; return `401` when `body.token` is absent
- [ ] T008 [P] Update `app/api/analyze-org/route.ts` — same change as T007

**Checkpoint**: AuthContext exists and API routes require a token — all story work can now begin

---

## Phase 3: User Story 1 — Sign In With GitHub (Priority: P1) 🎯 MVP

**Goal**: Unauthenticated users see "Sign in with GitHub"; after OAuth they are signed in with their username shown and can run analysis.

**Independent Test**: Open the app unauthenticated → click "Sign in with GitHub" → complete GitHub OAuth → verify username is shown and an analysis request succeeds.

### Tests for User Story 1 ⚠️ Write first — must fail before implementation

- [ ] T009 [P] [US1] Write failing unit tests for `SignInButton` (renders button, initiates redirect) in `components/auth/SignInButton.test.tsx`
- [ ] T010 [P] [US1] Write failing unit tests for `AuthGate` (shows sign-in when unauthenticated, shows children when authenticated) in `components/auth/AuthGate.test.tsx`
- [ ] T011 [P] [US1] Write failing unit tests for `GET /api/auth/login` (redirects to GitHub with correct params, sets state cookie) in `app/api/auth/login/route.test.ts`
- [ ] T012 [P] [US1] Write failing unit tests for `GET /api/auth/callback` (exchanges code, fetches username, redirects with fragment; rejects missing/mismatched state) in `app/api/auth/callback/route.test.ts`

### Implementation for User Story 1

- [ ] T013 [US1] Implement `GET /api/auth/login` route — generates CSRF state, stores in cookie, redirects to `https://github.com/login/oauth/authorize` in `app/api/auth/login/route.ts`
- [ ] T014 [US1] Implement `GET /api/auth/callback` route — validates state cookie, exchanges `code` for token via `POST https://github.com/login/oauth/access_token`, fetches `/api/user`, redirects to `/#token=...&username=...` in `app/api/auth/callback/route.ts`
- [ ] T015 [US1] Implement `SignInButton` — renders "Sign in with GitHub" button that navigates to `/api/auth/login` in `components/auth/SignInButton.tsx`
- [ ] T016 [US1] Implement `AuthGate` — reads URL fragment on mount (stores token+username in AuthContext, clears fragment), renders `SignInButton` when unauthenticated, renders `children` when authenticated in `components/auth/AuthGate.tsx`
- [ ] T017 [US1] Wrap app root with `AuthGate` in `app/page.tsx` (or layout)
- [ ] T018 [US1] Update `RepoInputClient` — remove `hasServerToken` prop, remove `TokenInput` usage, read token from `AuthContext` and pass to API requests in `components/repo-input/RepoInputClient.tsx`
- [ ] T019 [US1] Update server component that renders `RepoInputClient` — remove `hasServerToken` prop in `app/page.tsx`
- [ ] T020 [US1] Verify all T009–T012 tests now pass

**Checkpoint**: User Story 1 fully functional — user can sign in and run analysis

---

## Phase 4: User Story 2 — Sign Out (Priority: P2)

**Goal**: Signed-in users can sign out; token is cleared from memory and the sign-in prompt reappears.

**Independent Test**: Sign in → click "Sign out" → verify username indicator is gone, sign-in button reappears, and an analysis request without re-signing-in returns 401.

### Tests for User Story 2 ⚠️ Write first — must fail before implementation

- [ ] T021 [P] [US2] Write failing unit tests for `UserBadge` (shows username, sign-out button calls signOut) in `components/auth/UserBadge.test.tsx`

### Implementation for User Story 2

- [ ] T022 [US2] Implement `UserBadge` — displays signed-in username and a "Sign out" button that calls `signOut()` from `AuthContext` in `components/auth/UserBadge.tsx`
- [ ] T023 [US2] Integrate `UserBadge` into `AuthGate` — show `UserBadge` alongside children when authenticated in `components/auth/AuthGate.tsx`
- [ ] T024 [US2] Verify T021 tests pass

**Checkpoint**: User Stories 1 and 2 both functional — full sign-in/sign-out cycle works

---

## Phase 5: User Story 3 — OAuth Error Handling (Priority: P3)

**Goal**: When OAuth fails (user denies, bad state, GitHub error), a clear error message is shown and the user can retry.

**Independent Test**: Deny authorization on GitHub → verify app shows error message and "Sign in with GitHub" button is still available.

### Tests for User Story 3 ⚠️ Write first — must fail before implementation

- [ ] T025 [P] [US3] Write failing unit tests for `AuthGate` error state (renders error message when `auth_error` query param is present) in `components/auth/AuthGate.test.tsx`
- [ ] T026 [P] [US3] Write failing unit tests for callback route error path (redirects to `/?auth_error=...` on denied authorization or state mismatch) in `app/api/auth/callback/route.test.ts`

### Implementation for User Story 3

- [ ] T027 [US3] Update `GET /api/auth/callback` — handle `error` query param from GitHub (denied authorization) and state mismatch; redirect to `/?auth_error=<reason>` in `app/api/auth/callback/route.ts`
- [ ] T028 [US3] Update `AuthGate` — read `auth_error` query param on mount, display error message, clear param from URL in `components/auth/AuthGate.tsx`
- [ ] T029 [US3] Verify T025–T026 tests pass

**Checkpoint**: All three user stories functional — full OAuth happy path and error path covered

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T030 [P] Write E2E test for full sign-in flow (mock OAuth callback, verify username shown, verify analysis request succeeds) in `e2e/auth.spec.ts`
- [ ] T031 [P] Write E2E test for sign-out flow in `e2e/auth.spec.ts`
- [ ] T032 [P] Write E2E test for OAuth error path (auth_error param → error message shown) in `e2e/auth.spec.ts`
- [ ] T033 Update `docs/DEVELOPMENT.md` — mark P1-F14 as ✅ Done in the implementation order table
- [ ] T034 [P] Update `README.md` — document `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` env vars; remove `GITHUB_TOKEN` references
- [ ] T035 [P] Create manual testing checklist at `specs/029-github-oauth/checklists/manual-testing.md`
- [ ] T036 Run `npm test`, `npm run lint`, and `npm run build` — confirm all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; T002 and T003 are parallel
- **Phase 2 (Foundational)**: Depends on Phase 1 — blocks all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — tests (T009–T012) can run in parallel; implementation is sequential
- **Phase 4 (US2)**: Depends on Phase 2 — can start after Phase 2 independent of Phase 3
- **Phase 5 (US3)**: Depends on Phase 2 — can start after Phase 2 independent of Phases 3 and 4
- **Phase 6 (Polish)**: Depends on all story phases complete

### Within Each User Story

- Test tasks are written and must fail first
- Implementation follows in dependency order (routes → context → UI → integration)
- Each story's tests verified green before moving to next story

---

## Parallel Opportunities

```bash
# Phase 1 — run in parallel:
T002: Delete lib/token-storage.*
T003: Delete components/token-input/*

# Phase 2 — run in parallel:
T007: Update /api/analyze route
T008: Update /api/analyze-org route

# Phase 3 tests — run in parallel (write first):
T009: SignInButton tests
T010: AuthGate tests
T011: /api/auth/login tests
T012: /api/auth/callback tests

# Phase 6 — run in parallel:
T030/T031/T032: E2E tests
T033: DEVELOPMENT.md update
T034: README update
T035: Manual testing checklist
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundational) — blocks everything
3. Complete Phase 3 (US1 — Sign In)
4. **Validate**: Sign in works, analysis runs with OAuth token
5. Ship if acceptable — US2 and US3 can follow

### Incremental Delivery

1. Phase 1 + 2 → foundation ready
2. Phase 3 → sign-in works (MVP)
3. Phase 4 → sign-out works
4. Phase 5 → error handling complete
5. Phase 6 → polished, tested, ready for PR
