# Feature Specification: Unskip the FR-016a "live per-repo status list" test

**Feature Branch**: `264-investigate-skipped-test-per-repo-status`
**Created**: 2026-04-16
**Status**: Draft
**Related issue**: #264
**Input**: Investigate and resolve the skipped test `per-repo status list updates live as repos complete (FR-016a)` in `components/shared/hooks/useOrgAggregation.test.tsx` (line 45). It has been marked `it.skip(...)` since commit `46fac97` (#212 US1 React layer). Determine why it was skipped, either fix it or document why it cannot be reliably tested, and remove the `it.skip` once resolved. Prefer a test-side fix; do not change unrelated tests; do not introduce new dependencies.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Restore live-status regression coverage (Priority: P1)

As a RepoPulse maintainer working on the org-aggregation surface, I need the automated test suite to actually exercise the "per-repo status list updates live as repos complete" behavior, not silently skip it. Today the `useOrgAggregation` hook ships the FR-016a behavior (live per-repo status transitions from `queued` → `in-progress` → `done`) but no test actually runs — the one that would catch a regression has been `it.skip(...)` since it landed. That means a breaking change to `OrgAggregationQueue` event ordering, the `perRepo` reducer mutation, or the `perRepoStatusList` view-model projection would not fail CI. The failing-repo and end-state tests around it don't cover the *intermediate* states, so a regression in the live path would be invisible until a human noticed it in the UI.

**Why this priority**: FR-016a is a user-visible behavior (the maintainer watches a list update row-by-row while a run is in progress). Losing test coverage for it is the whole reason issue #264 was filed. This is the only user story the issue calls out.

**Independent Test**: After the change, `npm test components/shared/hooks/useOrgAggregation.test.tsx` runs the FR-016a test (not skipped), the test passes on a clean checkout, and re-running it N times in a row does not produce a flake.

**Acceptance Scenarios**:

1. **Given** a clean checkout on this branch, **When** a maintainer runs `npm test components/shared/hooks/useOrgAggregation.test.tsx`, **Then** the test named `per-repo status list updates live as repos complete (FR-016a)` executes (is not reported as skipped) and passes.
2. **Given** the test is now live, **When** a developer regresses `useOrgAggregation` such that `perRepoStatusList` does *not* reflect a repo's `in-progress` state while another is still `queued` under `concurrency: 1`, **Then** the test fails with an assertion error that identifies the regression.
3. **Given** the test is now live, **When** the test is run 20 times in sequence (`for i in $(seq 1 20); do npm test -- components/shared/hooks/useOrgAggregation.test.tsx || break; done`), **Then** it passes every run with no intermittent failures caused by `act()` / deferred-promise timing.

---

### Edge Cases

- **Test proves un-salvageable**: If after investigation the test cannot be made reliable without changing `useOrgAggregation` production behavior in ways that violate the "out of scope" guard in issue #264, the test MUST be removed (not left as `it.skip`). The removal PR MUST state why in-code and in the PR body, and FR-016a coverage MUST either be re-asserted by an adjacent test (e.g., asserting the `apply('started')` path on the reducer directly, bypassing `act()` timing) or explicitly declared un-covered with a one-line rationale. A perpetually-skipped test is not an acceptable outcome — that is what #264 exists to eliminate.
- **Cadence interaction**: The default `updateCadence` is a tick-every-N-completions gate in `useOrgAggregation`. The skipped test uses `concurrency: 1` and inspects state between the first and second completion, so cadence gating could legitimately mask the intermediate state depending on the default config. The fix MUST account for this — either pass an explicit `updateCadence: { kind: 'per-completion' }` option, or assert on state that is not cadence-gated.
- **Snapshotting vs. promise flush**: The test resolves deferred promises inside `act(async () => { ... })` then reads `result.current.view?.perRepoStatusList`. If the reducer update and the view-model memoization do not both flush inside that `act`, the intermediate assertion can read stale state. The fix MUST ensure assertions only run after React has committed the relevant state update (e.g., via `waitFor` on the specific field being asserted, not on a sibling).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The test `per-repo status list updates live as repos complete (FR-016a)` in `components/shared/hooks/useOrgAggregation.test.tsx` MUST NOT be `it.skip(...)` on the merged branch. It is either `it(...)` and passing, or it is deleted with written justification in the same PR.
- **FR-002**: If the test is fixed, the fix MUST be a test-side change wherever possible — adjusting `act()` boundaries, using `waitFor(...)` around the specific assertion, passing an explicit `updateCadence` option to the hook, or restructuring the deferred-promise flow. A change to `useOrgAggregation.ts` is permitted only when the test cannot be made reliable without it, and any such change MUST be minimal and justified in the PR description.
- **FR-003**: The test, when fixed, MUST assert the specific FR-016a contract: that `perRepoStatusList` contains an `in-progress` entry for the currently-executing repo and a `queued` entry for the not-yet-started repo at the moment between "first repo dispatched" and "first repo resolved", given `concurrency: 1`.
- **FR-004**: The fix MUST NOT introduce new runtime or test dependencies. No new packages in `package.json`.
- **FR-005**: The fix MUST NOT change any other test in `useOrgAggregation.test.tsx` or any other test file. The two existing `it(...)` blocks in that file stay green without modification.
- **FR-006**: The fix MUST NOT break `npm run lint`, `npm run build`, or `npm test` on the whole repo. A full `npm test` after the change passes.
- **FR-007**: If FR-001's "delete with justification" path is taken, the deleted test's replacement coverage (or explicit uncovered declaration) MUST be stated in the PR body's `## Test plan` section, not only in code.

### Key Entities

This feature has no new data model. The entities it reasons about already exist:

- **`useOrgAggregation` hook** (`components/shared/hooks/useOrgAggregation.ts`): the React hook under test; owns the reducer that projects queue events onto `perRepo` state, and the view-model memo that derives `perRepoStatusList`.
- **`OrgAggregationQueue`** (`lib/org-aggregation/queue.ts`): emits `started` / `done` / `failed` / `queued` / `complete` events consumed by the hook's `applyEvent` callback.
- **`OrgSummaryViewModel.perRepoStatusList`** (`lib/org-aggregation/types.ts`): the view-model array the test asserts against; each entry carries a `status` field with values `queued | in-progress | done | failed`.
- **The test itself** (`components/shared/hooks/useOrgAggregation.test.tsx` line 45): the `it.skip(...)` block that must either become a passing `it(...)` or be removed with justification.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After this change, running `npm test components/shared/hooks/useOrgAggregation.test.tsx` reports zero skipped tests in that file (where there is currently one).
- **SC-002**: Running the FR-016a test 20 consecutive times in a tight loop produces 20 passes and 0 flakes on the maintainer's machine.
- **SC-003**: A deliberate regression injected into `useOrgAggregation` — for example, short-circuiting the `started` event so `perRepoStatusList` skips `in-progress` and goes straight from `queued` to `done` — causes the now-live FR-016a test to fail with an actionable assertion, where before it would have been silently skipped.
- **SC-004**: The full repo test suite (`npm test`), lint (`npm run lint`), and build (`npm run build`) remain green.

## Assumptions

- The behavior under test (`perRepoStatusList` updates live as each repo transitions) is already implemented correctly in `useOrgAggregation` and `OrgAggregationQueue`. Issue #264 is explicitly about *test* restoration, not a production-code bug. The investigation may show this assumption is wrong; if so, the PR will call that out and scope accordingly.
- The skip was added because of `act()` / deferred-promise timing in React Testing Library's `renderHook`, not because the behavior is impossible to test. The two adjacent non-skipped tests in the same file (end-state and failed-repo) already prove the hook is testable in principle; what's hard is asserting *intermediate* state between two `act` boundaries.
- The default `updateCadence` config is not the root cause of the skip: even if cadence gates tick re-renders, `perRepoStatusList` derives from `run.perRepo` which is reducer-driven and updates on every event. But it is a plausible contributing factor and the fix should eliminate it as a variable (e.g., by passing `updateCadence: { kind: 'per-completion' }` explicitly in the test).
- No production behavior change is expected. If one is required, the PR will justify it in prose before listing the diff.
- Issue #264 is scoped to this one skipped test. Any other `it.skip` / `describe.skip` in the repo is out of scope for this PR.
