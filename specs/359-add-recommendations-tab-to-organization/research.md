# Phase 0 Research — Org Recommendations tab

All open questions resolved before Phase 1.

---

## R1 — Where do per-repo recommendations actually come from?

**Decision**: The aggregator consumes the same two streams the per-repo `RecommendationsView.tsx` consumes today:

1. `getHealthScore(result).recommendations` → `HealthScoreRecommendation[]`, each carrying `bucket` (one of `Activity | Responsiveness | Contributors | Documentation | Security`), `key` (catalog lookup key), `percentile`, `message`, `tab`.
2. `getSecurityScore(result.securityResult, result.stars).recommendations` → `SecurityRecommendation[]`, each carrying `category: 'scorecard' | 'direct_check'`, `item` (catalog lookup key), `title`, `text`, `riskLevel`, and a pre-computed `bucket: 'security'`.

**Rationale**: The spec (FR-003, FR-018) requires reusing the existing per-repo recommendation catalog without introducing new rules. Reading from these two functions is byte-identical to what the per-repo view renders — the aggregator can never diverge from per-repo truth.

**Alternatives considered**:
- *Re-deriving recommendations inside the aggregator from the raw `AnalysisResult`*: rejected. It would duplicate the per-repo rule surface and would drift. Violates the issue's own "out of scope — inventing new recommendation rules."
- *Adding a `recommendations` field on `AnalysisResult` at analyzer time*: rejected. It would widen the analyzer contract and pollute every consumer that doesn't need it, violating §IX YAGNI. Deriving on-demand from the two pure scoring functions is already cheap (both functions are called by the per-repo UI on every render).

---

## R2 — How are recommendation keys deduped across sources?

**Decision**: The unified catalog (`lib/recommendations/catalog.ts`) already resolves both sources to the same entry via:

- `HealthScoreRecommendation.key` → direct catalog lookup via `getCatalogEntryByKey(key)`.
- `SecurityRecommendation.item` → same `getCatalogEntryByKey(item)` works because security Scorecard keys (e.g., `Branch-Protection`) are in the catalog directly, **and** the catalog's `DIRECT_CHECK_ALIASES` map (e.g., `branch_protection` → `Branch-Protection`) already collapses the direct-check and Scorecard forms to the same catalog entry.

So: **the aggregation dedup key is `catalogEntry.id`** (e.g., `SEC-3`, `DOC-5`). Two recommendations from the same repo that resolve to the same catalog entry count as one for that repo (shouldn't happen in practice given the per-repo rules, but the set-based dedup is idempotent either way).

**Rationale**: FR-005 requires "keys that resolve to the same catalog entry via existing aliases MUST be counted together, not twice." The alias table is the single source of truth for key-collapsing; the aggregator delegates to it and does not re-implement alias logic.

**Alternatives considered**:
- *Dedup by `key` string alone*: rejected. Misses the direct-check / Scorecard alias case the catalog was specifically built to handle.
- *Dedup by `bucket + key`*: rejected — the catalog is already authoritative on bucket, so using catalog ID (which encodes both) is cleaner and guaranteed consistent.

---

## R3 — What about recommendations whose keys are NOT in the catalog?

**Decision**: Fall through to a stable non-catalog identity: use the string key itself as the ID, bucket taken from the source recommendation (`HealthScoreRecommendation.bucket` or `'Security'` for `SecurityRecommendation`), and title taken from `HealthScoreRecommendation.message` / `SecurityRecommendation.title ?? text`.

Concretely, the aggregator computes, for each per-repo recommendation:

```
const entry = getCatalogEntryByKey(key)
const id = entry?.id ?? `UNCAT:${key}`
const bucket = entry?.bucket ?? sourceRec.bucket
const title = entry?.title ?? sourceRec.title ?? sourceRec.message
```

Sort key within a bucket: `[affectedRepoCount desc, id asc]`. `UNCAT:*` IDs sort lexicographically after all cataloged `SEC-`/`ACT-`/`RSP-`/`CTR-`/`DOC-` IDs, which is fine for determinism.

**Rationale**: FR-019 requires unknown keys not to be silently dropped. The per-repo view's `assignReferenceIds()` already has a fallback counter (dynamic IDs 101+), but the aggregator operates across repos so it can't reuse per-repo sequential IDs without creating conflicting IDs across runs. Using `UNCAT:<key>` yields a stable, deterministic identity that survives re-renders.

**Alternatives considered**:
- *Drop uncataloged recommendations*: rejected. Violates FR-019.
- *Reassign sequential IDs across the whole org*: rejected. Runs with different repo subsets would yield different IDs for the same recommendation. Determinism matters for SC-003.

---

## R4 — Denominator semantics when the run is in-progress or has failed repos

**Decision**: The denominator on each aggregated recommendation, and the denominator in the empty-state message, is **the count of successfully analyzed repos contributing to the panel** (`AnalysisResult[]` actually passed to the aggregator). This equals `AggregatePanel.contributingReposCount`.

- During an in-progress run: denominator grows as repos complete; each aggregated count and repo list reflects only completed repos.
- For failed repos: they contribute nothing (no `AnalysisResult`), so they are not in the numerator or denominator.

Panel `status`:
- `'in-progress'` → `results.length === 0` (nothing completed yet) — panel renders in-progress skeleton.
- `'final'` → at least one result present. (There's no "unavailable" terminal state here because the aggregator works on any non-empty result set.)

**Rationale**: Matches the existing aggregator convention across every other panel in `lib/org-aggregation/aggregators/` (e.g., governance.ts lines 17–26, 54–62). Uses the pre-existing `AggregatePanel` lifecycle rather than inventing a new one. Satisfies FR-011, FR-013.

**Alternatives considered**:
- *Denominator = total repos queued (including failed/in-progress)*: rejected. Would make "12 of 15" suggest the other 3 definitely don't have the finding, when in fact they might have (they just haven't been analyzed). Misleading.
- *Denominator = total repos in the run minus failures*: equivalent to "contributing" in the final state but unclear semantics mid-run. Rejected for the simpler "what the panel actually saw."

---

## R5 — Where does the new tab live in the OrgSummaryView filter?

**Decision**: In `components/org-summary/OrgSummaryView.tsx:34`, change:

```ts
.filter((b) => b.id !== 'repos' && b.id !== 'recommendations')
```

to:

```ts
.filter((b) => b.id !== 'repos')
```

The bucket ordering in `PANEL_BUCKETS` (registry.tsx:50) already places `recommendations` between `security` and `repos`, matching FR-001's "after Security" requirement. No reordering required.

Also update the comment at `registry.tsx:28–31` which currently says "don't apply at the org level — no recommendations engine" to reflect that the bucket is now live; leave the `comparison` part of the comment unchanged (comparison-at-org-level is still out of scope).

**Rationale**: FR-014 directs the minimum surgical change. The filter drop-down is the only bit of UI plumbing that treats `recommendations` as special; removing its exception brings it into the standard bucket-visibility path (bucket shows if it has at least one non-empty panel for this run).

**Alternatives considered**:
- *Add explicit "always show recommendations bucket" logic*: rejected. The generic "show any bucket with a non-empty panel" rule already does the right thing once the bucket has a populated panel. Adding a special-case would regress to pre-existing design.

---

## R6 — Should the aggregator emit a flat list or pre-grouped structure?

**Decision**: Aggregator emits a flat `items: OrgRecommendationEntry[]`, each item carrying its `bucket`. The panel component does the per-bucket grouping at render time via a fixed bucket-order constant. The aggregator also pre-sorts the flat list by `[bucket-order asc, count desc, id asc]` so the panel can group-by without re-sorting.

**Rationale**:
1. Keeps the aggregator value shape mirror-able as JSON (useful if we ever add an org-export surface; not in scope here but cheap).
2. The bucket order is a UI decision, so living in the panel is correct per §IV.
3. A flat array is simpler to test than a nested structure — fewer key-path assertions in tests.

**Alternatives considered**:
- *Pre-group in the aggregator as `Map<Bucket, Entry[]>`*: rejected. Pushes a UI concern (rendering order of buckets) into the pure data layer, muddies `§IV`. A constant in the panel component reads more clearly.

---

## R7 — Per-recommendation repo-list ordering

**Decision**: `affectedRepos` is stored in alphabetical order by `owner/repo`, case-insensitive (`localeCompare(..., 'en', { sensitivity: 'base' })`), matching the convention already used in `view-model.ts:175` for `perRepoStatusList`. The aggregator sets this order once; the panel renders as-is.

**Rationale**: FR-009 requires case-insensitive alphabetical sort. Doing it in the aggregator (pure, cheap, deterministic) avoids the panel re-sorting on every expand toggle.

---

## R8 — How does the `/demo/organization` route consume this?

**Decision**: The demo route imports `OrgSummaryView` and constructs a view-model through `buildOrgSummaryViewModel()` (or a demo-fixture equivalent). Because this feature wires the new aggregator into `buildOrgSummaryViewModel()` directly and drops the exclusion in `OrgSummaryView.tsx`, the demo route inherits the change with zero edits — satisfying FR-015 / SC-004.

**Rationale**: Confirmed by reading `components/org-summary/OrgSummaryView.tsx:33-43` — the `visibleBuckets` computation runs off `PANEL_BUCKETS` and `view.panels`, both of which we update. No demo-specific branch exists in that path.

**Verification step for the quickstart**: open `/demo/organization`, confirm the Recommendations tab renders with fixture-driven content. If the demo uses a reduced or static fixture that happens to have no recommendations, the empty-state message still renders — the tab is still present.

---

## R9 — Tests needed (TDD order)

**Decision**: Three test files, in this order:

1. `lib/org-aggregation/aggregators/org-recommendations.test.ts` — unit tests for the pure aggregator:
   - Empty input → in-progress panel, no value.
   - Single repo with one recommendation → aggregated entry with count 1, repo in the list.
   - Two repos, same recommendation → one aggregated entry with count 2, both repos in the list alphabetized.
   - Two repos, different recommendations → two aggregated entries, each count 1.
   - Direct-check alias dedup: one repo emits a Scorecard-form security rec, another emits the aliased direct-check form — aggregates to one entry with count 2 (FR-005 guard).
   - Uncataloged key survives with `UNCAT:*` ID (FR-019 guard).
   - Sort order: higher count first; catalog ID asc breaks ties (SC-003 guard).
   - Denominator = `results.length` (FR-011 guard).
   - `affectedRepos` alphabetical, case-insensitive (FR-009 guard).

2. `components/org-summary/panels/OrgRecommendationsPanel.test.tsx` — RTL tests for the panel:
   - Renders empty-state message when `value.items.length === 0` (FR-012 guard).
   - Renders each bucket group in the correct order; skips empty buckets (FR-006, FR-008 guards).
   - Renders each item with catalog ID + title + "N of M repos" (FR-004 guard).
   - Expanding an item reveals the repo list in alphabetical order (US3 AC1–AC4).

3. Playwright update in `tests/e2e/org-summary-demo.spec.ts` (or nearest existing demo test): navigate to `/demo/organization`, click the Recommendations tab, assert at least one bucket heading and one aggregated item are visible. Lightweight DOM/computed-style assertion — not a snapshot (per user's `feedback_playwright_e2e_style` memory).

**Rationale**: Follows the constitution's §XI TDD mandate. The three layers cover the value-shape contract, the rendering contract, and the integration contract independently.

---

## R10 — PRODUCT.md update scope

**Decision**: One paragraph added to the org-summary section of `docs/PRODUCT.md`, enumerating the new tab and noting the primary framing. No other doc changes. If the file already enumerates the org tab set, the enumeration is updated in-place to include Recommendations between Security and the repos list.

**Rationale**: FR-020 makes this the only doc surface this feature touches. Keeping it terse avoids doc-drift. The constitution and DEVELOPMENT.md don't require an edit.
