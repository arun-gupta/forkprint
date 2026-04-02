# Tasks: Activity (P1-F08)

**Branch**: `013-activity-scoring`  
**Input**: `specs/013-activity-scoring/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)  
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required. The constitution requires TDD, so tests and verification tasks MUST be defined before implementation is considered complete.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (for example, `US1`, `US2`)
- Include exact file paths in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the Activity feature workspace and identify the existing shell, analyzer, and badge touchpoints that the first slice will reuse.

- [ ] T001 Create `/Users/arungupta/workspaces/forkprint/specs/013-activity-scoring/tasks.md`
- [ ] T002 [P] Review `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx`, `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.tsx`, and `/Users/arungupta/workspaces/forkprint/lib/results-shell/tabs.ts` for `Activity`-tab integration points and the current `Metrics` placeholder behavior
- [ ] T003 [P] Review `/Users/arungupta/workspaces/forkprint/lib/analyzer/analysis-result.ts`, `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyze.ts`, `/Users/arungupta/workspaces/forkprint/lib/analyzer/queries.ts`, and `/Users/arungupta/workspaces/forkprint/lib/metric-cards/score-config.ts` for reusable activity-score inputs and current Activity badge behavior

**Checkpoint**: Activity-tab touchpoints, analyzer dependencies, and score-surface constraints are identified.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the shared activity data-shaping and scoring foundations before building the new tab UI.

**⚠️ CRITICAL**: No user story implementation should start until this phase is complete.

- [ ] T004 Create `/Users/arungupta/workspaces/forkprint/lib/activity/view-model.ts` with helpers for formatting selected-window metrics, fixed commit-window values, unavailable states, and missing-data callouts
- [ ] T005 [P] Create `/Users/arungupta/workspaces/forkprint/lib/activity/score-config.ts` with config-driven Activity thresholds, weighted factor groups, score semantics, and "how is this scored?" copy
- [ ] T006 [P] Update `/Users/arungupta/workspaces/forkprint/lib/analyzer/analysis-result.ts` with the first-slice activity inputs required for selected windows, fixed commit windows, release cadence, derived rates/medians, Activity score readiness, and missing-data reporting
- [ ] T007 [P] Add focused tests for `/Users/arungupta/workspaces/forkprint/lib/activity/view-model.ts` and `/Users/arungupta/workspaces/forkprint/lib/activity/score-config.ts`

**Checkpoint**: Activity data shaping and score semantics are centralized and test-covered.

---

## Phase 3: User Story 1 - Inspect repo activity metrics in the Activity tab (Priority: P1) 🎯 MVP

**Goal**: A user can open `Activity` and see a dedicated activity section for each successful repository, with primary values visible and no extra requests.

**Independent Test**: Supply one or more successful `AnalysisResult` objects and confirm the `Activity` tab renders one activity section per successful repository with visible primary values and no rerun of analysis when the tab is opened.

### Tests for User Story 1 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T008 [P] [US1] Update `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsTabs.test.tsx` for the top-level tab contract change from `Metrics` to `Activity`
- [ ] T009 [P] [US1] Update `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.test.tsx` to verify the `Activity` content area renders through the shell
- [ ] T010 [P] [US1] Extend `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` to verify switching to `Activity` does not call `onAnalyze` again
- [ ] T011 [P] [US1] Create `/Users/arungupta/workspaces/forkprint/components/activity/ActivityView.test.tsx` for one-section-per-successful-repo behavior, visible primary values, and failure exclusion

### Implementation for User Story 1

- [ ] T012 [US1] Update `/Users/arungupta/workspaces/forkprint/lib/results-shell/tabs.ts` and `/Users/arungupta/workspaces/forkprint/specs/006-results-shell/contracts/tab-ui.md` to rename the `Metrics` top-level tab to `Activity`
- [ ] T013 [US1] Create `/Users/arungupta/workspaces/forkprint/components/activity/ActivityView.tsx` using `/Users/arungupta/workspaces/forkprint/lib/activity/view-model.ts`
- [ ] T014 [US1] Update `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.tsx` and `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to route analyzed results into `/Users/arungupta/workspaces/forkprint/components/activity/ActivityView.tsx`

**Checkpoint**: The `Activity` tab renders the first usable activity workspace for each successful repository.

---

## Phase 4: User Story 2 - Change the recent activity window without rerunning analysis (Priority: P1)

**Goal**: A user can switch among supported recent-activity presets in the `Activity` tab and see metrics update locally.

**Independent Test**: Render one or more successful repositories, switch between `30d`, `60d`, `90d`, `180d`, and `12 months`, and confirm the displayed activity metrics update locally without any additional analysis request.

### Tests for User Story 2 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T015 [P] [US2] Extend `/Users/arungupta/workspaces/forkprint/components/activity/ActivityView.test.tsx` to cover `30d`, `60d`, `90d`, `180d`, and `12 months` window switching and visible selected-state behavior
- [ ] T016 [P] [US2] Extend `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` to verify recent-activity window changes do not rerun analysis
- [ ] T017 [P] [US2] Create Playwright coverage in `/Users/arungupta/workspaces/forkprint/e2e/activity.spec.ts` for opening `Activity` and switching windows locally

### Implementation for User Story 2

- [ ] T018 [US2] Update `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyze.ts` and `/Users/arungupta/workspaces/forkprint/lib/analyzer/queries.ts` to populate the selected-window activity inputs and fixed commit windows required by `/Users/arungupta/workspaces/forkprint/lib/analyzer/analysis-result.ts`
- [ ] T019 [US2] Update `/Users/arungupta/workspaces/forkprint/lib/activity/view-model.ts` to support `30d`, `60d`, `90d`, `180d`, and `12 months` local window selection using the shared analysis payload
- [ ] T020 [US2] Update `/Users/arungupta/workspaces/forkprint/components/activity/ActivityView.tsx` to render the `Recent activity window` control with local state and synchronized per-repo updates
- [ ] T020a [US2] Update `/Users/arungupta/workspaces/forkprint/lib/activity/view-model.ts` and `/Users/arungupta/workspaces/forkprint/components/activity/ActivityView.tsx` to surface selected-window PR merge rate and issue closure rate with raw-count context

**Checkpoint**: The `Activity` tab supports local recent-activity window switching with no extra fetches.

---

## Phase 5: User Story 3 - Understand the Activity score and how it was derived (Priority: P1)

**Goal**: A user can see a real Activity score in overview cards and the `Activity` tab, with clear threshold and factor explanations.

**Independent Test**: Render repositories with known activity inputs and confirm the Activity score shows High/Medium/Low/Insufficient correctly, the overview badge updates from the placeholder state, and the scoring help surface explains thresholds without hiding primary values.

### Tests for User Story 3 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T021 [P] [US3] Add analyzer and score tests in `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyzer.test.ts` and `/Users/arungupta/workspaces/forkprint/lib/activity/score-config.test.ts` for High/Medium/Low/Insufficient activity scoring inputs and explicit unavailable behavior
- [ ] T022 [P] [US3] Extend `/Users/arungupta/workspaces/forkprint/components/activity/ActivityView.test.tsx` to verify score rendering, help-surface copy, and derived-metric explanations
- [ ] T023 [P] [US3] Extend `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCard.test.tsx` or related score-badge tests to verify the overview Activity badge can render a real score instead of only `Not scored yet`

### Implementation for User Story 3

- [ ] T024 [US3] Update `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyze.ts` and `/Users/arungupta/workspaces/forkprint/lib/analyzer/queries.ts` to populate the first-slice score inputs required for release cadence, PR merge rate, stale issue ratio, and median time-to-merge/close values
- [ ] T025 [US3] Create `/Users/arungupta/workspaces/forkprint/components/activity/ActivityScoreHelp.tsx` with the "how is this scored?" help surface using `/Users/arungupta/workspaces/forkprint/lib/activity/score-config.ts`
- [ ] T026 [US3] Update `/Users/arungupta/workspaces/forkprint/components/activity/ActivityView.tsx` to render the Activity score, score help, and derived-metric explanations while keeping primary values visible
- [ ] T027 [US3] Update `/Users/arungupta/workspaces/forkprint/lib/metric-cards/score-config.ts`, `/Users/arungupta/workspaces/forkprint/lib/metric-cards/view-model.ts`, and `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCard.tsx` so the overview Activity badge consumes the first real Activity score output

**Checkpoint**: The `Activity` tab and overview card both expose the first real Activity score and explanation surfaces.

---

## Phase 6: User Story 4 - See missing activity data clearly without fabricated values (Priority: P2)

**Goal**: A user can tell which activity values are unavailable and which missing inputs prevent scoring, without the UI inventing or hiding data.

**Independent Test**: Render repositories with partial activity data and confirm unavailable metrics remain explicit, the score becomes `Insufficient verified public data` when required inputs are incomplete, and missing inputs are called out clearly per repository.

### Tests for User Story 4 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T028 [P] [US4] Extend `/Users/arungupta/workspaces/forkprint/components/activity/ActivityView.test.tsx` to verify explicit unavailable rendering and per-repo missing-data callouts
- [ ] T029 [P] [US4] Extend `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` to verify partial activity data still renders available values while unavailable values remain explicit
- [ ] T030 [P] [US4] Extend `/Users/arungupta/workspaces/forkprint/e2e/activity.spec.ts` for unavailable-data and insufficient-score scenarios

### Implementation for User Story 4

- [ ] T031 [US4] Update `/Users/arungupta/workspaces/forkprint/lib/activity/view-model.ts` to centralize missing-data callout content and explicit unavailable formatting for derived metrics
- [ ] T032 [US4] Update `/Users/arungupta/workspaces/forkprint/components/activity/ActivityView.tsx` to render per-repo missing-data callouts and explicit unavailable states without hiding available values

**Checkpoint**: The `Activity` tab handles incomplete public data honestly and explicitly.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, docs alignment, and manual signoff for the feature PR.

- [ ] T033 [P] Run unit/integration tests with `npm test`
- [ ] T034 [P] Run lint with `npm run lint`
- [ ] T035 [P] Run end-to-end coverage with `npm run test:e2e`
- [ ] T036 Run `npm run build` and verify Activity-tab changes do not introduce production build regressions beyond any known environment limitations
- [ ] T037 Create and complete `/Users/arungupta/workspaces/forkprint/specs/013-activity-scoring/checklists/manual-testing.md`
- [ ] T038 Update `/Users/arungupta/workspaces/forkprint/README.md` and `/Users/arungupta/workspaces/forkprint/docs/PRODUCT.md` if the `Activity` tab rename or score terminology changes need documentation alignment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies, can start immediately
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories
- **User Stories (Phases 3-6)**: Depend on Foundational completion
- **Polish (Phase 7)**: Depends on implemented stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational and delivers the first usable `Activity` workspace
- **US2 (P1)**: Depends on US1’s `Activity` structure and adds local recent-window switching
- **US3 (P1)**: Depends on US1’s workspace shell and US2’s window-ready activity data, then adds the real score and help surfaces
- **US4 (P2)**: Depends on US3’s score and metric surfaces so missing-data behavior has a stable home

### Parallel Opportunities

- T002 and T003 can run in parallel
- T005, T006, and T007 can run in parallel
- T008, T009, T010, and T011 can run in parallel
- T015, T016, and T017 can run in parallel
- T021, T022, and T023 can run in parallel
- T028, T029, and T030 can run in parallel
- T033, T034, and T035 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the `Activity` tab shell before adding local window switching, scoring, and missing-data refinements

### Incremental Delivery

1. Rename the current `Metrics` placeholder into a real `Activity` workspace and render one section per successful repository
2. Add local recent-activity window switching with the supported presets
3. Add the first real Activity score plus score/help surfaces and overview badge integration
4. Add explicit missing-data callouts and unavailable-state handling
5. Finish with verification, manual checklist completion, and documentation alignment

### TDD Reminder

Every test phase follows Red-Green-Refactor: write tests, verify failure, implement, then verify pass.
