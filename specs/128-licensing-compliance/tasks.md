# Tasks: Licensing & Compliance Scoring

**Input**: Design documents from `/specs/128-licensing-compliance/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — constitution mandates TDD (Red-Green-Refactor).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Static data and type definitions that all user stories depend on

- [x] T001 [P] Create OSI-approved license set and permissiveness tier map in lib/licensing/license-data.ts
- [x] T002 [P] Create unit tests for license-data (OSI lookup, tier classification, edge cases) in __tests__/licensing/license-data.test.ts
- [x] T003 Add LicensingResult, LicenseDetection, and ContributorAgreementSignal interfaces to lib/analyzer/analysis-result.ts
- [x] T004 Add licensingResult field (LicensingResult | Unavailable) to AnalysisResult interface in lib/analyzer/analysis-result.ts

---

## Phase 2: Foundational (Data Collection)

**Purpose**: Extend the analyzer to collect licensing and compliance data from the GitHub API. MUST complete before any scoring or UI work.

- [x] T005 Add `message` field to commit history nodes in REPO_COMMIT_AND_RELEASES_QUERY in lib/analyzer/queries.ts
- [x] T006 Add workflow tree query field (`object(expression: "HEAD:.github/workflows")`) to REPO_OVERVIEW_QUERY in lib/analyzer/queries.ts
- [x] T007 Write unit tests for licensing data extraction (license detection, Signed-off-by parsing, workflow bot detection) in __tests__/licensing/extract-licensing.test.ts
- [x] T008 Implement extractLicensingResult() in lib/analyzer/extract-licensing.ts — extract license SPDX ID, OSI approval, permissiveness tier from overview query response
- [x] T009 Implement Signed-off-by trailer detection in lib/analyzer/extract-licensing.ts — parse commit messages, compute signedOffByRatio
- [x] T010 Implement DCO/CLA bot detection in lib/analyzer/extract-licensing.ts — scan workflow tree entries for known bot action references
- [x] T011 Wire extractLicensingResult() into the main analyze() function, populating licensingResult on AnalysisResult in lib/analyzer/analyze.ts
- [x] T012 Remove licenseType field from DocumentationFileCheck interface in lib/analyzer/analysis-result.ts and update all references in lib/analyzer/analyze.ts and components/documentation/DocumentationView.tsx

**Checkpoint**: Analyzer now produces LicensingResult for every analyzed repo. All downstream consumers can read licensing data.

---

## Phase 3: User Story 1 — License Presence and Quality Assessment (Priority: P1) 🎯 MVP

**Goal**: Documentation score reflects license quality via a three-part composite model. Users see licensing signals affect the Documentation bucket score.

**Independent Test**: Analyze a repo with MIT license → Documentation score includes licensing sub-score. Analyze a repo with no license → score is lower, recommendation generated.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [P] [US1] Write unit tests for three-part Documentation composite formula (40/30/30 weights) in __tests__/documentation/score-config.test.ts
- [x] T014 [P] [US1] Write unit tests for licensing sub-score calculation (license present, OSI approved, tier classified, DCO enforced) in __tests__/licensing/licensing-score.test.ts
- [x] T015 [P] [US1] Write unit tests for updated file presence weights (5 files, license removed from scoring) in __tests__/documentation/score-config.test.ts
- [x] T016 [P] [US1] Write unit tests for licensing recommendation generation (no license, non-OSI, no DCO) in __tests__/licensing/licensing-score.test.ts
- [x] T017 [P] [US1] Write unit test for fallback to two-part model when licensingResult is unavailable in __tests__/documentation/score-config.test.ts

### Implementation for User Story 1

- [x] T018 [US1] Implement getLicensingScore() function computing weighted licensing sub-score in lib/documentation/score-config.ts
- [x] T019 [US1] Update FILE_WEIGHTS in lib/documentation/score-config.ts — remove license entry, redistribute weights across 5 remaining files (readme 0.30, contributing 0.20, code_of_conduct 0.10, security 0.20, changelog 0.20)
- [x] T020 [US1] Update getDocumentationScore() signature to accept licensingResult parameter in lib/documentation/score-config.ts
- [x] T021 [US1] Update composite formula to three-part model (filePresence * 0.40 + readmeQuality * 0.30 + licensing * 0.30) with fallback to two-part when licensing unavailable in lib/documentation/score-config.ts
- [x] T022 [US1] Add licensingScore field to DocumentationScoreDefinition interface in lib/documentation/score-config.ts
- [x] T023 [US1] Generate licensing recommendations (no license, non-OSI license, no DCO/CLA) in lib/documentation/score-config.ts
- [x] T024 [US1] Update getHealthScore() call site to pass licensingResult to getDocumentationScore() in lib/scoring/health-score.ts

**Checkpoint**: Documentation bucket score now incorporates licensing signals. All scoring tests pass.

---

## Phase 4: User Story 2 — License Permissiveness Classification (Priority: P2)

**Goal**: Users see the permissiveness tier (Permissive / Weak Copyleft / Copyleft) displayed in the Documentation tab's Licensing pane.

**Independent Test**: Analyze a repo with Apache-2.0 → Licensing pane shows "Permissive". Analyze a repo with GPL-3.0 → shows "Copyleft".

### Tests for User Story 2

- [x] T025 [P] [US2] Write component tests for Licensing pane rendering (license name, SPDX ID, OSI badge, permissiveness tier) in components/documentation/DocumentationView.test.tsx
- [x] T026 [P] [US2] Write component tests for Licensing pane with missing/unavailable data states in components/documentation/DocumentationView.test.tsx

### Implementation for User Story 2

- [x] T027 [US2] Add Licensing pane to DocumentationView — display license name, SPDX ID, OSI approval status, and permissiveness tier in components/documentation/DocumentationView.tsx
- [x] T028 [US2] Style Licensing pane with presence indicators (✓/✗), tier badge, and recommendation text consistent with existing file/section panes in components/documentation/DocumentationView.tsx
- [x] T029 [US2] Handle unavailable/missing licensing data gracefully in the Licensing pane (show "unavailable" state) in components/documentation/DocumentationView.tsx

**Checkpoint**: Documentation tab shows Licensing pane with license details and permissiveness tier.

---

## Phase 5: User Story 3 — DCO/CLA Enforcement Detection (Priority: P3)

**Goal**: Users see DCO/CLA enforcement status in the Licensing pane. Repos with active enforcement score higher.

**Independent Test**: Analyze a repo with Signed-off-by trailers → Licensing pane shows "DCO enforcement detected". Analyze a repo with no enforcement → shows "Not detected" with recommendation.

### Tests for User Story 3

- [x] T030 [P] [US3] Write component tests for DCO/CLA enforcement display in Licensing pane (detected/not detected states) in components/documentation/DocumentationView.test.tsx
- [x] T031 [P] [US3] Write component test for enforcement recommendation display in components/documentation/DocumentationView.test.tsx

### Implementation for User Story 3

- [x] T032 [US3] Add DCO/CLA enforcement section to Licensing pane — show Signed-off-by ratio, bot detection status, and enforcement verdict in components/documentation/DocumentationView.tsx
- [x] T033 [US3] Add enforcement recommendation text when not detected in components/documentation/DocumentationView.tsx

**Checkpoint**: Licensing pane shows full compliance picture — license quality + permissiveness + DCO/CLA enforcement.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Score help component, tooltip updates, and cleanup

- [x] T034 [P] Create DocumentationScoreHelp component explaining three-part model (file presence, README quality, licensing compliance) in components/documentation/DocumentationScoreHelp.tsx
- [x] T035 [P] Write component tests for DocumentationScoreHelp in components/documentation/DocumentationScoreHelp.test.tsx
- [x] T036 Wire DocumentationScoreHelp into DocumentationView below the score badge in components/documentation/DocumentationView.tsx
- [x] T037 Update health score tooltip text to mention three-part Documentation model in components/metric-cards/MetricCard.tsx
- [x] T038 Update summary line in DocumentationView to include licensing signal count (e.g., "X of Y files · Z of W sections · licensing: [status]") in components/documentation/DocumentationView.tsx
- [x] T039 Verify no TODO, dead code, console.log, or untyped values remain across all modified files
- [x] T040 Create manual testing checklist in specs/128-licensing-compliance/checklists/manual-testing.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types and static data must exist)
- **User Story 1 (Phase 3)**: Depends on Phase 2 (analyzer must produce LicensingResult)
- **User Story 2 (Phase 4)**: Depends on Phase 3 (scoring must work before displaying in UI)
- **User Story 3 (Phase 5)**: Depends on Phase 4 (Licensing pane must exist to add DCO section)
- **Polish (Phase 6)**: Depends on all user stories complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD per constitution)
- Scoring logic before UI rendering
- Core implementation before integration

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel
- **Phase 3**: All test tasks (T013–T017) can run in parallel, then all implementation tasks sequentially
- **Phase 4**: T025 and T026 can run in parallel
- **Phase 5**: T030 and T031 can run in parallel
- **Phase 6**: T034 and T035 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all US1 tests in parallel (TDD — write first, verify they fail):
Task: "T013 — Three-part composite formula tests"
Task: "T014 — Licensing sub-score calculation tests"
Task: "T015 — Updated file presence weight tests"
Task: "T016 — Licensing recommendation tests"
Task: "T017 — Two-part fallback tests"

# Then implement sequentially:
Task: "T018 — getLicensingScore()"
Task: "T019 — Update FILE_WEIGHTS"
Task: "T020 — Update getDocumentationScore() signature"
Task: "T021 — Three-part composite formula"
Task: "T022 — Add licensingScore to definition"
Task: "T023 — Generate licensing recommendations"
Task: "T024 — Wire into health score"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Static data + types
2. Complete Phase 2: Analyzer data collection
3. Complete Phase 3: Scoring integration (US1)
4. **STOP and VALIDATE**: Run all tests, verify Documentation score changes with licensing signals
5. Score is functional even without UI — visible in health score composite

### Incremental Delivery

1. Setup + Foundational → Analyzer produces licensing data
2. Add US1 (scoring) → Documentation score reflects licensing → MVP!
3. Add US2 (UI display) → Users see licensing details in Documentation tab
4. Add US3 (DCO/CLA display) → Full compliance picture visible
5. Polish → Help component, tooltips, cleanup

---

## Notes

- Total tasks: **40**
- US1 (scoring): 12 tasks (5 tests + 7 implementation)
- US2 (UI display): 5 tasks (2 tests + 3 implementation)
- US3 (DCO/CLA display): 4 tasks (2 tests + 2 implementation)
- Setup: 4 tasks, Foundational: 8 tasks, Polish: 7 tasks
- Parallel opportunities: 5 parallel groups across phases
- MVP scope: Phases 1–3 (24 tasks) delivers scoring without UI pane
