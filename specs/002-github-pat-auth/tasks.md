# Tasks: GitHub PAT Authentication (P1-F02)

**Branch**: `002-github-pat-auth`
**Input**: `specs/002-github-pat-auth/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required. The spec and constitution require TDD, so test tasks MUST be written first and confirmed failing before implementation begins.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (for example, `US1`, `US2`, `US3`)
- Include exact file paths in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the repo for the PAT authentication feature without introducing implementation behavior yet.

- [ ] T001 Create `.env.example` with a blank `GITHUB_TOKEN=` placeholder in `/Users/arungupta/workspaces/forkprint/.env.example`
- [ ] T002 [P] Create `components/token-input/` and add a `TokenInput.tsx` stub in `/Users/arungupta/workspaces/forkprint/components/token-input/TokenInput.tsx`
- [ ] T003 [P] Create `lib/token-storage.ts` with exported contract stubs in `/Users/arungupta/workspaces/forkprint/lib/token-storage.ts`

**Checkpoint**: Required files for the feature exist and the project still compiles.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared contracts and feature plumbing that all user stories depend on.

**⚠️ CRITICAL**: No user story implementation should start until this phase is complete.

- [ ] T004 Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` type signature to accept `hasServerToken: boolean` and `onSubmit(repos, token)` flow per `specs/002-github-pat-auth/contracts/component-props.ts`
- [ ] T005 Update `/Users/arungupta/workspaces/forkprint/app/page.tsx` to pass a server-derived `hasServerToken` boolean into `RepoInputClient` without exposing the token value
- [ ] T006 Create shared token error messaging and display contract between `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` and `/Users/arungupta/workspaces/forkprint/components/token-input/TokenInput.tsx`

**Checkpoint**: The app has the server/client wiring needed to support PAT UI behavior, but story functionality is not implemented yet.

---

## Phase 3: User Story 1 - Enter and Store Token (Priority: P1) 🎯 MVP

**Goal**: Let the user enter a GitHub PAT, persist it in `localStorage`, pre-populate it on future visits, and show the required scope alongside the token field.

**Independent Test**: Enter a token on `/`, submit, reload, and verify the token field is pre-populated and the scope hint remains visible.

### Tests for User Story 1 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T007 [P] [US1] Add unit tests for token storage read/write/clear behavior in `/Users/arungupta/workspaces/forkprint/lib/token-storage.test.ts`
- [ ] T008 [P] [US1] Add unit tests for token field rendering, masking, scope label, and change handling in `/Users/arungupta/workspaces/forkprint/components/token-input/TokenInput.test.tsx`
- [ ] T009 [P] [US1] Add unit tests for loading a stored token and passing it through submit flow in `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx`
- [ ] T010 [US1] Add Playwright coverage for storing and reloading the PAT on the home page in `/Users/arungupta/workspaces/forkprint/e2e/auth.spec.ts`

### Implementation for User Story 1

- [ ] T011 [US1] Implement `readToken`, `writeToken`, `clearToken`, and `TOKEN_STORAGE_KEY` in `/Users/arungupta/workspaces/forkprint/lib/token-storage.ts`
- [ ] T012 [US1] Implement the controlled PAT field, label, and scope hint in `/Users/arungupta/workspaces/forkprint/components/token-input/TokenInput.tsx`
- [ ] T013 [US1] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to load stored tokens on mount and persist the trimmed token on successful submit
- [ ] T014 [US1] Update `/Users/arungupta/workspaces/forkprint/app/page.tsx` so the PAT entry UI appears on `/` when no server token is configured

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Submit Without Token Is Blocked (Priority: P1)

**Goal**: Prevent analysis submission when no client token is present and no server-side token fallback exists.

**Independent Test**: Clear stored token, leave the PAT field empty, submit the form, and verify an inline error appears before any request is attempted.

### Tests for User Story 2 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T015 [P] [US2] Add unit tests for empty and whitespace-only PAT submission blocking in `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx`
- [ ] T016 [P] [US2] Add unit tests for clearing stored PAT state when the field is emptied in `/Users/arungupta/workspaces/forkprint/lib/token-storage.test.ts`
- [ ] T017 [US2] Add Playwright coverage for blocked submission and inline error behavior in `/Users/arungupta/workspaces/forkprint/e2e/auth.spec.ts`

### Implementation for User Story 2

- [ ] T018 [US2] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to block submit when `hasServerToken` is false and the trimmed PAT is empty
- [ ] T019 [US2] Render a clear inline token-required error in `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` and clear it after a valid resubmission
- [ ] T020 [US2] Ensure `/Users/arungupta/workspaces/forkprint/lib/token-storage.ts` removes the stored token when the submitted value is empty or whitespace-only

**Checkpoint**: Empty-token submissions are blocked locally and the UX recovers correctly after correction.

---

## Phase 5: User Story 3 - Token Field Hidden on Server-Token Deployments (Priority: P2)

**Goal**: Hide the PAT UI when a server-side `GITHUB_TOKEN` is configured, while allowing submission to proceed without a client token.

**Independent Test**: Start the app with `GITHUB_TOKEN` set, load `/`, verify the PAT field is absent, and confirm repo submission is not blocked by token validation.

### Tests for User Story 3 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T021 [P] [US3] Add unit tests for conditional token UI visibility based on `hasServerToken` in `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx`
- [ ] T022 [US3] Add Playwright coverage for server-token mode hiding the PAT field in `/Users/arungupta/workspaces/forkprint/e2e/auth.spec.ts`

### Implementation for User Story 3

- [ ] T023 [US3] Update `/Users/arungupta/workspaces/forkprint/app/page.tsx` to derive `hasServerToken` from `process.env.GITHUB_TOKEN` on the server
- [ ] T024 [US3] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to skip client-token validation and hide `/Users/arungupta/workspaces/forkprint/components/token-input/TokenInput.tsx` when `hasServerToken` is true

**Checkpoint**: The home page behaves correctly in shared deployments with a configured server-side token.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the feature end to end and align docs/checklists with the finished implementation.

- [ ] T025 [P] Run unit tests with `npm test` and confirm the new PAT coverage passes
- [ ] T026 [P] Run lint with `npm run lint` and remove any dead code, TODOs, or `console.log` related to PAT work
- [ ] T027 [P] Run E2E coverage with `npm run test:e2e` for `/Users/arungupta/workspaces/forkprint/e2e/auth.spec.ts`
- [ ] T028 Run `npm run build` and verify the PAT feature does not introduce type or production build regressions
- [ ] T029 Update the manual testing checklist for `P1-F02` in `/Users/arungupta/workspaces/forkprint/specs/002-github-pat-auth/checklists/requirements.md` and any feature-specific checklist items
- [ ] T030 Update user-facing setup and behavior notes in `/Users/arungupta/workspaces/forkprint/README.md` if the completed PAT flow changes onboarding expectations

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies, can start immediately
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories
- **User Stories (Phases 3-5)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on all implemented stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational and delivers the MVP
- **US2 (P1)**: Depends on US1 token input and storage behavior
- **US3 (P2)**: Depends on the `hasServerToken` wiring from Foundational and should preserve US1/US2 behavior when disabled

### Within Each User Story

- Tests must be written and confirmed failing before implementation
- Storage utilities before client integration
- Client integration before end-to-end validation
- Each story must be independently testable before moving on

### Parallel Opportunities

- T002 and T003 can run in parallel
- T007, T008, and T009 can run in parallel
- T015 and T016 can run in parallel
- T025, T026, and T027 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Write US1 test coverage in parallel
Task: "Add unit tests for token storage read/write/clear behavior in lib/token-storage.test.ts"
Task: "Add unit tests for token field rendering and scope label in components/token-input/TokenInput.test.tsx"
Task: "Add unit tests for stored-token submit flow in components/repo-input/RepoInputClient.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate stored-token behavior independently before moving on

### Incremental Delivery

1. Add PAT entry and persistence (US1)
2. Add no-token blocking and recovery UX (US2)
3. Add server-token hiding behavior (US3)
4. Finish with verification, checklist updates, and documentation

### TDD Reminder

Every test phase follows Red-Green-Refactor: write tests, verify failure, implement, then verify pass.
