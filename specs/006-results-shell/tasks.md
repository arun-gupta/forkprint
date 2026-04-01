# Tasks: Results Shell (P1-F15)

**Branch**: `006-results-shell`  
**Input**: `specs/006-results-shell/` (spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md)  
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required. The constitution requires TDD, so test tasks MUST be written first and confirmed failing before implementation begins.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this belongs to (for example, `US1`, `US2`)
- Include exact file paths in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the shell component structure and tab metadata utilities.

- [ ] T001 Create `/Users/arungupta/workspaces/forkprint/components/app-shell/` with `ResultsShell.tsx`, `ResultsShell.test.tsx`, `ResultsTabs.tsx`, and `ResultsTabs.test.tsx`
- [ ] T002 [P] Create `/Users/arungupta/workspaces/forkprint/lib/results-shell/tabs.ts` for shared tab definitions
- [ ] T003 [P] Create `/Users/arungupta/workspaces/forkprint/e2e/results-shell.spec.ts` with a placeholder spec file

**Checkpoint**: The repo contains the planned shell file structure for components, tab metadata, and E2E coverage.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define shell/tab contracts and connect current analysis state to the new layout surface.

**⚠️ CRITICAL**: No user story implementation should start until this phase is complete.

- [ ] T004 Implement shared tab definitions in `/Users/arungupta/workspaces/forkprint/lib/results-shell/tabs.ts`
- [ ] T005 [P] Refactor `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` so shell state can render analysis panel and active result views without changing the API contract
- [ ] T006 [P] Update `/Users/arungupta/workspaces/forkprint/app/page.tsx` to host a reusable shell container rather than a bare page stack

**Checkpoint**: The shell has stable tab metadata and a clear integration point with the existing analysis flow.

---

## Phase 3: User Story 1 - Submit repos once and navigate result views (Priority: P1) 🎯 MVP

**Goal**: Users can analyze once and switch between tabs without triggering another request or losing the analysis panel.

**Independent Test**: Submit one or more repositories, confirm analysis completes, then switch tabs and verify no new analysis request fires while the analysis panel remains available.

### Tests for User Story 1 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T007 [P] [US1] Add tab-state tests for active view switching in `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsTabs.test.tsx`
- [ ] T008 [P] [US1] Add shell integration tests for preserving the analysis panel while switching tabs in `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.test.tsx`
- [ ] T009 [P] [US1] Extend `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.test.tsx` to verify tab switching does not call `onAnalyze` again
- [ ] T010 [US1] Add Playwright coverage for analyze-once tab switching in `/Users/arungupta/workspaces/forkprint/e2e/results-shell.spec.ts`

### Implementation for User Story 1

- [ ] T011 [US1] Implement `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsTabs.tsx` with controlled tab switching
- [ ] T012 [US1] Implement `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.tsx` to keep the analysis panel stable above the tab workspace
- [ ] T013 [US1] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to render active tab content without re-submitting analysis

**Checkpoint**: Analysis runs once and users can switch result tabs without triggering another request.

---

## Phase 4: User Story 2 - Understand the app structure at a glance (Priority: P1)

**Goal**: Users see a durable app frame with a branded header and a visible GitHub repo link.

**Independent Test**: Load the app and verify the banner/header, top-right GitHub repo link on desktop, and stable analysis panel all render cleanly on desktop and mobile widths.

### Tests for User Story 2 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T014 [P] [US2] Add header/banner rendering tests in `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.test.tsx`
- [ ] T015 [P] [US2] Extend `/Users/arungupta/workspaces/forkprint/app/page.tsx` coverage or shell integration tests to verify the GitHub link is visible and correctly addressed
- [ ] T016 [US2] Add Playwright coverage for header and GitHub link layout in `/Users/arungupta/workspaces/forkprint/e2e/results-shell.spec.ts`

### Implementation for User Story 2

- [ ] T017 [US2] Implement the branded header/banner and top-right GitHub repo link in `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.tsx`
- [ ] T018 [US2] Update `/Users/arungupta/workspaces/forkprint/app/page.tsx` layout/container styling so the shell feels intentional on desktop and mobile

**Checkpoint**: The app has a stable product frame with a clear GitHub repo link and persistent analysis workspace.

---

## Phase 5: User Story 3 - Use the shell as a host for present and future result views (Priority: P2)

**Goal**: Users can navigate implemented and placeholder tabs through a stable result workspace.

**Independent Test**: Confirm tabs exist for `Overview`, `Ecosystem Map`, `Comparison`, and `Metrics`; implemented tabs show content while future tabs show intentional placeholder states.

### Tests for User Story 3 ⚠️

> **Write these tests first, and verify they fail before implementing the story.**

- [ ] T019 [P] [US3] Add tab-definition tests for implemented vs placeholder tabs in `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsTabs.test.tsx`
- [ ] T020 [P] [US3] Add shell tests for placeholder rendering in `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.test.tsx`
- [ ] T021 [US3] Add Playwright coverage for placeholder tabs and tab labels in `/Users/arungupta/workspaces/forkprint/e2e/results-shell.spec.ts`

### Implementation for User Story 3

- [ ] T022 [US3] Populate `/Users/arungupta/workspaces/forkprint/lib/results-shell/tabs.ts` with `Overview`, `Ecosystem Map`, `Comparison`, and `Metrics` metadata
- [ ] T023 [US3] Implement placeholder tab content in `/Users/arungupta/workspaces/forkprint/components/app-shell/ResultsShell.tsx`
- [ ] T024 [US3] Update `/Users/arungupta/workspaces/forkprint/components/repo-input/RepoInputClient.tsx` to route current implemented content into `Overview` and reserve the `Ecosystem Map` tab for resumed work

**Checkpoint**: The shell hosts both current and future views intentionally, without empty or broken result areas.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, docs alignment, and manual-checklist readiness for the feature PR.

- [ ] T025 [P] Run unit/integration tests with `npm test` and confirm results-shell coverage passes
- [ ] T026 [P] Run lint with `npm run lint` and remove any dead code, TODOs, or temporary logging
- [ ] T027 [P] Run end-to-end coverage with `npm run test:e2e` including `/Users/arungupta/workspaces/forkprint/e2e/results-shell.spec.ts`
- [ ] T028 Run `npm run build` and verify shell changes do not introduce production build regressions
- [ ] T029 Update `/Users/arungupta/workspaces/forkprint/specs/006-results-shell/checklists/manual-testing.md` as the feature is manually verified
- [ ] T030 Update `/Users/arungupta/workspaces/forkprint/README.md` if the shell changes the user-facing app structure or setup expectations

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies, can start immediately
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories
- **User Stories (Phases 3-5)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on all implemented stories being complete

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational and delivers the first usable shell workflow
- **US2 (P1)**: Depends on US1’s shell structure and adds header/frame clarity
- **US3 (P2)**: Depends on US1’s tab system and adds placeholder hosting for future views

### Within Each User Story

- Tests must be written and confirmed failing before implementation
- Shared tab definitions before component wiring
- Shell layout before Playwright validation
- Story completion before moving to the next dependent story

### Parallel Opportunities

- T001, T002, and T003 can run in parallel
- T004 and T005 can run in parallel
- T007, T008, and T009 can run in parallel
- T014 and T015 can run in parallel
- T019 and T020 can run in parallel
- T025, T026, and T027 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Write US1 tests in parallel
Task: "Add tab-state tests in components/app-shell/ResultsTabs.test.tsx"
Task: "Add shell integration tests in components/app-shell/ResultsShell.test.tsx"
Task: "Extend RepoInputClient tests to verify tab switching does not call onAnalyze again"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate the stable analyze-once/tab-switching workflow before adding more shell framing

### Incremental Delivery

1. Add stable shell layout and non-reloading tab navigation
2. Add branded header and GitHub repo link
3. Add placeholder-hosting tab workspace for future views
4. Finish with verification, manual checklist completion, and README alignment

### TDD Reminder

Every test phase follows Red-Green-Refactor: write tests, verify failure, implement, then verify pass.
