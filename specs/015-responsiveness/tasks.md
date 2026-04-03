# Tasks: Responsiveness (P1-F10)

**Branch**: `015-responsiveness`  
**Input**: `specs/015-responsiveness/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)  
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required. The constitution requires TDD, so tests and verification tasks MUST be defined before implementation is considered complete.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story belongs to (for example, `US1`, `US2`)
- Include exact file paths in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the Responsiveness feature workspace and identify the existing shell, analyzer, and badge touchpoints that the first slice will reuse.

- [ ] T001 Create `/Users/arungupta/workspaces/forkprint/specs/015-responsiveness/tasks.md`
- [ ] T002 [P] Review `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx`, `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.tsx`, and `/Users/arungupta/workspaces/forkprint/lib/results-shell/tabs.ts` for `Responsiveness`-tab integration points and the current placeholder behavior
- [ ] T003 [P] Review `/Users/arungupta/workspaces/forkprint/lib/analyzer/analysis-result.ts`, `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyze.ts`, `/Users/arungupta/workspaces/forkprint/lib/analyzer/queries.ts`, and `/Users/arungupta/workspaces/forkprint/lib/metric-cards/score-config.ts` for reusable responsiveness-score inputs and current Responsiveness badge behavior

**Checkpoint**: Responsiveness-tab touchpoints, analyzer dependencies, and score-surface constraints are identified.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the shared responsiveness data-shaping and scoring foundations before building the new tab UI.

**⚠️ CRITICAL**: No user story implementation should start until this phase is complete.

- [ ] T004 Create `/Users/arungupta/workspaces/forkprint/lib/responsiveness/view-model.ts` with helpers for pane formatting, unavailable states, and missing-data callouts
- [ ] T005 [P] Create `/Users/arungupta/workspaces/forkprint/lib/responsiveness/score-config.ts` with config-driven Responsiveness thresholds, weighted category groups, score semantics, and "how is this scored?" copy
- [ ] T006 [P] Update `/Users/arungupta/workspaces/forkprint/lib/analyzer/analysis-result.ts` with the first-slice responsiveness inputs required for pane metrics, derived rates/percentiles, Responsiveness score readiness, and missing-data reporting
- [ ] T007 [P] Add focused tests for `/Users/arungupta/workspaces/forkprint/lib/responsiveness/view-model.ts` and `/Users/arungupta/workspaces/forkprint/lib/responsiveness/score-config.ts`

**Checkpoint**: Responsiveness data shaping and score semantics are centralized and test-covered.

---

## Phase 3: User Story 1 - Inspect responsiveness metrics in the Responsiveness tab (Priority: P1) 🎯 MVP

**Goal**: A user can open `Responsiveness` and see a dedicated responsiveness section for each successful repository, grouped into panes, with no extra requests.

**Independent Test**: Supply one or more successful `AnalysisResult` objects and confirm the `Responsiveness` tab renders one responsiveness section per successful repository with the required panes and no rerun of analysis when the tab is opened.

### Tests for User Story 1 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T008 [P] [US1] Update `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsTabs.test.tsx` for the real `Responsiveness` tab contract
- [ ] T009 [P] [US1] Update `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.test.tsx` to verify the `Responsiveness` content area renders through the shell
- [ ] T010 [P] [US1] Extend `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` to verify switching to `Responsiveness` does not call `onAnalyze` again
- [ ] T011 [P] [US1] Create `/Users/arungupta/workspaces/forkprint/components/responsiveness/ResponsivenessView.test.tsx` for one-section-per-successful-repo behavior, pane rendering, and failure exclusion

### Implementation for User Story 1

- [ ] T012 [US1] Create `/Users/arungupta/workspaces/forkprint/components/responsiveness/ResponsivenessView.tsx` using `/Users/arungupta/workspaces/forkprint/lib/responsiveness/view-model.ts`
- [ ] T013 [US1] Update `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.tsx` and `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to route analyzed results into `/Users/arungupta/workspaces/forkprint/components/responsiveness/ResponsivenessView.tsx`
- [ ] T014 [US1] Update `/Users/arungupta/workspaces/forkprint/lib/results-shell/tabs.ts` and `/Users/arungupta/workspaces/forkprint/specs/006-results-shell/contracts/tab-ui.md` if the Responsiveness tab description/contract needs refinement beyond the placeholder

**Checkpoint**: The `Responsiveness` tab renders the first usable responsiveness workspace for each successful repository.

---

## Phase 4: User Story 2 - Understand response, resolution, and engagement quality for a repository (Priority: P1)

**Goal**: A user can inspect pane-based responsiveness metrics such as first response, first review, resolution duration, stale ratios, and engagement quality signals in one place.

**Independent Test**: Render repositories with known responsiveness inputs and confirm the five panes show the expected durations, ratios, and quality signals from verified public data.

### Tests for User Story 2 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T015 [P] [US2] Extend `/Users/arungupta/workspaces/forkprint/components/responsiveness/ResponsivenessView.test.tsx` to cover all five panes, explicit unavailable behavior, and visible metric grouping
- [ ] T016 [P] [US2] Extend `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` to verify responsiveness metrics render after a successful analysis
- [ ] T017 [P] [US2] Create Playwright coverage in `/Users/arungupta/workspaces/forkprint/e2e/responsiveness.spec.ts` for opening `Responsiveness` and inspecting pane content locally

### Implementation for User Story 2

- [ ] T018 [US2] Update `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyze.ts` and `/Users/arungupta/workspaces/forkprint/lib/analyzer/queries.ts` to populate the first-slice responsiveness inputs required by `/Users/arungupta/workspaces/forkprint/lib/analyzer/analysis-result.ts`
- [ ] T019 [US2] Update `/Users/arungupta/workspaces/forkprint/lib/responsiveness/view-model.ts` to group metrics into the five pane categories using the shared analysis payload
- [ ] T020 [US2] Update `/Users/arungupta/workspaces/forkprint/components/responsiveness/ResponsivenessView.tsx` to render the five panes with visible primary values and derived metrics

**Checkpoint**: The `Responsiveness` tab exposes the first complete pane-based responsiveness metric set.

---

## Phase 5: User Story 3 - Understand the Responsiveness score and its missing-data limits (Priority: P2)

**Goal**: A user can see a real Responsiveness score in overview cards and the `Responsiveness` tab, with clear weighting, thresholds, and insufficient-data handling.

**Independent Test**: Render repositories with known responsiveness inputs and confirm the Responsiveness score shows High/Medium/Low/Insufficient correctly, the overview badge updates from the placeholder state, and the scoring help surface explains weighted categories without hiding primary values.

### Tests for User Story 3 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T021 [P] [US3] Add analyzer and score tests in `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyzer.test.ts` and `/Users/arungupta/workspaces/forkprint/lib/responsiveness/score-config.test.ts` for High/Medium/Low/Insufficient responsiveness scoring inputs and explicit unavailable behavior
- [ ] T022 [P] [US3] Extend `/Users/arungupta/workspaces/forkprint/components/responsiveness/ResponsivenessView.test.tsx` to verify score rendering, help-surface copy, and missing-data callouts
- [ ] T023 [P] [US3] Extend `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCard.test.tsx` or related score-badge tests to verify the overview Responsiveness badge can render a real score instead of only `Not scored yet`

### Implementation for User Story 3

- [ ] T024 [US3] Create `/Users/arungupta/workspaces/forkprint/components/responsiveness/ResponsivenessScoreHelp.tsx` with the "how is this scored?" help surface using `/Users/arungupta/workspaces/forkprint/lib/responsiveness/score-config.ts`
- [ ] T025 [US3] Update `/Users/arungupta/workspaces/forkprint/components/responsiveness/ResponsivenessView.tsx` to render the Responsiveness score, score help, and per-repo missing-data callouts
- [ ] T026 [US3] Update `/Users/arungupta/workspaces/forkprint/lib/metric-cards/score-config.ts`, `/Users/arungupta/workspaces/forkprint/lib/metric-cards/view-model.ts`, and `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCard.tsx` so the overview Responsiveness badge consumes the first real Responsiveness score output

**Checkpoint**: The `Responsiveness` tab and overview card both expose the first real Responsiveness score and explanation surfaces.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, docs alignment, and manual signoff for the feature PR.

- [ ] T027 [P] Run unit/integration tests with `npm test`
- [ ] T028 [P] Run lint with `npm run lint`
- [ ] T029 [P] Run end-to-end coverage with `npm run test:e2e`
- [ ] T030 Run `npm run build` and verify Responsiveness changes do not introduce production build regressions beyond any known environment limitations
- [ ] T031 Create and complete `/Users/arungupta/workspaces/forkprint/specs/015-responsiveness/checklists/manual-testing.md`
- [ ] T032 Update `/Users/arungupta/workspaces/forkprint/README.md` and `/Users/arungupta/workspaces/forkprint/docs/PRODUCT.md` if the shipped Responsiveness behavior needs documentation alignment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies, can start immediately
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories
- **User Stories (Phases 3-5)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on implemented stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational and delivers the first usable `Responsiveness` workspace
- **US2 (P1)**: Depends on US1’s `Responsiveness` structure and adds the first real pane-based metric set
- **US3 (P2)**: Depends on US2’s rendered metrics and adds the real score/help surfaces plus overview badge integration

### Parallel Opportunities

- T002 and T003 can run in parallel
- T005, T006, and T007 can run in parallel
- T008, T009, T010, and T011 can run in parallel
- T015, T016, and T017 can run in parallel
- T021, T022, and T023 can run in parallel
- T027, T028, and T029 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the `Responsiveness` tab shell before adding the full pane metrics and score behavior

### Incremental Delivery

1. Replace the current `Responsiveness` placeholder with a real pane-based workspace and render one section per successful repository
2. Add the first verified responsiveness metrics across the five panes
3. Add the first real Responsiveness score plus score/help surfaces and overview badge integration
4. Finish with verification, manual checklist completion, and documentation alignment

### TDD Reminder

Every test phase follows Red-Green-Refactor: write tests, verify failure, implement, then verify pass.
