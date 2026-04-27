# Tasks: Repo Card Progressive Disclosure

**Input**: Design documents from `specs/483-ux-repo-card-is-too-dense-for-first-time/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/metric-card-ui-contract.md

**Tests**: TDD is MANDATORY per constitution §XI-1. Every test task must be written and confirmed failing before the corresponding implementation task is executed.

**Organization**: Tasks grouped by user story to enable independent validation at each checkpoint.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: No new dependencies, directories, or files need to be created. The project is already set up. This phase is a pre-flight audit.

- [ ] T001 Audit `components/metric-cards/MetricCard.test.tsx` (354 lines) and identify every test block that asserts content from the secondary tier (scoreCells: Activity, Responsiveness, Contributors, Documentation, Security; lenses; details section; recommendations). Record the count for T016.

**Checkpoint**: You know exactly which existing tests will break when the secondary tier is gated. Implementation can begin.

---

## Phase 2: Foundational

**Purpose**: No blocking infrastructure changes needed — this feature modifies a single existing component. Phase 2 is intentionally thin for this feature.

- [ ] T002 Verify dev server on port 3010 is running and the repo card renders correctly at current state (baseline screenshot or DOM inspection via browser devtools). Confirm `Activity`, `Lenses`, and details are all visible by default before any changes.

**Checkpoint**: Baseline confirmed. Progressive disclosure implementation can begin.

---

## Phase 3: User Story 1 — First-time visitor understands score at a glance (Priority: P1)

**Goal**: Default card view shows only health score + 3 ecosystem tiles; all secondary content is hidden behind an affordance.

**Independent Test**: Load a card; assert health score visible; assert "Show details" button present; assert "Activity" tile NOT visible.

### Tests for User Story 1 (TDD — write first, confirm failing, then implement)

- [ ] T003 [US1] Add failing Vitest test to `components/metric-cards/MetricCard.test.tsx`: **"default state: health score and ecosystem tiles visible"** — render a full card; assert `screen.getByText(/oss health score/i)` is in document; assert `screen.getByText(/^Reach$/)`, `screen.getByText(/^Attention$/)`, `screen.getByText(/^Engagement$/)` are in document.

- [ ] T004 [US1] Add failing Vitest test: **"default state: secondary content hidden"** — render a full card; assert `screen.queryByText(/^Activity$/)` returns null; assert `screen.queryByText(/^Responsiveness$/)` returns null; assert `screen.queryByText(/^Contributors$/)` returns null; assert `screen.queryByText(/Lenses/i)` returns null; assert details section (aria-label ending in "details") is not in document; assert recommendations link is not in document.

- [ ] T005 [US1] Add failing Vitest test: **"default state: Show details affordance is present"** — render a full card; assert `screen.getByTestId('details-toggle-facebook/react')` is in document; assert its `aria-expanded` attribute is `"false"`; assert it has accessible text matching /show details/i.

- [ ] T006 [US1] Run `npm test -- --reporter=verbose components/metric-cards/MetricCard.test.tsx` and confirm T003–T005 tests FAIL (secondary content currently visible by default). Confirm all pre-existing tests still pass — if any pre-existing test now references a non-existent element that's a test bug, note it for T016.

### Implementation for User Story 1

- [ ] T007 [US1] In `components/metric-cards/MetricCard.tsx`: add `detailsExpanded` state initialized to `false` (localStorage read deferred to US3). Add a `toggleDetails` stub function that calls `setDetailsExpanded((prev) => !prev)`.

- [ ] T008 [US1] In `components/metric-cards/MetricCard.tsx`: wrap the `scoreCells` render block (lines ~205–211), the lenses block (lines ~215–235), the details `<section>` (lines ~237–255), and the recommendations block (lines ~257–274) in `{detailsExpanded && (…)}`. The `profileCells` grid (ecosystem tiles, lines ~194–204) remains in the primary tier and is NOT gated.

- [ ] T009 [US1] In `components/metric-cards/MetricCard.tsx`: insert the "Show details / Hide details" affordance button between the ecosystem tiles block (after the closing tag of the profileCells/scoreCells wrapper `<div>` at line ~213) and the new `{detailsExpanded && …}` gate. Use:
  ```tsx
  <button
    type="button"
    data-testid={`details-toggle-${card.repo}`}
    aria-expanded={detailsExpanded}
    aria-controls={`secondary-${card.repo}`}
    onClick={toggleDetails}
    className="mt-2 flex w-full min-h-[44px] items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
  >
    <span>{detailsExpanded ? 'Hide details' : 'Show details'}</span>
    <CollapseChevron expanded={detailsExpanded} />
  </button>
  ```
  Wrap the secondary content in `<div id={`secondary-${card.repo}`}>…</div>`.

- [ ] T010 [US1] Run `npm test -- components/metric-cards/MetricCard.test.tsx` — confirm T003–T005 now PASS. Note how many pre-existing tests now fail (they will, because secondary content is gated). Those failures are expected and will be fixed in T016.

**Checkpoint — US1**: Health score and ecosystem tiles show by default; secondary content hidden; "Show details" button present. User Story 1 independently verifiable.

---

## Phase 4: User Story 2 — User expands to see full detail (Priority: P2)

**Goal**: Clicking "Show details" reveals all secondary content; clicking "Hide details" collapses it. All existing interactive behaviors work in expanded state.

**Independent Test**: Click "Show details" → assert Activity tile visible; click "Hide details" → assert Activity tile gone.

### Tests for User Story 2 (TDD — write first, confirm failing, then implement)

- [ ] T011 [US2] Add failing Vitest test: **"expand: click Show details reveals secondary content"** — render full card; click `getByTestId('details-toggle-facebook/react')`; assert `screen.getByText(/^Activity$/)` is in document; assert `screen.getByText(/^Responsiveness$/)` is in document; assert `screen.getByText(/Lenses/i)` is in document; assert details section present; assert button now has text /hide details/i and `aria-expanded="true"`.

- [ ] T012 [US2] Add failing Vitest test: **"expand then collapse: click Hide details hides secondary again"** — render full card; click toggle; click toggle again; assert `screen.queryByText(/^Activity$/)` returns null; assert button text is /show details/i; assert `aria-expanded="false"`.

- [ ] T013 [US2] Add failing Vitest test: **"expanded: lens pill click triggers onTagChange"** — render card with `onTagChange` spy; expand; click the Community lens pill; assert spy was called.

- [ ] T014 [US2] Add failing Vitest test: **"expanded: score cell click navigates to tab"** — render card; expand; click an Activity score cell; assert `document.querySelector('[role="tab"][data-tab-id="activity"]')?.click` would be invoked (can use `vi.spyOn(document, 'querySelector')` returning a mock tab element).

- [ ] T015 [US2] Run tests and confirm T011–T014 FAIL (toggle click does nothing useful yet). Note: T011–T012 may already pass given T007 added toggle state — verify. T013–T014 should pass already (interactive behaviors already work); if so, mark them as PASS and skip to T016.

### Implementation for User Story 2

- [ ] T016 [US2] Update all pre-existing test blocks in `components/metric-cards/MetricCard.test.tsx` that assert secondary-tier content (`Activity`, `Responsiveness`, `Contributors`, `Documentation`, `Security`, lenses, details, recommendations). Each affected test block needs `await userEvent.click(screen.getByTestId('details-toggle-facebook/react'))` (or the relevant repo slug) inserted before the secondary-content assertion. Do NOT change what is being asserted — only add the expand step. Affected blocks identified in T001.

- [ ] T017 [US2] Run `npm test -- components/metric-cards/MetricCard.test.tsx` — all tests must pass (pre-existing + T011–T015). Fix any remaining failures before proceeding.

**Checkpoint — US2**: Expand and collapse work correctly. All existing interactive behaviors preserved. User Story 2 independently verifiable.

---

## Phase 5: User Story 3 — Power user retains expanded state across page loads (Priority: P3)

**Goal**: Per-repo expand state persisted in `localStorage` with key `repopulse:card-expanded:{repo}`. Restored on re-mount. Failure is silent.

**Independent Test**: Expand card, re-render component (simulating page reload via unmount+remount with localStorage set), assert card opens expanded.

### Tests for User Story 3 (TDD — write first, confirm failing, then implement)

- [ ] T018 [P] [US3] Add failing Vitest test: **"localStorage: card starts expanded when stored value is true"** — before render, call `localStorage.setItem('repopulse:card-expanded:facebook/react', 'true')`; render card; assert `screen.getByText(/^Activity$/)` is in document (secondary tier visible without clicking); assert toggle button shows /hide details/i.

- [ ] T019 [P] [US3] Add failing Vitest test: **"localStorage: card starts collapsed when stored value is false"** — set `'false'`; render; assert `screen.queryByText(/^Activity$/)` is null.

- [ ] T020 [P] [US3] Add failing Vitest test: **"localStorage: toggle writes new state to localStorage"** — render card (starts collapsed); click toggle; assert `localStorage.getItem('repopulse:card-expanded:facebook/react')` equals `'true'`; click toggle again; assert equals `'false'`.

- [ ] T021 [P] [US3] Add failing Vitest test: **"localStorage: throws on read → card starts collapsed, no error"** — spy on `localStorage.getItem` to throw `new DOMException('QuotaExceededError')`; render card; assert `screen.queryByText(/^Activity$/)` is null (default collapsed). Confirm no unhandled errors.

- [ ] T022 [US3] Run tests — confirm T018–T021 all FAIL (no localStorage integration yet). Confirm T011–T017 still pass.

### Implementation for User Story 3

- [ ] T023 [US3] In `components/metric-cards/MetricCard.tsx`: replace the `useState(false)` for `detailsExpanded` with a localStorage-backed initializer:
  ```tsx
  const localStorageKey = `repopulse:card-expanded:${card.repo}`
  const [detailsExpanded, setDetailsExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem(localStorageKey) === 'true'
    } catch {
      return false
    }
  })
  ```
  Update `toggleDetails` to write to localStorage:
  ```tsx
  const toggleDetails = () => {
    setDetailsExpanded((prev) => {
      const next = !prev
      try { localStorage.setItem(localStorageKey, String(next)) } catch { /* storage unavailable */ }
      return next
    })
  }
  ```

- [ ] T024 [US3] Run `npm test -- components/metric-cards/MetricCard.test.tsx` — all tests must pass including T018–T021. If T018/T019 need `localStorage.clear()` in `beforeEach`, add that cleanup to the test file's `beforeEach` block.

**Checkpoint — US3**: localStorage persistence works. Per-repo state survives remount. Failure is silent. User Story 3 independently verifiable.

---

## Phase 6: User Story 4 — CNCF readiness in card header (Priority: P3)

**Goal**: When `card.analysisResult.aspirantResult` is non-null, show a compact `CNCFReadinessPill` in the header button row. Badge is always visible (primary tier, inside the header toggle button).

**Independent Test**: Render card with `aspirantResult = { readinessScore: 75, … }`; assert `data-testid="cncf-badge-facebook/react"` is in document inside the header button.

### Tests for User Story 4 (TDD — write first, confirm failing, then implement)

- [ ] T025 [P] [US4] Add failing Vitest test: **"CNCF badge: visible in header when aspirantResult is set"** — build card with `buildResult({ aspirantResult: { readinessScore: 75, readyCount: 5, totalAutoCheckable: 8, autoFields: [], humanOnlyFields: [], tagRecommendation: 'sandbox', sandboxApplication: null } })`; render; assert `screen.getByTestId('cncf-badge-facebook/react')` is in document; assert it contains text `75`; assert it is within the header `<button>` element (check parent chain).

- [ ] T026 [P] [US4] Add failing Vitest test: **"CNCF badge: absent when aspirantResult is null"** — render card with default buildResult (no aspirantResult); assert `screen.queryByTestId('cncf-badge-facebook/react')` is null.

- [ ] T027 [P] [US4] Add failing Vitest test: **"CNCF badge: visible when pane is not collapsed"** — render card; do not collapse pane; assert badge visible. (Confirms badge is always in the primary visible zone, not behind the details gate.)

- [ ] T028 [US4] Run tests — confirm T025–T027 FAIL. Confirm all earlier tests still pass.

### Implementation for User Story 4

- [ ] T029 [US4] In `components/metric-cards/MetricCard.tsx`: add import `import { CNCFReadinessPill } from '@/components/overview/CNCFReadinessPill'`. Add `const aspirantResult = card.analysisResult.aspirantResult ?? null`. Inside the header `<button>` (after `<h3>{card.repo}</h3>`, before `<p className="ml-auto …">Created: …</p>`), insert:
  ```tsx
  {aspirantResult ? (
    <span
      data-testid={`cncf-badge-${card.repo}`}
      className="ml-2"
      aria-label={`CNCF Sandbox Readiness: ${aspirantResult.readinessScore} / 100`}
    >
      <CNCFReadinessPill
        aspirantResult={aspirantResult}
        onClick={() => {
          const tab = document.querySelector<HTMLButtonElement>('[role="tab"][data-tab-id="cncf-readiness"]')
          tab?.click()
        }}
      />
    </span>
  ) : null}
  ```

- [ ] T030 [US4] Run `npm test -- components/metric-cards/MetricCard.test.tsx` — all tests including T025–T027 must pass.

**Checkpoint — US4**: CNCF badge appears in header when aspirantResult is set; absent otherwise. User Story 4 independently verifiable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: E2E smoke test, full regression pass, lint/typecheck, docs update.

- [ ] T031 Add a new Playwright test block to `e2e/metric-cards.spec.ts` — **"progressive disclosure: secondary content hidden by default, expand/collapse works"**:
  1. Route `**/api/analyze` to return a `buildResult` with full data (stars, forks, lenses, recommendations)
  2. Submit the analysis form
  3. Assert `page.getByText('Activity')` is NOT visible initially
  4. Assert `page.getByText('Lenses')` is NOT visible initially
  5. Click `page.getByTestId('details-toggle-facebook/react')`
  6. Assert `page.getByText('Activity')` is visible
  7. Assert `page.getByText('Lenses')` is visible
  8. Click the toggle again
  9. Assert `page.getByText('Activity')` is NOT visible

- [ ] T032 Run full test suite: `npm test` — all Vitest tests pass with zero failures.

- [ ] T033 [P] Run `npm run lint` — no lint errors.

- [ ] T034 [P] Run `npm run typecheck` — no TypeScript errors.

- [ ] T035 Run `npx playwright test e2e/metric-cards.spec.ts` — all E2E tests pass including T031.

- [ ] T036 Update `docs/DEVELOPMENT.md` — mark issue #483 (repo card progressive disclosure) as complete in the implementation order.

**Checkpoint — Done**: All tests pass. Lint and typecheck clean. Feature is complete per Definition of Done.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Setup): Start immediately
- **Phase 2** (Foundational): After Phase 1
- **Phase 3** (US1): After Phase 2 — BLOCKS all other user story phases
- **Phase 4** (US2): After Phase 3 (expand/collapse builds on the gated secondary tier)
- **Phase 5** (US3): After Phase 4 (localStorage builds on the toggle state)
- **Phase 6** (US4): After Phase 3 — can run in parallel with US2 and US3 since it modifies the header, not the secondary tier gate
- **Phase 7** (Polish): After all user story phases

### Within Each Phase: TDD Order

1. Write test(s) and confirm they FAIL
2. Implement the code change
3. Run tests and confirm they PASS
4. Proceed to next phase

### Parallel Opportunities

- T018, T019, T020, T021 (US3 test writing) can be written in parallel — different describe blocks
- T025, T026, T027 (US4 test writing) can be written in parallel
- T033 and T034 (lint + typecheck) can run in parallel after T032

---

## Implementation Strategy

### MVP (User Story 1 only — T001–T010)

After T010: card shows health score + ecosystem tiles by default; secondary hidden; affordance present. This is the minimum that satisfies the "first-time visitor" acceptance criterion.

### Incremental Delivery

1. T001–T010 → US1 complete (primary tier established)
2. T011–T017 → US2 complete (expand/collapse functional, all existing tests updated)
3. T018–T024 → US3 complete (localStorage persistence)
4. T025–T030 → US4 complete (CNCF header badge)
5. T031–T036 → Polish complete (E2E, full regression, docs)

### Notes

- The biggest risk is T016 (updating existing tests). Expect 8–12 test blocks to need the expand-click prefix. Do not skip any — each represents a real regression guard.
- The `localStorage` lazy initializer in `useState(() => …)` is important: it runs only on mount (not on every render), which is the correct semantics for restoration.
- Do NOT use `useEffect` for localStorage initialization — lazy `useState` is the idiomatic React pattern and avoids a flash of incorrect state.
- The `CNCFReadinessPill` `onClick` in T029 wraps the tab navigation in a click handler; clicking the badge from within the header button will propagate to the header's collapse toggle unless `e.stopPropagation()` is called on the span's click. Add `onClick={(e) => e.stopPropagation()}` to the wrapper `<span>` to prevent the badge click from toggling card collapse.
