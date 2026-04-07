# Tasks: Export (P1-F13)

**Input**: Design documents from `/specs/030-export/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Note**: TDD is mandatory per the constitution (Section XI). Test tasks are written first and must fail before implementation begins.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup & Foundational

**Purpose**: Create the `ExportControls` component shell and wire it into `RepoInputClient`. This is a blocking prerequisite — all three user stories add to this same component.

- [x] T001 Create `components/export/ExportControls.tsx` — shell component rendering three disabled controls ("Download JSON", "Download Markdown", "Copy link") when `analysisResponse` is null, otherwise enabled; accepts `ExportControlsProps` from `specs/030-export/contracts/export-props.ts`
- [x] T002 Write unit tests for `ExportControls` shell (controls disabled when no results, enabled when results present) in `components/export/ExportControls.test.tsx`
- [x] T003 Wire `ExportControls` into `RepoInputClient` — pass `analysisResponse` and `analyzedRepos` (the repos array from last analysis) as props; render `ExportControls` above the `ResultsShell` when `analysisResponse` is non-null in `components/repo-input/RepoInputClient.tsx`

**Checkpoint**: `ExportControls` renders in the results view with all three controls; all are disabled until analysis completes.

---

## Phase 2: User Story 1 — Download JSON Export (Priority: P1) 🎯 MVP

**Goal**: Users can download the full `AnalyzeResponse` as a timestamped `.json` file.

**Independent Test**: Complete an analysis → click "Download JSON" → verify a file named `repopulse-YYYY-MM-DD-HHmmss.json` downloads containing the full results array.

### Tests for User Story 1 ⚠️ Write first — must fail before implementation

- [x] T004 [P] [US1] Write failing unit tests for `json-export` (blob MIME type is `application/json`, filename matches `repopulse-YYYY-MM-DD-HHmmss.json` pattern, blob content round-trips to the original `AnalyzeResponse`, `"unavailable"` values preserved) in `lib/export/json-export.test.ts`
- [x] T005 [P] [US1] Write failing unit tests for `ExportControls` Download JSON button (onClick triggers download, disabled when no results) in `components/export/ExportControls.test.tsx`

### Implementation for User Story 1

- [x] T006 [US1] Implement `lib/export/json-export.ts` — `buildJsonExport(response: AnalyzeResponse): JsonExportResult` returns a `Blob` and timestamped filename; `triggerDownload(result: JsonExportResult): void` creates object URL, clicks anchor, revokes URL
- [x] T007 [US1] Wire Download JSON button in `ExportControls` — onClick calls `buildJsonExport(analysisResponse)` then `triggerDownload()` in `components/export/ExportControls.tsx`
- [x] T008 [US1] Verify T004–T005 tests pass

**Checkpoint**: User can download a valid JSON file after analysis.

---

## Phase 3: User Story 2 — Download Markdown Report (Priority: P2)

**Goal**: Users can download a CHAOSS-aligned Markdown report as a timestamped `.md` file.

**Independent Test**: Complete an analysis → click "Download Markdown" → verify a file named `repopulse-YYYY-MM-DD-HHmmss.md` downloads with one `##` section per repo containing scores and key metrics.

### Tests for User Story 2 ⚠️ Write first — must fail before implementation

- [x] T009 [P] [US2] Write failing unit tests for `markdown-export` (top-level header with timestamp, one `##` section per repo, Activity/Sustainability/Responsiveness scores present, `"unavailable"` values render as `N/A`, filename matches pattern, multiple repos produce multiple sections) in `lib/export/markdown-export.test.ts`
- [x] T010 [P] [US2] Write failing unit tests for `ExportControls` Download Markdown button (onClick triggers download, disabled when no results) in `components/export/ExportControls.test.tsx`

### Implementation for User Story 2

- [x] T011 [US2] Implement `lib/export/markdown-export.ts` — `buildMarkdownExport(response: AnalyzeResponse): MarkdownExportResult`; uses `getActivityScore`, `getSustainabilityScore`, `getResponsivenessScore` from existing score-config modules; renders `"unavailable"` as `N/A`; returns Blob (`text/markdown`) and timestamped filename in `lib/export/markdown-export.ts`
- [x] T012 [US2] Wire Download Markdown button in `ExportControls` — onClick calls `buildMarkdownExport(analysisResponse)` then `triggerDownload()` in `components/export/ExportControls.tsx`
- [x] T013 [US2] Verify T009–T010 tests pass

**Checkpoint**: User can download a readable CHAOSS-aligned Markdown report after analysis.

---

## Phase 4: User Story 3 — Copy Shareable URL (Priority: P3)

**Goal**: Users can copy a URL encoding the repo list as `?repos=slug1,slug2`; opening it pre-populates the repo input. Token is never included.

**Independent Test**: Enter repos → click "Copy link" → paste URL in new tab → verify repo list pre-populates and no token is present.

### Tests for User Story 3 ⚠️ Write first — must fail before implementation

- [x] T014 [P] [US3] Write failing unit tests for `shareable-url` (`encodeRepos(repos)` returns URL with `?repos=` param, no token; `decodeRepos(url)` returns repos array; round-trip preserves slugs; empty list encodes/decodes correctly) in `lib/export/shareable-url.test.ts`
- [x] T015 [P] [US3] Write failing unit tests for `ExportControls` Copy Link button (calls clipboard write on click, shows fallback input when clipboard unavailable) in `components/export/ExportControls.test.tsx`
- [x] T016 [P] [US3] Write failing unit tests for `RepoInputClient` reading `?repos=` query param on mount (pre-populates textarea with decoded repos) in `components/repo-input/RepoInputClient.test.tsx`

### Implementation for User Story 3

- [x] T017 [US3] Implement `lib/export/shareable-url.ts` — `encodeRepos(repos: string[]): string` builds URL with `?repos=` param (comma-separated, no token); `decodeRepos(search: string): string[]` parses repos from `URLSearchParams` in `lib/export/shareable-url.ts`
- [x] T018 [US3] Implement Copy Link button in `ExportControls` — `navigator.clipboard.writeText(url)` on click; on failure render a read-only `<input>` with the URL as fallback (FR-009); "Copied!" confirmation shown on success in `components/export/ExportControls.tsx`
- [x] T019 [US3] Update `RepoInputClient` to read `?repos=` query param on mount using `useSearchParams` and pre-populate the repo textarea (wrap in `Suspense` if not already present) in `components/repo-input/RepoInputClient.tsx`
- [x] T020 [US3] Verify T014–T016 tests pass

**Checkpoint**: All three user stories functional — JSON download, Markdown download, and shareable URL all work.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T021 [P] Write E2E tests for all three export flows (JSON download, Markdown download, copy link, URL round-trip) in `e2e/export.spec.ts`
- [x] T022 [P] Update `docs/DEVELOPMENT.md` — mark P1-F13 as ✅ Done in the implementation order table
- [x] T023 [P] Create manual testing checklist at `specs/030-export/checklists/manual-testing.md`
- [x] T024 Run `npm test`, `npm run lint`, and `npm run build` — confirm all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; T002 and T003 can run after T001
- **Phase 2 (US1)**: Depends on Phase 1 (ExportControls shell must exist)
- **Phase 3 (US2)**: Depends on Phase 1; can run in parallel with Phase 2 (different files)
- **Phase 4 (US3)**: Depends on Phase 1; can run in parallel with Phases 2 and 3
- **Phase 5 (Polish)**: Depends on all story phases complete

### Within Each User Story

- Test tasks are written first and must fail before implementation begins
- `lib/export/*.ts` utility functions are independent of each other — can be implemented in parallel across stories
- `ExportControls.tsx` is shared — stories add to it sequentially; tests per story are independent

### Parallel Opportunities

```bash
# Phase 2-4 tests (write in parallel after Phase 1 completes):
T004: json-export tests
T009: markdown-export tests
T014: shareable-url tests
T015: ExportControls Copy Link tests
T016: RepoInputClient ?repos= tests

# Phase 2-4 implementations (after respective tests fail):
T006: json-export.ts
T011: markdown-export.ts
T017: shareable-url.ts

# Phase 5 (run in parallel):
T021: E2E tests
T022: DEVELOPMENT.md update
T023: Manual testing checklist
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete Phase 1 (Setup — ExportControls shell + wiring)
2. Complete Phase 2 (US1 — JSON download)
3. **Validate**: JSON file downloads correctly with full results
4. Ship if acceptable — US2 and US3 can follow

### Incremental Delivery

1. Phase 1 → ExportControls visible (all controls disabled)
2. Phase 2 → JSON download works
3. Phase 3 → Markdown download works
4. Phase 4 → Shareable URL works (and bookmarkable links via ?repos= on load)
5. Phase 5 → Polish, E2E, docs

---

## Notes

- `triggerDownload` helper can be shared between JSON and Markdown exports — extract to a single utility in `lib/export/download.ts` if both call it
- `ExportControls` is a `'use client'` component (uses onClick, clipboard API)
- `RepoInputClient` already uses `useSearchParams` — wrap any new usage in the existing `<Suspense>` boundary from `app/page.tsx`
- Token is never passed to `ExportControls` and never included in shareable URLs (constitution Rules III.7, X.4)
