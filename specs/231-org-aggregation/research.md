# Phase 0 Research: Org-Level Aggregation

Each item below is a small bounded design decision needed before implementation. None block; each has a clear leading option, recorded as the Decision.

---

## R1. Queue / concurrency limiter

**Decision**: In-house Promise-based concurrency limiter (~30 LOC) in `lib/org-aggregation/queue.ts`. No new npm dependency.

**Rationale**: The queue's behavior is custom — pause on rate-limit, re-queue rate-limited in-flight requests, halve concurrency on secondary-limit resume, expose granular events (`queued`, `started`, `done`, `failed`, `paused`, `resumed`, `cancelled`) to drive React UI. Building on a generic dep like `p-limit` or `p-queue` saves ~30 lines of mechanism but pays for it in adapter code, and locks us to that dep's events. Per constitution §IX (YAGNI / Keep It Simple), the smallest implementation that satisfies the spec wins.

**Alternatives considered**:
- `p-limit` — too thin (just `(fn) => Promise<T>`); we'd need a wrapper anyway for the FSM and events.
- `p-queue` — richer (priority, pause, concurrency mutation), but its pause-on-rate-limit semantics don't match GitHub's reset-time model; we'd be overriding most of it.
- Web Workers — overkill; aggregation is fast enough on the main thread (target <100ms for N=200).

---

## R2. Browser Notification API permission flow (FR-018)

**Decision**: When the user toggles the "notify me on completion" switch on for the first time, call `Notification.requestPermission()`. Persist the resulting permission state in component state for the session (no localStorage — constitution §III.4 prohibits persistent token-adjacent state, and we treat the permission preference as session-only for symmetry with the OAuth token). If the user denies, the toggle visually reflects "denied — re-enable in browser settings" and is not re-prompted automatically. The completion notification fires exactly once on terminal run completion (success, failure, or cancelled) using `new Notification(title, { body, icon })`.

**Rationale**: `Notification.requestPermission()` is a one-time gate per origin per browser session. Re-prompting is impossible by browser design; the right UX is to surface the denied state honestly (per constitution §II — never hide data). Session-only memory of the toggle preference matches the rest of the app's stateless posture.

**Alternatives considered**:
- Auto-request permission on the warning dialog — violates the "ask only when needed" UX heuristic and surprises the user.
- Persist toggle preference in localStorage — adds persistent state for a minor convenience; not worth the constitution drift.

---

## R3. Wall-clock progress tick (FR-017d)

**Decision**: `setInterval(tick, 1000)` for the elapsed/remaining timer and quote rotation gating. Cleared on terminal completion or unmount. The progress bar itself is a derived value of `succeeded + failed` over `total`, recomputed on both queue events and the wall-clock tick.

**Rationale**: 1Hz is the right cadence for human perception of "still alive" and matches FR-017d's "at least once per second" requirement. `requestAnimationFrame` runs at 60Hz when the tab is foregrounded but throttles to ~1Hz when backgrounded — losing the very property we want (background tabs should still feel alive when the user returns). `setInterval` is consistent across foreground/background.

**Alternatives considered**:
- `requestAnimationFrame` — wrong throttling behavior in backgrounded tabs.
- `setTimeout` chain — equivalent to `setInterval` but harder to clean up.

---

## R4. Rate-limit detection from response headers (FR-032b)

**Decision**: A repo's analysis is rate-limited if the response is HTTP 403 or 429 AND one of:
- **Primary**: `x-ratelimit-remaining: 0` is present → resume time is `x-ratelimit-reset` (Unix timestamp in seconds).
- **Secondary**: `Retry-After` header is present → resume time is `now + Retry-After` (seconds).

If neither header is present, classify as a generic failure (not rate-limit). The detection function is pure: takes a `Response`-like input, returns `{ kind: 'primary' | 'secondary' | 'none', resumesAt?: Date }`.

**Rationale**: GitHub documents both signals at https://docs.github.com/en/rest/overview/rate-limits-for-the-rest-api. The GraphQL endpoint emits the same `x-ratelimit-*` headers as REST. Using header-driven classification (not status-code-only) avoids confusing a generic 403 (e.g. private repo without scope) with a rate-limit pause.

**Alternatives considered**:
- Status code only — conflates scope errors with rate-limit (both 403); causes bad pauses.
- Always treat 403/429 as primary — wrong for secondary, where reset is `Retry-After` not `x-ratelimit-reset`.

---

## R5. Pinned items GraphQL query (FR-011a)

**Decision**: Wrap this query in `app/api/org/pinned/route.ts`:

```graphql
query OrgPinnedRepos($login: String!) {
  organization(login: $login) {
    pinnedItems(first: 6, types: [REPOSITORY]) {
      nodes {
        ... on Repository {
          owner { login }
          name
          stargazerCount
        }
      }
    }
  }
}
```

Response normalized to `{ pinned: Array<{ owner, name, stars }> }`. Empty array if the org pins nothing or pins only gists.

**Rationale**: `Organization.pinnedItems` is the documented GraphQL surface for the org-profile pinned repos. `first: 6` matches the GitHub UI cap. `types: [REPOSITORY]` filters out gists at the API layer (no client-side filtering needed). Single GraphQL request per run — negligible rate-budget impact.

**Alternatives considered**:
- REST `/orgs/:org/pinned` — does not exist; pinned items are GraphQL-only.
- Scrape the org profile HTML — fragile; constitution §III.1 mandates GraphQL primary source.

---

## R6. Volume-weighted median (FR-021)

**Decision**: Algorithm:

```
input: pairs = [(value_i, weight_i), ...] where weight_i > 0
1. discard pairs where value_i is `unavailable`
2. if empty after step 1, return `unavailable`
3. sort by value_i ascending
4. total = sum(weight_i)
5. accumulate weights from low value upward
6. return value_i where cumulative weight first crosses total / 2
```

Worked example: pairs `[(2h, 100), (4h, 200), (6h, 50)]`, total = 350, half = 175. Cumulative: 100, 300. 300 ≥ 175 at the second pair → median = 4h.

**Rationale**: This is the textbook weighted-median algorithm. The example is included so reviewers and future maintainers can sanity-check the implementation against the documented behavior.

**Alternatives considered**:
- Mean (volume-weighted average) — the spec says median, not mean; medians are robust to outliers (a single repo with very long response times shouldn't dominate).
- Per-repo median averaged — loses the volume weighting that the spec asks for.

---

## R7. Concurrency adaptive backoff reset (FR-003e)

**Decision**: When a secondary rate limit is hit and the queue auto-resumes with halved concurrency, that halved value persists for the *remainder of the current run*. If the user cancels and starts a new run, the new run begins at the user-chosen concurrency (not the backed-off value). The run-status header shows both the user-chosen value and the current effective value when they differ (e.g. "concurrency: 3 (reduced to 1 after rate-limit pause)").

**Rationale**: The user picks concurrency for the run; a transient rate-limit shouldn't permanently change their preference. Showing both numbers honors constitution §II (surface, don't hide).

**Alternatives considered**:
- Restore concurrency on every successful chunk after a backoff — risks oscillating into the rate limit again.
- Persist the backed-off value across runs — surprising and not requested.

---

## R8. Empty-state placeholder vs. skeleton loaders (FR-034)

**Decision**: When zero repos have completed, each panel renders a small dashed-border box with the explicit text "Waiting for first result" and an unfilled outline of the metric icon. No numeric placeholders ("0 stars"), no shimmer/skeleton bars (which can be mistaken for arriving data). The run-status header simultaneously shows "0 of N completed" so the user has a single source of truth for "no progress yet" vs. "waiting on rendering."

**Rationale**: Skeleton loaders are appropriate when content is *about* to arrive in milliseconds; for a run that may take minutes, they imply the wrong cadence. Explicit empty-state text removes ambiguity.

**Alternatives considered**:
- Hide panels until they have data — harder to scan; user can't tell which panels exist until they fill.
- Render with `unavailable` styling — wrong; `unavailable` means "this signal will never arrive for these repos," not "results haven't arrived yet."
