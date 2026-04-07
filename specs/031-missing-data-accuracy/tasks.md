# Tasks: Missing Data & Accuracy (P1-F12)

**Input**: Design documents from `/specs/031-missing-data-accuracy/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the one new shared artifact that all user stories depend on.

- [ ] T001 Create `components/shared/MetricValue.tsx` — renders `value: string` as `"—"` in `text-slate-400` when `value === '—'`, otherwise `text-slate-900 font-semibold`
- [ ] T002 Write unit tests for `MetricValue` in `components/shared/MetricValue.test.tsx` — assert muted dash for `"—"`, standard styling for `"0"` and `"1,234"`

**Checkpoint**: `MetricValue` passes tests — all story phases can now proceed

---

## Phase 2: Foundational (Format Function Updates)

**Purpose**: Update all format functions to return `"—"` instead of the string `"unavailable"`. These functions are consumed by every user story phase. Must complete before any rendering surface is updated.

⚠️ **CRITICAL**: Update tests to expect `"—"` before changing the implementation (TDD: red → green)

- [ ] T003 Update `formatMetric()` in `lib/metric-cards/view-model.ts` to return `'—'` when value is `'unavailable'`
- [ ] T004 Update `formatText()` in `lib/metric-cards/view-model.ts` to return `'—'` as the fallback for unavailable/empty text
- [ ] T005 Update `formatDate()` in `lib/metric-cards/view-model.ts` to return `'—'` when value is `'unavailable'`
- [ ] T006 [P] Update `formatHours()` in `lib/activity/score-config.ts` to return `'—'` when value is `'unavailable'`
- [ ] T007 [P] Update `formatPercentage()` in `lib/activity/score-config.ts` to return `'—'` when value is `'unavailable'`
- [ ] T008 [P] Update `formatHours()` in `lib/responsiveness/score-config.ts` to return `'—'` when value is `'unavailable'`
- [ ] T009 [P] Update `formatPercentage()` in `lib/responsiveness/score-config.ts` to return `'—'` when value is `'unavailable'`
- [ ] T010 [P] Update `formatCount()` in `lib/responsiveness/score-config.ts` to return `'—'` when value is `'unavailable'`
- [ ] T011 Update unit tests in `lib/metric-cards/view-model.test.ts` — assert `starsLabel`, `forksLabel`, `watchersLabel`, detail row values return `'—'` (not `'unavailable'`) when input is `'unavailable'`
- [ ] T012 [P] Update unit tests in `lib/activity/score-config.test.ts` — assert `formatHours` and `formatPercentage` return `'—'` for `'unavailable'` input
- [ ] T013 [P] Update unit tests in `lib/responsiveness/score-config.test.ts` — assert all three format functions return `'—'` for `'unavailable'` input

**Checkpoint**: All lib unit tests pass with `"—"` as the universal unavailable output

---

## Phase 3: User Story 1 — Inline Unavailable Marking on MetricCard (Priority: P1) 🎯 MVP

**Goal**: MetricCard summary stats (stars, forks, watchers) and detail rows render `"—"` in muted slate styling instead of the string `"unavailable"` in bold.

**Independent Test**: Render `MetricCard` with a result where `stars`, `forks`, `watchers`, and several detail fields are `'unavailable'`. Assert each displays `"—"` with `text-slate-400` class, and that `"0"` still renders in standard bold styling.

- [ ] T014 [US1] Update `SummaryStat` in `components/metric-cards/MetricCard.tsx` to use `<MetricValue>` instead of a plain `<p>` for the value — apply `text-lg` base size
- [ ] T015 [US1] Update `components/metric-cards/MetricCard.test.tsx` — add test cases asserting `"—"` in muted styling for unavailable stars/forks/watchers and `"0"` in standard styling for zero values

**Checkpoint**: MetricCard fully compliant — unavailable summary stats show muted `"—"`, zero shows bold `"0"`

---

## Phase 4: User Story 2 — Consistent `"—"` Across All Views (Priority: P2)

**Goal**: Activity, Responsiveness, Contributors, Health Ratios, and Comparison surfaces all render `"—"` with `text-slate-400` for unavailable values. Aggregate amber callout panels are removed.

**Independent Test**: For each view, provide a result with all relevant fields set to `'unavailable'`. Assert no `"unavailable"` string appears in rendered output and no amber callout panel is rendered. Assert `"0"` is visually distinct from `"—"`.

### Activity view

- [ ] T016 [P] [US2] Remove `missingDataCallout` field and its generation logic from `lib/activity/view-model.ts` — the section type no longer carries a callout
- [ ] T017 [P] [US2] Remove the amber callout panel block from `components/activity/ActivityView.tsx` (`section.missingDataCallout ? ...`)
- [ ] T018 [US2] Update `<dd>` elements in `components/activity/ActivityView.tsx` that render `formatHours`/`formatPercentage` output to use `<MetricValue>` with `className="text-base"`
- [ ] T019 [P] [US2] Update `components/activity/ActivityView.test.tsx` — assert no amber callout panel and that unavailable metric values render `"—"` inline

### Responsiveness view

- [ ] T020 [P] [US2] Remove `missingDataCallout` field and its generation logic from `lib/responsiveness/view-model.ts`
- [ ] T021 [P] [US2] Remove the amber callout panel block from `components/responsiveness/ResponsivenessView.tsx`
- [ ] T022 [US2] Update `<dd className="text-base font-semibold text-slate-900">{metric.value}</dd>` in `components/responsiveness/ResponsivenessView.tsx` to use `<MetricValue value={metric.value} className="text-base" />`
- [ ] T023 [P] [US2] Update `components/responsiveness/ResponsivenessView.test.tsx` — assert no callout panel and inline `"—"` for unavailable metric values

### Contributors view

- [ ] T024 [P] [US2] Remove the "Missing data" amber panel block from `components/contributors/SustainabilityPane.tsx` (`section.missingData.length > 0 ? ...`)
- [ ] T025 [P] [US2] Update `emptyText` prop in `components/contributors/ContributionBarChart.tsx` — change rendered text to `"—"` and apply `text-slate-400` styling to the empty-state `<p>`
- [ ] T026 [P] [US2] Update `components/contributors/SustainabilityPane.test.tsx` and `components/contributors/CoreContributorsPane.test.tsx` — assert no amber "Missing data" panel and that empty bar chart state renders `"—"` in muted style

### Health Ratios view

- [ ] T027 [P] [US2] Update `components/health-ratios/HealthRatiosView.tsx` line rendering `cell?.displayValue ?? '—'` — add `text-slate-400` class when `displayValue === '—'` (already emits dash, needs muted style)
- [ ] T028 [P] [US2] Update `components/health-ratios/HealthRatiosView.test.tsx` — assert unavailable cells have muted styling

### Comparison table

- [ ] T029 [P] [US2] Update `components/comparison/ComparisonTable.tsx` — add `text-slate-400` class to `cell.displayValue` rendering when value is `"—"`
- [ ] T030 [P] [US2] Update `components/comparison/ComparisonView.test.tsx` — assert unavailable comparison cells render `"—"` in muted styling

**Checkpoint**: All metric surfaces render `"—"` in `text-slate-400` for unavailable values; no amber aggregate panels remain

---

## Phase 5: User Story 3 — Analyzer Enforcement Verification (Priority: P3)

**Goal**: Confirm the analyzer correctly marks missing fields as `'unavailable'` and populates `missingFields`. No new analyzer behavior — this phase is verification only.

**Independent Test**: Run `lib/analyzer/analyzer.test.ts` — existing tests at lines 610, 669, 728 already assert `missingFields` contains field names for missing API data. Confirm these pass and add any gaps.

- [ ] T031 [US3] Audit `lib/analyzer/analyzer.test.ts` — confirm tests cover all tracked fields being set to `'unavailable'` and appearing in `missingFields` when absent from the API response; add any missing field coverage
- [ ] T032 [US3] Audit `lib/analyzer/analyze.ts` — confirm `UNAVAILABLE_FIELDS` tracking covers all top-level scalar fields in `AnalysisResult` (cross-reference `analysis-result.ts`); add any fields not yet tracked

**Checkpoint**: Analyzer tests confirm no field is substituted or estimated; `missingFields` is complete

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T033 [P] Add E2E test in `e2e/missing-data.spec.ts` — mock a result with `missingFields: ['releases12mo', 'totalContributors']`; assert `"—"` appears in rendered output and no `"unavailable"` string is visible to the user
- [ ] T034 [P] Run `npm test` — confirm all unit tests pass with zero regressions
- [ ] T035 [P] Run `npm run test:e2e` — confirm E2E suite passes
- [ ] T036 [P] Run `npm run lint` — confirm no lint errors
- [ ] T037 [P] Run `npm run build` — confirm production build succeeds
- [ ] T038 Create `specs/031-missing-data-accuracy/checklists/manual-testing.md` — checklist covering: unavailable metric card stats, activity tab inline dashes, responsiveness tab inline dashes, health ratios muted cells, comparison muted cells, no amber callout panels visible
- [ ] T039 Update `docs/DEVELOPMENT.md` — mark P1-F12 as `✅ Done` in the implementation order table

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Format functions)**: Depends on Phase 1 — `MetricValue` must exist before rendering sites use it
- **Phase 3 (US1 MetricCard)**: Depends on Phase 2 — format functions must return `"—"` before rendering is updated
- **Phase 4 (US2 all views)**: Depends on Phase 2 — same reason; phases 3 and 4 can run in parallel with each other
- **Phase 5 (US3 analyzer)**: Independent — can run in parallel with phases 3 and 4
- **Phase 6 (Polish)**: Depends on phases 3, 4, 5

### Parallel Opportunities

- T006–T010 (format function updates) can all run in parallel — different files
- T011–T013 (test updates for format functions) can run in parallel
- Within Phase 4: Activity, Responsiveness, Contributors, Health Ratios, and Comparison task groups are all different files and can run in parallel
- T031–T032 (Phase 5) can run in parallel with all of Phase 4
- T033–T038 (Phase 6) can all run in parallel once preceding phases are done

---

## Implementation Strategy

### MVP (User Story 1 only)

1. T001–T002: Create `MetricValue`
2. T003–T013: Update format functions
3. T014–T015: Update `MetricCard`
4. Validate: MetricCard unavailable stats show muted dash

### Incremental Delivery

1. MVP above → MetricCard compliant
2. Phase 4 → All remaining views compliant, amber panels removed
3. Phase 5 → Analyzer verification confirmed
4. Phase 6 → Tests, lint, build, manual checklist, DEVELOPMENT.md update → PR ready

---

## Notes

- Constitution §XI (TDD mandatory): update tests to assert `"—"` *before* changing format function implementations — red first, then green
- Org inventory (`OrgInventoryView`, `OrgInventorySummary`, `OrgInventoryTable`) is out of scope — different data type, covered by P1-F16
- `ActivityScoreHelp` and `ResponsivenessScoreHelp` tooltip components are unchanged — `score.missingInputs` display stays as-is
- `RepoInputClient` rate-limit display is out of scope — not a metric value
