# Tasks: Metric Cards (P1-F07)

**Branch**: `008-metric-cards`  
**Input**: `specs/008-metric-cards/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)  
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required. The constitution requires TDD, so tests and verification tasks MUST be defined before implementation is considered complete.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (for example, `US1`, `US2`)
- Include exact file paths in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the overview-card workspace and identify existing overview/ecosystem touchpoints to replace safely.

- [x] T001 Create `/Users/arungupta/workspaces/forkprint/specs/008-metric-cards/tasks.md`
- [x] T002 [P] Review `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx`, `/Users/arungupta/workspaces/forkprint/components/ecosystem-map/EcosystemMap.tsx`, and `/Users/arungupta/workspaces/forkprint/docs/PRODUCT.md` for metric-card integration requirements
- [x] T003 [P] Review `/Users/arungupta/workspaces/forkprint/lib/analyzer/analysis-result.ts`, `/Users/arungupta/workspaces/forkprint/lib/ecosystem-map/spectrum-config.ts`, and existing overview tests for reusable card inputs and unavailable-value handling

**Checkpoint**: Overview-tab touchpoints and reusable spectrum/analyzer contracts are identified.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the reusable view-model and score-badge foundations before card UI implementation.

**⚠️ CRITICAL**: No user story implementation should start until this phase is complete.

- [x] T004 Create `/Users/arungupta/workspaces/forkprint/lib/metric-cards/view-model.ts` with helpers that derive card-ready fields and preserve explicit unavailable values from `/Users/arungupta/workspaces/forkprint/lib/analyzer/analysis-result.ts`
- [x] T005 [P] Create `/Users/arungupta/workspaces/forkprint/lib/metric-cards/score-config.ts` with config-driven badge labels, tones, and interim `Insufficient verified public data` semantics
- [x] T006 [P] Add focused tests for `/Users/arungupta/workspaces/forkprint/lib/metric-cards/view-model.ts` and `/Users/arungupta/workspaces/forkprint/lib/metric-cards/score-config.ts`

**Checkpoint**: Card data shaping and score-badge semantics are centralized and test-covered.

---

## Phase 3: User Story 1 - Scan key repo health signals quickly (Priority: P1) 🎯 MVP

**Goal**: A user can see one summary card per successful repository in the `Overview` tab with exact key signals and the current ecosystem profile summary.

**Independent Test**: Supply one or more successful `AnalysisResult` objects and confirm one card appears per repo with stars, forks, watches, created date, and the current ecosystem profile summary.

### Tests for User Story 1 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [x] T007 [P] [US1] Add component tests in `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCard.test.tsx` for summary rendering of stars, forks, watches, created date, and ecosystem profile badges
- [x] T008 [P] [US1] Add collection tests in `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCardsOverview.test.tsx` for one-card-per-successful-repo behavior and failure exclusion
- [x] T009 [US1] Extend `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` to verify the `Overview` tab renders metric cards instead of the old lightweight result rows

### Implementation for User Story 1

- [x] T010 [US1] Create `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCard.tsx` with the collapsed summary-card UI
- [x] T011 [US1] Create `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCardsOverview.tsx` to render one card per successful repository and no fabricated cards for failures
- [x] T012 [US1] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to replace the current overview result list with `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCardsOverview.tsx`

**Checkpoint**: The `Overview` tab shows one summary card per successful repository with exact key repo signals.

---

## Phase 4: User Story 2 - Understand CHAOSS-aligned score badges per repo (Priority: P2)

**Goal**: Each metric card surfaces one consistent score badge for Evolution, Contribution Dynamics, and Responsiveness.

**Independent Test**: Render repo cards with score values for Evolution, Contribution Dynamics, and Responsiveness and confirm the badges show the expected labels and color semantics.

### Tests for User Story 2 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [x] T013 [P] [US2] Add focused badge tests in `/Users/arungupta/workspaces/forkprint/components/metric-cards/ScoreBadge.test.tsx` for category labels, values, and High/Medium/Low/Insufficient color semantics
- [x] T014 [P] [US2] Extend `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCard.test.tsx` to verify three CHAOSS badges render on each card
- [x] T015 [US2] Add or update manual verification steps for score badges in `/Users/arungupta/workspaces/forkprint/specs/008-metric-cards/checklists/manual-testing.md`

### Implementation for User Story 2

- [x] T016 [US2] Create `/Users/arungupta/workspaces/forkprint/components/metric-cards/ScoreBadge.tsx` using `/Users/arungupta/workspaces/forkprint/lib/metric-cards/score-config.ts`
- [x] T017 [US2] Update `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCard.tsx` to render Evolution, Contribution Dynamics, and Responsiveness badges with explicit category labels

**Checkpoint**: Each metric card clearly frames repo health with consistent CHAOSS-aligned score badges.

---

## Phase 5: User Story 3 - Expand a card to inspect repo detail (Priority: P3)

**Goal**: A user can expand a card in place to inspect fuller repo detail without leaving the current workspace or rerunning analysis.

**Independent Test**: Render a repo card, expand it, and confirm fuller repo-specific detail becomes visible while the rest of the analysis workspace remains intact.

### Tests for User Story 3 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [x] T018 [P] [US3] Extend `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCard.test.tsx` to cover expand/collapse behavior and explicit unavailable-value rendering
- [x] T019 [P] [US3] Extend `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` to verify card expansion does not rerun analysis or trigger extra requests
- [x] T020 [US3] Add end-to-end coverage in `/Users/arungupta/workspaces/forkprint/e2e/metric-cards.spec.ts` for overview-card expansion in the shell

### Implementation for User Story 3

- [x] T021 [US3] Update `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCard.tsx` to support in-place expansion/collapse with fuller repo detail
- [x] T022 [US3] Update `/Users/arungupta/workspaces/forkprint/components/metric-cards/MetricCardsOverview.tsx` to manage expansion state locally and safely for multiple cards

**Checkpoint**: Metric cards expand in place, preserve explicit unavailable values, and do not rerun analysis.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, docs alignment, and manual signoff for the feature PR.

- [x] T023 [P] Run unit/integration tests with `npm test`
- [x] T024 [P] Run lint with `npm run lint`
- [x] T025 [P] Run end-to-end coverage with `npm run test:e2e`
- [x] T026 Run `npm run build` and verify whether metric-card work introduced any new regressions beyond the known environment/font issue
- [x] T027 Update `/Users/arungupta/workspaces/forkprint/specs/008-metric-cards/checklists/manual-testing.md` as the feature is manually verified
- [x] T028 Update `/Users/arungupta/workspaces/forkprint/README.md` if the overview/tab behavior or user-visible card experience needs documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies, can start immediately
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories
- **User Stories (Phases 3-5)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on all implemented stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational and delivers the first user-visible repo-card value
- **US2 (P2)**: Depends on the card shell from US1
- **US3 (P3)**: Depends on the summary-card structure from US1 and works best once badge placement from US2 is stable

### Parallel Opportunities

- T002 and T003 can run in parallel
- T005 and T006 can run in parallel after the foundational helpers exist
- T007 and T008 can run in parallel
- T013 and T014 can run in parallel
- T018 and T019 can run in parallel
- T023, T024, and T025 can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the overview-card experience before layering score badges and expansion detail

### Incremental Delivery

1. Replace the old overview rows with real metric cards
2. Add CHAOSS-aligned score badges with explicit interim semantics
3. Add in-place expansion for fuller repo detail
4. Finish with verification and manual checklist completion

### TDD Reminder

Every test phase follows Red-Green-Refactor: write tests, verify failure, implement, then verify pass.
