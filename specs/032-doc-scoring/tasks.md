# Tasks: Documentation Scoring

**Input**: Design documents from `/specs/032-doc-scoring/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: TDD is mandatory per constitution Section XI. Tests written first, verified to fail, then implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Types, GraphQL query extensions, and analyzer integration

- [ ] T001 Add `DocumentationResult` type and `documentationResult` field to `AnalysisResult` in `lib/analyzer/analysis-result.ts`
- [ ] T002 Add documentation file `object()` aliases, README content (`... on Blob { text }`), and `licenseInfo { spdxId name }` to the overview GraphQL query in `lib/analyzer/queries.ts`
- [ ] T003 Extract documentation results from GraphQL response in `lib/analyzer/analyze.ts` — parse file aliases into `DocumentationResult` with file checks, README content, and license info

---

## Phase 2: Foundational (Scoring Infrastructure)

**Purpose**: Core scoring logic that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Write tests for documentation scoring logic in `lib/documentation/score-config.test.ts` — file presence weighted score (60%), README quality weighted score (40%), composite calculation, recommendation generation for missing items
- [ ] T005 [P] Write tests for README section detection in `lib/documentation/score-config.test.ts` — regex heading matching for description, installation, usage, contributing, license sections; edge cases: empty README, RST format, no headings
- [ ] T006 Implement `getDocumentationScore()` in `lib/documentation/score-config.ts` — file presence sub-score (weighted: README 25%, LICENSE 20%, CONTRIBUTING 15%, CODE_OF_CONDUCT 10%, SECURITY 15%, CHANGELOG 15%), README section detection and quality sub-score (weighted: description 25%, installation 25%, usage 25%, contributing 15%, license 10%), composite score, recommendation generation
- [ ] T007 Write tests for documentation percentile scoring in `lib/documentation/score-config.test.ts` — percentile via `interpolatePercentile`, tone mapping, bracket label
- [ ] T008 Add documentation calibration placeholder to `lib/scoring/config-loader.ts` — add `documentationScore` field to `BracketCalibration` with temporary linear percentile anchors until real calibration data is collected

**Checkpoint**: Scoring logic complete — can compute documentation score and generate recommendations for any repo

---

## Phase 3: User Story 1 — View documentation health for a repository (Priority: P1) 🎯 MVP

**Goal**: Documentation percentile score appears on the scorecard alongside Activity, Responsiveness, Sustainability

**Independent Test**: Analyze any public repo → Documentation score badge visible on scorecard

### Tests for User Story 1

- [ ] T009 [P] [US1] Write tests for health score rebalancing in `lib/scoring/health-score.test.ts` — verify new weights (30/30/25/15), verify documentation percentile included in composite, verify recommendations generated without percentile gate
- [ ] T010 [P] [US1] Write tests for documentation score badge in `components/metric-cards/MetricCard.test.tsx` — verify Documentation badge renders with percentile, verify recommendation count shown

### Implementation for User Story 1

- [ ] T011 [US1] Rebalance health score weights to 30/30/25/15 in `lib/scoring/health-score.ts` — add documentation percentile to composite, remove 50th percentile gate for all recommendation generation
- [ ] T012 [US1] Add Documentation score badge to scorecard in `components/metric-cards/MetricCard.tsx` — 4th score cell showing documentation percentile
- [ ] T013 [US1] Add recommendation count summary to scorecard in `components/metric-cards/MetricCard.tsx` — show "N recommendations" linking to Recommendations tab, remove existing inline recommendations panel
- [ ] T014 [US1] Register Documentation and Recommendations tabs in `components/repo-input/RepoInputClient.tsx`

**Checkpoint**: Scorecard shows Documentation percentile + recommendation count. MVP functional.

---

## Phase 4: User Story 2 — Documentation completeness breakdown (Priority: P2)

**Goal**: Documentation tab shows per-file checklist, README section detection, and recommendations

**Independent Test**: Analyze a repo → switch to Documentation tab → see file/section breakdown with recommendations

### Tests for User Story 2

- [ ] T015 [P] [US2] Write tests for documentation view model in `lib/documentation/view-model.test.ts` — file statuses (found/missing with recommendations), README section statuses (detected/missing with recommendations), summary counts
- [ ] T016 [P] [US2] Write component tests for DocumentationView in `components/documentation/DocumentationView.test.tsx` — renders file checklist, renders README sections, renders recommendations inline

### Implementation for User Story 2

- [ ] T017 [US2] Implement `buildDocumentationViewModel()` in `lib/documentation/view-model.ts` — map `DocumentationResult` to `DocumentationSectionViewModel` with file statuses, README section statuses, recommendations
- [ ] T018 [US2] Implement `DocumentationView` component in `components/documentation/DocumentationView.tsx` — score badge, file presence checklist (check/cross icons), README section detection list, inline recommendation text for each missing item
- [ ] T019 [US2] Implement `RecommendationsView` component in `components/recommendations/RecommendationsView.tsx` — unified list of all recommendations from all buckets (Activity, Responsiveness, Sustainability, Documentation), each tagged with bucket label, ordered by weight/impact
- [ ] T020 [P] [US2] Write component tests for RecommendationsView in `components/recommendations/RecommendationsView.test.tsx` — renders recommendations from multiple buckets, shows bucket labels, ordered by impact

**Checkpoint**: Documentation tab fully functional with file/section breakdown and recommendations. Recommendations tab shows unified cross-bucket list.

---

## Phase 5: User Story 3 — Compare documentation across repositories (Priority: P3)

**Goal**: Documentation scores and file counts appear in Comparison view

**Independent Test**: Analyze 2+ repos → Comparison view shows Documentation section

### Tests for User Story 3

- [ ] T021 [P] [US3] Write tests for documentation comparison attributes in `lib/comparison/view-model.test.ts` — documentation score, file count, README quality in comparison table

### Implementation for User Story 3

- [ ] T022 [US3] Add documentation comparison section to `lib/comparison/sections.ts` — documentation score, files found count, README sections detected count
- [ ] T023 [US3] Add documentation data to JSON export in `lib/export/json-export.ts`
- [ ] T024 [P] [US3] Add documentation data to Markdown export in `lib/export/markdown-export.ts`
- [ ] T025 [P] [US3] Write export tests in `lib/export/json-export.test.ts` and `lib/export/markdown-export.test.ts`

**Checkpoint**: Documentation metrics in comparison and exports. All user stories complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Scoring methodology page, calibration, edge cases

- [ ] T026 Add documentation metrics to Scoring Methodology page in `components/baseline/BaselineView.tsx` — file list, weights, README sections, calibration anchors
- [ ] T027 Add documentation scoring to calibration script in `scripts/calibrate.ts` — collect file presence and README section data for 1600+ repos using GraphQL `object()` aliases
- [ ] T028 Handle edge cases in `lib/analyzer/analyze.ts` — empty README (present but no sections), rate limit failures (mark unavailable), missing `licenseInfo` (license file present but type unrecognized)
- [ ] T029 Update `docs/PRODUCT.md` P1-F09 sustainability pane description and health score weights
- [ ] T030 Create manual testing checklist at `specs/032-doc-scoring/checklists/manual-testing.md`
- [ ] T031 Mark P2-F01 as done in `docs/DEVELOPMENT.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2
- **User Story 2 (Phase 4)**: Depends on Phase 2 (US1 not required — but scorecard changes from US1 are needed for tab registration)
- **User Story 3 (Phase 5)**: Depends on Phase 2
- **Polish (Phase 6)**: Depends on all user stories

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Scoring logic before UI components
- Core implementation before integration

### Parallel Opportunities

- T004 and T005 can run in parallel (different test concerns)
- T009 and T010 can run in parallel (different test files)
- T015 and T016 can run in parallel (different test files)
- T023 and T024 can run in parallel (different export files)
- T021, T023, T024, T025 can all run in parallel (different files)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001–T003)
2. Phase 2: Foundational scoring (T004–T008)
3. Phase 3: US1 — scorecard integration (T009–T014)
4. **STOP and VALIDATE**: Documentation score visible on scorecard
5. Deploy if ready

### Incremental Delivery

1. Setup + Foundational → scoring works
2. US1 → scorecard shows documentation percentile (MVP!)
3. US2 → Documentation tab + Recommendations tab
4. US3 → comparison + exports
5. Polish → methodology page, calibration, edge cases

---

## Notes

- Constitution XI mandates TDD — tests written and failing before implementation
- All scoring weights defined in config (`score-config.ts`), not hardcoded
- Calibration data collection (T027) can run independently after scoring logic exists
- Temporary linear percentile anchors (T008) until real calibration data is collected
