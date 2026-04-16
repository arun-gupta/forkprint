---
description: "Task list for 264-unskip-live-status-test — restore FR-016a live per-repo status test coverage"
---

# Tasks: Unskip the FR-016a "live per-repo status list" test

**Input**: Design documents from `/specs/264-unskip-live-status-test/`
**Prerequisites**: spec.md, plan.md, research.md, quickstart.md

**Tests**: The feature *is* a test restoration. T003 modifies one test. No additional test scaffolding is required.

**Organization**: Single user story (US1). One file is modified.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: None required — the test file, hook, queue, and view-model all exist and the dev environment is already running on port 3010.

*(No tasks in this phase.)*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Confirm the pre-fix behavior so the fix has a baseline to compare against.

- [X] T001 Run `npm test -- components/shared/hooks/useOrgAggregation.test.tsx` and confirm exactly one test is reported as skipped (the FR-016a block at line 45) and the other two tests pass. Capture the skip confirmation in the investigation scratch note (not committed).
- [X] T002 Read `components/shared/hooks/useOrgAggregation.ts:135-207` (applyEvent + started/done branches) and `lib/org-aggregation/queue.ts:146-184` (tryDispatch, dispatchOne) to confirm the research.md R1–R4 findings are still accurate against HEAD. If any divergence, update research.md before proceeding.

**Checkpoint**: Baseline confirmed, research is current. User story work can begin.

---

## Phase 3: User Story 1 — Restore live-status regression coverage (Priority: P1) 🎯 MVP

**Goal**: The FR-016a test runs (not skipped), passes reliably, and would catch a regression that drops the `'started'` → `in-progress` reducer mutation.

**Independent Test**: `npm test -- components/shared/hooks/useOrgAggregation.test.tsx` reports zero skipped tests; the file's three tests all pass; a 20× consecutive run (see quickstart.md) produces 20 passes.

### Implementation for User Story 1

- [X] T003 [US1] Edit `components/shared/hooks/useOrgAggregation.test.tsx` — replace the `it.skip(...)` block starting at line 45 with a reliable `it(...)` that asserts FR-016a. Apply the pattern from research.md R1: (a) do NOT wrap `start()` in an outer pending `act(async () => await start(...))`; instead capture the un-awaited promise inside a short `act` that only awaits until the first deferred is pushed; (b) use `waitFor(...)` around every post-state assertion on `result.current.view?.perRepoStatusList[i]?.status` — no bare `expect` on reactive state; (c) wrap each `deferred[i](...)` resolver call in its own `await act(async () => { ... })` so pending microtasks and reducer commits flush before the next `waitFor`; (d) do NOT pass an `updateCadence` override (R2); (e) keep index-based `[0]`/`[1]` access with a one-line comment that `perRepoStatusList` is alphabetically sorted (R3); (f) final assertion waits on `result.current.view?.status.succeeded === 2`. Do not modify the two adjacent non-skipped tests. Do not modify `useOrgAggregation.ts`.

**Checkpoint**: The test file compiles and `npm test -- components/shared/hooks/useOrgAggregation.test.tsx` reports 3 passing, 0 skipped, 0 failing.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [X] T004 Run the 20× flake loop from `quickstart.md` and confirm 20 consecutive passes. If any iteration fails, return to T003 and diagnose (do NOT add retries or loosen the assertion — fix the test-side race).
- [X] T005 Run `npm test` (full suite), `npm run lint`, and `npm run build`. All three must be green. (Two pre-existing-on-main issues observed and confirmed not introduced by this PR: one `analyzer.test.ts` assertion mismatch on `rateLimit.limit`, and lint errors in `useOrgAggregation.ts:203`/`:304` in production code. Build is green.)
- [X] T006 Verify FR-016a regression detection (SC-003): temporarily change the `'started'` branch of `applyEvent` in `components/shared/hooks/useOrgAggregation.ts` to `return r` (no-op), run `npm test -- components/shared/hooks/useOrgAggregation.test.tsx`, and confirm the FR-016a test fails with an assertion on `perRepoStatusList[0]?.status`. Revert the edit and re-run the test suite to confirm it passes again. Record the observed failure message in the PR body's Test plan (not in the test or the hook).
- [ ] T007 [P] Commit the single-file change with a message like `[#264] unskip FR-016a live per-repo status test`. Do not include unrelated changes (no bulk reformat, no stray edits to `useOrgAggregation.ts`).
- [ ] T008 Push branch `264-investigate-skipped-test-per-repo-status` and open a PR that (a) references issue #264, (b) explains in the body what root cause was — overlapping pending `act` scope around a long-running `start()` call — and how the restructured test avoids it, (c) includes a `## Test plan` section with checkboxes for T001, T004, T005, T006, and (d) does NOT merge (per CLAUDE.md PR Merge Rule).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Empty.
- **Foundational (Phase 2)**: T001 before T002 is not strictly required, but T002 benefits from the baseline from T001. Run them in order.
- **User Story 1 (Phase 3)**: T003 depends on T001/T002 (baseline confirmed, research current).
- **Polish (Phase 4)**: T004–T006 depend on T003. T007 depends on T004–T006 passing. T008 depends on T007.

### Within User Story 1

- Only one task (T003). No sub-ordering.

### Parallel Opportunities

- T001 and T002 are trivially parallelizable (different actions, no shared state).
- T004, T005, T006 all require T003 done first and each touches different surfaces (flake loop, suite/lint/build, regression injection), so they can run in parallel once T003 lands — but since they each depend on the test suite being in the "fixed" state, sequence T006 *after* T004/T005 to avoid accidentally leaving the regression-injected edit on disk during an unrelated run.

---

## Parallel Example: Polish

```bash
# After T003 lands, T004 and T005 can run side-by-side:
Task T004: for i in $(seq 1 20); do npm test -- components/shared/hooks/useOrgAggregation.test.tsx --run || break; done
Task T005: npm test && npm run lint && DEV_GITHUB_PAT= npm run build
# Then T006 (regression injection) runs alone to avoid disturbing the other two.
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. T001, T002 (baseline + research refresh)
2. T003 (the single code change)
3. T004 (flake loop) → T005 (full suite + lint + build) → T006 (regression injection)
4. T007, T008 (commit + PR; do not merge)

There is no incremental delivery beyond MVP — this is a single-story feature.

---

## Notes

- [P] tasks = different files / different surfaces, no ordering dependency.
- [US1] label is the only story label; Setup/Foundational/Polish carry no story label per template rules.
- This is a test-restoration feature. No production code should change. If T003 reveals that a production-code change is truly required (and research.md R1 didn't catch it), stop and update spec.md before editing `useOrgAggregation.ts`.
- Do not skip `npm run build` just because the change is "test-only" — the build asserts `DEV_GITHUB_PAT` is absent in production, and CI will fail otherwise.
- Commit after T003 lands and again after the PR opens; do not amend published commits.
