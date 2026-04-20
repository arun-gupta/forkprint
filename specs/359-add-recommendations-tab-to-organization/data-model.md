# Phase 1 Data Model — Org Recommendations

The aggregator output type and the panel's input type.

---

## Types

### `OrgRecommendationBucket`

Narrow union that matches the existing per-repo recommendation taxonomy.

```ts
export type OrgRecommendationBucket =
  | 'Activity'
  | 'Responsiveness'
  | 'Contributors'
  | 'Documentation'
  | 'Security'
```

Order of rendering (used by the panel, not the aggregator):

```ts
export const ORG_RECOMMENDATION_BUCKET_ORDER: OrgRecommendationBucket[] = [
  'Activity',
  'Responsiveness',
  'Contributors',
  'Documentation',
  'Security',
]
```

Rationale: mirrors the per-repo `BUCKET_COLORS` ordering in `components/recommendations/RecommendationsView.tsx:21-27`.

---

### `OrgRecommendationEntry`

One aggregated recommendation.

```ts
export interface OrgRecommendationEntry {
  /**
   * Stable identity used for dedup and display.
   * Cataloged recs: catalog ID (e.g. "SEC-3", "DOC-5").
   * Uncataloged recs: `UNCAT:${rawKey}`.
   */
  id: string

  /** Bucket the recommendation belongs to. Catalog-derived when possible. */
  bucket: OrgRecommendationBucket

  /**
   * Display title. Catalog-derived when the key is cataloged;
   * otherwise falls back to the per-repo recommendation's own title/message.
   */
  title: string

  /** Number of analyzed repos that produced this recommendation. */
  affectedRepoCount: number

  /**
   * Repo slugs (`owner/repo`) that produced this recommendation,
   * sorted alphabetically, case-insensitive.
   */
  affectedRepos: string[]
}
```

**Invariants**:
- `affectedRepos.length === affectedRepoCount`.
- `affectedRepos` is sorted `(a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })`.
- `id` is unique per panel value — no two entries share an `id`.

---

### `OrgRecommendationsValue`

The `value` field of the `AggregatePanel<OrgRecommendationsValue>`.

```ts
export interface OrgRecommendationsValue {
  /**
   * Flat list of aggregated recommendations across all buckets,
   * pre-sorted by [bucket-order asc, affectedRepoCount desc, id asc].
   */
  items: OrgRecommendationEntry[]

  /**
   * Number of successfully analyzed repos that contributed to this panel.
   * Equals `AggregatePanel.contributingReposCount` and is duplicated here
   * so the panel can compute "X of Y" without needing to read the panel
   * wrapper.
   */
  analyzedReposCount: number
}
```

**Invariants**:
- If `items.length === 0`, the panel still renders (empty state). The panel distinguishes this case from the pre-run "no repos yet" case via the panel wrapper's `status` and `contributingReposCount`.
- All `items[i].affectedRepoCount <= analyzedReposCount`.

---

### New `PanelId`

Add `'org-recommendations'` to the `PanelId` union in `lib/org-aggregation/types.ts`:

```ts
export type PanelId =
  | 'contributor-diversity'
  | 'maintainers'
  | /* … existing 16 entries … */
  | 'inactive-repos'
  | 'org-recommendations'   // NEW
```

Then in `components/org-summary/panels/registry.tsx`:

- `PANEL_BUCKETS[].find(b => b.id === 'recommendations').panels` becomes `['org-recommendations']`.
- `PANEL_LABELS['org-recommendations'] = 'Top systemic issues'` (or similar; exact copy is a UX judgment, but must be a single short label).
- `REAL_PANELS['org-recommendations'] = OrgRecommendationsPanel`.

---

## State transitions

The aggregator's output lifecycle mirrors the existing aggregator pattern. Signal keys used in status decisions:

| Input condition                                         | `status`        | `value`                                              |
|---------------------------------------------------------|-----------------|------------------------------------------------------|
| `results.length === 0`                                   | `'in-progress'` | `null`                                               |
| `results.length >= 1` and no recommendations produced    | `'final'`       | `{ items: [], analyzedReposCount: results.length }`  |
| `results.length >= 1` and at least one recommendation    | `'final'`       | `{ items: [...], analyzedReposCount: results.length }`|

No `'unavailable'` terminal is used — recommendations are always derivable from any successful `AnalysisResult` (even if zero recommendations are produced, that is itself a valid final state).

---

## Relationships

- Input: `AnalysisResult[]` (existing type, unchanged).
- Read-only dependencies inside the aggregator:
  - `getHealthScore(result)` from `lib/scoring/health-score` — returns `.recommendations: HealthScoreRecommendation[]`.
  - `getSecurityScore(result.securityResult, result.stars)` from `lib/security/score-config` — returns `.recommendations: SecurityRecommendation[]`.
  - `getCatalogEntryByKey(key)` from `lib/recommendations/catalog` — catalog lookup.
- Output: `AggregatePanel<OrgRecommendationsValue>` — feeds the existing org-summary view-model.

No new types added to `AnalysisResult`. No analyzer changes. No catalog changes.

---

## Type placement

| Type                               | File                                                      |
|------------------------------------|-----------------------------------------------------------|
| `OrgRecommendationBucket`          | `lib/org-aggregation/aggregators/types.ts`                |
| `OrgRecommendationEntry`           | `lib/org-aggregation/aggregators/types.ts`                |
| `OrgRecommendationsValue`          | `lib/org-aggregation/aggregators/types.ts`                |
| `ORG_RECOMMENDATION_BUCKET_ORDER`  | `lib/org-aggregation/aggregators/types.ts` (const export) |
| `'org-recommendations'` PanelId    | `lib/org-aggregation/types.ts`                            |

Keeps all value types with the other `*Value` types in `aggregators/types.ts`, matching existing convention (`GovernanceValue`, `SecurityRollupValue`, etc.).
