# Tasks: Ecosystem Map (P1-F05)

**Branch**: `005-ecosystem-map`  
**Input**: `specs/005-ecosystem-map/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)  
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required. The constitution requires TDD, so test tasks MUST be written first and confirmed failing before implementation begins.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (for example, `US1`, `US2`)
- Include exact file paths in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the file structure for ecosystem-map UI, helpers, and spectrum config.

- [x] T001 Create `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/` with `EcosystemMap.tsx`, `EcosystemMap.test.tsx`, and `ecosystem-map-utils.test.ts`
- [x] T002 [P] Create `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/` with `classification.ts`, `chart-data.ts`, and `spectrum-config.ts`
- [x] T003 [P] Create `/Users/arungupta/workspaces/forkprint/e2e/ecosystem-map.spec.ts` with initial feature coverage

**Checkpoint**: The repo contains the planned ecosystem-map file structure and spectrum-config file.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared spectrum config and view-model utilities before story implementation.

**⚠️ CRITICAL**: No user story implementation should start until this phase is complete.

- [x] T005 Implement ecosystem-map view-model helpers in `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/chart-data.ts`
- [x] T006 [P] Implement shared spectrum thresholds in `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/spectrum-config.ts`
- [x] T007 [P] Implement ecosystem profile and rate helpers in `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/classification.ts`
- [x] T008 [P] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` state contract to pass successful `analysisResponse.results` into a reusable ecosystem-map section

**Checkpoint**: Shared transformation, spectrum config, and profile helpers exist, and the client can supply ecosystem-map input without extra API calls.

---

## Phase 3: User Story 1 - Show ecosystem metrics clearly for analyzed repos (Priority: P1) 🎯 MVP

**Goal**: Users can see visible stars, forks, and watchers for each successful repository without relying on secondary interactions.

**Independent Test**: Submit one or more successful results and verify stars, forks, and watchers are visible as normal UI elements for every successful repository.

### Tests for User Story 1 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [x] T009 [P] [US1] Add view-model tests for visible ecosystem metrics in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/ecosystem-map-utils.test.ts`
- [x] T010 [P] [US1] Add component tests for visible stars/forks/watchers rendering in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.test.tsx`
- [x] T011 [P] [US1] Extend client integration tests for ecosystem-map metrics rendering in `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx`
- [x] T012 [US1] Add Playwright coverage for visible ecosystem metrics in `/Users/arungupta/workspaces/forkprint/e2e/ecosystem-map.spec.ts`

### Implementation for User Story 1

- [x] T013 [US1] Implement visible metric-row formatting in `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/chart-data.ts`
- [x] T014 [US1] Implement `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.tsx` to render visible stars, forks, and watchers for successful repositories
- [x] T015 [US1] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to render `EcosystemMap` from successful results

**Checkpoint**: Successful analyses show visible ecosystem metrics outside of any tooltip interactions.

---

## Phase 4: User Story 2 - Understand the ecosystem spectrum view (Priority: P2)

**Goal**: Users can see one or more successful repositories summarized in a spectrum-based ecosystem view using reach, builder engagement, and attention.

**Independent Test**: Render the feature with one or more successful results and verify the spectrum legends and one profile card per successful repository appear without extra fetching.

### Tests for User Story 2 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [x] T016 [P] [US2] Add view-model tests for spectrum legends and profile-card rendering in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/ecosystem-map-utils.test.ts`
- [x] T017 [P] [US2] Extend component tests for spectrum rendering in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.test.tsx`
- [x] T018 [US2] Add Playwright coverage for single-repo and multi-repo spectrum rendering in `/Users/arungupta/workspaces/forkprint/e2e/ecosystem-map.spec.ts`

### Implementation for User Story 2

- [x] T019 [US2] Implement spectrum/profile view-model generation in `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/chart-data.ts`
- [x] T020 [US2] Implement the spectrum legend and repository profile view in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.tsx`
- [x] T021 [US2] Handle unavailable ecosystem metrics honestly in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.tsx` without fabricated derived values or rates

**Checkpoint**: The ecosystem map renders a useful spectrum/profile view for one or more successful repositories.

---

## Phase 5: User Story 3 - Understand the ecosystem spectrum profile (Priority: P2)

**Goal**: Users can see config-driven Reach / Builder Engagement / Attention profiles derived from exact ecosystem metrics.

**Independent Test**: Render the feature with successful repos and verify profile tiers and legends follow the shared spectrum configuration rather than inline thresholds.

### Tests for User Story 3 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [x] T022 [P] [US3] Add profile tests for shared spectrum-band behavior in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/ecosystem-map-utils.test.ts`
- [x] T023 [P] [US3] Extend component tests for profile labels and legend text in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.test.tsx`
- [x] T024 [US3] Add Playwright coverage for config-driven ecosystem profile rendering in `/Users/arungupta/workspaces/forkprint/e2e/ecosystem-map.spec.ts`

### Implementation for User Story 3

- [x] T025 [US3] Implement config-driven spectrum profile logic in `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/classification.ts`
- [x] T026 [US3] Render Reach / Builder Engagement / Attention profile labels and legend copy in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.tsx`
- [x] T027 [US3] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to show the profile-aware ecosystem-map section alongside existing results/failure UI

**Checkpoint**: The ecosystem map shows config-driven profiles without implying official CHAOSS terminology.

---

## Phase 6: User Story 4 - Inspect exact values and derived rates (Priority: P3)

**Goal**: Users can inspect exact values and derived rates while keeping single-repo behavior fully useful.

**Independent Test**: Inspect the repository cards and profile content to verify exact values and derived rates, and verify that a single successful repository still receives a full profile.

### Tests for User Story 4 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [x] T028 [P] [US4] Add component tests for exact-value detail and single-repo profile behavior in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.test.tsx`
- [x] T029 [US4] Add Playwright coverage for derived-rate details and single-repo profile behavior in `/Users/arungupta/workspaces/forkprint/e2e/ecosystem-map.spec.ts`

### Implementation for User Story 4

- [x] T030 [US4] Implement exact-value and derived-rate detail in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.tsx`
- [x] T031 [US4] Implement single-repo profile behavior in `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/classification.ts` and `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.tsx`

**Checkpoint**: Single-repo analyses remain useful, profiled, and honest, and repository details expose the derived rates.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, documentation alignment, and manual-checklist readiness for the feature PR.

- [x] T032 [P] Run unit/integration tests with `npm test` and confirm ecosystem-map coverage passes
- [x] T033 [P] Run lint with `npm run lint` and remove any dead code, TODOs, or temporary logging
- [x] T034 [P] Run end-to-end coverage with `npm run test:e2e` including `/Users/arungupta/workspaces/forkprint/e2e/ecosystem-map.spec.ts`
- [ ] T035 Run `npm run build` and verify the ecosystem-map changes do not introduce production build regressions
- [x] T036 Update `/Users/arungupta/workspaces/forkprint/specs/005-ecosystem-map/checklists/manual-testing.md` as the feature is manually verified
- [x] T037 Update `/Users/arungupta/workspaces/forkprint/README.md` if the completed ecosystem-map flow changes user-facing behavior or setup

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies, can start immediately
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories
- **User Stories (Phases 3-6)**: Depend on Foundational completion
- **Polish (Phase 7)**: Depends on all implemented stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational and delivers the first usable ecosystem-map value
- **US2 (P2)**: Depends on US1’s visible metric/view-model work and adds the spectrum view
- **US3 (P2)**: Depends on US2’s profile dataset and adds the config-driven ecosystem profile
- **US4 (P3)**: Depends on US2/US3 profile behavior and adds final exact-value/rate polish

### Within Each User Story

- Tests must be written and confirmed failing before implementation
- Shared utilities before component wiring
- Component rendering before Playwright validation
- Story completion before moving to the next dependent story

### Parallel Opportunities

- T002, T003, and T004 can run in parallel
- T005, T006, and T007 can run in parallel
- T009, T010, and T011 can run in parallel
- T016 and T017 can run in parallel
- T022 and T023 can run in parallel
- T032, T033, and T034 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Write US1 tests in parallel
Task: "Add view-model tests for visible ecosystem metrics in components/ecosystem-map/ecosystem-map-utils.test.ts"
Task: "Add component tests for visible stars/forks/watchers rendering in components/ecosystem-map/EcosystemMap.test.tsx"
Task: "Extend client integration tests for ecosystem-map metrics rendering in components/repo-input/RepoInputClient.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate the visible ecosystem metrics experience before adding the full spectrum/profile interpretation

### Incremental Delivery

1. Add visible ecosystem metrics for successful repos
2. Add the spectrum/profile view for one or more successful repos
3. Add config-driven Reach / Builder Engagement / Attention profiles
4. Add tooltip detail and derived-rate behavior
5. Finish with verification, manual checklist completion, and README alignment

### TDD Reminder

Every test phase follows Red-Green-Refactor: write tests, verify failure, implement, then verify pass.
