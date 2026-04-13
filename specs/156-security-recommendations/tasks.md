# Tasks: Richer Security Recommendations

**Input**: Design documents from `/specs/156-security-recommendations/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required — constitution Section XI mandates TDD (Red-Green-Refactor).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend types and create the recommendation catalog data source

- [x] T001 Extend `SecurityRecommendation` interface with optional enriched fields (title, riskLevel, evidence, explanation, remediationHint, docsUrl, groupCategory) in `lib/security/analysis-result.ts`
- [x] T002 Add `RiskLevel`, `RecommendationCategoryKey`, and `RecommendationSource` types to `lib/security/analysis-result.ts`
- [x] T003 Update `SecurityRecommendationDisplay` in `specs/130-security-scoring/contracts/security-view-props.ts` with enriched fields matching the extended interface

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the static recommendation catalog — all user stories depend on this

**CRITICAL**: No user story work can begin until this phase is complete

### Tests

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] Write catalog completeness tests in `lib/security/__tests__/recommendation-catalog.test.ts`: verify catalog has entries for all 17 Scorecard checks listed in research.md, all 4 direct checks, each entry has all required fields, keys are unique, riskLevel and groupCategory values are valid
- [x] T005 [P] Write catalog deduplication mapping tests in `lib/security/__tests__/recommendation-catalog.test.ts`: verify the 4 known overlapping Scorecard entries (Security-Policy, Dependency-Update-Tool, CI-Tests, Branch-Protection) each have a `directCheckMapping` pointing to the correct direct check name

### Implementation

- [x] T006 Create `lib/security/recommendation-catalog.ts` with the static `RECOMMENDATION_CATALOG` array containing all 17 Scorecard check entries derived from OpenSSF Scorecard checks documentation (https://github.com/ossf/scorecard/blob/main/docs/checks.md) — each entry has: key, source, title, riskLevel, groupCategory, whyItMatters, remediation, remediationHint, docsUrl, directCheckMapping
- [x] T007 Add 4 direct check entries to `RECOMMENDATION_CATALOG` in `lib/security/recommendation-catalog.ts` for: security_policy, dependabot, ci_cd, branch_protection — each with source "direct_check", appropriate riskLevel, groupCategory, and null docsUrl/directCheckMapping
- [x] T008 Export `CATEGORY_DEFINITIONS` array in `lib/security/recommendation-catalog.ts` with the 4 categories (critical_issues order 1, quick_wins order 2, workflow_hardening order 3, best_practices order 4) and a `getCatalogEntry(key: string)` lookup helper

**Checkpoint**: Catalog is complete and tested. All 21 entries pass validation. Ready for scoring integration.

---

## Phase 3: User Story 1 - Structured Security Recommendations (Priority: P1) MVP

**Goal**: Every security recommendation includes structured fields (title, source, risk level, evidence, explanation, remediation action, docs link) instead of generic one-line text.

**Independent Test**: Analyze a repo with low-scoring Scorecard checks and missing direct checks; verify each recommendation shows all structured fields.

### Tests for User Story 1

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T009 [P] [US1] Write test in `lib/security/__tests__/score-config.test.ts`: given a Scorecard check scoring 3/10 with a catalog entry, `getSecurityScore()` returns a recommendation with title, riskLevel, evidence containing "scored 3/10", explanation, docsUrl, and groupCategory populated
- [x] T010 [P] [US1] Write test in `lib/security/__tests__/score-config.test.ts`: given a direct check with detected=false and a catalog entry, `getSecurityScore()` returns a recommendation with title, riskLevel, evidence containing "not detected", explanation, and groupCategory populated
- [x] T011 [P] [US1] Write test in `lib/security/__tests__/score-config.test.ts`: given all Scorecard checks scoring 10/10 and all direct checks detected, `getSecurityScore()` returns zero recommendations
- [x] T012 [P] [US1] Write test in `lib/security/__tests__/score-config.test.ts`: given a Scorecard check scoring 7/10 with a catalog entry, `getSecurityScore()` still returns a recommendation (threshold widened from 0-4 to 0-9)
- [x] T013 [P] [US1] Write test in `lib/security/__tests__/score-config.test.ts`: given a Scorecard check with indeterminate score (-1), no recommendation is generated for that check
- [x] T014 [P] [US1] Write test in `lib/security/__tests__/score-config.test.ts`: given a Scorecard check scoring below 10 with NO catalog entry, no recommendation is generated (catalog entry required)
- [x] T015 [P] [US1] Write backward compatibility test in `lib/security/__tests__/score-config.test.ts`: enriched recommendations still have `text` field populated and `bucket: 'security'` so health-score.ts integration is unbroken

### Implementation for User Story 1

- [x] T016 [US1] Refactor `generateDirectCheckRecommendations()` in `lib/security/score-config.ts` to look up catalog entries via `getCatalogEntry()` and populate enriched fields (title, riskLevel, evidence as "{check.name} not detected", explanation from whyItMatters, remediationHint, docsUrl, groupCategory). Compose `text` field from title + remediation for backward compat.
- [x] T017 [US1] Refactor Scorecard recommendation generation in `lib/security/score-config.ts` (lines 118-132) to: widen threshold from score 0-4 to score 0-9, look up catalog entries via `getCatalogEntry()`, populate enriched fields (title, riskLevel, evidence as "{check.name} scored {score}/10", explanation, remediationHint, docsUrl, groupCategory), skip checks with no catalog entry, skip indeterminate (-1) scores. Compose `text` from title + remediation.
- [x] T018 [US1] Remove the `RECOMMENDATION_TEXT` constant from `lib/security/score-config.ts` (lines 24-29) — replaced by catalog entries
- [x] T019 [US1] Verify all T009-T015 tests pass after implementation

**Checkpoint**: `getSecurityScore()` returns enriched recommendations with all structured fields. `text` backward compat preserved. Threshold widened to 0-9.

---

## Phase 4: User Story 2 - Grouped Recommendations by Category (Priority: P2)

**Goal**: Recommendations are organized into priority-driven categories (Critical Issues, Quick Wins, Workflow Hardening, Best Practices) with dynamic promotion based on risk level + score.

**Independent Test**: Analyze a repo with findings spanning multiple risk/score combinations; verify recommendations are grouped under correct category headings in the correct display order.

### Tests for User Story 2

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T020 [P] [US2] Write category assignment test in `lib/security/__tests__/score-config.test.ts`: given a Critical-risk Scorecard check scoring 2/10, its groupCategory is "critical_issues" (promoted from default)
- [x] T021 [P] [US2] Write category assignment test in `lib/security/__tests__/score-config.test.ts`: given a High-risk Scorecard check scoring 3/10, its groupCategory is "critical_issues" (promoted from default)
- [x] T022 [P] [US2] Write category assignment test in `lib/security/__tests__/score-config.test.ts`: given a High-risk Scorecard check scoring 7/10, its groupCategory stays at its catalog default (NOT promoted to critical_issues)
- [x] T023 [P] [US2] Write sorting test in `lib/security/__tests__/score-config.test.ts`: recommendations are sorted by category order (critical_issues first, then quick_wins, workflow_hardening, best_practices), then by riskLevel severity within each category, then by weight
- [x] T024 [P] [US2] Write UI test in `components/security/SecurityView.test.tsx`: given recommendations spanning 3 categories, SecurityView renders 3 category sections with correct headings in display order, with empty categories omitted

### Implementation for User Story 2

- [x] T025 [US2] Add category promotion logic to recommendation generation in `lib/security/score-config.ts`: after looking up catalog entry's default groupCategory, promote to "critical_issues" if riskLevel is Critical/High AND score is 0-4
- [x] T026 [US2] Update recommendation sorting in `lib/security/score-config.ts` to sort by: (1) category order (using CATEGORY_DEFINITIONS), (2) riskLevel severity (Critical > High > Medium > Low), (3) weight descending
- [x] T027 [US2] Add categorized recommendations rendering section to `components/security/SecurityView.tsx`: group recommendations by groupCategory, render each non-empty group under a labeled heading using CATEGORY_DEFINITIONS labels, display in category order
- [x] T028 [US2] Verify all T020-T024 tests pass after implementation

**Checkpoint**: Recommendations are grouped into priority-driven categories. Critical Issues show first. Empty categories are hidden.

---

## Phase 5: User Story 3 - Source Attribution and Finding Distinction (Priority: P2)

**Goal**: Each recommendation is clearly labeled with its source (OpenSSF Scorecard or Direct check).

**Independent Test**: Analyze a repo with both Scorecard and direct-check findings; verify each recommendation shows a visible source label.

### Tests for User Story 3

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T029 [P] [US3] Write deduplication test in `lib/security/__tests__/score-config.test.ts`: given Security-Policy Scorecard check scoring 5/10 AND security_policy direct check detected=false, only one recommendation is emitted (Scorecard version preferred) with evidence noting both sources
- [x] T030 [P] [US3] Write deduplication test for all 4 overlapping pairs in `lib/security/__tests__/score-config.test.ts`: Security-Policy/security_policy, Dependency-Update-Tool/dependabot, CI-Tests/ci_cd, Branch-Protection/branch_protection
- [x] T031 [P] [US3] Write UI test in `components/security/SecurityView.test.tsx`: each rendered recommendation card shows a visible source label ("OpenSSF Scorecard" or "Direct check") without requiring hover or expansion

### Implementation for User Story 3

- [x] T032 [US3] Add deduplication logic to `getSecurityScore()` in `lib/security/score-config.ts`: after generating all Scorecard recommendations, collect the set of direct check names that are covered by Scorecard entries with `directCheckMapping`. Suppress direct-check recommendations for those names. For deduplicated entries, append "Also confirmed by direct repository check" to evidence.
- [x] T033 [US3] Add source label rendering to the recommendation cards in `components/security/SecurityView.tsx`: display "OpenSSF Scorecard" or "Direct check" as a visible badge/label on each recommendation, using the `category` field
- [x] T034 [US3] Verify all T029-T031 tests pass after implementation

**Checkpoint**: Source attribution is visible on every recommendation. Duplicates are merged.

---

## Phase 6: User Story 4 - Remediation Snippets and Documentation Links (Priority: P3)

**Goal**: Recommendations include brief remediation hints and clickable links to OpenSSF Scorecard check documentation.

**Independent Test**: Analyze a repo with low-scoring checks; verify recommendations with catalog hints show them, and Scorecard-sourced recommendations link to the correct docs page.

### Tests for User Story 4

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T035 [P] [US4] Write UI test in `components/security/SecurityView.test.tsx`: given a recommendation with a non-null remediationHint, the hint text is rendered in the recommendation card
- [x] T036 [P] [US4] Write UI test in `components/security/SecurityView.test.tsx`: given a recommendation with a non-null docsUrl, a clickable link to the OpenSSF Scorecard docs is rendered
- [x] T037 [P] [US4] Write UI test in `components/security/SecurityView.test.tsx`: given a recommendation with null remediationHint and null docsUrl, no hint section or link is rendered (graceful absence)

### Implementation for User Story 4

- [x] T038 [US4] Add remediation hint rendering to recommendation cards in `components/security/SecurityView.tsx`: when `remediationHint` is non-null, render it as a distinct visual element (e.g., a light-background tip box) below the main remediation text
- [x] T039 [US4] Add documentation link rendering to recommendation cards in `components/security/SecurityView.tsx`: when `docsUrl` is non-null, render a clickable "OpenSSF Scorecard docs" link that opens in a new tab
- [x] T040 [US4] Verify all T035-T037 tests pass after implementation

**Checkpoint**: Recommendations show remediation hints and docs links where available.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Fix the missing Security color, ensure backward compat, and final validation

- [x] T041 [P] Add `Security: 'bg-red-100 text-red-800'` to `BUCKET_COLORS` in `components/recommendations/RecommendationsView.tsx`
- [x] T042 [P] Write integration test in `lib/security/__tests__/score-config.test.ts`: verify that enriched recommendations produced by `getSecurityScore()` are consumable by `getHealthScore()` — the `text` field maps to `HealthScoreRecommendation.message` without errors
- [x] T043 Run `npm test` and verify all existing + new tests pass
- [x] T044 Run `npm run lint` and `npm run build` to verify no type errors or build failures
- [ ] T045 Run quickstart.md manual verification: analyze a repo with known security findings and verify all 6 verification steps from quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — types only, can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types must exist for catalog)
- **User Story 1 (Phase 3)**: Depends on Phase 2 (catalog must exist for lookups)
- **User Story 2 (Phase 4)**: Depends on Phase 3 (enriched recs must exist for grouping)
- **User Story 3 (Phase 5)**: Depends on Phase 3 (enriched recs must exist for deduplication)
- **User Story 4 (Phase 6)**: Depends on Phase 3 (enriched recs must exist for UI rendering)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — core MVP
- **US2 (P2)**: Depends on US1 — needs enriched recs with groupCategory
- **US3 (P2)**: Depends on US1 — needs enriched recs with category field for source labels + deduplication
- **US4 (P3)**: Depends on US1 — needs enriched recs with remediationHint and docsUrl

**Note**: US2 and US3 are both P2 and can run in parallel once US1 is complete (they modify different concerns: grouping vs. source attribution). US4 can also run in parallel with US2/US3.

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD per constitution XI)
- Implementation follows test specifications
- All tests must pass before checkpoint

### Parallel Opportunities

- T004, T005 can run in parallel (different test concerns, same file)
- T009–T015 can all run in parallel (independent test cases)
- T020–T024 can all run in parallel (independent test cases)
- T029–T031 can all run in parallel (independent test cases)
- T035–T037 can all run in parallel (independent test cases)
- T041, T042 can run in parallel (different files)
- US2, US3, US4 can run in parallel after US1 (if team capacity allows)

---

## Parallel Example: User Story 1

```bash
# Launch all tests in parallel (TDD — write first, verify they fail):
T009: Scorecard check 3/10 → enriched recommendation fields
T010: Direct check not detected → enriched recommendation fields
T011: All checks perfect → zero recommendations
T012: Scorecard check 7/10 → still generates recommendation (widened threshold)
T013: Indeterminate score → no recommendation
T014: No catalog entry → no recommendation
T015: Backward compat → text field + bucket:'security' preserved

# Then implement sequentially:
T016: Refactor direct check recommendation generation
T017: Refactor Scorecard recommendation generation
T018: Remove old RECOMMENDATION_TEXT constant
T019: Verify all tests pass
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Type extensions
2. Complete Phase 2: Recommendation catalog
3. Complete Phase 3: User Story 1 (enriched structured recommendations)
4. **STOP and VALIDATE**: Test — every recommendation has structured fields, backward compat works
5. This alone delivers the core value of #140

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready (types + catalog)
2. Add US1 → Structured recommendations (MVP!)
3. Add US2 → Priority-driven grouping
4. Add US3 → Source attribution + deduplication
5. Add US4 → Remediation hints + docs links
6. Polish → Security color fix, integration test, manual verification

---

## Notes

- [P] tasks = different files or independent concerns, no dependencies
- [Story] label maps task to specific user story for traceability
- Constitution XI mandates TDD — all test tasks must complete before implementation tasks
- The `text` field on SecurityRecommendation MUST remain populated for backward compat with health-score.ts
- Catalog entries are derived from OpenSSF Scorecard checks.md — not invented
