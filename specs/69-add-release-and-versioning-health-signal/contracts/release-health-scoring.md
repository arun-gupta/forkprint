# Contract: Release Health Scoring

**Feature**: P2-F09 — Release Health Scoring (issue #69)
**Branch**: `69-add-release-and-versioning-health-signal`

This contract pins the programmatic interfaces that cross module boundaries. Any divergence during implementation requires a spec / plan amendment.

---

## 1. Analyzer output — `AnalysisResult.releaseHealthResult`

```ts
// lib/analyzer/analysis-result.ts
export type Unavailable = 'unavailable'

export interface ReleaseHealthResult {
  totalReleasesAnalyzed: number
  totalTags: number | Unavailable
  releaseFrequency: number | Unavailable
  daysSinceLastRelease: number | Unavailable
  semverComplianceRatio: number | Unavailable
  releaseNotesQualityRatio: number | Unavailable
  tagToReleaseRatio: number | Unavailable
  preReleaseRatio: number | Unavailable
  versioningScheme: 'semver' | 'calver' | 'unrecognized' | Unavailable
}

export interface AnalysisResult {
  // ...existing fields...
  releaseHealthResult?: ReleaseHealthResult | Unavailable
}
```

**Contract**:

- `undefined` is reserved for fixtures predating this feature. Fresh analyses emit either an object or the literal `'unavailable'`.
- When emitted as an object, `totalReleasesAnalyzed` is always a number (may be 0); every other field may be `'unavailable'`.

---

## 2. Detection — `lib/release-health/detect.ts`

```ts
export interface RawRelease {
  tagName: string
  body: string | null
  isPrerelease: boolean
  createdAt: string
  publishedAt: string | null
}

export interface DetectReleaseHealthInput {
  releases: RawRelease[]              // most recent first, up to 100
  totalReleasesAllTime: number         // from releases.totalCount
  totalTags: number | 'unavailable'    // from refs.totalCount
  now: Date                            // injected for determinism
}

export function detectReleaseHealth(input: DetectReleaseHealthInput): ReleaseHealthResult
```

**Contract**:

- Pure function. No network calls, no `Date.now()` reads inside — `now` is injected.
- Returns the `'unavailable'` object shape when `releases.length === 0` AND `totalTags === 'unavailable'`.
- Otherwise returns a populated object with per-field `'unavailable'` as specified in `data-model.md`.

---

## 3. Completeness — `lib/release-health/completeness.ts`

```ts
export function computeReleaseHealthCompleteness(
  result: AnalysisResult
): ReleaseHealthCompleteness
```

**Contract**:

- Pure function. Reads `result.releaseHealthResult` and the shared-config thresholds; writes nothing.
- Returns `{ ratio: null, percentile: null, tone: 'neutral' }` when all five scored signals are `unknown` — rendered as `"Insufficient verified public data"` at the UI.
- Uses the same linear `ratio → percentile` fallback as `lib/community/completeness.ts` until #152 calibration lands.

---

## 4. Semver / scheme detection — `lib/release-health/semver.ts`

```ts
export const SEMVER_REGEX: RegExp
export const CALVER_REGEX: RegExp

export function detectVersioningScheme(tagNames: string[]): 'semver' | 'calver' | 'unrecognized' | 'unavailable'
```

**Contract**:

- Dominant-scheme rule: ≥ 50% of non-empty tag names match a scheme → that scheme wins. Else `unrecognized`. Empty input → `unavailable`.
- Both regexes are exported (tests lock them down).

---

## 5. Scoring hooks

### Activity — `lib/activity/score-config.ts`

```ts
// Cadence sub-factor (currently 20% of Activity).
// Splits into:
//   - releasesPerYear weight ACTIVITY_CADENCE_FREQUENCY_WEIGHT (default 0.12)
//   - daysSinceLastRelease weight ACTIVITY_CADENCE_RECENCY_WEIGHT (default 0.08)
// Sum must remain 0.20 to preserve composite Activity weight of 25%.
```

**Contract**: the exported `getActivityScore()` signature is unchanged. Internally, cadence reads both inputs from the `ReleaseHealthResult` when present; falls back to the current `releases12mo`-only logic when `releaseHealthResult` is `'unavailable'` / `undefined`. No new caller rewrites.

### Documentation — `lib/documentation/score-config.ts`

```ts
// Three small-weight bonus multipliers applied AFTER the base Documentation percentile:
//   semverComplianceRatio      → bonus DOCUMENTATION_SEMVER_BONUS (default 0.03) scaled by ratio
//   releaseNotesQualityRatio   → bonus DOCUMENTATION_NOTES_BONUS (default 0.02) scaled by ratio
//   tagToReleaseRatio          → fixed DOCUMENTATION_TAG_PROMOTION_BONUS (default 0.02) when ratio ≤ 0.3, else 0
// Final Documentation percentile is clamped to [0, 99].
```

**Contract**: the exported `getDocumentationScore()` signature is unchanged. Release-health inputs are threaded through the existing `AnalysisResult` argument. No new caller rewrites.

---

## 6. Lens readout — `lib/metric-cards/view-model.ts`

`buildLensReadouts(result)` gains a third readout after `community` and `governance`:

```ts
// Only added when result.releaseHealthResult is an object AND completeness.ratio !== null.
{
  key: 'release-health',
  label: 'Release Health',
  percentileLabel: `${completeness.percentile}th percentile`,
  detail: `${present.length} of ${present.length + missing.length} signals`,
  tooltip: 'Release Health is a cross-cutting lens — count of release-health signals present. Does not feed the composite OSS Health Score.',
  tone: completeness.tone,
}
```

---

## 7. Recommendations — `lib/recommendations/catalog.ts`

Seven new keys (see `data-model.md` §Recommendation catalog). Each entry matches the existing `HealthScoreRecommendation` shape:

```ts
{
  key: string
  bucket: 'activity' | 'documentation'
  tab: 'activity' | 'documentation'
  message: string          // user-facing copy
  gate: typeof RECOMMENDATION_PERCENTILE_GATE
}
```

**Contract**:

- Each recommendation's `message` is static (no runtime interpolation except where the trigger provides a number, e.g., `daysSinceLastRelease`).
- `RECOMMENDATION_PERCENTILE_GATE` (host-bucket percentile) suppresses all seven.
- Staleness tiers evaluate in order `never_released → stale → cooling`; first match wins. FR-028 guarantees at most one fires.
- `preReleaseRatio` never appears in any trigger expression (FR-031).

---

## 8. GraphQL — `lib/analyzer/queries.ts`

Additive field selection on the existing Pass-1 query. No new query pass, no new exported constant. The contract is that after this feature:

```graphql
repository(owner: $owner, name: $name) {
  releases(first: 100, orderBy: { field: CREATED_AT, direction: DESC }) {
    totalCount
    nodes {
      tagName
      name
      body
      isPrerelease
      createdAt
      publishedAt
    }
  }
  refs(refPrefix: "refs/tags/", first: 0) { totalCount }
  # ... existing defaultBranchRef.target fields unchanged ...
}
```

Per-repo request count stays within 1–3 (Constitution §III.2).

---

## 9. Export — `lib/export/json-export.ts`, `lib/export/markdown-export.ts`

**JSON**: include `releaseHealthResult` field verbatim and a top-level `releaseHealthCompleteness` object when present.

**Markdown**: a `## Release Health` section with three subsections (Release Cadence, Release Discipline, Completeness), parallel to the shipped `## Community` section in `specs/180-community-scoring/`.

---

## 10. Constitution compliance

| # | Rule | How this contract upholds it |
|---|---|---|
| II | Accuracy | `'unavailable'` is the first-class state; no estimation in `detectReleaseHealth` |
| III | Data Sources | Additive GraphQL fields only; no new network pass |
| IV | Analyzer Boundary | Detection in `lib/release-health/`; scoring in per-bucket `score-config.ts`; UI in `components/` — no cross-boundary imports |
| V | CHAOSS | No new composite bucket or CHAOSS score |
| VI | Scoring Thresholds | All thresholds in shared config; scoring logic reads (not hardcodes) them |
| IX | YAGNI | No speculative infrastructure, no calibration payload changes (deferred to #152) |
| XI | Testing | Every function in this contract lands with Vitest coverage before UI wiring |
