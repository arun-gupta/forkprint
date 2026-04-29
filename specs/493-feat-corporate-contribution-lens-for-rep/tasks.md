# Tasks: Corporate Contribution Lens

**Feature Branch**: `493-feat-corporate-contribution-lens-for-rep`
**Spec**: `specs/493-feat-corporate-contribution-lens-for-rep/spec.md`
**Plan**: `specs/493-feat-corporate-contribution-lens-for-rep/plan.md`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story this task belongs to (US1, US2, US3)
- Constitution §XI mandates TDD: tests written before implementation in every phase

---

## Phase 1: Setup

**Purpose**: Establish baseline before any changes.

- [x] T001 Run `npm test` and record the initial pass/fail state as a baseline

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type extension and analyzer population. All three user stories depend on these new data fields being present in `AnalysisResult`.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### TDD — Write failing tests first (§XI)

- [x] T002 Write failing analyzer tests covering the three new `ContributorWindowMetrics` fields in `lib/analyzer/analyze.test.ts`: new fields populated correctly for org signal only, email signal only, both present, both absent

### Type Extension

- [x] T003 Add three optional fields to `ContributorWindowMetrics` in `lib/analyzer/analysis-result.ts`: `commitAuthorsByExperimentalOrg?: Record<string, string[]> | Unavailable`, `commitCountsByEmailDomain?: Record<string, number> | Unavailable`, `commitAuthorsByEmailDomain?: Record<string, string[]> | Unavailable`

- [x] T004 Update `createUnavailableContributorWindowMetrics()` in `lib/analyzer/analyze.ts` to set all three new fields to `'unavailable'`

- [x] T005 Update the zero-window early-return inside `buildExperimentalMetricsByWindow` in `lib/analyzer/analyze.ts` to include the three new fields (set to `'unavailable'`)

### Analyzer Extension

- [x] T006 Extend `buildExperimentalMetricsByWindow` in `lib/analyzer/analyze.ts` to build `commitAuthorsByExperimentalOrg`: for each login-based actor, add the actor key to a per-org `Set<string>` capped at 500 entries, then convert to `Record<string, string[]>` in the return value

- [x] T007 Extend `buildExperimentalMetricsByWindow` in `lib/analyzer/analyze.ts` to build `commitCountsByEmailDomain` and `commitAuthorsByEmailDomain`: for each email-based actor (no linked GitHub login), extract the domain from `node.author?.email`, increment the domain commit count, and add `email:<address>` to the domain author set (capped at 500); convert Maps to Records in the return value

- [x] T008 Run `npx vitest run lib/analyzer/analyze.test.ts` — all new-field tests must pass

**Checkpoint**: Analyzer populates all three new fields. User story implementation can now begin.

---

## Phase 3: User Story 1 — Per-Repo Corporate Metrics Table (Priority: P1) 🎯 MVP

**Goal**: A user types a company name into a single "Company" input; a per-repo table appears showing Corporate commits, Corporate authors, and Corporate % for each analyzed repo; clearing the field hides the table.

**Independent Test**: Enter 3+ repos, run analysis, type `microsoft` in the Company field; verify the per-repo table appears with non-blank values in all three columns; clear the field; verify the table disappears.

### TDD — Write failing tests first (§XI)

- [x] T009 [P] Write failing tests for `deriveCompanyInput` in `lib/corporate/derive-company-input.test.ts`: name-only input (`microsoft` → org `microsoft`, domain `microsoft.com`), domain input (`microsoft.com` → same), `.io` TLD (`hashicorp.io` → org `hashicorp`, domain `hashicorp.io`), `.org` TLD, mixed case, leading/trailing whitespace

- [x] T010 [P] Write failing tests for `computeCorporateMetrics` (per-repo portion) in `lib/corporate/compute-corporate-metrics.test.ts`: zero match (all repos return 0/0/0%), org-only signal match, email-only signal match, both signals combined, `'unavailable'` org data returns `'unavailable'` in all three corporate columns

- [x] T011 [P] Write failing component tests for `CorporateContributionPanel` in `components/contributors/CorporateContributionPanel.test.tsx`: empty input renders only the input (no table), typing a name renders per-repo table with "Corporate commits", "Corporate authors", "Corporate %" column headers, clearing input removes the table, `'unavailable'` data renders "—" (not "0"), `0` data renders `0` (not "—")

### Implementation

- [x] T012 [P] [US1] Implement `deriveCompanyInput` in `lib/corporate/derive-company-input.ts`: trim and lowercase input, strip known TLD suffixes (`.com`, `.io`, `.org`, `.net`, `.dev`) to derive `orgHandle`, append `.com` if no dot in input to derive `emailDomain`

- [x] T013 [P] [US1] Implement `computeCorporateMetrics` per-repo computation in `lib/corporate/compute-corporate-metrics.ts`: for each `AnalysisResult`, look up `contributorMetricsByWindow[windowDays]`, extract org commits (`commitCountsByExperimentalOrg[orgHandle]`), org authors (`commitAuthorsByExperimentalOrg[orgHandle]`), email commits (`commitCountsByEmailDomain[emailDomain]`), email authors (`commitAuthorsByEmailDomain[emailDomain]`), combine signals, compute `corporatePct` from `activityMetricsByWindow[windowDays].commits`; handle `'unavailable'` per data-model.md derivation rules; export `CorporateRepoMetrics[]` as `perRepo`

- [x] T014 [US1] Implement `CorporateContributionPanel` in `components/contributors/CorporateContributionPanel.tsx`: single `<input type="text">` labelled "Company" with placeholder `e.g. microsoft`; when empty renders nothing beyond the input; when non-empty calls `computeCorporateMetrics` and renders a per-repo table (columns: Repo, Corporate commits, Corporate authors, Corporate %); wrap entire section in the existing Experimental UI boundary with FR-013 caveat text covering the three known limitations (personal-email gap, private org-membership gap, dual-key double-count); accept `results` and `windowDays` props per `CorporateContributionPanelProps`

- [x] T015 [US1] Add `<CorporateContributionPanel results={results} windowDays={windowDays} />` at the top of the return in `components/contributors/ContributorsView.tsx`, passing the existing `results` prop and the existing `windowDays` state

- [x] T016 [US1] Run `npx vitest run lib/corporate/derive-company-input.test.ts lib/corporate/compute-corporate-metrics.test.ts components/contributors/CorporateContributionPanel.test.tsx` — all US1 tests must pass

**Checkpoint**: Per-repo corporate table is fully functional. US1 independently testable.

---

## Phase 4: User Story 2 — Summary Row (Priority: P2)

**Goal**: Below the per-repo table, a summary row shows total corporate commits across all repos, unique corporate author identities de-duplicated across all repos, and overall corporate %.

**Independent Test**: With a company name entered and at least one repo showing non-zero corporate data, the summary row appears with values consistent with the per-repo rows (manually sum corporate commits to verify; verify author count ≤ sum of per-repo author counts due to de-duplication).

### TDD — Write failing tests first (§XI)

- [x] T017 [P] [US2] Add failing summary computation tests to `lib/corporate/compute-corporate-metrics.test.ts`: summary de-duplication of actor keys across repos (same actor in two repos counts once), zero-match summary (all zeros), `overallCorporatePct` correct calculation, `'unavailable'` when no repo has available total-commit data

- [x] T018 [P] [US2] Add failing summary row render tests to `components/contributors/CorporateContributionPanel.test.tsx`: summary row appears below per-repo rows, displays correct totalCorporateCommits, totalCorporateAuthors, and overallCorporatePct values

### Implementation

- [x] T019 [US2] Extend `computeCorporateMetrics` in `lib/corporate/compute-corporate-metrics.ts` to compute `CorporateLensResult.summary`: `totalCorporateCommits` (sum of per-repo corporate commits where not `'unavailable'`), `totalCorporateAuthors` (size of union of all actor-key arrays across repos using full arrays from `commitAuthorsByExperimentalOrg` and `commitAuthorsByEmailDomain`), `overallCorporatePct` (totalCorporateCommits / sum of available totalCommits × 100, rounded to 1 dp; `'unavailable'` if no repo has available total-commit data)

- [x] T020 [US2] Add summary row to `CorporateContributionPanel.tsx` below the per-repo table rows, displaying `summary.totalCorporateCommits`, `summary.totalCorporateAuthors`, and `summary.overallCorporatePct` (formatting "—" for `'unavailable'`)

- [x] T021 [US2] Run `npx vitest run lib/corporate/compute-corporate-metrics.test.ts components/contributors/CorporateContributionPanel.test.tsx` — all summary tests must pass

**Checkpoint**: Summary row is fully functional. US1 and US2 both independently testable.

---

## Phase 5: User Story 3 — Window Selector Consistency (Priority: P3)

**Goal**: Changing the time-window selector (30d / 60d / 90d / 180d / 12m) while a company name is active updates all corporate metrics to reflect the selected window.

**Independent Test**: With a company name entered and 90d selected, switch to 30d; all three corporate columns update without clearing the company name or re-running analysis.

### TDD — Write failing tests first (§XI)

- [x] T022 [US3] Add failing window-change tests to `components/contributors/CorporateContributionPanel.test.tsx`: re-rendering the panel with a different `windowDays` prop value causes `computeCorporateMetrics` to be called with the new window and the table to display updated values

### Implementation / Verification

- [x] T023 [US3] Verify `computeCorporateMetrics` in `lib/corporate/compute-corporate-metrics.ts` passes `windowDays` directly into the `contributorMetricsByWindow[windowDays]` and `activityMetricsByWindow[windowDays]` lookups (no internal window state)

- [x] T024 [US3] Verify `components/contributors/ContributorsView.tsx` passes the controlled `windowDays` state value — which the existing window selector buttons update — as the `windowDays` prop to `CorporateContributionPanel`, so window changes automatically propagate

- [x] T025 [US3] Run `npx vitest run components/contributors/CorporateContributionPanel.test.tsx` — all window-change tests must pass

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T026 [P] Run full test suite: `npm test` — all tests must pass with no regressions

- [x] T027 [P] Run TypeScript type check: `npx tsc --noEmit` — no new type errors introduced

- [x] T028 [P] Run linter: `npm run lint` — no new lint errors

- [x] T029 Run production build: `npm run build` — build must succeed

- [x] T030 Manual verify: "—" is visually distinct from "0" in the corporate table (string literal `"—"` rendered as text, not a number zero)

- [x] T031 Manual verify: FR-013 caveat text is visible on the same surface as the corporate table (not hidden behind a tooltip, accordion, or collapsed section)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Baseline)**: No dependencies — run immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story phases
- **Phase 3 (US1)**: Depends on Phase 2 — creates all new source files; blocks US2/US3 only where they extend the same files
- **Phase 4 (US2)**: Depends on Phase 3 — extends `computeCorporateMetrics` and `CorporateContributionPanel`
- **Phase 5 (US3)**: Depends on Phase 3 — verifies prop plumbing already established in Phase 3
- **Phase 6 (Polish)**: Depends on Phases 3–5 completing

### Within Each Phase

- TDD tests MUST be written before implementation tasks in that phase; verify they fail first
- `deriveCompanyInput` (T012) and `computeCorporateMetrics` per-repo (T013) can run in parallel (different files)
- `CorporateContributionPanel` (T014) depends on both T012 and T013
- `ContributorsView` wiring (T015) depends on T014

### Parallel Opportunities

```bash
# Phase 2 — TDD tests first (single file), then parallel implementation:
# T003 and T004 affect the same file (analysis-result.ts) — run sequentially
# T006 and T007 affect the same function — run sequentially

# Phase 3 — parallel after tests:
T009  # derive-company-input.test.ts
T010  # compute-corporate-metrics.test.ts     } run in parallel
T011  # CorporateContributionPanel.test.tsx

T012  # derive-company-input.ts
T013  # compute-corporate-metrics.ts          } run in parallel after tests

# Phase 4 — parallel test additions, then sequential implementation:
T017  # add to compute-corporate-metrics.test.ts
T018  # add to CorporateContributionPanel.test.tsx  } run in parallel
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Phase 1: Baseline
2. Phase 2: Foundational (type extension + analyzer — BLOCKS all stories)
3. Phase 3: US1 (per-repo table) — **STOP and VALIDATE** independently
4. Ship MVP: users can already see per-repo corporate data

### Full Feature (Incremental)

1. Phase 1 + Phase 2 → foundation ready
2. Phase 3 (US1) → per-repo table — demo-able
3. Phase 4 (US2) → add summary row — full table complete
4. Phase 5 (US3) → confirm window consistency — verified correctness
5. Phase 6 → polish, full CI pass, PR ready

---

## Notes

- `[P]` tasks = different files, no incomplete dependencies — safe to run in parallel
- `[US1/US2/US3]` labels map each task to the user story it delivers
- Constitution §XI: every phase begins with failing tests; implement only until tests pass
- `'unavailable'` must never be coerced to `0` — the spec (§II accuracy) treats them as distinct states
- Actor key cap of 500 (Decision 7 in research.md) applies only to the author-key arrays, not to commit counts
- Total task count: **31** (T001–T031)
