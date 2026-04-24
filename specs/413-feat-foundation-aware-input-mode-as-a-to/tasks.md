# Tasks: Foundation Input Mode (#413)

**Input**: Design documents from `/specs/413-feat-foundation-aware-input-mode-as-a-to/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: TDD is mandatory (constitution §XI). Test tasks appear before implementation in every phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create directory scaffolding for new files before any code is written.

- [ ] T001 Create `lib/foundation/` directory (new module for FoundationTarget registry and parser)
- [ ] T002 Create `components/foundation/` directory (new components: FoundationInputSection, FoundationResultsView, FoundationNudge)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type system, smart input parser, and URL encoding — all must exist before any user story component can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Type System & Foundation Registry (TDD)

- [ ] T003 Write `lib/foundation/types.test.ts` — assert FOUNDATION_REGISTRY has exactly 4 entries, only `cncf-sandbox` has `active: true`, all have non-empty `label` strings
- [ ] T004 [P] Create `lib/foundation/types.ts` with `FoundationInputKind`, `FoundationConfig`, `FOUNDATION_REGISTRY` (4 entries: cncf-sandbox active, cncf-incubating/cncf-graduation/apache-incubator disabled) — implement to make T003 pass
- [ ] T005 Extend `FoundationTarget` union in `lib/cncf-sandbox/types.ts` from `'none' | 'cncf-sandbox'` to `'none' | 'cncf-sandbox' | 'cncf-incubating' | 'cncf-graduation' | 'apache-incubator'`
- [ ] T006 Fix all TypeScript exhaustive-check errors caused by the extended `FoundationTarget` union (search all `switch` statements and `if/else` chains referencing `FoundationTarget` — add `cncf-incubating`, `cncf-graduation`, `apache-incubator` cases or update fallthrough)

### Smart Input Parser (TDD)

- [ ] T007 Write `lib/foundation/parse-foundation-input.test.ts` covering all cases from plan.md Phase 2: `owner/repo` → repos, multiple repos (newline/comma/space), full GitHub URL → repos, bare slug → org, `github.com/org` → org, `https://github.com/org` → org, `https://github.com/orgs/org/projects/N` → projects-board, empty → invalid, unrecognised → invalid
- [ ] T008 Implement `lib/foundation/parse-foundation-input.ts` — `parseFoundationInput(input: string): FoundationParseResult` reusing `parseRepos` from `lib/parse-repos.ts` and `normalizeOrgInput` from `lib/analyzer/org-inventory.ts` internally — implement to make T007 pass

### Foundation URL Encoding (TDD)

- [ ] T009 Add Foundation URL cases to `lib/export/shareable-url.test.ts`: encode `{ foundation: 'cncf-sandbox', input: 'owner/repo' }` → `/?mode=foundation&foundation=cncf-sandbox&input=owner%2Frepo`, decode round-trip for repos and org inputs, decode returns `null` when `mode` param absent or not `foundation`, confirm token is never present in encoded URL
- [ ] T010 Add `FoundationUrlState` interface, `encodeFoundationUrl(state: FoundationUrlState): string`, and `decodeFoundationUrl(search: string): FoundationUrlState | null` to `lib/export/shareable-url.ts` — implement to make T009 pass

**Checkpoint**: `npm test -- lib/foundation lib/export/shareable-url` must be green before Phase 3.

---

## Phase 3: User Story 1 — Per-repo foundation readiness (Priority: P1) 🎯 MVP

**Goal**: Foundation tab is visible; user picks CNCF Sandbox, enters `owner/repo` slug(s), clicks Scan, gets a per-repo readiness report. Foundation target dropdown removed from Repositories mode. CNCF Readiness tab removed from Repositories mode results.

**Independent Test**: Select Foundation mode → pick CNCF Sandbox → enter `kubernetes/kubernetes` → click Scan → verify a readiness report renders with health checks, maturity signals, and top gaps.

### Tests for User Story 1 (TDD — write and confirm failing before T014–T021)

- [ ] T011 Write `components/foundation/FoundationInputSection.test.tsx`: CNCF Sandbox renders as active/clickable; Incubating/Graduation/Apache Incubator render as disabled and cannot be selected; info icon tooltip shows accepted formats (repos and org — not Projects board); `error` prop shows inline error; `inputValue` and `onChange` wire correctly
- [ ] T012 [P] Write `components/foundation/FoundationResultsView.test.tsx` — repos branch: loading indicator when `loading=true`; error message when `error` set; `kind: 'repos'` renders `CNCFReadinessTab` for each result using `aspirantResult`; one failed repo shows per-repo error while others still render; null result renders empty state

### Implementation for User Story 1

- [ ] T013 Implement `components/foundation/FoundationInputSection.tsx` — foundation picker rendered from `FOUNDATION_REGISTRY` (active = clickable, disabled = greyed with "coming soon" aria-label) + textarea (same style as existing repo textarea) + info icon with tooltip showing accepted formats — implement to make T011 pass
- [ ] T014 Implement `components/foundation/FoundationResultsView.tsx` — repos branch: render `CNCFReadinessTab` per result using `result.aspirantResult`; per-repo error isolation; loading spinner; error message; empty state — implement to make T012 (repos branch cases) pass
- [ ] T015 Add `'foundation'` to the `mode` prop union and mode button strip in `components/repo-input/RepoInputForm.tsx`; render `<FoundationInputSection>` when `mode === 'foundation'` passing `foundationTarget`, `onFoundationTargetChange`, `inputValue`, `onInputChange`, `error`; add `onSubmitFoundation?: (input: string) => void` prop; call `onSubmitFoundation(inputValue)` in submit handler when `mode === 'foundation'`
- [ ] T016 Remove Foundation target `<select>` dropdown (L154–169) from `components/repo-input/RepoInputForm.tsx` — the dropdown is replaced by `FoundationInputSection`
- [ ] T017 Add `'foundation'` to `inputMode` state type and add state fields `foundationInput`, `foundationTarget` (default `'cncf-sandbox'`), `foundationResult`, `loadingFoundation`, `foundationError` in `components/repo-input/RepoInputClient.tsx`
- [ ] T018 Implement `handleFoundationSubmit(input: string)` repos path in `components/repo-input/RepoInputClient.tsx`: call `parseFoundationInput`, for `kind: 'repos'` call `/api/analyze` with `foundationTarget`, set `foundationResult = { kind: 'repos', results }`, handle per-repo errors
- [ ] T019 Handle Foundation URL params on load in `components/repo-input/RepoInputClient.tsx`: detect `mode=foundation` in `searchParams` using `decodeFoundationUrl`, set `inputMode='foundation'`, pre-populate `foundationInput` and `foundationTarget`, auto-trigger `handleFoundationSubmit`
- [ ] T020 Render `<FoundationResultsView>` in `components/repo-input/RepoInputClient.tsx` when `inputMode === 'foundation'`, passing `foundationResult`, `loadingFoundation`, `foundationError`
- [ ] T021 Remove `aspirantResult`, `landscapeOverride`, `landscapeStatus` props from `components/app-shell/ResultsShell.tsx`; remove the `useMemo` that injects the `cncf-readiness` tab dynamically; remove `CNCFReadinessPill` and `CNCFReadinessTab` render logic from the shell; update the `RepoInputClient` call site to stop passing these props

**Checkpoint**: At this point, US1 is fully functional. `npm test` must be green; Foundation tab visible in browser; per-repo readiness renders.

---

## Phase 4: User Story 2 — Org candidacy ranking (Priority: P2)

**Goal**: User enters an org slug in Foundation mode and gets a candidacy ranking panel. CNCF Candidacy tab removed from Organization mode.

**Independent Test**: Select Foundation mode → pick CNCF Sandbox → enter `cncf` → click Scan → verify candidacy ranking panel renders without triggering org aggregation.

### Tests for User Story 2 (TDD — write and confirm failing before T024–T027)

- [ ] T022 Add org branch test cases to `components/foundation/FoundationResultsView.test.tsx`: `kind: 'org'` renders `CNCFCandidacyPanel` with correct `org` and `repos`; org with zero repos shows empty state; null result renders empty state

### Implementation for User Story 2

- [ ] T023 Add org branch to `components/foundation/FoundationResultsView.tsx`: when `result.kind === 'org'` render `<CNCFCandidacyPanel org={result.inventory.org} repos={result.inventory.repos} />` — implement to make T022 pass
- [ ] T024 Implement `handleFoundationSubmit` org path in `components/repo-input/RepoInputClient.tsx`: for `kind: 'org'` call `/api/analyze-org`, set `foundationResult = { kind: 'org', inventory }`, handle error
- [ ] T025 Extend Foundation URL params handling (T019) to cover org path: when decoded `input` is detected as org by `parseFoundationInput`, auto-trigger org scan on load
- [ ] T026 Remove `cncf-candidacy` tab from `orgInventoryTabs` in `components/repo-input/RepoInputClient.tsx` — remove from both the full-analysis branch (L434) and lightweight-only branch (L439)

**Checkpoint**: US2 fully functional. `npm test` green; org slug in Foundation mode renders candidacy ranking.

---

## Phase 5: User Story 3 — Nudge from Organization / Repositories modes (Priority: P3)

**Goal**: After an org or repo analysis completes, a callout appears pointing to Foundation mode with input pre-populated.

**Independent Test**: Run org analysis → verify nudge callout appears → click nudge → verify Foundation mode activates with org slug pre-populated.

### Tests for User Story 3 (TDD — write and confirm failing before T029–T033)

- [ ] T027 Write `components/foundation/FoundationNudge.test.tsx`: renders callout with descriptive label; clicking calls `onActivate` with the correct `prefillValue`; label and prefillValue props wire correctly

### Implementation for User Story 3

- [ ] T028 Implement `components/foundation/FoundationNudge.tsx` — minimal single-line callout with "Check foundation readiness →" button/link; calls `onActivate(prefillValue)` on click — implement to make T027 pass
- [ ] T029 Wire `<FoundationNudge>` in org results area of `components/repo-input/RepoInputClient.tsx`: show after org analysis completes, `prefillValue = orgSlug`, `onActivate` sets `inputMode='foundation'` and `foundationInput = prefillValue`
- [ ] T030 Wire `<FoundationNudge>` in repos results area of `components/repo-input/RepoInputClient.tsx`: show after repo analysis completes, `prefillValue = analyzedRepos.join('\n')`, `onActivate` sets `inputMode='foundation'` and `foundationInput = prefillValue`
- [X] T031 Update "View full report" link in `components/cncf-candidacy/CNCFCandidacyPanel.tsx` (L1072) from `/?repos=${...}&foundationTarget=cncf-sandbox&tab=cncf-readiness` to use `encodeFoundationUrl({ foundation: 'cncf-sandbox', input: result.repo })`

**Checkpoint**: US3 fully functional. Nudge appears after both org and repo scans; clicking switches to Foundation mode with input pre-filled.

---

## Phase 6: User Story 4 — Projects board "coming soon" (Priority: P4)

**Goal**: Pasting a Projects board URL into the Foundation input shows a "Projects board support coming soon" message, reserving the path for #411.

**Independent Test**: Paste `https://github.com/orgs/cncf/projects/14` → click Scan → verify "coming soon" message renders instead of an error.

### Tests for User Story 4 (TDD — write and confirm failing before T034)

- [ ] T032 Add projects-board branch test cases to `components/foundation/FoundationResultsView.test.tsx`: `kind: 'projects-board'` renders a "Projects board support coming soon" message, not an error

### Implementation for User Story 4

- [ ] T033 Implement `handleFoundationSubmit` projects-board path in `components/repo-input/RepoInputClient.tsx`: for `kind: 'projects-board'` set `foundationResult = { kind: 'projects-board', url }` (no fetch)
- [ ] T034 Add projects-board branch to `components/foundation/FoundationResultsView.tsx`: when `result.kind === 'projects-board'` render "Projects board support coming soon" callout — implement to make T032 pass

**Checkpoint**: US4 acceptance scenario met. Board URL → coming-soon message, not error.

---

## Phase 7: User Story 5 — Foundation picker shows full roadmap (Priority: P5)

**Goal**: Foundation picker shows all 4 known targets. Only CNCF Sandbox is interactive. This is primarily validated by T003 (registry) and T011 (picker rendering) — this phase verifies they are wired end-to-end.

**Independent Test**: Open Foundation tab → verify picker displays 4 options: CNCF Sandbox (clickable), CNCF Incubating, CNCF Graduation, Apache Incubator (all greyed / disabled).

- [ ] T035 [P] Verify `FOUNDATION_REGISTRY` is consumed by `FoundationInputSection` — confirm the picker renders exactly 4 entries in the specified order; disabled entries have correct ARIA attributes (`aria-disabled="true"`) and cannot receive focus or click events; CNCF Sandbox is the default selected value

**Checkpoint**: US5 acceptance scenarios met. Picker shows all 4 targets; only CNCF Sandbox interactive.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T036 Update `docs/DEVELOPMENT.md` — mark `413-feat-foundation-aware-input-mode-as-a-to` as ✅ Done in the Phase 2 feature order table; add entry for #411 (Projects board) as next Foundation sub-mode
- [X] T037 Run full test suite `npm test` and fix any regressions — ensure all existing Repositories and Organization mode tests still pass (SC-003)
- [X] T038 Run `npm run typecheck` — confirm zero TypeScript errors across all modified files

---

## Dependency Graph

```
Phase 1 (T001–T002)
  └── Phase 2 (T003–T010)
        ├── Phase 3 US1 (T011–T021)
        │     ├── Phase 4 US2 (T022–T026)
        │     │     └── Phase 5 US3 (T027–T031)
        │     │           └── Phase 6 US4 (T032–T034)
        │     │                 └── Phase 7 US5 (T035)
        │     └── Phase 5 US3 (T031 — CNCFCandidacyPanel link, independent)
        └── Phase 8 Polish (T036–T038, after all stories complete)
```

**Parallel opportunities within a phase**:
- T003 (types test) can be drafted before T004 (types impl) and run concurrently
- T011 (FoundationInputSection test) and T012 (FoundationResultsView test) can be written in parallel (different files)
- T015 (RepoInputForm) and T014 (FoundationResultsView) can be implemented in parallel after T013 completes

---

## Implementation Strategy

**MVP (Phase 3 only)**: Foundation tab appears, CNCF Sandbox active, per-repo readiness works. Org sub-path and nudges are incomplete but existing Repositories/Organization modes remain fully functional — regression-free.

**Increment 2 (Phase 4)**: Org candidacy ranking in Foundation mode; CNCF Candidacy tab removed from Organization mode.

**Increment 3 (Phase 5–7)**: Nudge callouts, Projects board "coming soon", full picker roadmap — feature complete.

---

## Summary

| Phase | User Story | Tasks | TDD Tasks |
|-------|-----------|-------|-----------|
| Setup | — | T001–T002 | 0 |
| Foundational | — | T003–T010 | T003, T007, T009 |
| Phase 3 | US1 (P1) 🎯 | T011–T021 | T011, T012 |
| Phase 4 | US2 (P2) | T022–T026 | T022 |
| Phase 5 | US3 (P3) | T027–T031 | T027 |
| Phase 6 | US4 (P4) | T032–T034 | T032 |
| Phase 7 | US5 (P5) | T035 | — |
| Polish | — | T036–T038 | — |
| **Total** | | **38 tasks** | **8 TDD tasks** |

**Parallel opportunities**: 5 identified (T004∥T003, T011∥T012, T014∥T015, T022 writeable during T021, T035∥T034)
