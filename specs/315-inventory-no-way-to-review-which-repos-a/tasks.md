---
description: "Task list for issue #315 — Selected-only filter toggle in org-inventory Repositories table"
---

# Tasks: Review selected repos in org-inventory table

**Input**: Design documents from `/specs/315-inventory-no-way-to-review-which-repos-a/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: Required. Constitution §XI mandates TDD (NON-NEGOTIABLE). All test tasks are written to fail before their matching implementation task is started.

**Organization**: Tasks are grouped by user story (US1 / US2 / US3) so each story can be implemented, tested, and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task description includes its exact file path

## Path Conventions

Existing Phase 1 Next.js layout. All paths are repo-relative:

- `components/org-inventory/` — view + table components
- `lib/org-inventory/` — pure filter pipeline
- `docs/` — product + development docs (unchanged here)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: None. The feature sits inside already-initialized Phase 1 app code — no new dependencies, scaffolds, or configuration are required.

No setup tasks.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the existing pure filter pipeline to accept an optional `selectedOnly` parameter. This is the shared surface both US1 and US3 depend on.

**⚠️ CRITICAL**: US1 and US3 both call this extended signature. It must land first.

- [X] T001 Add `SelectedOnlyOptions` interface and optional third parameter to `filterOrgInventoryRows` in `lib/org-inventory/filters.ts`. When `options?.selectedOnly === true`, apply the existing filter pipeline then filter to rows whose `repo` slug is in `options.selectedRepos`. Existing callers (no third arg) behave identically to before.
- [X] T002 [P] Add unit tests for the new `selectedOnly` branch to `lib/org-inventory/filters.test.ts` covering: (a) `selectedOnly: false` or `undefined` returns the pre-existing behavior for a non-trivial input, (b) `selectedOnly: true` with a non-empty `selectedRepos` narrows rows to that set, (c) `selectedOnly: true` with an empty `selectedRepos` returns `[]`, (d) composition with `repoQuery` / `language` / `archived` filters returns the intersection, (e) duplicate entries in `selectedRepos` do not produce duplicate rows.

**Checkpoint**: `filterOrgInventoryRows` now supports `selectedOnly` and is fully tested. User stories can start.

---

## Phase 3: User Story 1 — Audit my current selection (Priority: P1) 🎯 MVP

**Goal**: User can turn on a **Selected only** filter toggle and see exactly the repos currently in their selection, with the table pagination / counter / sort all behaving per the UI contract.

**Independent Test**: Load the inventory table, check 4 rows across multiple pages, turn on **Selected only**, verify exactly those 4 rows are shown, the counter still reads `4 selected · ...`, and pagination reflects 4 rows. Deselect one — visible set drops to 3, counter drops to 3. Turn off **Selected only** — full (filtered) table reappears with 3 rows still checked.

### Tests for User Story 1 (TDD — write these FIRST and ensure they fail)

- [X] T003 [P] [US1] Component test in `components/org-inventory/OrgInventoryView.test.tsx` — "turning on Selected only collapses the visible rows to exactly the current selection": render `OrgInventoryView` with ≥ 6 repos, programmatically select 3, check the **Selected only** checkbox, assert the rendered table body contains exactly those 3 repo slugs and no others.
- [X] T004 [P] [US1] Component test in `components/org-inventory/OrgInventoryView.test.tsx` — "counter still reports the full selection size regardless of Selected only": with 3 selected and **Selected only** on, assert the counter text matches `3 selected ·`.
- [X] T005 [P] [US1] Component test in `components/org-inventory/OrgInventoryView.test.tsx` — "deselecting a visible row while Selected only is on removes it and decrements the counter": with 3 selected and **Selected only** on, click a row checkbox to deselect it, assert the table now has 2 rows and the counter reads `2 selected ·`.
- [X] T006 [P] [US1] Component test in `components/org-inventory/OrgInventoryView.test.tsx` — "turning Selected only off restores the prior filter + selection state": with name filter `cu`, selection `{a, b, c}`, **Selected only** on, then toggled off, assert the table shows all rows matching `cu` and all three still-selected rows remain checked.
- [X] T007 [P] [US1] Component test in `components/org-inventory/OrgInventoryView.test.tsx` — "toggling Selected only resets currentPage to 1": with rows-per-page = 5, a 12-row dataset, 3 selected, paginate to page 2, check **Selected only** on, assert pagination reads `Page 1 of 1`.
- [X] T008 [P] [US1] Component test in `components/org-inventory/OrgInventoryView.test.tsx` — "Analyze selected sends the full selection regardless of Selected only state": with 3 selected and **Selected only** on, click **Analyze selected**, assert the `onAnalyzeSelected` prop receives exactly those 3 repo slugs.
- [X] T009 [P] [US1] Component test in `components/org-inventory/OrgInventoryView.test.tsx` — "sort column changes still work while Selected only is on": with 3 selected, **Selected only** on, click the `Stars` column header, assert the 3 rows render in star-sorted order.

### Implementation for User Story 1

- [X] T010 [US1] Add `const [selectedOnly, setSelectedOnly] = useState<boolean>(false)` to `components/org-inventory/OrgInventoryView.tsx`. Co-locate with the existing filter-row state (after `excludeForks`, before `repoTableExpanded`).
- [X] T011 [US1] In `components/org-inventory/OrgInventoryView.tsx`, update the `filteredRows` memo to pass `{ selectedOnly, selectedRepos }` as the third argument to `filterOrgInventoryRows`. Include `selectedOnly` and `selectedRepos` in the memo's dependency array.
- [X] T012 [US1] In `components/org-inventory/OrgInventoryView.tsx`, render a new `<label>` wrapping an `<input type="checkbox">` for **Selected only** in the filter row, placed immediately after the existing `No forks` checkbox. `checked={selectedOnly}`, `onChange={(e) => { setCurrentPage(1); setSelectedOnly(e.target.checked) }}`, `aria-label="Show only selected repositories"`.

**Checkpoint**: US1 is fully working — user can audit their selection via the toggle and all UI contract invariants I-1 through I-7 hold for the populated case.

---

## Phase 4: User Story 2 — Recover from empty selection state (Priority: P2)

**Goal**: When **Selected only** is on and no rows are visible (either because nothing is selected, or because the intersection with other filters is empty), the table area shows a clear, self-explanatory empty state with a one-click way back to the default view.

**Independent Test**: Turn on **Selected only** with zero selected repos and see the "nothing selected" empty state with a working "turn off Selected only" affordance. Separately, select repos and narrow other filters until the intersection is empty to see the second empty-state variant.

### Tests for User Story 2 (TDD — write these FIRST and ensure they fail)

- [X] T013 [P] [US2] Component test in `components/org-inventory/OrgInventoryView.test.tsx` — "Selected only on + zero selected shows the nothing-selected empty state": assert the rendered message contains copy naming the cause (e.g. matches `/no repositories.*selected/i`) and a visible button/link labelled to turn off **Selected only**.
- [X] T014 [P] [US2] Component test in `components/org-inventory/OrgInventoryView.test.tsx` — "clicking the empty-state affordance turns off Selected only": click the affordance, assert the table re-renders with rows and the checkbox is now unchecked.
- [X] T015 [P] [US2] Component test in `components/org-inventory/OrgInventoryView.test.tsx` — "deselecting the last visible row transitions from populated to nothing-selected empty state": start with 1 selected + **Selected only** on, deselect that row, assert the empty state is now the "nothing selected" variant (not the generic "no matches" copy).
- [X] T016 [P] [US2] Component test in `components/org-inventory/OrgInventoryView.test.tsx` — "Selected only on + some selected but intersection empty shows the filters-hide-all variant": select 2 repos, apply a name filter that matches neither of them, assert the rendered message matches `/filters hide.*selected/i` (or equivalent wording) and a visible affordance turns off **Selected only**.

### Implementation for User Story 2

- [X] T017 [US2] In `components/org-inventory/OrgInventoryView.tsx`, split the existing `sortedRows.length === 0` branch into three cases: (a) `selectedOnly && selectedRepos.length === 0` → "No repositories are currently selected..." + affordance, (b) `selectedOnly && selectedRepos.length > 0` → "Your current filters hide every selected repository..." + affordance, (c) otherwise → retain the existing "No matching repositories" message.
- [X] T018 [US2] Ensure the empty-state affordance button in both new variants calls `setSelectedOnly(false)` and `setCurrentPage(1)`. Use a `<button type="button">` with a clearly focusable label ("Turn off Selected only" or equivalent).

**Checkpoint**: US1 + US2 both work. Users never land in an unexplained empty table.

---

## Phase 5: User Story 3 — Coexists with existing filters (Priority: P3)

**Goal**: **Selected only** composes correctly with the existing name / language / archived filters. Visible rows = selection ∩ all other active filter predicates. Counter stays anchored to full selection size.

**Independent Test**: Select 5 repos including at least one archived and at least one in a rare language. Turn on **Selected only** (5 visible). Apply **archived = active** → archived row hidden. Apply a language filter matching only one of the five → one row visible. Remove filters → five rows visible. Counter reads `5 selected` throughout.

### Tests for User Story 3 (TDD — write these FIRST and ensure they fail)

- [X] T019 [P] [US3] Component test in `components/org-inventory/OrgInventoryView.test.tsx` — "Selected only AND archived=active shows the intersection": select 3 repos (one archived), turn on **Selected only**, set **Archived** = `Active`, assert exactly the 2 non-archived selected rows are visible and the counter still reads `3 selected ·`.
- [X] T020 [P] [US3] Component test in `components/org-inventory/OrgInventoryView.test.tsx` — "Selected only AND a name search shows the intersection and the counter remains total": select 4 repos, turn on **Selected only**, type a query matching 2 of them, assert those 2 rows are visible and the counter still reads `4 selected ·`.
- [X] T021 [P] [US3] Component test in `components/org-inventory/OrgInventoryView.test.tsx` — "turning Selected only off preserves other active filters": with a name search and a language filter active + **Selected only** on, toggle **Selected only** off, assert the name search and language filter values in the DOM are unchanged and the table re-renders them applied to the full repo list.

### Implementation for User Story 3

US3 has no implementation beyond what US1's T011 already delivers — passing `{ selectedOnly, selectedRepos }` into `filterOrgInventoryRows` composes with the existing `repoQuery` / `language` / `archived` predicates automatically. The US3 work is to *verify* composition via the T019–T021 tests.

- [X] T022 [US3] Visually confirm via `npm run dev` on port 3010 that the quickstart.md "Empty-state — all selections hidden by other filters" scenario works as specified end-to-end.

**Checkpoint**: US1 + US2 + US3 are all independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Hygiene, lint, build, DoD sign-off.

- [X] T023 Run `npm run lint` from the repo root and fix any new warnings/errors introduced by the feature.
- [X] T024 Run `DEV_GITHUB_PAT= npm run build` per `docs/DEVELOPMENT.md` to confirm the production build is clean.
- [X] T025 Run `npm test` and confirm all new tests pass alongside the existing suite.
- [X] T026 Walk through `specs/315-inventory-no-way-to-review-which-repos-a/quickstart.md` in a browser on localhost:3010. Confirm happy path, both empty-state variants, keyboard accessibility, and the regression checklist.
- [X] T027 [P] Review `docs/DEVELOPMENT.md` — the P1-F16 row is already `✅ Done`; no row change is required. If the feature surfaces any developer-facing setup change (it should not), update accordingly.
- [X] T028 [P] Review `README.md` — no user-facing setup change expected; update only if a reader's quickstart experience would notice.
- [X] T029 Open a PR with a `## Test plan` section that mirrors the quickstart.md checks (happy path audit, both empty-state variants, sort while filtered, pagination reset, counter invariance, keyboard accessibility, regression checklist). Do NOT run `gh pr merge` — PR merging is a manual user action (CLAUDE.md).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: none (no tasks).
- **Phase 2 Foundational**: must complete first. T001 (signature extension) must land before any US1 / US3 implementation task that depends on it; T002 (pure-function tests) can land in parallel with T001 if written as failing tests first.
- **Phase 3 US1**: starts after T001.
- **Phase 4 US2**: starts after T012 (the `selectedOnly` state + checkbox must exist to produce the empty state).
- **Phase 5 US3**: starts after T011 (the memo change). In practice, US3 tests can be written as soon as T001 / T011 are in place.
- **Phase 6 Polish**: runs last.

### User Story Dependencies

- **US1 (P1)**: depends on Phase 2 only. Independently testable.
- **US2 (P2)**: depends on Phase 2 + US1 implementation tasks (T010–T012) because the empty-state depends on the toggle existing.
- **US3 (P3)**: depends on Phase 2 only. Verifies composition of the same underlying `filterOrgInventoryRows` extension.

### Within Each User Story

- TDD order: write the story's [P]-marked tests first, run them, confirm they FAIL, then implement. Re-run and confirm they PASS.
- For US1 and US2 the implementation tasks are sequential because they all touch `components/org-inventory/OrgInventoryView.tsx` — serialize them in ID order (T010 → T011 → T012; T017 → T018).

### Parallel Opportunities

- T002 can run in parallel with T001 as TDD failing-tests-first.
- All [P]-marked US1 tests (T003–T009) can run in parallel.
- All [P]-marked US2 tests (T013–T016) can run in parallel.
- All [P]-marked US3 tests (T019–T021) can run in parallel.
- T027 and T028 (doc reviews) can run in parallel.
- Implementation tasks that touch the same file (`OrgInventoryView.tsx`, `filters.ts`) are NOT parallel with each other.

---

## Parallel Example: User Story 1 tests

```bash
# Write these tests first, all in the same test file but independently:
Task: "Add 'Selected only collapses to selection' test in components/org-inventory/OrgInventoryView.test.tsx"
Task: "Add 'counter unaffected by Selected only' test in components/org-inventory/OrgInventoryView.test.tsx"
Task: "Add 'deselect from filtered view decrements counter' test in components/org-inventory/OrgInventoryView.test.tsx"
Task: "Add 'turning Selected only off restores prior state' test in components/org-inventory/OrgInventoryView.test.tsx"
Task: "Add 'toggle resets currentPage to 1' test in components/org-inventory/OrgInventoryView.test.tsx"
Task: "Add 'Analyze selected respects full selection' test in components/org-inventory/OrgInventoryView.test.tsx"
Task: "Add 'sort column works while filtered' test in components/org-inventory/OrgInventoryView.test.tsx"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 2 (T001–T002) — lands the filter-pipeline extension and its unit tests.
2. Phase 3 (T003–T012) — lands the toggle, the checkbox UI, and the passing component tests.
3. STOP. US1 is the spec's P1 and the bulk of the user-visible value.

### Incremental Delivery

- MVP (US1) → Demo: users can audit their selection.
- + US2 → Demo: empty-state copy is humane, no dead-end.
- + US3 → Demo: composes with existing filters, invariants hold under stress.

### Parallel Team Strategy

With multiple developers, after T001 lands:

- Developer A: Phase 3 (US1).
- Developer B: Phase 5 (US3) — touches test file only, no implementation.
- Developer C: Phase 4 (US2) starts after T012 from Developer A is pushed.

---

## Notes

- [P] tasks = different files OR independently writable blocks within the same test file.
- Constitution §XI is NON-NEGOTIABLE: tests are written first and MUST fail before the implementation lands.
- Commit after each logical block (recommend: one commit per checkpoint).
- Verify every spec.md invariant (I-1…I-7) via at least one test task above before marking US1+US2+US3 complete.
- No `docs/DEVELOPMENT.md` row to add — P1-F16 already reads `✅ Done`; this is a UX layer on a shipped feature.
- Never run `gh pr merge` (CLAUDE.md PR Merge Rule). T029 opens the PR; the user merges manually.
