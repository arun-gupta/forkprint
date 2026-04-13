# Tasks: Inclusive Naming Analysis

**Input**: Design documents from `/specs/129-inclusive-naming/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required (TDD mandated by constitution Section XI).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create the inclusive naming module structure and static data

- [x] T001 Create `lib/inclusive-naming/` directory structure
- [x] T002 [P] Create INI Tier 1–3 word list data in `lib/inclusive-naming/word-list.ts` with term, tier, recommendation, replacements, and termPage for each entry. Exclude all Tier 0 terms.
- [x] T003 [P] Add `InclusiveNamingCheck`, `InclusiveNamingResult`, and `InclusiveNamingRecommendation` interfaces to `lib/analyzer/analysis-result.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: GraphQL query changes and extraction logic that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add `defaultBranchRef { name }` to `REPO_OVERVIEW_QUERY` in `lib/analyzer/queries.ts` and update `RepoOverviewResponse` interface in `lib/analyzer/analyze.ts`
- [x] T005 Add `repositoryTopics(first: 20) { nodes { topic { name } } }` to `REPO_OVERVIEW_QUERY` in `lib/analyzer/queries.ts` and update `RepoOverviewResponse` interface in `lib/analyzer/analyze.ts`
- [x] T006 Add `defaultBranchName` and `topics` fields to `AnalysisResult` in `lib/analyzer/analysis-result.ts`
- [x] T007 Extract `defaultBranchName` and `topics` from overview response and populate `AnalysisResult` in `lib/analyzer/analyze.ts`

**Checkpoint**: GraphQL fetches branch name and topics; AnalysisResult carries inclusive naming data

---

## Phase 3: User Story 1 - Default Branch Name Check (Priority: P1) 🎯 MVP

**Goal**: Check the default branch name for `master` and generate a recommendation to rename to `main`

**Independent Test**: Analyze any repo — verify the branch name check appears in the Documentation tab with correct pass/fail status

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Write word list data integrity tests in `__tests__/inclusive-naming/word-list.test.ts`: verify all Tier 1–3 terms present, no Tier 0 terms, each entry has non-empty replacements array
- [x] T009 [P] [US1] Write branch name checker tests in `__tests__/inclusive-naming/checker.test.ts`: `master` → fails, `main` → passes, `develop` → passes, `trunk` → passes, null → unavailable

### Implementation for User Story 1

- [x] T010 [US1] Implement `checkBranchName(branchName: string | null): InclusiveNamingCheck` in `lib/inclusive-naming/checker.ts`
- [x] T011 [US1] Implement `extractInclusiveNamingResult()` in `lib/analyzer/analyze.ts` that calls `checkBranchName` and populates `InclusiveNamingResult` on `AnalysisResult` (metadata checks as empty array for now)
- [x] T012 [US1] Verify T008 and T009 tests pass

**Checkpoint**: Branch name check works end-to-end. MVP complete.

---

## Phase 4: User Story 2 - Repo Metadata Terminology Check (Priority: P2)

**Goal**: Scan repo description and topics for INI Tier 1–3 non-inclusive terms with whole-word matching

**Independent Test**: Analyze a repo whose description contains "whitelist" or "sanity-check" — verify each flagged term appears with tier-appropriate severity and replacement suggestions

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [P] [US2] Write description scanner tests in `__tests__/inclusive-naming/checker.test.ts`: "whitelist" flagged (Tier 1), "sanity-check" flagged (Tier 2), "blast-radius" flagged (Tier 3), "blackbox" NOT flagged (Tier 0), "mastery" NOT flagged (substring), "mastermind" NOT flagged (Tier 0), case-insensitive matching
- [x] T014 [P] [US2] Write topic scanner tests in `__tests__/inclusive-naming/checker.test.ts`: exact match on topic labels, "master-slave" flagged, "machine-learning" NOT flagged

### Implementation for User Story 2

- [x] T015 [US2] Implement `checkDescription(description: string | null): InclusiveNamingCheck[]` in `lib/inclusive-naming/checker.ts` using whole-word regex matching (`\b`) and case-insensitive search
- [x] T016 [US2] Implement `checkTopics(topics: string[]): InclusiveNamingCheck[]` in `lib/inclusive-naming/checker.ts` using exact match against word list terms
- [x] T017 [US2] Update `extractInclusiveNamingResult()` in `lib/analyzer/analyze.ts` to call `checkDescription` and `checkTopics`, populating `metadataChecks` on `InclusiveNamingResult`
- [x] T018 [US2] Verify T013 and T014 tests pass

**Checkpoint**: Branch name + metadata checks both work. All analysis-layer checks complete.

---

## Phase 5: User Story 3 - Inclusive Naming Score Integration (Priority: P3)

**Goal**: Integrate inclusive naming as a 10% sub-score in the Documentation composite with tier-weighted penalties

**Independent Test**: Compare Documentation scores for repos with `master` vs `main` branch — verify the 10% weight impact. Verify recommendations appear in Recommendations tab.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T019 [P] [US3] Write inclusive naming score calculation tests in `__tests__/inclusive-naming/score-config.test.ts`: branch score (binary 0/1), metadata score with tier penalties (-0.25 T1, -0.15 T2, -0.10 T3), composite weighting (70/30), floor at 0.0, recommendation generation with tier severity labels
- [x] T020 [P] [US3] Write four-part Documentation composite tests in `__tests__/documentation/score-config.test.ts`: verify 35/30/25/10 weights, fallback to three-part (40/30/30) when inclusive naming unavailable

### Implementation for User Story 3

- [x] T021 [US3] Implement `getInclusiveNamingScore(result: InclusiveNamingResult): { branchScore: number; metadataScore: number; compositeScore: number; recommendations: InclusiveNamingRecommendation[] }` in `lib/inclusive-naming/score-config.ts`
- [x] T022 [US3] Update `DocumentationScoreDefinition` in `lib/documentation/score-config.ts` to include `inclusiveNamingScore: number` field
- [x] T023 [US3] Update `COMPOSITE_WEIGHTS` in `lib/documentation/score-config.ts` to four-part model: `{ filePresence: 0.35, readmeQuality: 0.30, licensing: 0.25, inclusiveNaming: 0.10 }`
- [x] T024 [US3] Update `FALLBACK_COMPOSITE_WEIGHTS` in `lib/documentation/score-config.ts` for when inclusive naming is unavailable (fall back to current three-part 40/30/30)
- [x] T025 [US3] Update `getDocumentationScore()` in `lib/documentation/score-config.ts` to call `getInclusiveNamingScore()` and integrate into composite
- [x] T026 [US3] Update `DocumentationRecommendation` category union in `lib/documentation/score-config.ts` to include `'inclusive_naming'`
- [x] T027 [US3] Merge inclusive naming recommendations into the documentation recommendations array in `getDocumentationScore()` so they flow through to `health-score.ts` and the Recommendations tab
- [x] T028 [US3] Verify T019 and T020 tests pass

**Checkpoint**: Scoring fully integrated. Documentation composite reflects four-part model.

---

## Phase 6: UI — Inclusive Naming Pane

**Purpose**: Display inclusive naming results in the Documentation tab

### Tests

- [x] T029 [P] Write UI rendering tests in `__tests__/components/DocumentationView.test.tsx`: Inclusive Naming pane renders, passing checks show green, failing checks show term + severity + replacements, unavailable state handled

### Implementation

- [x] T030 Add Inclusive Naming pane to `components/documentation/DocumentationView.tsx`: display branch name check result, metadata check results grouped by tier, recommendations with severity labels and INI reference link
- [x] T031 Update `components/documentation/DocumentationScoreHelp.tsx` to explain the four-part scoring model (35% file presence, 30% README quality, 25% licensing, 10% inclusive naming) with tier weight explanation
- [x] T032 Verify T029 tests pass

**Checkpoint**: Full UI rendering of inclusive naming results in Documentation tab

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Calibration, cleanup, and manual testing

- [x] T033 Update calibration data in `lib/scoring/calibration-data.json` if documentation percentiles need re-calibration with the new four-part model
- [x] T034 Run `npm run lint` and fix any linting issues
- [x] T035 Run `npm test` and verify all tests pass (existing + new)
- [x] T036 Run `npm run build` and verify clean build
- [x] T037 Create manual testing checklist at `specs/129-inclusive-naming/checklists/manual-testing.md`
- [ ] T038 Complete and sign off manual testing checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T003 (types) from Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion — No dependencies on other stories
- **US2 (Phase 4)**: Depends on Phase 2 + T010 (checker module created in US1)
- **US3 (Phase 5)**: Depends on Phase 2 + US1 + US2 (needs complete InclusiveNamingResult)
- **UI (Phase 6)**: Depends on US3 (needs scoring data to display)
- **Polish (Phase 7)**: Depends on all prior phases

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Checker logic before extraction integration
- Extraction before scoring
- Scoring before UI

### Parallel Opportunities

- T002 and T003 (word list + types) can run in parallel
- T004 and T005 (query changes) can run in parallel
- T008 and T009 (US1 tests) can run in parallel
- T013 and T014 (US2 tests) can run in parallel
- T019 and T020 (US3 tests) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch tests in parallel:
Task: "Word list data integrity tests in __tests__/inclusive-naming/word-list.test.ts"
Task: "Branch name checker tests in __tests__/inclusive-naming/checker.test.ts"

# Then implement sequentially:
Task: "Implement checkBranchName in lib/inclusive-naming/checker.ts"
Task: "Implement extractInclusiveNamingResult in lib/analyzer/analyze.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (word list, types)
2. Complete Phase 2: Foundational (GraphQL query, extraction)
3. Complete Phase 3: User Story 1 (branch name check)
4. **STOP and VALIDATE**: Test branch name check independently
5. Proceed to US2, US3, UI, Polish

### Incremental Delivery

1. Setup + Foundational → Data pipeline ready
2. US1 → Branch name check works → MVP
3. US2 → Metadata terminology checks work → Full analysis
4. US3 → Scoring integrated → Documentation score updated
5. UI → Results visible in Documentation tab → Feature complete
6. Polish → Calibration, testing, cleanup → Ship-ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Constitution XI mandates TDD: tests written first, verified failing, then implementation
- Total tasks: 38
- Tasks per story: US1 = 5, US2 = 6, US3 = 10
- Setup/Foundational = 7, UI = 4, Polish = 6
