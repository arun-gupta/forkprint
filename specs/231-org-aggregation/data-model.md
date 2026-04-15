# Data Model: Org-Level Aggregation

All entities are **in-browser, ephemeral**. Nothing is persisted server-side (constitution §I).

---

## OrgAggregationRun

The top-level value type representing a single user-initiated multi-repo analysis.

```ts
interface OrgAggregationRun {
  org: string                                  // org login, e.g. "konveyor"
  repos: string[]                              // [owner/repo, ...] — selected after pre-filters
  concurrency: number                          // user-chosen value (1..10), see config
  effectiveConcurrency: number                 // current value after any FR-003e backoff
  updateCadence: UpdateCadence                 // FR-016a
  startedAt: Date
  status: RunStatus
  perRepo: Map<string, RepoRunState>           // keyed by "owner/repo"
  pauseHistory: RateLimitPause[]               // every primary/secondary pause this run
  notificationOptIn: boolean                   // FR-018
  flagshipRepos: FlagshipMarker[]              // resolved once before queue starts
}

type RunStatus =
  | 'pre-run'        // warning dialog open, queue not started
  | 'in-progress'    // queue dispatching
  | 'paused'         // FR-032 rate-limit pause; pauseHistory[last] holds details
  | 'cancelled'      // FR-031
  | 'complete'       // every repo is `done` or `failed`

type UpdateCadence =
  | { kind: 'per-completion' }                       // default
  | { kind: 'every-n-completions'; n: number }
  | { kind: 'on-completion-only' }
```

### State transitions for `RunStatus`

```
pre-run → in-progress              (user confirms warning dialog)
pre-run → cancelled                (user cancels in warning dialog)
in-progress → paused               (rate-limit detected by any in-flight call)
paused → in-progress               (auto-resume at reset time)
paused → cancelled                 (user cancels during pause)
in-progress → cancelled            (user cancels mid-run)
in-progress → complete             (last in-progress repo settles)
```

`complete` and `cancelled` are terminal. The notification (FR-018) fires on either terminal transition.

---

## RepoRunState

Per-repo state, keyed by `"owner/repo"` in `OrgAggregationRun.perRepo`.

```ts
interface RepoRunState {
  repo: string                                 // "owner/repo"
  status: RepoStatus
  result?: AnalysisResult                      // present iff status === 'done'
  error?: RepoError                            // present iff status === 'failed'
  startedAt?: Date                             // when first dispatched
  finishedAt?: Date                            // when status reached 'done' or 'failed'
}

type RepoStatus = 'queued' | 'in-progress' | 'done' | 'failed'

interface RepoError {
  reason: string                               // human-readable, surfaced to user
  kind: RepoErrorKind                          // for filtering / iconography
}

type RepoErrorKind =
  | 'rate-limit-primary'                       // re-queued by FR-032c, never user-visible as failure
  | 'rate-limit-secondary'                     // same
  | 'scope'                                    // OAuth scope insufficient for repo (e.g. private)
  | 'not-found'                                // 404
  | 'transient'                                // 5xx, network — eligible for one auto-retry
  | 'other'                                    // anything else
```

### State transitions for `RepoStatus`

```
queued → in-progress               (queue dispatches it)
in-progress → done                 (analysis succeeds)
in-progress → failed               (any non-rate-limit error)
in-progress → queued               (rate-limit response; FR-032c re-queue)
failed → in-progress               (user clicks Retry per FR-035)
done → done                        (terminal)
failed → failed                    (terminal unless retried)
```

A `RepoError` with `kind: 'rate-limit-primary' | 'rate-limit-secondary'` is **transient** — the entry is moved back to `queued` rather than counted as a failure (FR-032c). The error is recorded only for the duration of the in-flight call; once re-queued, the error field is cleared.

---

## RateLimitPause

One entry per pause cycle in `pauseHistory`.

```ts
interface RateLimitPause {
  kind: 'primary' | 'secondary'
  detectedAt: Date
  resumesAt: Date                              // primary: x-ratelimit-reset; secondary: now + Retry-After
  reposReDispatched: string[]                  // repos returned to queued state for re-run
  appliedConcurrencyAfterResume: number        // FR-003e — halved for secondary, unchanged for primary
}
```

`pauseHistory.length` is the "pauses so far: K" counter shown in the run-status header (FR-032g).

---

## FlagshipMarker

Resolved once at run start by calling `GET /api/org/pinned?org=<slug>` and intersecting with `repos`.

```ts
interface FlagshipMarker {
  repo: string                                 // "owner/repo"
  source: 'pinned' | 'fallback-most-stars' | 'none'
  rank?: number                                // 0..5 for 'pinned' (preserves pin order); undefined otherwise
}
```

If `Organization.pinnedItems` returns nothing, exactly one `FlagshipMarker` with `source: 'fallback-most-stars'` is created from the highest-star repo in `repos`. If every repo's `stars` is `unavailable`, no `FlagshipMarker` is created and dependent panels report "no flagship repo identified" (FR-011a.d).

---

## RunStatusHeader (derived)

A pure projection of `OrgAggregationRun` for the header UI (FR-017a).

```ts
interface RunStatusHeader {
  total: number
  succeeded: number                            // count of perRepo entries with status === 'done'
  failed: number                               // count of status === 'failed' (excludes rate-limit re-queues per FR-032c)
  inProgress: number
  queued: number
  elapsedMs: number                            // now - startedAt
  etaMs: number | null                         // null while < 2 repos done; otherwise rolling-mean per-repo time × queued
  concurrency: { chosen: number; effective: number }
  pause: { kind: 'primary' | 'secondary'; resumesAt: Date; pausesSoFar: number } | null
  status: RunStatus
}
```

This is recomputed on every queue event AND on the wall-clock tick (FR-017d) so the elapsed timer keeps moving between completions.

---

## OrgSummaryViewModel (derived)

The render-input for `OrgSummaryView`. Built by `lib/org-aggregation/view-model.ts` from a snapshot of `OrgAggregationRun.perRepo` (only `status === 'done'` entries contribute to aggregates).

```ts
interface OrgSummaryViewModel {
  status: RunStatusHeader
  flagshipRepos: FlagshipMarker[]
  panels: AggregatePanelMap
  missingData: MissingDataEntry[]              // FR-033 consolidated org-level
  perRepoStatusList: PerRepoStatusEntry[]      // FR-005a alphabetical
}

interface PerRepoStatusEntry {
  repo: string
  status: RepoStatus
  badge: 'queued' | 'in-progress' | 'done' | 'failed'
  errorReason?: string                         // present iff status === 'failed'
  isFlagship: boolean                          // true iff repo appears in flagshipRepos
  durationMs?: number                          // finishedAt - startedAt, present once finished
}

interface MissingDataEntry {
  repo: string
  signalKey: SignalKey                         // typed key into the signal taxonomy
  reason: string                               // e.g. "scorecard not published", "no CODEOWNERS"
}
```

`AggregatePanelMap` is a map keyed by panel id with values typed as `AggregatePanel<T>` per panel.

---

## AggregatePanel<T>

The shape every aggregator returns. The UI renders it uniformly (heading, "in progress (X of N)" label, value or `unavailable` placeholder).

```ts
interface AggregatePanel<T> {
  panelId: PanelId
  contributingReposCount: number               // how many of perRepo were `done` AND had non-unavailable input for this panel
  totalReposInRun: number                      // OrgAggregationRun.repos.length
  status: 'in-progress' | 'final' | 'unavailable'
  value: T | null                              // null iff status === 'unavailable'
}

type PanelId =
  | 'contributor-diversity'   // FR-008
  | 'maintainers'             // FR-009
  | 'org-affiliations'        // FR-010 (Experimental)
  | 'release-cadence'         // FR-011
  | 'security-rollup'         // FR-012
  | 'governance'              // FR-013
  | 'adopters'                // FR-014
  | 'project-footprint'       // FR-019
  | 'activity-rollup'         // FR-020
  | 'responsiveness-rollup'   // FR-021
  | 'license-consistency'     // FR-022
  | 'inclusive-naming-rollup' // FR-023
  | 'documentation-coverage'  // FR-024
  | 'languages'               // FR-025
  | 'stale-work'              // FR-026
  | 'bus-factor'              // FR-027
  | 'repo-age'                // FR-028
  | 'inactive-repos'          // FR-029
```

Each panel's `T` is panel-specific. Examples:

```ts
type ContributorDiversityValue = {
  topTwentyPercentShare: number                // 0..1
  elephantFactor: number
  uniqueAuthorsAcrossOrg: number
}

type MaintainersValue = {
  projectWide: { token: string; kind: 'user' | 'team'; reposListed: string[] }[]
  perRepo: { repo: string; tokens: string[] }[]
}

type SecurityRollupValue = {
  perRepo: { repo: string; score: number | 'unavailable' }[]
  worstScore: number | null                    // null if every repo unavailable
}

type RepoAgeValue = {
  newest: { repo: string; createdAt: Date } | null
  oldest: { repo: string; createdAt: Date } | null
}

// ... one per panel (full set in contracts/aggregator-contracts.ts)
```

---

## Configuration (lib/config/org-aggregation.ts)

Constitution §VI requires thresholds in shared config. This is the single config module for this feature.

```ts
export const ORG_AGGREGATION_CONFIG = {
  concurrency: {
    default: 3,
    min: 1,
    max: 10,
    secondaryRateLimitBackoffFactor: 0.5,      // FR-003e: halve on secondary-limit resume
  },
  largeOrgWarningThreshold: 25,                // FR-017c: dialog appears at >= this many repos
  updateCadenceDefault: { kind: 'per-completion' } as UpdateCadence,
  quoteRotationIntervalMs: 6_000,              // FR-017b
  wallClockTickIntervalMs: 1_000,              // FR-017d / R3
  inactiveRepoWindowMonths: 12,                // FR-029
  preFilters: {
    excludeArchivedByDefault: true,            // FR-036
    excludeForksByDefault: true,
  },
} as const
```

All UI controls and the queue dispatcher import from this single source.

---

## Invariants

1. `perRepo.size === repos.length` for the lifetime of the run.
2. `succeeded + failed + inProgress + queued === total` at all times.
3. A repo can transition `failed → in-progress` only via user-initiated Retry (FR-035).
4. `pauseHistory.length === pausesSoFar` (the header is a derived view).
5. `flagshipRepos` is set exactly once before `status` leaves `pre-run`; it is not mutated by completion events.
6. `MissingDataEntry` for `(repo, signalKey)` appears at most once across `missingData` regardless of how many panels marked that signal `unavailable` for that repo (FR-033).
7. `OrgAggregationRun` and all derived views are framework-agnostic — they live in `lib/org-aggregation/` and import nothing from `react`, `next/*`, or `components/*`.
