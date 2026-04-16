# Phase 0 Research: Why the FR-016a test was skipped

## Scope

Determine the concrete reason the test at `components/shared/hooks/useOrgAggregation.test.tsx:45` is `it.skip(...)` and decide on a fix strategy that (a) needs no production-code change, (b) is not flaky, and (c) actually asserts the FR-016a contract. Resolve all `NEEDS CLARIFICATION` markers from the plan (none remain after this research).

## R1 — Root cause of the skip: overlapping async `act` with a never-resolving `start` call

**Current test shape** (simplified):

```ts
const startPromise = act(async () => {
  await result.current.start({ org: 'test', repos: ['o/a', 'o/b'], concurrency: 1 })
})

await waitFor(() => expect(deferred.length).toBe(1))
expect(result.current.view?.perRepoStatusList[0]?.status).toBe('in-progress')
expect(result.current.view?.perRepoStatusList[1]?.status).toBe('queued')

await act(async () => { deferred[0]!({ kind: 'ok', result: stub('o/a') }) })
await waitFor(() => expect(deferred.length).toBe(2))
await act(async () => { deferred[1]!({ kind: 'ok', result: stub('o/b') }) })
await startPromise
```

**Why this is unreliable**

1. `start()` awaits `queue.run()`, which only resolves on the `complete` event — i.e. after *all* repos are terminal. Until both deferreds are resolved, `start()` does not return.
2. Therefore the outer `act(async () => { await start(...) })` *cannot complete* at the moment the assertions run. It is a *pending async act scope*.
3. The subsequent `waitFor(...)` and `await act(...)` calls execute while the outer act scope is still pending. React Testing Library explicitly warns against overlapping / nested `act` scopes; the behavior in this regime is not contractually specified and in practice causes `act() ... was not wrapped in act(...)` warnings *or* missed flushes of reducer updates.
4. Intermediate assertions — `expect(perRepoStatusList[0]?.status).toBe('in-progress')` — are raw `expect` calls, not wrapped in `waitFor`. They run at whatever instant `waitFor(deferred.length === 1)` returned, which is not guaranteed to be after React has committed the `started` event's reducer update. Even if the `started` event fires synchronously inside `queue.dispatchOne()`, `useReducer` schedules the re-render; the `result.current.view` snapshot won't reflect it until after React's commit phase flushes.

This matches the skip timing: the test was introduced in commit `46fac97` (#212 US1) alongside the hook itself, and was skipped in the same commit — the author noted it was racy and deferred the fix rather than block US1.

**Decision**: Fix the test by (a) *not* wrapping `start()` in an outer pending `act`, (b) using `waitFor(...)` around every post-state assertion rather than bare `expect`, and (c) wrapping each deferred-resolution in a short `act(async () => { ... })` that flushes microtasks before the next `waitFor`.

**Rationale**: This is the textbook RTL pattern for long-running async operations whose completion we don't want to await before inspecting intermediate state. The two non-skipped tests in the same file work only because their `dispatch` stubs settle synchronously; they don't exercise the nested-act hazard.

**Alternatives considered**:

- *Expose an imperative "step" API on the hook for tests.* Rejected — production-code change, violates FR-002 and YAGNI.
- *Test the behavior at the view-model layer instead (no React).* `lib/org-aggregation/view-model.test.ts:95` already covers `perRepoStatusList` status values from a run snapshot. That test covers view-model projection but not the queue→reducer→view-model integration that FR-016a claims. Removing the React-level test would leave the integration untested. Rejected unless the React-level fix turns out to be impossible.
- *Use Vitest fake timers.* Not needed — the deferred-promise pattern is already synchronous-enough; timing is the symptom, not the underlying delay.
- *Use `flushSync` / `renderHook`'s `rerender`.* Unnecessary complexity; `waitFor` already encapsulates the polling semantics we need.

## R2 — The `updateCadence` default does NOT gate per-repo status visibility

**Question**: Could `ORG_AGGREGATION_CONFIG.updateCadenceDefault` (`{ kind: 'every-n-percent', percentStep: 10 }`) suppress the view-model update between "first started" and "first done"?

**Finding**: No, but the mechanism is worth understanding to rule it out definitively.

- The hook's reducer updates `run.perRepo` on every queue event (including `started`). `useReducer` returns a new state reference on each mutation; this by itself invalidates the `view` memo because its dep array is `[run, tick]`.
- `tick` is a separate `useState` counter that bumps only on `done`/`failed`/`complete`/`cancelled` events (subject to cadence gating) and on the 1 s wall-clock interval.
- Therefore even with `every-n-percent` / `percentStep: 10` and 2 repos (10% step = every 0.2 completions, so every completion qualifies anyway), the `started` event already triggers a reducer update → new `run` reference → new view. Cadence cannot hide the intermediate `in-progress` state.

**Decision**: Do *not* pass an explicit `updateCadence` override in the test. The production default is correct. If a future refactor decouples the reducer update from the re-render (e.g. switching to `useRef` + explicit tick), this assumption breaks — a comment on the test documents that cadence is intentionally left default.

**Rationale**: Passing an override would (a) test a non-default code path and (b) hide any regression that accidentally moved `run` into a ref. Default cadence = closer to production reality.

**Alternatives considered**:

- *Pass `updateCadence: { kind: 'per-completion' }` for maximum tick frequency.* Rejected per above: cadence doesn't gate `started`, and overriding it masks regressions.

## R3 — Alphabetical sort of `perRepoStatusList` is safe for `['o/a', 'o/b']`

**Finding**: `buildOrgSummaryViewModel` sorts `perRepoStatusList` alphabetically by repo name (view-model.ts:176, case-insensitive). For input `['o/a', 'o/b']`, alphabetical order equals input order, so `perRepoStatusList[0]` refers to `o/a` (the one dispatched first under `concurrency: 1`) and `[1]` refers to `o/b` (the queued one). The existing test relies on this; no change needed.

**Decision**: Keep index-based assertions `[0]` / `[1]`. Add a comment noting the sort order in case someone later changes repo names.

**Rationale**: Index access is terser than `find`. With a two-element input where sort order = input order by construction, it is not fragile.

## R4 — Deferred-promise resolution order inside `await act(async () => resolve(...))`

**Question**: When `deferred[0]!({ kind: 'ok', ... })` runs inside `act`, does the `.then(handleResult)` chain fire and a new `dispatchOne` enqueue `deferred[1]` before `act` returns?

**Finding**: Yes, as long as the act callback yields microtasks. `resolve(value)` synchronously marks the promise fulfilled, then queues its `.then` handlers as microtasks. `await act(async () => { deferred[0]!(...) })` awaits the inner async arrow — which has no explicit `await` — so the arrow resolves immediately, and `act`'s teardown then flushes pending microtasks and committed state updates. The `.then(handleResult)` runs, emits `done`, calls `tryDispatch` which synchronously calls the next `dispatchOne`, which synchronously calls the test's `dispatch` stub, which pushes `deferred[1]`.

**Risk**: If `handleResult` itself adds another `await`/microtask boundary, `act` may need an explicit `await Promise.resolve()` inside to complete the chain. Inspecting `queue.ts:handleResult` confirms no `await` is involved — it is fully synchronous through to the next `dispatch()` call. So a bare `await act(async () => { deferred[0]!(...) })` is sufficient.

**Decision**: No extra microtask flushes in the test.

**Rationale**: Minimum needed. Adding `await Promise.resolve()` where unnecessary is noise that tempts future changes.

## R5 — 20× flake loop target (SC-002)

**Question**: Is 20× consecutive runs the right flake detection bar?

**Finding**: For an operation that would fail at ~5% flake rate, 20 consecutive passes gives a ~36% chance of catching it; at ~10% flake rate, ~88%. The bar is pragmatic — a true 1% flake won't be caught by 20× but also won't be routinely disruptive. For a hard flake (e.g. a missing `await`), 20× catches it ~100% of the time.

**Decision**: Keep 20× as the bar in SC-002. Document it in `quickstart.md` so reviewers can re-run it themselves.

**Rationale**: The original skip was put in because the test was *reliably* failing / warning, not because it flaked rarely. 20× is enough to distinguish "genuinely fixed" from "still broken most of the time."

## Summary of decisions

| # | Decision | Blocks |
|---|----------|--------|
| R1 | Restructure the test: don't wrap `start()` in an outer pending `act`; use `waitFor` around every post-state assertion; flush microtasks inside each deferred-resolution `act`. | tasks.md T003 |
| R2 | Keep default `updateCadence`; do not pass an override. Add a one-line comment. | tasks.md T003 |
| R3 | Keep index-based `perRepoStatusList[0/1]` assertions; note alphabetical sort in a comment. | tasks.md T003 |
| R4 | No extra `await Promise.resolve()` needed inside the deferred-resolution `act`s. | tasks.md T003 |
| R5 | Confirm no flakes with 20 consecutive runs; document the loop command in `quickstart.md`. | tasks.md T004 |

No `NEEDS CLARIFICATION` markers remain.
