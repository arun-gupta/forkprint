# Phase 1 Data Model: Release Health Scoring

**Feature**: P2-F09 — Release Health Scoring (issue #69)
**Branch**: `69-add-release-and-versioning-health-signal`

Flat, diffable-across-repos shapes per Constitution §IX.5.

---

## `ReleaseHealthResult`

Top-level field on `AnalysisResult` (optional — `undefined` on fixtures predating this feature; `'unavailable'` when releases cannot be retrieved at all).

```ts
export type Unavailable = 'unavailable'

export interface ReleaseHealthResult {
  /** Count of releases analyzed (bounded at 100). Drives the 'never released' recommendation tier. */
  totalReleasesAnalyzed: number
  /** Tag count from refs(refPrefix: "refs/tags/"). Used for tagToReleaseRatio. */
  totalTags: number | Unavailable
  /** Releases per year over the last 12 months. 'unavailable' when fewer than 2 releases exist. */
  releaseFrequency: number | Unavailable
  /** Days since the most recent release (publishedAt falling back to createdAt). 'unavailable' when there are zero releases. */
  daysSinceLastRelease: number | Unavailable
  /** Share of releases matching SEMVER_REGEX [0, 1]. 'unavailable' when there are zero releases. */
  semverComplianceRatio: number | Unavailable
  /** Share of releases whose body.trim().length >= RELEASE_NOTES_SUBSTANTIVE_FLOOR [0, 1]. */
  releaseNotesQualityRatio: number | Unavailable
  /** Share of tags that never became a release: max(0, totalTags - totalReleases) / max(1, totalTags). */
  tagToReleaseRatio: number | Unavailable
  /** Share of releases with isPrerelease === true. Informational — never scored. */
  preReleaseRatio: number | Unavailable
  /** Dominant versioning scheme detected across tagNames. Drives semver vs. CalVer vs. unrecognized recommendation routing. */
  versioningScheme: 'semver' | 'calver' | 'unrecognized' | Unavailable
}
```

`AnalysisResult` gains one optional field:

```ts
releaseHealthResult?: ReleaseHealthResult | Unavailable
```

---

## `ReleaseHealthCompleteness`

Derived summary for the per-repo metric card's lens readout. Peer to `CommunityCompleteness`.

```ts
export type ReleaseHealthSignalKey =
  | 'release_frequency'
  | 'days_since_last_release'
  | 'semver_compliance'
  | 'release_notes_quality'
  | 'tag_to_release'

export interface ReleaseHealthCompleteness {
  present: ReleaseHealthSignalKey[]
  missing: ReleaseHealthSignalKey[]
  unknown: ReleaseHealthSignalKey[]
  /** present.length / (present.length + missing.length); null when denominator is zero (zero-release case). */
  ratio: number | null
  /** Linear fallback: Math.round(ratio * 99); null when ratio is null. Swapped for calibrated percentile in #152. */
  percentile: number | null
  tone: ScoreTone
}
```

Classification per signal:

- `release_frequency`: `releaseFrequency === 'unavailable'` → `unknown` if `totalReleasesAnalyzed === 0`, else `missing`; `releaseFrequency < 1` → `missing`; `releaseFrequency >= 1` → `present`.
- `days_since_last_release`: `daysSinceLastRelease === 'unavailable'` → `unknown`; `daysSinceLastRelease >= STALE_RELEASE_CUTOFF_DAYS` → `missing`; else → `present`.
- `semver_compliance`: `semverComplianceRatio === 'unavailable'` → `unknown`; `semverComplianceRatio >= SEMVER_ADOPTION_THRESHOLD` → `present`; else → `missing`.
- `release_notes_quality`: `releaseNotesQualityRatio === 'unavailable'` → `unknown`; `releaseNotesQualityRatio >= 0.5` → `present`; else → `missing`.
- `tag_to_release`: `tagToReleaseRatio === 'unavailable'` → `unknown`; `tagToReleaseRatio <= 0.3` → `present`; else → `missing`.

Thresholds are shared-config values (§VI).

---

## Recommendation catalog entries

`lib/recommendations/catalog.ts` gains the following keys (new `HealthScoreRecommendation` entries, gated by `RECOMMENDATION_PERCENTILE_GATE`):

| Key | Bucket | Tab | Trigger |
|---|---|---|---|
| `release_never_released` | `activity` | `activity` | `totalReleasesAnalyzed === 0` AND repo has ≥ 1 commit |
| `release_stale` | `activity` | `activity` | `daysSinceLastRelease >= STALE_RELEASE_CUTOFF_DAYS` |
| `release_cooling` | `activity` | `activity` | `COOLING_RELEASE_CUTOFF_DAYS <= daysSinceLastRelease < STALE_RELEASE_CUTOFF_DAYS` AND `commits90d > 0` |
| `release_adopt_semver` | `documentation` | `documentation` | `semverComplianceRatio < SEMVER_ADOPTION_THRESHOLD` AND `versioningScheme !== 'calver'` AND `versioningScheme !== 'unrecognized'` |
| `release_adopt_scheme` | `documentation` | `documentation` | `versioningScheme === 'unrecognized'` |
| `release_improve_notes` | `documentation` | `documentation` | `releaseNotesQualityRatio < 0.5` |
| `release_promote_tags` | `documentation` | `documentation` | `tagToReleaseRatio > 0.5` |

At most one staleness recommendation fires per repo (FR-028). `preReleaseRatio` never triggers a recommendation (FR-031).

---

## Tag registry

New file `lib/tags/release-health.ts` — mirrors `lib/tags/community.ts`:

```ts
export const RELEASE_HEALTH_TAG = 'release-health'
export const RELEASE_HEALTH_ROWS = new Set<string>([
  'release_cadence_card',         // Activity tab
  'release_discipline_card',      // Documentation tab
  'release_discipline_semver',
  'release_discipline_notes',
  'release_discipline_tag_promotion',
])
export const RELEASE_HEALTH_ACTIVITY_ITEMS = new Set<string>([
  'release_cadence_card',
])
export const RELEASE_HEALTH_METRICS = new Set<string>([
  'release_frequency',
  'days_since_last_release',
  'semver_compliance',
  'release_notes_quality',
  'tag_to_release',
])
```

Co-occurrence with other lens tags (e.g., `governance`) is supported by the existing `TagPill` rendering path (FR-016).

---

## Export shape

`json-export.ts` emits the flat `releaseHealthResult` field plus a top-level `releaseHealthCompleteness` summary. `markdown-export.ts` emits a `## Release Health` section with three subsections (Release Cadence, Release Discipline, Completeness), parallel to the shipped Community export.
