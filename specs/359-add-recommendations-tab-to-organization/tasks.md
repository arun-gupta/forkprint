---

description: "Task list for issue #359 — Recommendations tab on the org-summary view"
---

# Tasks: Recommendations tab on the org-summary view

**Input**: Design documents from `/specs/359-add-recommendations-tab-to-organization/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/org-recommendations-aggregator.ts, quickstart.md

**Tests**: YES — constitution §XI makes TDD mandatory (NON-NEGOTIABLE). Tests are written first and must fail before implementation.

**Organization**: Tasks are grouped by user story (US1 / US2 / US3 / US4) to enable independent implementation and testing of each story. US1 and US2 are the MVP — the aggregator + the panel render is what delivers the headline value. US3 adds the drill-down. US4 is the `/demo/organization` regression guard.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks).
- **[Story]**: Which user story this task belongs to (US1/US2/US3/US4). Setup/Foundational/Polish phases carry no `[Story]` label.
- Include exact file paths in descriptions.

## Path Conventions

Single Next.js 14 App Router project. Source lives at repo root under `lib/`, `components/`, `app/`. Tests live next to their subject (`*.test.ts`, `*.test.tsx`) per the existing codebase convention. No new project layout.

---

## Phase 1: Setup

**Purpose**: No new project scaffolding needed — the feature slots into existing `lib/org-aggregation/aggregators/` and `components/org-summary/panels/` directories. Setup here is limited to the declarations the later tasks depend on.

- [x] T001 Add `'org-recommendations'` to the `PanelId` union in `lib/org-aggregation/types.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Introduce the value types and the contract file-level assertions that every downstream story depends on.

**⚠️ CRITICAL**: Tasks T002–T003 must complete before any US-phase task.

- [x] T002 Add `OrgRecommendationBucket`, `ORG_RECOMMENDATION_BUCKET_ORDER`, `OrgRecommendationEntry`, `OrgRecommendationsValue` to `lib/org-aggregation/aggregators/types.ts`, with TSDoc mirroring `specs/359-add-recommendations-tab-to-organization/data-model.md` and `contracts/org-recommendations-aggregator.ts`.
- [x] T003 [P] Re-export the new types from `lib/org-aggregation/aggregators/index.ts` (the file already does `export * from './types'` — verify no manual change needed, adjust only if types were placed elsewhere).

**Checkpoint**: Type surface is defined. Aggregator and panel work can now proceed.

---

## Phase 3: User Story 1 — Systemic issues visible at a glance (Priority: P1) 🎯 MVP

**Goal**: The pure-function `orgRecommendationsAggregator` produces a correctly-deduped, correctly-counted, correctly-sorted aggregated recommendation set from the completed `AnalysisResult[]`. The new panel bucket renders in the org-summary tab strip (but grouping visuals are covered in US2).

**Independent Test**: Run the aggregator unit tests — they verify the aggregation contract end-to-end without any rendering. Then manually open the org-summary view on a completed run and confirm the Recommendations tab is visible in the strip.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [x] T004 [P] [US1] Write failing Vitest unit tests in `lib/org-aggregation/aggregators/org-recommendations.test.ts` covering: empty input → in-progress panel; single repo one recommendation → one entry count 1; two repos same recommendation → one entry count 2 with both repos alphabetized; two repos different recommendations → two entries; direct-check alias dedup (one repo Scorecard `Branch-Protection`, one repo direct-check `branch_protection`) → one entry count 2; uncataloged key → `UNCAT:<key>` id; sort order higher count first with catalog id asc as tiebreaker; denominator `analyzedReposCount === results.length`; `affectedRepos` case-insensitive alphabetical. One assertion per `it(...)`; use lightweight `AnalysisResult` fixture factories rather than full runs.

### Implementation for User Story 1

- [x] T005 [US1] Implement `orgRecommendationsAggregator` in `lib/org-aggregation/aggregators/org-recommendations.ts` satisfying the `OrgRecommendationsAggregator` type from `specs/359-add-recommendations-tab-to-organization/contracts/org-recommendations-aggregator.ts`. Iterate `results`, call `getHealthScore(result).recommendations` + (if `result.securityResult !== 'unavailable'`) `getSecurityScore(result.securityResult, result.stars).recommendations`, resolve each rec via `getCatalogEntryByKey`, dedup by `catalogEntry.id` (or `UNCAT:<rawKey>` fallback) into a `Map<string, { bucket, title, repos: Set<string> }>`, emit `OrgRecommendationEntry[]` sorted `[bucket-order asc, affectedRepoCount desc, id asc]`, wrap in `AggregatePanel<OrgRecommendationsValue>` with `status: 'in-progress' | 'final'` per data-model.md §State transitions. Pure function — no react/next/component imports.
- [x] T006 [US1] Wire `orgRecommendationsAggregator` into `lib/org-aggregation/view-model.ts` alongside the other aggregators: add an import, add `'org-recommendations': stamp(orgRecommendationsAggregator(completedResults, context))` to the `panels` record.
- [x] T007 [US1] Register the panel in `components/org-summary/panels/registry.tsx`: set `PANEL_BUCKETS[id='recommendations'].panels = ['org-recommendations']`; add `'org-recommendations': 'Top systemic issues'` to `PANEL_LABELS`; import and add `OrgRecommendationsPanel` to `REAL_PANELS`. Update the bucket comment at registry.tsx:28–31 to drop the "no recommendations engine" sentence while keeping the comparison-exclusion note.
- [x] T008 [US1] In `components/org-summary/OrgSummaryView.tsx:34`, change `.filter((b) => b.id !== 'repos' && b.id !== 'recommendations')` to `.filter((b) => b.id !== 'repos')`.
- [x] T009 [P] [US1] Create a minimal `components/org-summary/panels/OrgRecommendationsPanel.tsx` that (a) renders the section shell in the style of `GovernancePanel` (border, header, expand chevron, empty-state, `data-testid="org-recommendations-panel"`), (b) when `panel.status === 'in-progress' && !panel.value` renders the `<EmptyState />`, (c) when `panel.value.items.length === 0` renders "No systemic issues found across the N analyzed repos." text, (d) when `panel.value.items.length > 0` renders a FLAT list of entries (no bucket grouping yet — that lands in US2) each showing `<ID> · <title> · N of M repos`. This gives US1 a complete, testable rendering end-to-end; grouping is a layered addition in US2.

**Checkpoint**: Aggregator works. Tab is visible. Flat list of top-N recommendations renders. US2 builds on this to add grouping and headings.

---

## Phase 4: User Story 2 — Grouped by CHAOSS dimension (Priority: P1)

**Goal**: The flat list from US1 is grouped into CHAOSS bucket sections in the fixed order, with empty buckets hidden.

**Independent Test**: RTL test on `OrgRecommendationsPanel`: given an `OrgRecommendationsValue` with entries spanning two buckets (Activity, Security), confirm two section headings render, in the order Activity → Security, each containing only the entries of its bucket. Also confirm Responsiveness / Contributors / Documentation headings do NOT render when absent.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [x] T010 [P] [US2] Write failing RTL tests in `components/org-summary/panels/OrgRecommendationsPanel.test.tsx` covering: empty `items` → empty-state message references the `analyzedReposCount`; multi-bucket `items` → bucket headings render in `ORG_RECOMMENDATION_BUCKET_ORDER`; buckets with zero items → heading absent; each entry shows `<ID> · <title> · <count> of <denom> repos`.

### Implementation for User Story 2

- [x] T011 [US2] In `components/org-summary/panels/OrgRecommendationsPanel.tsx`, group `panel.value.items` by `entry.bucket`, iterate `ORG_RECOMMENDATION_BUCKET_ORDER` (imported from `lib/org-aggregation/aggregators/types`), and render only buckets with ≥1 entry. Each group gets a subheading (matching the bucket label) and lists its entries in the order they arrive from the aggregator (already pre-sorted). Reuse the `BUCKET_COLORS` palette constants that already exist at `components/recommendations/RecommendationsView.tsx:21-27` if readily import-friendly; otherwise duplicate the five-color lookup as a local constant in the panel file (do not export from `RecommendationsView` just for this).

**Checkpoint**: Grouped output renders. With US1 + US2 in place, the MVP is shippable: a completed org run shows a Recommendations tab with systemic issues grouped by CHAOSS dimension, sorted by affected-repo count.

---

## Phase 5: User Story 3 — Drill down to affected repos (Priority: P2)

**Goal**: Each aggregated entry can be expanded to show the alphabetical list of affected repo slugs.

**Independent Test**: RTL test: click the expand affordance on an entry with `affectedRepoCount === 3`; confirm all 3 repo slugs render in the exact order produced by the aggregator (already alphabetical).

### Tests for User Story 3 ⚠️ (write first, must fail)

- [x] T012 [US3] Extend `components/org-summary/panels/OrgRecommendationsPanel.test.tsx` with drill-down tests: expanded entry shows the exact `affectedRepos` list; `aria-expanded` toggles on click; collapsed entry hides the list; re-expanding shows the same list in the same order (stability).

### Implementation for User Story 3

- [x] T013 [US3] In `components/org-summary/panels/OrgRecommendationsPanel.tsx`, wrap each entry in an expandable disclosure (local `useState<Set<string>>` keyed by `entry.id` — matches the `collapsedRepos` pattern in `components/recommendations/RecommendationsView.tsx:205`). Render the `entry.affectedRepos` list under the entry when expanded, using a `<ul>` with `role="list"` and each `<li>` showing the repo slug. No re-sorting in the component — trust the aggregator's order.

**Checkpoint**: Users can drill down from an aggregated entry to the exact repos it affects.

---

## Phase 6: User Story 4 — `/demo/organization` regression guard (Priority: P3)

**Goal**: The demo route renders the Recommendations tab with zero demo-specific code changes.

**Independent Test**: Playwright smoke — navigate to `/demo/organization`, click the Recommendations tab, confirm a bucket heading and at least one entry are visible.

### Tests for User Story 4 ⚠️ (write first, must fail)

- [x] T014 [US4] Find the existing Playwright test for `/demo/organization` (or the nearest existing demo coverage file under `tests/e2e/`); extend it with a test case that navigates to the route, clicks the Recommendations tab, and asserts `data-testid="org-recommendations-panel"` is visible and contains at least one bucket heading and one entry. Per `feedback_playwright_e2e_style` memory: use lightweight DOM assertions, NOT visual snapshots.

### Implementation for User Story 4

- [x] T015 [US4] Confirm (don't edit) that `app/demo/organization/page.tsx` — or whatever the demo route is — consumes `OrgSummaryView` / `buildOrgSummaryViewModel` through the same path as production, so the new tab appears automatically. If the demo uses a private fixture path that constructs its own `panels` map, expand it to include `'org-recommendations': orgRecommendationsAggregator(demoResults, demoContext)`. This task's output is either (a) "no change required — path is shared" or (b) a small diff to the demo route, never a restructuring.

**Checkpoint**: Demo route renders the full 7-tab set (including Recommendations) — matching #213's original intent.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, constitution compliance verification, and end-to-end validation.

- [x] T016 [P] Update `docs/PRODUCT.md`: in the section that enumerates the org-summary tab set (or the nearest equivalent section if no enumeration exists), add the Recommendations tab and a one-sentence description of its primary framing ("top-N most common issues across the analyzed repo set, grouped by CHAOSS dimension, with per-recommendation drill-down to affected repos"). Keep the edit terse — one paragraph.
- [x] T017 [P] Update `docs/DEVELOPMENT.md` Phase 1 feature order table only if an entry for issue #359 is appropriate; otherwise leave the table untouched (the feature is not a P1-F## entry — it is an incremental polish to existing P1-F16 org-aggregation output, so the table may not need a row).
- [x] T018 Run `npm test` — all new unit tests pass, no regressions.
- [x] T019 Run `npm run lint` — clean.
- [x] T020 Run `DEV_GITHUB_PAT= npm run build` — clean.
- [x] T021 Run `npm run test:e2e` — the new Playwright coverage for `/demo/organization` passes.
- [x] T022 Walk through `specs/359-add-recommendations-tab-to-organization/quickstart.md` sections A–D manually on `http://localhost:3011`. Confirm each bullet.
- [x] T023 `dod-verifier` sub-agent: run `@dod-verifier (agent) walk the DoD for this branch` before opening the PR. Address any blockers it flags.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1 — T001)**: starts immediately.
- **Foundational (Phase 2 — T002, T003)**: depends on Phase 1. Blocks all US phases.
- **US1 (Phase 3 — T004–T009)**: depends on Foundational. Delivers the aggregator + tab visibility + flat render.
- **US2 (Phase 4 — T010–T011)**: depends on US1 (grouping layers on top of the flat render from T009).
- **US3 (Phase 5 — T012–T013)**: depends on US2 (drill-down is added to the grouped entries from T011).
- **US4 (Phase 6 — T014–T015)**: depends on US3 (demo smoke needs the fully-built panel from T013 to assert against).
- **Polish (Phase 7 — T016–T023)**: depends on US4 (and therefore all earlier phases).

### Within each user story

- The test tasks (T004, T010, T012, T014) are written FIRST and must fail before the matching implementation task.
- Within US1, T005 → T006 → T007 → T008 run sequentially (each touches the integration path of the previous); T009 is [P] with them only if the panel file is created in isolation (the final T007/T008 edits still need the panel to exist, so prefer sequential: T005 → T006 → T007 → T008 → T009).
- Within US2, T011 depends on T010 (tests before impl).
- Within US3, T013 depends on T012.

### Parallel opportunities

- T003 is [P] with T002 (different files: `index.ts` vs `types.ts`).
- T004 and T009 are both [P] within US1 — the test file and the panel stub touch different files and have no dependency between them (the panel stub imports only type exports from T002).
- T010 is [P] with T009 — both belong to the panel file vs its test file.
- T016 and T017 are [P] within Polish.

### Parallel execution examples

```text
# After T001, T002, and T003 are done, kick off T004 and T009 side-by-side:
Task: "Write failing Vitest unit tests in lib/org-aggregation/aggregators/org-recommendations.test.ts"
Task: "Create minimal OrgRecommendationsPanel skeleton in components/org-summary/panels/OrgRecommendationsPanel.tsx"

# During polish:
Task: "Update docs/PRODUCT.md with the Recommendations tab paragraph"
Task: "Update docs/DEVELOPMENT.md (if needed)"
```

---

## Implementation Strategy

### MVP first (US1 + US2 only)

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002–T003).
3. Complete Phase 3: US1 (T004–T009) — aggregator + flat tab.
4. Complete Phase 4: US2 (T010–T011) — grouping.
5. **STOP and VALIDATE**: quickstart.md §A (demo route) should now render the Recommendations tab with grouped entries.
6. Ship, or continue to US3/US4.

### Incremental delivery

- US1 → US2 = MVP. Mergeable on its own if US3/US4 would delay shipping.
- US3 is the drill-down, strictly additive — adds an expandable affordance to entries that already render.
- US4 is a Playwright smoke — catches regressions on future changes but is not a product requirement in the user-visible sense; still required before merge because the feature's FR-015 / SC-004 commit to it.

### Constitution compliance

The TDD order (tests-first) is enforced per-story (T004 → T005, T010 → T011, T012 → T013, T014 → T015). Constitution §XI (NON-NEGOTIABLE) is satisfied. §IV analyzer/aggregator boundary is enforced by the pure-function test at T004 and the contract at `contracts/org-recommendations-aggregator.ts`.

---

## Notes

- Every task lists an exact file path.
- `[P]` means different file, no dependency on an incomplete task.
- `[US#]` maps to the user stories in `spec.md`.
- Do not skip test tasks — TDD is constitutional (NON-NEGOTIABLE).
- Commit after each task or logical group; do not squash US1 tests and impl into a single commit.
- PR is not opened until T023 passes.
