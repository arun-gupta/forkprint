# Tasks: Report Search

**Input**: Design documents from `/specs/174-report-search/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: TDD is mandatory per constitution Section XI. Tests are written first and must fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create directory structure and shared types for report search

- [x] T001 Create directories `components/search/` and `lib/search/`
- [x] T002 [P] Create search type exports in lib/search/types.ts based on specs/174-report-search/contracts/report-search-props.ts (SearchIndex, SearchResult, TabMatchCounts)

---

## Phase 2: Foundational (Search Engine + Index)

**Purpose**: Core search logic that ALL user stories depend on. Must complete before any UI work.

**CRITICAL**: No user story work can begin until this phase is complete.

### Tests

- [x] T003 [P] Write tests for search engine in __tests__/lib/search/search-engine.test.ts — case-insensitive substring matching, empty query returns zero matches, special characters treated as literals, match counting per tab
- [x] T004 [P] Write tests for search index builder in __tests__/lib/search/search-index.test.ts — extracts correct text per tab from mock AnalysisResult[], covers all 8 tabs, handles empty results

### Implementation

- [x] T005 [P] Implement search engine in lib/search/search-engine.ts — executeSearch(index, query) returns SearchResult with matchCounts, totalMatches, matchedTabCount; case-insensitive substring matching; empty/whitespace query returns zero matches
- [x] T006 [P] Implement search index builder in lib/search/search-index.ts — buildSearchIndex(results: AnalysisResult[]) returns Record<ResultTabId, string[]>; one extractor per tab covering repo names, metric labels, values, recommendation IDs, risk levels, license info, contributor names, scorecard checks, documentation file names
- [x] T007 Verify T003 and T004 tests pass with implementations from T005 and T006

**Checkpoint**: Search logic is complete and tested. UI work can begin.

---

## Phase 3: User Story 1 — Search by Recommendation ID (Priority: P1) MVP

**Goal**: User can type a recommendation ID (e.g., `SEC-3`) in the toolbar search bar and see badge counts on tabs + highlighted matches in the active tab.

**Independent Test**: Analyze any repo, type a known recommendation ID, verify badge counts appear on matching tabs and text is highlighted.

### Tests

- [x] T008 [P] [US1] Write tests for ReportSearchBar in __tests__/components/search/ReportSearchBar.test.tsx — renders search input, calls onQueryChange on typing, displays match summary ("N matches across M tabs"), shows nothing when totalMatches is 0, input has placeholder text
- [x] T009 [P] [US1] Write tests for SearchHighlighter in __tests__/components/search/SearchHighlighter.test.tsx — splits text and wraps matches in mark element, handles no match (renders plain text), handles multiple matches, case-insensitive highlighting, empty query renders plain text
- [x] T010 [P] [US1] Write tests for ResultsTabs badge rendering in __tests__/components/app-shell/ResultsTabs.test.tsx — renders badge counts when matchCounts prop provided, no badge when count is 0 or matchCounts not provided, badge visible in overflow dropdown tabs

### Implementation

- [x] T011 [P] [US1] Implement ReportSearchBar component in components/search/ReportSearchBar.tsx — search input with magnifying glass icon, match summary text, clear button when query is non-empty, Tailwind styling consistent with ExportControls
- [x] T012 [P] [US1] Implement SearchHighlighter component in components/search/SearchHighlighter.tsx — splits text on case-insensitive query match, wraps matched substrings in `<mark>` with yellow highlight styling, returns plain text when query is empty
- [x] T013 [US1] Add optional matchCounts prop to ResultsTabs in components/app-shell/ResultsTabs.tsx — display badge count next to tab label in TabButton when count > 0, show badge in overflow dropdown menu items
- [x] T014 [US1] Wire search state into RepoInputClient in components/repo-input/RepoInputClient.tsx — add query/setQuery state, implement 300ms debounce with useEffect+setTimeout, build search index from analysisResponse.results via useMemo, execute search on debounced query, pass matchCounts to ResultsShell
- [x] T015 [US1] Update ResultsShell in components/app-shell/ResultsShell.tsx — accept optional matchCounts prop, pass it through to ResultsTabs; accept optional searchQuery prop for tab content highlighting
- [x] T016 [US1] Compose toolbar in RepoInputClient — render ReportSearchBar alongside ExportControls in the toolbar slot, only when analysisResponse is present
- [x] T017 [US1] Verify T008, T009, T010 tests pass with implementations

**Checkpoint**: Core search is functional — search bar visible, badge counts on tabs, text highlighting works. User Story 1 is independently testable.

---

## Phase 4: User Story 2 — Filter by Risk Level (Priority: P1)

**Goal**: User can type `Critical` or `High` and see risk-level matches across Security and Recommendations tabs with accurate badge counts.

**Independent Test**: Analyze a repo with security findings, type `Critical`, verify matches in Security and Recommendations tabs.

### Tests

- [x] T018 [US2] Write test in __tests__/lib/search/search-index.test.ts — verify search index includes risk level text (Critical, High, Medium, Low) from security and recommendation data

### Implementation

- [x] T019 [US2] Ensure search index extractors for security and recommendations tabs in lib/search/search-index.ts include risk/severity level text, recommendation descriptions, and category labels
- [x] T020 [US2] Verify case-insensitive matching works for risk levels (e.g., `critical` matches `Critical`) — should pass with existing engine logic from T005

**Checkpoint**: Risk-level search produces correct matches in Security and Recommendations tabs.

---

## Phase 5: User Story 3 — Search for Metrics (Priority: P2)

**Goal**: User can type metric names like `merge rate`, `stale issues`, `commits` and find them across Activity, Responsiveness, Overview tabs.

**Independent Test**: Analyze a repo, type `merge rate`, verify highlighted matches in Activity tab.

### Tests

- [x] T021 [US3] Write test in __tests__/lib/search/search-index.test.ts — verify index includes metric labels and values from activity, responsiveness, and overview data

### Implementation

- [x] T022 [US3] Ensure search index extractors for activity, responsiveness, and overview tabs in lib/search/search-index.ts include metric labels (e.g., "PR merge rate", "Stale issue ratio", "Commits"), formatted values, and score labels
- [x] T023 [US3] Verify multi-word phrase matching works (e.g., `stale issues` as a substring) — should pass with existing engine logic

**Checkpoint**: Metric search produces correct matches across relevant tabs.

---

## Phase 6: User Story 4 — Repo-Specific Data Search (Priority: P2)

**Goal**: User can type a repo name (e.g., `facebook/react`) and see all data for that repo across every tab.

**Independent Test**: Analyze 2+ repos, type one repo name, verify matches span multiple tabs.

### Tests

- [x] T024 [US4] Write test in __tests__/lib/search/search-index.test.ts — verify index includes repo names (owner/repo format) in every tab's entries

### Implementation

- [x] T025 [US4] Ensure all tab extractors in lib/search/search-index.ts include the repo name string (e.g., `kubernetes/kubernetes`) in their searchable text entries
- [x] T026 [US4] Verify repo name search returns matches across all tabs that display per-repo data

**Checkpoint**: Repo-specific search works across all tabs for multi-repo analysis.

---

## Phase 7: User Story 5 — Mobile Layout (Priority: P3)

**Goal**: Search works on mobile viewports with responsive layout.

**Independent Test**: Open report on mobile viewport (< 640px), verify search bar is visible and functional.

### Tests

- [x] T027 [US5] Write test in __tests__/components/search/ReportSearchBar.test.tsx — verify search bar renders correctly in narrow container, input and summary stack vertically on small widths

### Implementation

- [x] T028 [US5] Update ReportSearchBar responsive styling in components/search/ReportSearchBar.tsx — ensure search input and export controls wrap correctly on mobile using flex-wrap, input takes full width on small screens
- [x] T029 [US5] Update toolbar layout in components/repo-input/RepoInputClient.tsx — ensure search bar and export controls stack vertically on mobile (flex-col on sm:flex-row)

**Checkpoint**: Search is fully functional on mobile viewports.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, edge cases, and cleanup

- [x] T030 [P] Add SearchHighlighter wrapping to tab view content — integrate into recommendation cards, security checks, metric cards, documentation items, contributor entries, and comparison table cells where text highlighting should appear
- [x] T031 Run all tests (`npm test`) and fix any failures
- [x] T032 Run linter (`npm run lint`) and fix any issues
- [x] T033 Run build (`npm run build`) and verify no type errors
- [x] T034 Manual testing: verify all 8 usage examples from issue #172 produce correct matches
- [x] T035 Create manual testing checklist at specs/174-report-search/checklists/manual-testing.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — core search UI
- **US2 (Phase 4)**: Depends on Phase 2; can run in parallel with US1 (index coverage work)
- **US3 (Phase 5)**: Depends on Phase 2; can run in parallel with US1 (index coverage work)
- **US4 (Phase 6)**: Depends on Phase 2; can run in parallel with US1 (index coverage work)
- **US5 (Phase 7)**: Depends on US1 (needs search bar to exist for responsive testing)
- **Polish (Phase 8)**: Depends on all user stories complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD per constitution)
- Search index coverage tasks can run in parallel with UI tasks
- Story complete before moving to next priority (for sequential execution)

### Parallel Opportunities

- T003 + T004 can run in parallel (different test files)
- T005 + T006 can run in parallel (different lib files)
- T008 + T009 + T010 can run in parallel (different test files)
- T011 + T012 can run in parallel (different component files)
- US2, US3, US4 can run in parallel with each other (all are index coverage work)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch tests in parallel:
Task: "Write tests for search engine in __tests__/lib/search/search-engine.test.ts"
Task: "Write tests for search index builder in __tests__/lib/search/search-index.test.ts"

# Launch implementations in parallel:
Task: "Implement search engine in lib/search/search-engine.ts"
Task: "Implement search index builder in lib/search/search-index.ts"
```

## Parallel Example: Phase 3 (US1)

```bash
# Launch tests in parallel:
Task: "Write tests for ReportSearchBar"
Task: "Write tests for SearchHighlighter"
Task: "Write tests for ResultsTabs badge rendering"

# Launch component implementations in parallel:
Task: "Implement ReportSearchBar component"
Task: "Implement SearchHighlighter component"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational search logic (T003-T007)
3. Complete Phase 3: User Story 1 — search bar + badges + highlighting (T008-T017)
4. **STOP and VALIDATE**: Test search with recommendation IDs
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Search logic ready
2. Add US1 → Core search UI (MVP!)
3. Add US2/US3/US4 → Expand index coverage for risk levels, metrics, repo names
4. Add US5 → Mobile responsive polish
5. Polish → Manual testing, all 8 usage examples validated

---

## Notes

- Constitution mandates TDD (Section XI) — all test tasks must run and fail before implementation
- No new npm dependencies — all search logic is custom
- SearchHighlighter integration (T030) spans multiple existing tab view files — this is the largest single task
- The search index is the key quality factor — comprehensive text extraction determines match accuracy
