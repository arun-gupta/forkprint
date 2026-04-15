# Implementation Plan: Org-Level Aggregation with Client-Orchestrated Multi-Repo Analysis

**Branch**: `231-org-aggregation` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/231-org-aggregation/spec.md`
**Issue**: [#212](https://github.com/arun-gupta/repo-pulse/issues/212)

## Summary

Add a client-orchestrated multi-repo analysis flow that drives the existing per-repo `/api/analyze` endpoint from the browser with bounded, user-configurable concurrency, and renders results into a new **Org Summary** view that aggregates across all completed repos. No server-side jobs, no email, no new external services — fully consistent with the stateless Phase 1 architecture (constitution §I).

The work decomposes into five layers, each independently testable:

1. **Queue / Orchestrator** (`lib/org-aggregation/queue.ts`) — a framework-agnostic, in-memory finite-state machine with bounded concurrency, cancel, retry, rate-limit pause/resume, and adaptive backoff. Pure TypeScript, no React, no Next.js.
2. **Aggregators** (`lib/org-aggregation/aggregators/`) — pure functions, one per Org Summary panel (FR-008 to FR-029), that take `AnalysisResult[]` and return a panel view-model. Easy to unit-test exhaustively, including `unavailable` handling.
3. **Org Summary view-model** (`lib/org-aggregation/view-model.ts`) — composes aggregators + run-status + missing-data panel into a single render-ready object.
4. **React components** (`components/org-summary/`) — render the view-model. New tab in the existing Org Inventory shell.
5. **Wiring** (`components/org-inventory/OrgInventoryView.tsx` + new `useOrgAggregation` hook) — wires the queue's progress events into React state, drives the pre-run dialog, auto-navigation, notification, etc.

A small new server-side endpoint (`GET /api/org/pinned`) wraps the GraphQL `Organization.pinnedItems` query for FR-011a (flagship selection). This is one additional route that fits the existing API contract pattern; it is not a job store and does not violate stateless-Phase-1.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16+ (App Router) — matches existing stack
**Primary Dependencies**: React 18, Tailwind CSS, Vitest, React Testing Library, Playwright (E2E). No new runtime dependencies.
**Storage**: N/A (stateless — in-browser memory only for the duration of the run, per constitution §I)
**Testing**: Vitest + RTL for unit/integration; Playwright for E2E (one happy-path scenario; large-org runs validated manually per the PR Test Plan)
**Target Platform**: Modern evergreen browsers (Chrome/Firefox/Safari/Edge — same as existing app); requires Web Notifications API support for FR-018 (graceful degradation if denied)
**Project Type**: Web application (Next.js App Router monorepo — single repo, frontend + thin API routes)
**Performance Goals**:
- Aggregation re-computation under 100 ms for N=200 (single main-thread pass)
- Progress UI updates within 2 s of repo completion (SC-004)
- UI never appears frozen between completions (FR-017d wall-clock tick)
**Constraints**:
- No server-side state (constitution §I)
- No new external services (FR-017)
- All thresholds in shared config (constitution §VI)
- Per-repo error isolation (constitution §X.5)
- Surface `unavailable`, never zero or estimate (constitution §II)
- TDD mandatory (constitution §XI) — Red → Green → Refactor
**Scale/Scope**:
- Run sizes: 1 to 1000+ repos (no upper bound per FR-006a)
- Concurrency: 1–10 (default 3)
- 16 aggregate panels in the Org Summary
- ~36 functional requirements from the spec

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Constitution Rule | Verdict | Notes |
|---|---|---|
| §I Stack — no new tech | **PASS** | Reuses Next.js / React / Tailwind / Vitest / Playwright. No new runtime deps. |
| §I Stateless | **PASS** | All run state is in-browser memory. The one new API route (`GET /api/org/pinned`) is a stateless GraphQL passthrough; no jobs, no DB, no email. |
| §I API Contract | **PASS** | Existing `POST /api/analyze` is reused unchanged. New `GET /api/org/pinned?org=X` follows the same pattern (stateless, single GraphQL query). |
| §I Analyzer module boundary | **PASS** | Aggregation logic lives in `lib/org-aggregation/` — framework-agnostic; no Next.js / React imports. Importable by future Phase 2 (GitHub Action) and Phase 3 (MCP) without changes. |
| §II Accuracy | **PASS** | Every aggregator preserves `unavailable` per repo and excludes from numeric roll-ups (FR-015, FR-033). No estimation. The two narrowly-allowed heuristics (Elephant Factor, single-vendor) are surfaced inside the existing Experimental UI surface for FR-010. |
| §III Data Sources | **PASS** | `/api/org/pinned` uses GraphQL `Organization.pinnedItems` (primary source). REST fallback only if GraphQL cannot reach it (it can). |
| §IV Analyzer module | **PASS** | `lib/org-aggregation/` has zero Next.js / React imports — verifiable by `grep`. |
| §V CHAOSS | **N/A** | This feature does not introduce new CHAOSS categories or scores. |
| §VI Config-driven thresholds | **PASS** | Concurrency default/min/max/backoff factor, large-org warning threshold, update cadence default, quote rotation interval, all live in `lib/config/org-aggregation.ts` (FR-003f). |
| §VII Ecosystem Spectrum | **N/A** | Not modified by this feature. |
| §VIII Contribution Honesty | **PASS** | Org-affiliation aggregation (FR-010) renders inside the Experimental surface with the required warning. |
| §IX YAGNI / Keep It Simple | **PASS** | No speculative extensibility. Queue is a single class; aggregators are plain functions. No abstraction over "future job stores" or "future notification channels". |
| §X Security & Hygiene | **PASS** | Token never leaves the existing OAuth flow. Per-repo failures are isolated (FR-005, FR-005a). |
| §XI Testing / TDD | **PASS** | Plan enumerates Red→Green→Refactor cycles for queue, each aggregator, view-model, and components. Vitest mocks GraphQL calls per §XI.3. |
| §XII Definition of Done | **PASS (deferred to PR)** | All criteria checked at PR open; manual signoff in PR Test Plan per §XIII.3 + v1.2 amendment. |
| §XIII Workflow | **PASS** | Branch `231-org-aggregation`, no main commits, PR-merge by user, README updated for the new "Analyze all active repos" action. |

**Result**: Constitution Check passes with no violations. No entries needed in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/231-org-aggregation/
├── spec.md              # ✅ committed
├── plan.md              # this file
├── research.md          # Phase 0 — decisions on queue strategy, notification, flagship fallback
├── data-model.md        # Phase 1 — entity shapes (OrgAggregationRun, AggregatePanel, RunStatus, etc.)
├── quickstart.md        # Phase 1 — how to validate the feature locally
├── contracts/
│   ├── org-aggregation-types.ts    # Queue / run / panel TypeScript contracts
│   ├── pinned-repos-api.md         # GET /api/org/pinned contract
│   └── aggregator-contracts.ts     # Per-panel aggregator function signatures
└── tasks.md             # Phase 2 — generated by /speckit.tasks (NOT created here)
```

### Source Code (repository root)

New code, organized to keep the framework-agnostic core (`lib/org-aggregation/`) cleanly separable from the React layer (`components/org-summary/`):

```text
lib/
├── org-aggregation/                          # NEW — framework-agnostic core
│   ├── queue.ts                              # FSM: queued/in-progress/done/failed/rate-limited
│   ├── queue.test.ts                         # Vitest: concurrency, cancel, retry, pause/resume
│   ├── rate-limit.ts                         # primary vs. secondary detection from response headers
│   ├── rate-limit.test.ts
│   ├── view-model.ts                         # Composes aggregators into Org Summary view-model
│   ├── view-model.test.ts
│   ├── flagship.ts                           # Pinned-items selection + most-stars fallback (FR-011a)
│   ├── flagship.test.ts
│   ├── missing-data.ts                       # Consolidated org-level missing-data panel (FR-033)
│   ├── missing-data.test.ts
│   └── aggregators/                          # One pure function per Org Summary panel
│       ├── contributor-diversity.ts          # FR-008
│       ├── contributor-diversity.test.ts
│       ├── maintainers.ts                    # FR-009 (incl. team-handle handling)
│       ├── maintainers.test.ts
│       ├── org-affiliations.ts               # FR-010 (Experimental surface)
│       ├── org-affiliations.test.ts
│       ├── release-cadence.ts                # FR-011
│       ├── release-cadence.test.ts
│       ├── security-rollup.ts                # FR-012
│       ├── security-rollup.test.ts
│       ├── governance.ts                     # FR-013
│       ├── governance.test.ts
│       ├── adopters.ts                       # FR-014
│       ├── adopters.test.ts
│       ├── project-footprint.ts              # FR-019
│       ├── project-footprint.test.ts
│       ├── activity-rollup.ts                # FR-020
│       ├── activity-rollup.test.ts
│       ├── responsiveness-rollup.ts          # FR-021
│       ├── responsiveness-rollup.test.ts
│       ├── license-consistency.ts            # FR-022
│       ├── license-consistency.test.ts
│       ├── inclusive-naming-rollup.ts        # FR-023
│       ├── inclusive-naming-rollup.test.ts
│       ├── documentation-coverage.ts         # FR-024
│       ├── documentation-coverage.test.ts
│       ├── languages.ts                      # FR-025
│       ├── languages.test.ts
│       ├── stale-work.ts                     # FR-026
│       ├── stale-work.test.ts
│       ├── bus-factor.ts                     # FR-027
│       ├── bus-factor.test.ts
│       ├── repo-age.ts                       # FR-028
│       ├── repo-age.test.ts
│       ├── inactive-repos.ts                 # FR-029
│       └── inactive-repos.test.ts
│
├── config/
│   └── org-aggregation.ts                    # NEW — concurrency default/min/max/backoff,
│                                             # large-org warning threshold, cadence default,
│                                             # quote rotation interval, inactive-repo window
│
└── export/
    ├── org-summary-json-export.ts            # NEW — FR-030 JSON export
    ├── org-summary-json-export.test.ts
    ├── org-summary-markdown-export.ts        # NEW — FR-030 Markdown export
    └── org-summary-markdown-export.test.ts

app/api/
└── org/
    └── pinned/
        ├── route.ts                          # NEW — GET /api/org/pinned?org=X (FR-011a)
        └── route.test.ts

components/
├── org-summary/                              # NEW — React layer
│   ├── OrgSummaryView.tsx                    # Top-level view; auto-opens on run start (FR-016)
│   ├── OrgSummaryView.test.tsx
│   ├── RunStatusHeader.tsx                   # FR-017a (totals + cancel + concurrency display)
│   ├── RunStatusHeader.test.tsx
│   ├── PerRepoStatusList.tsx                 # FR-005a alphabetical with badges + retry (FR-035)
│   ├── PerRepoStatusList.test.tsx
│   ├── ProgressIndicator.tsx                 # FR-017d wall-clock tick (bar + timer + quote)
│   ├── ProgressIndicator.test.tsx
│   ├── PreRunWarningDialog.tsx               # FR-017c large-org warning + concurrency control
│   ├── PreRunWarningDialog.test.tsx
│   ├── RateLimitPausePanel.tsx               # FR-032 pause UI w/ countdown
│   ├── RateLimitPausePanel.test.tsx
│   ├── ConsolidatedMissingDataPanel.tsx      # FR-033
│   ├── ConsolidatedMissingDataPanel.test.tsx
│   ├── EmptyState.tsx                        # FR-034 "waiting for first result"
│   └── panels/
│       ├── ContributorDiversityPanel.tsx     # 16 panels, one per FR-008..FR-029
│       ├── ContributorDiversityPanel.test.tsx
│       └── ... (one per aggregator)
│
├── org-inventory/
│   └── OrgInventoryView.tsx                  # MODIFIED — adds "Analyze all active repos"
│                                             # button + archived/forks pre-filters (FR-036)
│
└── shared/
    └── hooks/
        ├── useOrgAggregation.ts              # NEW — wires queue events → React state,
        │                                     # auto-navigates, drives notification (FR-018)
        └── useOrgAggregation.test.tsx
```

**Modified existing code**:

- `lib/comparison/sections.ts:596` — **untouched**. Per FR-006/006a/006b, the org-aggregation path does not call `limitComparedResults()`; the Comparison table's 4-repo display cap stays where it is, scoped to the Comparison view.
- `components/org-inventory/OrgInventoryView.tsx` — adds the "Analyze all active repos" button and the archived/forks pre-filters (FR-036). Existing single-repo and small-batch comparison flows are unchanged.
- `app/results/...` (existing results shell) — adds an "Org Summary" tab when an org-aggregation run is active.
- `docs/DEVELOPMENT.md` — implementation order table updated to mark P2-related entry / add the new feature row.
- `README.md` — adds a one-paragraph "Analyzing a whole org" section if user-facing setup changed (likely just the new button — confirm at PR open).

**Structure Decision**: Single Next.js project (Option 1 in the template, but adapted to this app's existing `lib/` + `components/` + `app/` layout). The framework-agnostic boundary is enforced by the directory split: anything under `lib/org-aggregation/` must not import from `components/`, `app/`, `react`, or `next/*`. This is verifiable by a single ESLint rule or a grep gate in CI.

## Phase 0 — Research

The spec made several decisions that need to be locked down with explicit decision records in `research.md`. Each is a small, bounded question; none are open-ended. Topics:

1. **Queue strategy**: simple `Promise`-based concurrency limiter (in-house, ~30 LOC) vs. importing `p-limit`/`p-queue`. **Recommendation: in-house** — no new dep, behavior is custom (rate-limit pause, re-queue, backoff), and a dep would add a maintenance surface for ~30 lines of value.
2. **Browser Notification API**: confirm permission flow (request on first toggle-on, remember denial, no re-prompt). Document the exact `Notification.requestPermission()` contract and graceful-degradation behavior.
3. **Wall-clock progress tick (FR-017d)**: `requestAnimationFrame` vs. `setInterval(1000)` for the elapsed-time updater. **Recommendation: `setInterval(1000)`** — accurate enough for human perception of "not frozen", lower CPU than rAF, runs in background tabs.
4. **Rate-limit header parsing**: confirm GitHub's GraphQL endpoint returns `x-ratelimit-*` headers in the same format as REST (it does), and confirm that a 403 with `x-ratelimit-remaining: 0` is the canonical primary-limit signal vs. a 403/429 with `Retry-After` for secondary.
5. **Pinned items GraphQL query**: confirm the exact shape of `Organization.pinnedItems(first: 6, types: [REPOSITORY])` and write the contract.
6. **Volume-weighted median (FR-021)**: pin the algorithm — sort all (response-time, weight) pairs by response-time, accumulate weights, return the value where cumulative weight crosses half of total weight. Document with one worked example.
7. **Concurrency adaptive backoff (FR-003e)**: pin "halve, rounded down, minimum 1" behavior, plus what happens if the user cancels and re-runs (reset to user-chosen value, not the backed-off value).
8. **Empty-state vs. "waiting for first result"**: confirm the placeholder copy and visual treatment so it can't be confused with skeleton loaders that look like data (FR-034).

Each item resolves to a Decision / Rationale / Alternatives section in `research.md`. None are blockers; all have a clear leading option.

## Phase 1 — Design & Contracts

Three artifacts:

### data-model.md

Entity shapes for the in-browser run, written as TypeScript interfaces. Key entities (matching the spec's Key Entities section):

- **`OrgAggregationRun`** — `{ org, repos[], concurrency, startedAt, status: 'pre-run' | 'in-progress' | 'paused' | 'cancelled' | 'complete', perRepo: Map<repo, RepoRunState>, pauseHistory[], updateCadence }`
- **`RepoRunState`** — `{ repo, status: 'queued' | 'in-progress' | 'done' | 'failed', result?: AnalysisResult, error?: { reason, kind: 'rate-limit-primary' | 'rate-limit-secondary' | 'scope' | 'other' } }`
- **`RunStatusHeader`** — derived view: `{ total, succeeded, failed, inProgress, queued, elapsedMs, etaMs, concurrency, paused?: { resumesAt, kind, reposToReDispatch } }`
- **`OrgSummaryViewModel`** — `{ status: RunStatusHeader, panels: AggregatePanelMap, missingData: MissingDataEntry[], flagshipRepos: FlagshipMarker[] }`
- **`AggregatePanel<T>`** — discriminated union per panel type, all with `{ panelId, contributingReposCount, status: 'in-progress' | 'final' | 'unavailable', value: T }`
- **`MissingDataEntry`** — `{ repo, signalKey, reason }` (FR-033)
- **`FlagshipMarker`** — `{ repo, source: 'pinned' | 'fallback-most-stars' | 'none' }` (FR-011a)

State transitions documented for `OrgAggregationRun.status` and `RepoRunState.status`.

### contracts/

- **`org-aggregation-types.ts`** — TypeScript interfaces above, exported from `lib/org-aggregation/types.ts` for both the queue and the React layer.
- **`pinned-repos-api.md`** — contract for `GET /api/org/pinned?org=<slug>`:
  - Request: query param `org` (string, required).
  - Response 200: `{ pinned: Array<{ owner: string, name: string, stars: number | "unavailable" }> }` — up to 6 items.
  - Response 4xx: standard error shape used elsewhere in `app/api/`.
  - Backed by GraphQL `Organization.pinnedItems(first: 6, types: [REPOSITORY])`.
- **`aggregator-contracts.ts`** — function signatures for all 16 aggregators. Each: `(results: AnalysisResult[], context: AggregationContext) => AggregatePanel<TPanelValue>` where `TPanelValue` is panel-specific. Pure, deterministic, no I/O.

### quickstart.md

Step-by-step manual validation: install, run dev server, OAuth sign-in (or `DEV_GITHUB_PAT`), navigate to a moderate-sized org (~10 repos) in Org Inventory, click "Analyze all active repos", verify the auto-navigation to Org Summary, watch panels populate live, validate the run-status header counts. Then scale to a CNCF-sized org (~64 repos) for the manual signoff in the PR Test Plan.

### Agent context update

Run `.specify/scripts/bash/update-agent-context.sh claude` to refresh `CLAUDE.md`'s Active Technologies block with this feature ID. No new tech is added (Next.js + Tailwind + Vitest + RTL are all already listed).

## Phase 2 — (handled by `/speckit.tasks`, not generated here)

`/speckit.tasks` will produce `tasks.md` with a TDD-ordered task list. Anticipated structure (for context only — `/speckit.tasks` will produce the authoritative list):

1. **Tier A — Config + Types** (no tests, foundation): `lib/config/org-aggregation.ts`, `lib/org-aggregation/types.ts`.
2. **Tier B — Queue + Rate-limit + Flagship + Missing-data** (TDD): each gets a Red test → Green impl → Refactor cycle. Independent — can be parallelized across implementers.
3. **Tier C — Aggregators (16)** (TDD, all independent): each panel's aggregator gets unit tests covering the typical case, every-`unavailable` case, mixed case, and any panel-specific edge case. Easily parallel.
4. **Tier D — View-model + Export** (TDD): composes Tier B/C outputs.
5. **Tier E — API route + GraphQL contract**: `app/api/org/pinned/route.ts` + tests with mocked GraphQL responses.
6. **Tier F — React components**: dialog → header → progress → panels → orchestrator hook. Depends on B/C/D being green.
7. **Tier G — Wiring + E2E**: integrate into Org Inventory; one Playwright happy-path; manual large-org test deferred to PR Test Plan.
8. **Tier H — Docs**: update `docs/DEVELOPMENT.md` implementation order, README "Analyze a whole org" section.

## Re-evaluation of Constitution Check (post-design)

After designing the data model, contracts, and module layout: **no new violations**. The framework-agnostic boundary holds (`lib/org-aggregation/` has no React/Next.js imports). Stateless guarantee holds (all run state lives in `OrgAggregationRun`, which is a value type held in browser memory). Configurable thresholds all centralize in `lib/config/org-aggregation.ts`. TDD is enforced by the test-file pairing in the Source Code tree.

**Result**: Constitution Check passes post-design. Proceed to `/speckit.tasks`.

## Complexity Tracking

> No constitution violations. Table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| _none_ | _n/a_ | _n/a_ |
