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

**Purpose**: Add the charting dependency and file structure for ecosystem-map UI and helpers.

- [ ] T001 Add `chart.js` and `react-chartjs-2` to `/Users/arungupta/workspaces/forkprint/package.json`
- [ ] T002 [P] Create `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/` with `EcosystemMap.tsx`, `EcosystemMap.test.tsx`, and `ecosystem-map-utils.test.ts`
- [ ] T003 [P] Create `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/` with `classification.ts` and `chart-data.ts`
- [ ] T004 [P] Create `/Users/arungupta/workspaces/forkprint/e2e/ecosystem-map.spec.ts` with a placeholder spec file

**Checkpoint**: The repo contains the planned ecosystem-map file structure and chart dependencies.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared classification and view-model utilities before story implementation.

**⚠️ CRITICAL**: No user story implementation should start until this phase is complete.

- [ ] T005 Implement ecosystem-map view-model helpers in `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/chart-data.ts`
- [ ] T006 [P] Implement median-split and single-repo classification helpers in `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/classification.ts`
- [ ] T007 [P] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` state contract to pass successful `analysisResponse.results` into a reusable ecosystem-map section

**Checkpoint**: Shared transformation and classification helpers exist, and the client can supply ecosystem-map input without extra API calls.

---

## Phase 3: User Story 1 - Show ecosystem metrics clearly for analyzed repos (Priority: P1) 🎯 MVP

**Goal**: Users can see visible stars, forks, and watchers for each successful repository without relying on chart hover.

**Independent Test**: Submit one or more successful results and verify stars, forks, and watchers are visible as normal UI elements for every successful repository.

### Tests for User Story 1 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T008 [P] [US1] Add view-model tests for visible ecosystem metrics in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/ecosystem-map-utils.test.ts`
- [ ] T009 [P] [US1] Add component tests for visible stars/forks/watchers rendering in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.test.tsx`
- [ ] T010 [P] [US1] Extend client integration tests for ecosystem-map metrics rendering in `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx`
- [ ] T011 [US1] Add Playwright coverage for visible ecosystem metrics in `/Users/arungupta/workspaces/forkprint/e2e/ecosystem-map.spec.ts`

### Implementation for User Story 1

- [ ] T012 [US1] Implement visible metric-row formatting in `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/chart-data.ts`
- [ ] T013 [US1] Implement `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.tsx` to render visible stars, forks, and watchers for successful repositories
- [ ] T014 [US1] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to render `EcosystemMap` from successful results

**Checkpoint**: Successful analyses show visible ecosystem metrics outside of any tooltip interactions.

---

## Phase 4: User Story 2 - Visualize analyzed repos on the ecosystem map (Priority: P2)

**Goal**: Users can see one or more successful repositories plotted on a bubble chart using stars, forks, and watchers.

**Independent Test**: Render the feature with one or more successful results and verify one bubble appears per plot-eligible successful repository with stars on X, forks on Y, and watchers as bubble size.

### Tests for User Story 2 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T015 [P] [US2] Add chart-data tests for bubble plotting eligibility and chart coordinates in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/ecosystem-map-utils.test.ts`
- [ ] T016 [P] [US2] Extend component tests for bubble chart rendering in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.test.tsx`
- [ ] T017 [US2] Add Playwright coverage for single-repo and multi-repo bubble rendering in `/Users/arungupta/workspaces/forkprint/e2e/ecosystem-map.spec.ts`

### Implementation for User Story 2

- [ ] T018 [US2] Implement chart dataset generation in `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/chart-data.ts`
- [ ] T019 [US2] Implement the Chart.js bubble chart in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.tsx`
- [ ] T020 [US2] Handle unavailable ecosystem metrics honestly in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.tsx` without fabricated plotted values

**Checkpoint**: The ecosystem map renders a useful bubble chart for one or more successful repositories.

---

## Phase 5: User Story 3 - Understand ForkPrint ecosystem classification (Priority: P2)

**Goal**: Users can see ForkPrint ecosystem classifications derived from the current successful input set when multi-repo classification is possible.

**Independent Test**: Render the feature with multiple successful repos and verify classifications change with the input set and use median-derived boundaries rather than hardcoded thresholds.

### Tests for User Story 3 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T021 [P] [US3] Add classification tests for median split behavior in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/ecosystem-map-utils.test.ts`
- [ ] T022 [P] [US3] Extend component tests for classification labels and note text in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.test.tsx`
- [ ] T023 [US3] Add Playwright coverage for multi-repo ForkPrint ecosystem classification in `/Users/arungupta/workspaces/forkprint/e2e/ecosystem-map.spec.ts`

### Implementation for User Story 3

- [ ] T024 [US3] Implement median-split classification in `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/classification.ts`
- [ ] T025 [US3] Render ForkPrint ecosystem classification labels and legend copy in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.tsx`
- [ ] T026 [US3] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to show the classification-aware ecosystem-map section alongside existing results/failure UI

**Checkpoint**: Multi-repo analyses show median-derived ForkPrint ecosystem classification without implying official CHAOSS labels.

---

## Phase 6: User Story 4 - Inspect bubble details and single-repo behavior (Priority: P3)

**Goal**: Users can inspect exact chart details and understand why classification is skipped for single-repo analyses.

**Independent Test**: Hover or focus a plotted bubble to inspect exact values and verify that a single successful repository shows a clear “classification skipped” note instead of a fabricated label.

### Tests for User Story 4 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T027 [P] [US4] Add component tests for tooltip/focus detail and single-repo note behavior in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.test.tsx`
- [ ] T028 [US4] Add Playwright coverage for tooltip details and single-repo explanatory copy in `/Users/arungupta/workspaces/forkprint/e2e/ecosystem-map.spec.ts`

### Implementation for User Story 4

- [ ] T029 [US4] Implement tooltip content and accessible focus detail in `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.tsx`
- [ ] T030 [US4] Implement single-repo explanatory note and classification skip behavior in `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/classification.ts` and `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.tsx`

**Checkpoint**: Single-repo analyses remain useful and honest, and bubble details are inspectable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, documentation alignment, and manual-checklist readiness for the feature PR.

- [ ] T031 [P] Run unit/integration tests with `npm test` and confirm ecosystem-map coverage passes
- [ ] T032 [P] Run lint with `npm run lint` and remove any dead code, TODOs, or temporary logging
- [ ] T033 [P] Run end-to-end coverage with `npm run test:e2e` including `/Users/arungupta/workspaces/forkprint/e2e/ecosystem-map.spec.ts`
- [ ] T034 Run `npm run build` and verify the ecosystem-map changes do not introduce production build regressions
- [ ] T035 Update `/Users/arungupta/workspaces/forkprint/specs/005-ecosystem-map/checklists/manual-testing.md` as the feature is manually verified
- [ ] T036 Update `/Users/arungupta/workspaces/forkprint/README.md` if the completed ecosystem-map flow changes user-facing behavior or setup

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies, can start immediately
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories
- **User Stories (Phases 3-6)**: Depend on Foundational completion
- **Polish (Phase 7)**: Depends on all implemented stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational and delivers the first usable ecosystem-map value
- **US2 (P2)**: Depends on US1’s visible metric/view-model work and adds chart rendering
- **US3 (P2)**: Depends on US2’s plotted dataset and adds ForkPrint ecosystem classification
- **US4 (P3)**: Depends on US2/US3 chart behavior and adds final tooltip/single-repo polish

### Within Each User Story

- Tests must be written and confirmed failing before implementation
- Shared utilities before component wiring
- Component rendering before Playwright validation
- Story completion before moving to the next dependent story

### Parallel Opportunities

- T002, T003, and T004 can run in parallel
- T005 and T006 can run in parallel
- T008, T009, and T010 can run in parallel
- T015 and T016 can run in parallel
- T021 and T022 can run in parallel
- T031, T032, and T033 can run in parallel

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
4. Stop and validate the visible ecosystem metrics experience before adding chart rendering

### Incremental Delivery

1. Add visible ecosystem metrics for successful repos
2. Add bubble-chart rendering for one or more successful repos
3. Add ForkPrint ecosystem classification for multi-repo runs
4. Add tooltip detail and single-repo explanatory behavior
5. Finish with verification, manual checklist completion, and README alignment

### TDD Reminder

Every test phase follows Red-Green-Refactor: write tests, verify failure, implement, then verify pass.
