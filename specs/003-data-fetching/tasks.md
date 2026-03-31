# Tasks: Data Fetching (P1-F04)

**Branch**: `003-data-fetching`
**Input**: `specs/003-data-fetching/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required. The spec and constitution require TDD, so test tasks MUST be written first and confirmed failing before implementation begins.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (for example, `US1`, `US2`, `US3`)
- Include exact file paths in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the shared analyzer and API file structure for this feature.

- [X] T001 Create `/Users/arungupta/workspaces/forkprint/lib/analyzer/` and add `analyze.ts`, `github-graphql.ts`, `queries.ts`, and `analysis-result.ts` stubs
- [X] T002 [P] Create `/Users/arungupta/workspaces/forkprint/app/api/analyze/route.ts` with a minimal POST route stub
- [X] T003 [P] Create `/Users/arungupta/workspaces/forkprint/e2e/data-fetching.spec.ts` with a placeholder spec file

**Checkpoint**: The repository contains the planned file structure for analyzer, API, and E2E work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared contracts, request/response types, and client wiring prerequisites before user-story implementation.

**⚠️ CRITICAL**: No user story implementation should start until this phase is complete.

- [X] T004 Implement shared response types in `/Users/arungupta/workspaces/forkprint/lib/analyzer/analysis-result.ts` based on `specs/003-data-fetching/contracts/analysis-result.ts`
- [X] T005 [P] Implement GitHub GraphQL request helper scaffolding in `/Users/arungupta/workspaces/forkprint/lib/analyzer/github-graphql.ts`
- [X] T006 [P] Define grouped GraphQL query documents in `/Users/arungupta/workspaces/forkprint/lib/analyzer/queries.ts`
- [X] T007 Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` submit contract so it can request analysis results instead of only invoking a local callback

**Checkpoint**: Shared result contracts and fetch plumbing exist, and user stories can now build on a stable analyzer/API boundary.

---

## Phase 3: User Story 1 - Fetch Verified Repo Data (Priority: P1) 🎯 MVP

**Goal**: Submit valid repositories and return verified GitHub-derived analysis results for each successfully analyzable repository.

**Independent Test**: Submit one or more valid public repositories with an available token source and verify that successful repos return the expected flat analysis placeholders from verified GitHub responses.

### Tests for User Story 1 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [X] T008 [P] [US1] Add analyzer unit tests for successful repo analysis and `"unavailable"` field handling in `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyzer.test.ts`
- [X] T009 [P] [US1] Add API route tests for successful `POST /api/analyze` responses in `/Users/arungupta/workspaces/forkprint/app/api/analyze/route.test.ts`
- [X] T010 [P] [US1] Extend client tests for successful analysis submission and result handling in `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx`
- [X] T011 [US1] Add Playwright coverage for successful data fetching in `/Users/arungupta/workspaces/forkprint/e2e/data-fetching.spec.ts`

### Implementation for User Story 1

- [X] T012 [US1] Implement the framework-agnostic `analyze()` pipeline in `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyze.ts`
- [X] T013 [US1] Implement successful GitHub GraphQL fetching and parsing in `/Users/arungupta/workspaces/forkprint/lib/analyzer/github-graphql.ts`
- [X] T014 [US1] Implement the Next.js API wrapper in `/Users/arungupta/workspaces/forkprint/app/api/analyze/route.ts` with server-token precedence and response shaping
- [X] T015 [US1] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to call `/api/analyze` and store successful analysis results in client state
- [ ] T016 [US1] Update `/Users/arungupta/workspaces/forkprint/app/page.tsx` to render the fetch-capable `RepoInputClient` flow on the home page

**Checkpoint**: User Story 1 is fully functional and independently testable.

---

## Phase 4: User Story 2 - Partial Failures Do Not Block Other Results (Priority: P1)

**Goal**: Return successful results for analyzable repositories even when some repositories fail.

**Independent Test**: Submit a mix of analyzable and failing repositories and verify that successful repos still return results while failures are isolated to the affected repositories.

### Tests for User Story 2 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [X] T017 [P] [US2] Add analyzer tests for mixed-success submissions and repository-specific failures in `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyzer.test.ts`
- [X] T018 [P] [US2] Add API route tests for isolated failures in `/Users/arungupta/workspaces/forkprint/app/api/analyze/route.test.ts`
- [X] T019 [P] [US2] Extend client tests for rendering successful results alongside failures in `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx`
- [X] T020 [US2] Add Playwright coverage for mixed valid/invalid repo submissions in `/Users/arungupta/workspaces/forkprint/e2e/data-fetching.spec.ts`

### Implementation for User Story 2

- [X] T021 [US2] Update `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyze.ts` to isolate repository failures and return them separately from successful results
- [X] T022 [US2] Update `/Users/arungupta/workspaces/forkprint/app/api/analyze/route.ts` to return `failures` alongside successful `results`
- [X] T023 [US2] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to display repository-specific fetch failures without dropping successful results

**Checkpoint**: User Stories 1 and 2 both work independently, and mixed-success analysis is stable.

---

## Phase 5: User Story 3 - Loading and Rate Limit State Is Visible (Priority: P2)

**Goal**: Show in-progress fetch state and surface GitHub rate-limit information when available.

**Independent Test**: Start an analysis and verify loading state appears, then simulate rate-limit metadata and confirm remaining-call and retry information is surfaced to the user.

### Tests for User Story 3 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [X] T024 [P] [US3] Add analyzer tests for rate-limit metadata propagation in `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyzer.test.ts`
- [X] T025 [P] [US3] Extend client tests for loading and rate-limit UI state in `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx`
- [X] T026 [US3] Add Playwright coverage for loading and rate-limit visibility in `/Users/arungupta/workspaces/forkprint/e2e/data-fetching.spec.ts`

### Implementation for User Story 3

- [X] T027 [US3] Update `/Users/arungupta/workspaces/forkprint/lib/analyzer/github-graphql.ts` and `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyze.ts` to capture and return rate-limit metadata
- [X] T028 [US3] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to show per-request loading state and visible rate-limit information
- [ ] T029 [US3] Update `/Users/arungupta/workspaces/forkprint/app/page.tsx` to render fetch-state feedback without introducing dashboard-level UI that belongs to later features

**Checkpoint**: All user stories are independently functional, including loading and rate-limit visibility.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, docs alignment, and manual-checklist readiness for the feature PR.

- [X] T030 [P] Run unit/integration tests with `npm test` and confirm analyzer, API, and client coverage passes
- [X] T031 [P] Run lint with `npm run lint` and remove any dead code, TODOs, or temporary logging
- [X] T032 [P] Run end-to-end coverage with `npm run test:e2e` including `/Users/arungupta/workspaces/forkprint/e2e/data-fetching.spec.ts`
- [ ] T033 Run `npm run build` and verify data-fetching changes do not introduce production build regressions
- [ ] T034 Update `/Users/arungupta/workspaces/forkprint/specs/003-data-fetching/checklists/manual-testing.md` as the feature is manually verified
- [X] T035 Update `/Users/arungupta/workspaces/forkprint/README.md` if the completed data-fetching flow changes user-facing setup or behavior

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies, can start immediately
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories
- **User Stories (Phases 3-5)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on all implemented stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational and delivers the first usable analysis pipeline
- **US2 (P1)**: Depends on US1 analyzer/API flow and extends it with per-repo failure isolation
- **US3 (P2)**: Depends on US1/US2 fetch flow and adds user-visible progress/rate-limit state

### Within Each User Story

- Tests must be written and confirmed failing before implementation
- Shared analyzer logic before API wrapper
- API wrapper before client integration
- Story completion before moving to the next dependent story

### Parallel Opportunities

- T002 and T003 can run in parallel
- T005 and T006 can run in parallel
- T008, T009, and T010 can run in parallel
- T017, T018, and T019 can run in parallel
- T030, T031, and T032 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Write US1 tests in parallel
Task: "Add analyzer unit tests for successful repo analysis in lib/analyzer/analyzer.test.ts"
Task: "Add API route tests for successful POST /api/analyze responses in app/api/analyze/route.test.ts"
Task: "Extend client tests for successful analysis submission in components/repo-input/RepoInputClient.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate the end-to-end analysis pipeline before extending failure and rate-limit behavior

### Incremental Delivery

1. Add shared analyzer and successful fetch path (US1)
2. Add partial-failure isolation (US2)
3. Add loading and rate-limit visibility (US3)
4. Finish with verification, manual checklist completion, and README alignment

### TDD Reminder

Every test phase follows Red-Green-Refactor: write tests, verify failure, implement, then verify pass.

## Notes

- T016 and T029 remain unchecked because `/Users/arungupta/workspaces/forkprint/app/page.tsx` already rendered `RepoInputClient`, so no page-level changes were required to ship the fetch-state behavior.
- T033 remains unchecked in this sandbox because `npm run build` cannot fetch Google-hosted Geist fonts during `next build`.
