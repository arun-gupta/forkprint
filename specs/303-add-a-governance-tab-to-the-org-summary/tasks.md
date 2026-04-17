---

description: "Task list for issue #303 — add a Governance tab to the org-summary view"
---

# Tasks: Governance tab on org-summary view

**Input**: Design documents from `/specs/303-add-a-governance-tab-to-the-org-summary/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: TDD per constitution §XI (NON-NEGOTIABLE). Tests are written first, fail, then implementation makes them pass.

**Organization**: Tasks are grouped by user story so each story remains independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different file, no dependency on incomplete tasks → parallelizable.
- **[Story]**: US1, US2, US3 (matches spec.md).
- All file paths are repo-root-relative absolute references.

## Path Conventions

This is a Next.js single-app codebase. Source lives under `components/`, `lib/`, `app/`, and `specs/`. Tests are co-located next to the file they test (`*.test.tsx`); E2E lives under `e2e/`.

---

## Phase 1: Setup

**Purpose**: No project initialization needed — this is a UI/registry change inside an established codebase. The "setup" is just confirming the worktree's dev tooling is healthy before edits begin.

- [X] T001 Confirm the dev server on port 3010 is responsive and that `npm test`, `npm run lint`, and `npm run build` all pass on the unmodified branch (baseline). Capture failures before touching any source file.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type-level changes that every subsequent task depends on. Adding `'governance'` to the two TypeScript unions and to the search extractors map is exhaustively type-checked, so doing it once up-front lets every story-specific task compile.

**⚠️ CRITICAL**: No user story task can begin until Phase 2 is complete.

- [X] T002 Extend `ResultTabId` to include `'governance'` (positioned between `'documentation'` and `'security'`) in `specs/006-results-shell/contracts/results-shell-props.ts`.
- [X] T003 Extend `PanelBucketId` to include `'governance'` (positioned between `'documentation'` and `'security'`) in `components/org-summary/panels/registry.tsx`.
- [X] T004 Add `governance: () => []` to the `EXTRACTORS` map in `lib/search/search-index.ts` so the exhaustive `Record<ResultTabId, Extractor>` type still compiles. Per research.md R3, per-repo search has no governance content. **Implementation note**: Also required adding `governance: []` (or `governance: <values>`) to two `SearchIndex` literals in `lib/search/search-engine.test.ts` to keep the exhaustive type happy.

**Checkpoint**: After T002–T004, the codebase still compiles (`npm run build` clean), no behavior change yet, all user stories can now proceed in parallel.

---

## Phase 3: User Story 1 — Surface org-level hygiene + policy as a single tab (Priority: P1) 🎯 MVP

**Goal**: Render a Governance tab on the org-summary view, between Documentation and Security, containing the four migrated panels in risk-first order.

**Independent Test**: Open the org-summary view for any analyzed organization; confirm a "Governance" tab is present between "Documentation" and "Security" and that selecting it renders Org admin activity → Maintainers → Governance file presence → License consistency in that order. (Steps 1–2 of `quickstart.md`.)

### Tests for User Story 1 (TDD — write first, ensure they fail) ⚠️

- [X] T005 [P] [US1] Write `components/org-summary/panels/registry.test.tsx`: assert `PANEL_BUCKETS` contains a `governance` bucket positioned at index 5 (immediately after `documentation`, immediately before `security`); assert its `panels` array equals `['maintainers', 'governance', 'license-consistency']` in that exact order; assert its `label` is `'Governance'`.
- [X] T006 [P] [US1] Extend `components/app-shell/ResultsShell.test.tsx`: add a test that renders `ResultsShell` with a `tabs` prop containing a `governance` entry plus a `governance={<div>Governance content</div>}` prop, clicks the Governance tab, and asserts "Governance content" becomes visible while the other tab contents do not.
- [X] ~~T007 [P] [US1] Write `e2e/governance-tab.spec.ts`: navigate to the org-summary view for a known org with data (use the same fixture/setup other org-summary E2Es use), click the Governance tab, assert the four panels render in order.~~ **Deferred**: there is no existing org-summary E2E in `e2e/` to model after — every existing E2E uses the per-repo `/api/analyze` route which org-summary does not consume. Building a deterministic org-aggregation E2E from scratch (mocking the inventory + queue + per-repo aggregator + OAuth) is out of scope for this UI-reshuffle PR. Coverage falls to: registry unit test (T005), `ResultsShell` slot test (T006), `OrgBucketContent` migration tests (T014, T019, T020), and the manual `quickstart.md` walkthrough in the PR Test Plan.

### Implementation for User Story 1

- [X] T008 [US1] Add the `governance` bucket entry to `PANEL_BUCKETS` in `components/org-summary/panels/registry.tsx`, positioned between the existing `documentation` and `security` entries. Bucket shape: `{ id: 'governance', label: 'Governance', description: 'Org-level hygiene and policy signals — account activity, designated maintainers, governance file presence, and license consistency.', panels: ['maintainers', 'governance', 'license-consistency'] }`. (No changes to the registry's `PANEL_LABELS`, `REAL_PANELS`, or `renderPanel` — those entries already exist for the migrated panel ids.)
- [X] T009 [US1] Add the optional `governance?: React.ReactNode` prop to `ResultsShell` in `components/app-shell/ResultsShell.tsx`. Add a corresponding `<div data-tab-content="governance" style={{ display: currentActiveTab === 'governance' ? 'contents' : 'none' }}>{governance}</div>` inside the existing `<div className="mt-6" ref={containerRef}>` block, immediately after the `documentation` slot and before the `security` slot, to match the visible tab order.
- [X] T010 [US1] Add a `governance` entry to the `orgInventoryTabs` array in `components/repo-input/RepoInputClient.tsx`, positioned between the existing `documentation` and `security` entries. Definition: `{ id: 'governance', label: 'Governance', status: 'implemented', description: 'Org-level hygiene and policy — account activity, maintainers, governance files, license consistency.' }`.
- [X] T011 [US1] Wire the `governance` slot in the `<ResultsShell .../>` JSX call in `components/repo-input/RepoInputClient.tsx`. Render `<OrgBucketContent bucketId="governance" view={orgAggregation.view} selectedWindow={orgWindow} org={orgInventoryResponse?.org ?? null} />` when `inputMode === 'org' && orgAnalysisComplete && orgAggregation.view`, else `null`. Also drop the `org` prop from the `documentation` `OrgBucketContent` invocation — it is no longer needed there since stale-admins moved out.
- [X] T012 [US1] In `components/org-summary/OrgBucketContent.tsx`, change the extra-panel injection branch from `bucketId === 'documentation'` to `bucketId === 'governance'`, and reorder the JSX so `extraPanels` (the StaleAdminsPanel) renders **before** `bucketPanels` for the governance bucket. This puts Org admin activity at the top of the Governance tab body, satisfying the FR-003 risk-first ordering. (For all other bucket ids the rendering order is unchanged.)

**Checkpoint**: T005, T006, T007 now pass. The Governance tab is visible, contains the four panels in the documented order, and renders correctly. User Story 1 is independently demoable.

---

## Phase 4: User Story 2 — Documentation, Contributors, Security stay focused after migration (Priority: P2)

**Goal**: After the migration, Documentation no longer renders Governance file presence / License consistency / Stale admins; Contributors no longer renders Maintainers; Security still renders only the Scorecard rollup; no panel is rendered in two tabs.

**Independent Test**: For an org with data for all migrated panels, open Documentation, Contributors, and Security in turn; confirm each tab still renders its remaining panels with no empty-state placeholder, no orphan heading, and no duplicate content. (Steps 3–5 of `quickstart.md`.)

### Tests for User Story 2 (TDD — write first, ensure they fail) ⚠️

- [X] T013 [P] [US2] Already covered: the test file written in T005 (`components/org-summary/panels/registry.test.tsx`) asserts the post-migration shape of `documentation`, `contributors`, and `security` buckets and verifies no panel id appears in two buckets. No additional edit needed.
- [X] T014 [P] [US2] Wrote `components/org-summary/OrgBucketContent.test.tsx`: bucketId='documentation' → no StaleAdminsPanel; bucketId='governance' (Organization owner) → StaleAdminsPanel rendered before registry panels; loop over all non-governance buckets → no StaleAdminsPanel.
- [X] ~~T015 [P] [US2] Extend `e2e/governance-tab.spec.ts`~~ — superseded by T007 deferral. Coverage falls to the registry test (T005/T013), the OrgBucketContent test (T014), and the manual quickstart walkthrough.

### Implementation for User Story 2

- [X] T016 [US2] Removed `'governance'` and `'license-consistency'` from the `documentation` bucket's `panels` array; updated its `description` to `'Docs coverage, inclusive naming, and adopters across the repo set.'` (Done as part of T008 — same edit moment.)
- [X] T017 [US2] Removed `'maintainers'` from the `contributors` bucket's `panels` array; updated its `description` to `'Who contributes and how concentrated contribution is across the org.'` (Done as part of T008 — same edit moment.)
- [X] T018 [US2] Verified — `npx vitest run components/org-summary/panels/registry.test.tsx components/org-summary/OrgBucketContent.test.tsx` → all 14 + 7 tests green.

**Checkpoint**: Documentation, Contributors, and Security tabs render only their non-migrated panels. No empty-state regressions. User Story 2 is independently demoable.

---

## Phase 5: User Story 3 — Risk-first panel ordering inside Governance (Priority: P2)

**Goal**: When the Governance tab is rendered with all four panels' data, the panels appear top-to-bottom in this exact sequence: Org admin activity, Maintainers, Governance file presence, License consistency. The relative ordering is preserved when one of the panels is N/A (e.g., User-owner case).

**Independent Test**: Open the Governance tab for an Organization owner with data for all four panels and visually confirm the order. Then repeat for a User-owner case and confirm the remaining three panels still appear in their relative risk-first order.

### Tests for User Story 3 (TDD — write first, ensure they fail) ⚠️

- [X] T019 [P] [US3] Wrote in T014's file: "renders StaleAdminsPanel BEFORE registry-driven panels" + "renders the three registry-driven panels in the documented risk-first order". Verified via `compareDocumentPosition`.
- [X] T020 [P] [US3] Wrote in T014's file: "preserves relative panel order when ownerType is User (StaleAdminsPanel still slot-first)". The detailed N/A copy is verified by the existing `StaleAdminsPanel.test.tsx` — no need to duplicate it here.

### Implementation for User Story 3

- [X] T021 [US3] Verified — no additional code edits needed. T012's reorder of `extraPanels`-before-`bucketPanels` is what makes T019 and T020 pass.

**Checkpoint**: All three user stories pass independently. The Governance tab renders in the documented order in both Organization and User owner contexts.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation update (FR-014) + final verification.

- [X] T022 [P] Updated `docs/PRODUCT.md` P1-F16 acceptance criteria with one bullet describing the org-summary tab strip including the new Governance tab. No per-bucket mapping table introduced.
- [X] T023 Quickstart manual verification deferred to the PR Test Plan checkboxes (the PR reviewer/user will walk it). Each of the eight quickstart steps is encoded as a Test Plan item.
- [X] T024 `npm run lint` (0 errors, 24 pre-existing warnings), `npm test` (996/996 passing), `DEV_GITHUB_PAT= npm run build` (✓ build clean) — all green. The `npm run test:e2e -- governance-tab` step was skipped because T007 (the corresponding e2e file) was deferred — see T007 entry for rationale.
- [X] T025 `dod-verifier` invocation deferred until just before `git push` (next step), so the verifier sees the branch in the exact shape that lands on the PR.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: T001 has no dependencies — run first.
- **Phase 2 (Foundational)**: Depends on T001. T002, T003, T004 are independent of each other and parallelizable, but the Phase 2 checkpoint (build green) must be reached before any user story task starts.
- **Phase 3 (US1)**: All US1 tasks depend on Phase 2.
- **Phase 4 (US2)**: All US2 tasks depend on Phase 2 — independent of Phase 3 *production code* but T013 extends the test file created in T005, so author US1's test file first.
- **Phase 5 (US3)**: Depends on T012 (Phase 3) for the production-code ordering it tests; T019/T020 extend the test file created in T014, so author US2's test file first.
- **Phase 6 (Polish)**: Depends on Phases 3, 4, 5 being green.

### Within Each User Story

- Tests (T005/T006/T007 for US1, T013/T014/T015 for US2, T019/T020 for US3) are written first and must FAIL before the corresponding implementation tasks land.
- Within US1, the implementation order is: T008 (registry add) → T009 (ResultsShell prop) → T010 (orgInventoryTabs entry) → T011 (RepoInputClient wiring) → T012 (OrgBucketContent injection move + reorder). Each step depends on the previous step's types/wiring.
- Within US2, T016 and T017 touch the same file (`registry.tsx`) so they are NOT parallelizable with each other — execute sequentially.

### Parallel Opportunities

- **Phase 2**: T002, T003, T004 → 3 parallel edits (different files).
- **US1 tests**: T005, T006, T007 → 3 parallel edits (different files).
- **US2 tests**: T014, T015 → 2 parallel edits (T013 extends T005's file). T016 and T017 are sequential (same file).
- **US3 tests**: T019 and T020 are in the same file (`OrgBucketContent.test.tsx`) — sequential.

---

## Parallel Example: User Story 1 tests

```text
# Authored together (different files):
T005 — components/org-summary/panels/registry.test.tsx
T006 — components/app-shell/ResultsShell.test.tsx (extension)
T007 — e2e/governance-tab.spec.ts
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Phase 1 (T001) → confirm baseline green.
2. Phase 2 (T002–T004) → wire types and search extractor.
3. Phase 3 (T005–T012) → ship the Governance tab.
4. **STOP and VALIDATE** quickstart steps 1–2 manually.
5. The MVP is shippable here in principle, but the spec scopes US2 + US3 into the same PR — so continue.

### Incremental delivery within the same PR

1. Phase 4 (US2) → tighten the source tabs.
2. Phase 5 (US3) → verify ordering.
3. Phase 6 (polish + DoD).
4. Open PR; ask user to merge after Test Plan is checked.

### Single-developer strategy

This feature is small enough for one developer to walk top-to-bottom through the task list serially. The `[P]` markers exist mainly to flag where a parallel-tool-call optimization is safe.

---

## Notes

- All file paths are repo-root-relative.
- This feature ships as a single PR (not split per user story) because the bucket-reassignment, the StaleAdminsPanel injection move, and the new tab wiring are interdependent enough that splitting them produces a transient broken UI.
- The PR Test Plan must be a Markdown checklist, one item per `quickstart.md` step plus the four automated checks in T024.
- `pr-test-plan-checker` runs after PR open; do not merge until every checkbox is checked. `dod-verifier` runs before push (T025).
- Per CLAUDE.md the assistant never runs `gh pr merge` — that action stays manual.
