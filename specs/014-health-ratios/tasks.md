# Tasks: Health Ratios (P1-F11)

**Branch**: `014-health-ratios`  
**Input**: `specs/014-health-ratios/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)  
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required. The constitution requires TDD, so tests and verification tasks MUST be defined before implementation is considered complete.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story belongs to (for example, `US1`, `US2`)
- Include exact file paths in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the Health Ratios workspace and identify the existing ratio touchpoints that will be reused.

- [ ] T001 Create `/Users/arungupta/workspaces/forkprint/specs/014-health-ratios/tasks.md`
- [ ] T002 [P] Review `/Users/arungupta/workspaces/forkprint/components/contributors/ContributorsView.tsx`, `/Users/arungupta/workspaces/forkprint/components/contributors/CoreContributorsPane.tsx`, and `/Users/arungupta/workspaces/forkprint/lib/contributors/view-model.ts` for contributor-ratio integration points
- [ ] T003 [P] Review `/Users/arungupta/workspaces/forkprint/components/activity/ActivityView.tsx`, `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCardsOverview.tsx`, and `/Users/arungupta/workspaces/forkprint/lib/metric-cards/score-config.ts` for reusable ecosystem/activity ratio surfaces
- [ ] T004 [P] Review `/Users/arungupta/workspaces/forkprint/lib/analyzer/analysis-result.ts`, `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyze.ts`, and `/Users/arungupta/workspaces/forkprint/lib/results-shell/tabs.ts` for ratio inputs and top-level tab touchpoints

**Checkpoint**: Existing ratio sources, missing contributor inputs, and `Health Ratios` tab touchpoints are identified.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shared ratio metadata and data-shaping helpers before building home-view or rollup UI.

**⚠️ CRITICAL**: No user story implementation should start until this phase is complete.

- [ ] T005 Create `/Users/arungupta/workspaces/forkprint/lib/health-ratios/ratio-definitions.ts` with shared category metadata, labels, formulas, help text, and value selectors
- [ ] T006 [P] Create `/Users/arungupta/workspaces/forkprint/lib/health-ratios/view-model.ts` with row shaping, display formatting, unavailable handling, and sorting helpers
- [ ] T007 [P] Update `/Users/arungupta/workspaces/forkprint/lib/analyzer/analysis-result.ts` with explicit contributor-composition ratio inputs if they are not already present
- [ ] T008 [P] Add focused tests for `/Users/arungupta/workspaces/forkprint/lib/health-ratios/ratio-definitions.ts` and `/Users/arungupta/workspaces/forkprint/lib/health-ratios/view-model.ts`

**Checkpoint**: Shared ratio definitions and table-shaping helpers are centralized and test-covered.

---

## Phase 3: User Story 1 - See contributor-composition ratios in the Contributors tab (Priority: P1) 🎯 MVP

**Goal**: A user can inspect `repeat contributors / total contributors` and `new contributors / total contributors` directly in the `Contributors` workspace.

**Independent Test**: Render one or more successful `AnalysisResult` objects and confirm the `Contributors` tab shows the verified contributor-composition ratios with no extra analysis request.

### Tests for User Story 1 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T009 [P] [US1] Extend `/Users/arungupta/workspaces/forkprint/components/contributors/ContributorsView.test.tsx` for contributor-composition ratio rendering and explicit unavailable behavior
- [ ] T010 [P] [US1] Extend `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` to verify switching to `Contributors` does not call `onAnalyze` again after the new ratios are added
- [ ] T011 [P] [US1] Add analyzer coverage in `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyzer.test.ts` for repeat/new contributor ratio inputs

### Implementation for User Story 1

- [ ] T012 [US1] Update `/Users/arungupta/workspaces/forkprint/lib/analyzer/analyze.ts` to populate repeat/new contributor ratio inputs from verified contributor data
- [ ] T013 [US1] Update `/Users/arungupta/workspaces/forkprint/lib/contributors/view-model.ts` to consume shared contributor ratio definitions
- [ ] T014 [US1] Update `/Users/arungupta/workspaces/forkprint/components/contributors/CoreContributorsPane.tsx` and `/Users/arungupta/workspaces/forkprint/components/contributors/ContributorsView.tsx` to render the contributor-composition ratios in-context

**Checkpoint**: Contributor-composition ratios are visible in the `Contributors` home view and come from verified shared data.

---

## Phase 4: User Story 2 - Compare verified ratios across repositories in a dedicated Health Ratios tab (Priority: P1)

**Goal**: A user can open `Health Ratios` and compare grouped ecosystem, activity, and contributor ratios in one sortable table.

**Independent Test**: Render two or more successful repositories and confirm the `Health Ratios` tab shows a grouped sortable table without another analysis request.

### Tests for User Story 2 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T015 [P] [US2] Update `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsTabs.test.tsx` and `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.test.tsx` for the `Health Ratios` tab contract
- [ ] T016 [P] [US2] Create `/Users/arungupta/workspaces/forkprint/components/health-ratios/HealthRatiosView.test.tsx` for grouping, sorting, unavailable rendering, and failure exclusion
- [ ] T017 [P] [US2] Extend `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` to verify the `Health Ratios` tab uses existing analysis results without another call
- [ ] T018 [P] [US2] Add Playwright coverage in `/Users/arungupta/workspaces/forkprint/e2e/health-ratios.spec.ts` for opening the tab and sorting rows

### Implementation for User Story 2

- [ ] T019 [US2] Create `/Users/arungupta/workspaces/forkprint/components/health-ratios/HealthRatiosView.tsx` using `/Users/arungupta/workspaces/forkprint/lib/health-ratios/view-model.ts`
- [ ] T020 [US2] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` and `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.tsx` to route results into the new `Health Ratios` view
- [ ] T021 [US2] Update `/Users/arungupta/workspaces/forkprint/lib/results-shell/tabs.ts` and any results-shell contract docs to add the `Health Ratios` tab

**Checkpoint**: The app exposes a real `Health Ratios` comparison tab for successful analyses.

---

## Phase 5: User Story 3 - Trust unavailable values and ratio definitions (Priority: P2)

**Goal**: A user can understand each ratio formula and trust that unavailable ratio values were not guessed.

**Independent Test**: Render repositories with partial ratio inputs and confirm the UI exposes consistent help text while showing unavailable values as `—`.

### Tests for User Story 3 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T022 [P] [US3] Extend `/Users/arungupta/workspaces/forkprint/components/health-ratios/HealthRatiosView.test.tsx` to verify help affordances and `—` unavailable rendering
- [ ] T023 [P] [US3] Extend `/Users/arungupta/workspaces/forkprint/components/contributors/ContributorsView.test.tsx` to verify contributor-ratio wording matches the rollup view
- [ ] T024 [P] [US3] Add shared-definition tests in `/Users/arungupta/workspaces/forkprint/lib/health-ratios/view-model.test.ts` or `/Users/arungupta/workspaces/forkprint/lib/health-ratios/ratio-definitions.test.ts` for formula/help consistency

### Implementation for User Story 3

- [ ] T025 [US3] Update `/Users/arungupta/workspaces/forkprint/components/health-ratios/HealthRatiosView.tsx` to surface formula/help affordances using the shared visible-tooltip pattern
- [ ] T026 [US3] Update `/Users/arungupta/workspaces/forkprint/lib/health-ratios/ratio-definitions.ts`, `/Users/arungupta/workspaces/forkprint/lib/health-ratios/view-model.ts`, and `/Users/arungupta/workspaces/forkprint/lib/contributors/view-model.ts` so wording and values stay consistent across surfaces

**Checkpoint**: Ratio formulas are explainable, unavailable states are explicit, and shared definitions keep the UI consistent.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, docs alignment, and manual signoff for the feature PR.

- [ ] T027 [P] Run unit/integration tests with `npm test`
- [ ] T028 [P] Run lint with `npm run lint`
- [ ] T029 [P] Run end-to-end coverage with `npm run test:e2e`
- [ ] T030 Run `npm run build` and verify Health Ratios changes do not introduce production build regressions
- [ ] T031 Create and complete `/Users/arungupta/workspaces/forkprint/specs/014-health-ratios/checklists/manual-testing.md`
- [ ] T032 Update `/Users/arungupta/workspaces/forkprint/README.md`, `/Users/arungupta/workspaces/forkprint/docs/PRODUCT.md`, and `/Users/arungupta/workspaces/forkprint/docs/DEVELOPMENT.md` if the shipped Health Ratios behavior needs documentation alignment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies, can start immediately
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories
- **User Stories (Phases 3-5)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on implemented stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational and delivers the first missing contributor-composition ratios
- **US2 (P1)**: Depends on shared ratio definitions and builds the dedicated `Health Ratios` rollup tab
- **US3 (P2)**: Depends on US1 and US2 surfaces to align formulas, help text, and unavailable-value behavior

### Parallel Opportunities

- T002, T003, and T004 can run in parallel
- T005, T006, T007, and T008 can run in parallel
- T009, T010, and T011 can run in parallel
- T015, T016, T017, and T018 can run in parallel
- T022, T023, and T024 can run in parallel
- T027, T028, and T029 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate contributor-composition ratios in the `Contributors` home view before building the cross-repo rollup

### Incremental Delivery

1. Add the missing contributor-composition ratios in `Contributors`
2. Add the dedicated `Health Ratios` tab and grouped sortable table
3. Align help text, unavailable values, and ratio formulas across home views and the rollup
4. Finish with verification, manual checklist completion, and documentation alignment

### TDD Reminder

Every test phase follows Red-Green-Refactor: write tests, verify failure, implement, then verify pass.
