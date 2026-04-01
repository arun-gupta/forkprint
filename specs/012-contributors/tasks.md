# Tasks: Contributors (P1-F09)

**Branch**: `012-contribution-dynamics`  
**Input**: `specs/012-contributors/` (spec.md, plan.md)  
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories)

**Tests**: Required. The constitution requires TDD, so tests and verification tasks MUST be defined before implementation is considered complete.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (for example, `US1`, `US2`)
- Include exact file paths in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the Contributors feature workspace and identify the existing shell/analyzer touchpoints that the first slice will reuse.

- [ ] T001 Create `/Users/arungupta/workspaces/forkprint/specs/012-contributors/tasks.md`
- [ ] T002 [P] Review `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx`, `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.tsx`, and `/Users/arungupta/workspaces/forkprint/lib/results-shell/tabs.ts` for Contributors-tab integration points
- [ ] T003 [P] Review `/Users/arungupta/workspaces/forkprint/lib/analyzer/analysis-result.ts`, `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyze.ts`, and `/Users/arungupta/workspaces/forkprint/lib/metric-cards/score-config.ts` for reusable contributor-score inputs and current Sustainability badge behavior

**Checkpoint**: Contributors-tab touchpoints and analyzer dependencies are identified.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the shared contributor data-shaping and scoring foundations before building the new tab UI.

**⚠️ CRITICAL**: No user story implementation should start until this phase is complete.

- [ ] T004 Create `/Users/arungupta/workspaces/forkprint/lib/contributors/view-model.ts` with helpers for formatting core contributor metrics, unavailable states, missing-data callouts, and placeholder signal labels
- [ ] T005 [P] Create `/Users/arungupta/workspaces/forkprint/lib/contributors/score-config.ts` with config-driven Sustainability thresholds, badge semantics, and "how is this scored?" copy
- [ ] T006 [P] Update `/Users/arungupta/workspaces/forkprint/lib/analyzer/analysis-result.ts` with the first-slice contributor inputs required for total contributors, active contributors, repeat contributors, new contributors, contribution concentration, Sustainability score readiness, and missing-data reporting
- [ ] T007 [P] Add focused tests for `/Users/arungupta/workspaces/forkprint/lib/contributors/view-model.ts` and `/Users/arungupta/workspaces/forkprint/lib/contributors/score-config.ts`

**Checkpoint**: Contributor data shaping and Sustainability scoring semantics are centralized and test-covered.

---

## Phase 3: User Story 1 - Inspect core contributor metrics in the Contributors tab (Priority: P1) 🎯 MVP

**Goal**: A user can open `Contributors` and see the implemented `Core` pane with verified contributor metrics for each successful repository.

**Independent Test**: Supply one or more successful `AnalysisResult` objects and confirm the `Contributors` tab renders a `Core` pane per successful repository with total contributors, active contributors, contribution concentration, repeat contributors, and new contributors, without rerunning analysis.

### Tests for User Story 1 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T008 [P] [US1] Add top-level tab-order coverage in `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsTabs.test.tsx` for `Overview`, `Contributors`, `Metrics`, `Responsiveness`, and `Comparison`
- [ ] T009 [P] [US1] Add Contributors-shell integration tests in `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.test.tsx` for rendering the `Contributors` content area
- [ ] T010 [P] [US1] Extend `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` to verify switching to `Contributors` does not call `onAnalyze` again
- [ ] T011 [P] [US1] Create `/Users/arungupta/workspaces/forkprint/components/contributors/ContributorsView.test.tsx` for one-section-per-successful-repo behavior and failure exclusion
- [ ] T012 [P] [US1] Create `/Users/arungupta/workspaces/forkprint/components/contributors/CoreContributorsPane.test.tsx` for exact rendering of the five core contributor metrics and explicit unavailable values

### Implementation for User Story 1

- [ ] T013 [US1] Update `/Users/arungupta/workspaces/forkprint/lib/results-shell/tabs.ts` and `/Users/arungupta/workspaces/forkprint/specs/006-results-shell/contracts/results-shell-props.ts` only if needed to finalize the Contributors tab contract for implementation
- [ ] T014 [US1] Create `/Users/arungupta/workspaces/forkprint/components/contributors/CoreContributorsPane.tsx` using `/Users/arungupta/workspaces/forkprint/lib/contributors/view-model.ts`
- [ ] T015 [US1] Create `/Users/arungupta/workspaces/forkprint/components/contributors/ContributorsView.tsx` to render one repository section with a `Core` pane for each successful result
- [ ] T016 [US1] Update `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.tsx` and `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to route analyzed results into `/Users/arungupta/workspaces/forkprint/components/contributors/ContributorsView.tsx`

**Checkpoint**: The `Contributors` tab renders the first-slice `Core` metrics for each successful repository.

---

## Phase 4: User Story 2 - Understand the Sustainability pane and contributor distribution (Priority: P1)

**Goal**: A user can inspect the `Sustainability` pane, see the first real Sustainability score, and understand how it was determined.

**Independent Test**: Render repositories with known contributor distributions and confirm the `Sustainability` pane shows the correct score, help surface, and per-repo missing-data callout behavior.

### Tests for User Story 2 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T017 [P] [US2] Add analyzer tests in `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyzer.test.ts` for first-slice contributor inputs and explicit unavailable behavior
- [ ] T018 [P] [US2] Create `/Users/arungupta/workspaces/forkprint/components/contributors/SustainabilityPane.test.tsx` for High/Medium/Low/Insufficient score rendering, help copy, and missing-data callout behavior
- [ ] T019 [P] [US2] Extend `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCard.test.tsx` or related score-badge tests to verify the Overview Sustainability badge can render a real score instead of only `Not scored yet`
- [ ] T020 [P] [US2] Extend `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` to verify the `Contributors` tab exposes both `Core` and `Sustainability` panes without extra requests

### Implementation for User Story 2

- [ ] T021 [US2] Update `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyze.ts` to populate the first-slice contributor inputs required by `/Users/arungupta/workspaces/forkprint/lib/analyzer/analysis-result.ts`
- [ ] T022 [US2] Create `/Users/arungupta/workspaces/forkprint/components/contributors/SustainabilityPane.tsx` with score rendering, threshold help, and per-repo missing-data callout panel using `/Users/arungupta/workspaces/forkprint/lib/contributors/score-config.ts`
- [ ] T023 [US2] Update `/Users/arungupta/workspaces/forkprint/components/contributors/ContributorsView.tsx` to expose both `Core` and `Sustainability` panes for each successful repository
- [ ] T024 [US2] Update `/Users/arungupta/workspaces/forkprint/lib/metric-cards/score-config.ts`, `/Users/arungupta/workspaces/forkprint/lib/metric-cards/view-model.ts`, and `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCard.tsx` so the Overview Sustainability badge consumes the first real score output

**Checkpoint**: The `Sustainability` pane and Overview card badge both reflect the first real Sustainability score and explanation surfaces.

---

## Phase 5: User Story 3 - See later sustainability signals reserved clearly without fabricated data (Priority: P2)

**Goal**: A user can see that broader sustainability signals are planned, without the UI pretending they already exist.

**Independent Test**: Render the `Contributors` tab and confirm the `Sustainability` pane shows a clearly labeled placeholder area for later sustainability signals with no fabricated values.

### Tests for User Story 3 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T025 [P] [US3] Extend `/Users/arungupta/workspaces/forkprint/components/contributors/SustainabilityPane.test.tsx` to verify the placeholder area lists the reserved later signals and does not show fabricated values
- [ ] T026 [P] [US3] Add Playwright coverage in `/Users/arungupta/workspaces/forkprint/e2e/contributors.spec.ts` for tab navigation, pane switching, and placeholder-state visibility
- [ ] T027 [P] [US3] Extend `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` to verify placeholder sustainability signals remain distinct from implemented core metrics

### Implementation for User Story 3

- [ ] T028 [US3] Update `/Users/arungupta/workspaces/forkprint/components/contributors/SustainabilityPane.tsx` to render the clearly labeled later-signals placeholder area
- [ ] T029 [US3] Update `/Users/arungupta/workspaces/forkprint/lib/contributors/view-model.ts` to centralize the placeholder signal list and related display copy
- [ ] T030 [US3] Create `/Users/arungupta/workspaces/forkprint/e2e/contributors.spec.ts` with first-pass Contributors-tab E2E coverage

**Checkpoint**: The `Contributors` tab reserves future sustainability signals honestly, without fabricated values.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, docs alignment, and manual signoff for the feature PR.

- [ ] T031 [P] Run unit/integration tests with `npm test`
- [ ] T032 [P] Run lint with `npm run lint`
- [ ] T033 [P] Run end-to-end coverage with `npm run test:e2e`
- [ ] T034 Run `npm run build` and verify Contributors-tab changes do not introduce production build regressions beyond any known environment limitations
- [ ] T035 Create and complete `/Users/arungupta/workspaces/forkprint/specs/012-contributors/checklists/manual-testing.md`
- [ ] T036 Update `/Users/arungupta/workspaces/forkprint/README.md` if the new Contributors tab changes the user-visible app structure enough to need documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies, can start immediately
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories
- **User Stories (Phases 3-5)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on implemented stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational and delivers the first usable Contributors workspace
- **US2 (P1)**: Depends on US1’s Contributors structure and adds real Sustainability scoring
- **US3 (P2)**: Depends on US2’s Sustainability pane so placeholder signals have a stable home

### Parallel Opportunities

- T002 and T003 can run in parallel
- T004, T005, and T006 can run in parallel
- T008, T009, T010, T011, and T012 can run in parallel
- T017, T018, T019, and T020 can run in parallel
- T025, T026, and T027 can run in parallel
- T031, T032, and T033 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the `Contributors` tab and `Core` pane before adding real Sustainability scoring

### Incremental Delivery

1. Establish the Contributors workspace and render the five core contributor metrics
2. Add first-slice Sustainability scoring, help, and missing-data callouts
3. Add the clearly labeled placeholder area for later sustainability signals
4. Finish with verification, manual checklist completion, and README alignment

### TDD Reminder

Every test phase follows Red-Green-Refactor: write tests, verify failure, implement, then verify pass.
