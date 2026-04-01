# Tasks: Deployment (P1-F03)

**Branch**: `007-deployment`  
**Input**: `specs/007-deployment/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)  
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required. The constitution requires TDD, so tests and verification tasks MUST be defined before implementation is considered complete.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (for example, `US1`, `US2`)
- Include exact file paths in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the deployment feature workspace and identify deployment-facing docs/tests to update.

- [x] T001 Create `/Users/arungupta/workspaces/forkprint/specs/007-deployment/tasks.md`
- [x] T002 [P] Review `/Users/arungupta/workspaces/forkprint/README.md`, `/Users/arungupta/workspaces/forkprint/.env.example`, and `/Users/arungupta/workspaces/forkprint/docs/PRODUCT.md` for deployment-specific drift
- [x] T003 [P] Review `/Users/arungupta/workspaces/forkprint/app/page.tsx`, `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx`, and existing auth/data-fetch tests for deployment token-path touchpoints

**Checkpoint**: Deployment touchpoints and required docs/test updates are identified.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm shared deployment assumptions before story implementation.

**⚠️ CRITICAL**: No user story implementation should start until this phase is complete.

- [x] T004 Confirm server-side token precedence behavior in `/Users/arungupta/workspaces/forkprint/app/page.tsx` and `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx`
- [x] T005 [P] Confirm `.env.example` and README can cleanly separate local `.env.local` setup from Vercel shared deployment setup
- [x] T006 [P] Identify whether any Vercel-specific config file is actually required or whether zero-config deployment is already sufficient

**Checkpoint**: The branch has a clear view of current deployment behavior and any real gaps.

---

## Phase 3: User Story 1 - Deploy ForkPrint to Vercel with minimal setup (Priority: P1) 🎯 MVP

**Goal**: A maintainer can deploy ForkPrint to Vercel with the standard Next.js path and documented setup.

**Independent Test**: Review the app and deployment docs, then verify that the current project remains compatible with default Vercel deployment expectations and that setup guidance is clear.

### Tests for User Story 1 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [x] T007 [P] [US1] Add or update coverage in `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` for deployment-safe rendering assumptions if needed
- [x] T008 [US1] Add or update deployment-facing manual verification steps in `/Users/arungupta/workspaces/forkprint/specs/007-deployment/checklists/manual-testing.md`

### Implementation for User Story 1

- [x] T009 [US1] Update `/Users/arungupta/workspaces/forkprint/README.md` with explicit Vercel deployment guidance and local/shared environment setup
- [x] T010 [US1] Update `/Users/arungupta/workspaces/forkprint/.env.example` if deployment guidance or placeholders need to be clearer for shared deployment use
- [x] T011 [US1] Add any minimal deployment config or documentation-only adjustment required to preserve zero-config Vercel deployment, but only if a real gap is confirmed

**Checkpoint**: A maintainer can follow the repo docs and prepare a standard Vercel deployment path without custom infrastructure.

---

## Phase 4: User Story 2 - Use a server-side GitHub token for shared deployments (Priority: P1)

**Goal**: Shared Vercel deployments use server-side `GITHUB_TOKEN` and hide the PAT field while preserving analysis behavior.

**Independent Test**: Verify that when a server token is present, the PAT field is hidden and analysis still works through the server-side token path.

### Tests for User Story 2 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [x] T012 [P] [US2] Extend `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` to verify server-token precedence and hidden PAT behavior from a deployment perspective
- [x] T013 [P] [US2] Review and update `/Users/arungupta/workspaces/forkprint/e2e/auth.spec.ts` for the shared-deployment token path if the current expectations are incomplete
- [x] T014 [US2] Add deployment-specific manual verification steps for server-token behavior in `/Users/arungupta/workspaces/forkprint/specs/007-deployment/checklists/manual-testing.md`

### Implementation for User Story 2

- [x] T015 [US2] Tighten `/Users/arungupta/workspaces/forkprint/app/page.tsx` or `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` only if deployment token precedence or hidden-PAT behavior is incomplete
- [x] T016 [US2] Update `/Users/arungupta/workspaces/forkprint/README.md` so the shared Vercel `GITHUB_TOKEN` path is documented explicitly

**Checkpoint**: Shared deployment behavior matches the `P1-F03` contract for server-side token precedence.

---

## Phase 5: User Story 3 - Keep the deployment stateless and safe (Priority: P2)

**Goal**: Deployment remains stateless, secret-safe, and clearly documented.

**Independent Test**: Review docs and code to confirm no database/custom auth is introduced and that secrets remain environment-only.

### Tests for User Story 3 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [x] T017 [P] [US3] Add or tighten regression coverage in `/Users/arungupta/workspaces/forkprint/e2e/results-shell.spec.ts` or related tests if deployment-safe shell behavior needs explicit protection
- [x] T018 [US3] Add stateless/shared-deployment manual verification steps in `/Users/arungupta/workspaces/forkprint/specs/007-deployment/checklists/manual-testing.md`

### Implementation for User Story 3

- [x] T019 [US3] Update `/Users/arungupta/workspaces/forkprint/README.md` and related docs so local `.env.local` and shared Vercel env-var setup are clearly separated
- [x] T020 [US3] Confirm no new persistent storage, database config, or custom auth system is introduced; if any drift exists, remove it from the `P1-F03` scope

**Checkpoint**: Deployment guidance is clear, stateless, and secret-safe.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, deployment-doc alignment, and manual-checklist readiness for the feature PR.

- [x] T021 [P] Run unit/integration tests with `npm test`
- [x] T022 [P] Run lint with `npm run lint`
- [x] T023 [P] Run end-to-end coverage with `npm run test:e2e`
- [x] T024 Run `npm run build` and verify whether deployment work introduced any new build regressions beyond the known environment/font issue
- [x] T025 Update `/Users/arungupta/workspaces/forkprint/specs/007-deployment/checklists/manual-testing.md` as the feature is manually verified
- [x] T026 Update `/Users/arungupta/workspaces/forkprint/README.md` for any final user-facing or setup clarifications

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies, can start immediately
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories
- **User Stories (Phases 3-5)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on all implemented stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational and delivers the first deployment-ready value
- **US2 (P1)**: Depends on the current token path being understood and locks in shared-deployment behavior
- **US3 (P2)**: Depends on the earlier deployment contract and finalizes stateless/safe deployment guidance

### Parallel Opportunities

- T002 and T003 can run in parallel
- T005 and T006 can run in parallel
- T012 and T013 can run in parallel
- T021, T022, and T023 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the documented zero-config Vercel path before tightening shared-deployment token behavior

### Incremental Delivery

1. Document and confirm the default Vercel deployment path
2. Lock in shared-deployment server-token behavior
3. Finalize stateless/safe deployment guidance
4. Finish with verification and manual checklist completion

### TDD Reminder

Every test phase follows Red-Green-Refactor: write tests, verify failure, implement, then verify pass.
