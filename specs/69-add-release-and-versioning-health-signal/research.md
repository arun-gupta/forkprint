# Phase 0 Research: Release Health Scoring

**Feature**: P2-F09 — Release Health Scoring (issue #69)
**Branch**: `69-add-release-and-versioning-health-signal`
**Date**: 2026-04-17

This document resolves the three open questions captured in `spec.md` and locks in additional implementation choices needed before design.

---

## Q1 — Semver pre-release handling

**Context**: When a repository's most recent releases are mostly pre-release (`-rc`, `-beta`), should semver compliance be computed over all releases or only over stable tags?

### Decision

**Count all releases. Pre-release tags are valid semver per the SPEC and must not be excluded.**

`semverComplianceRatio` is computed as `match_count / total_count` over the most recent 100 releases, where `match_count` counts any tag matching the full semver regex (including optional `-prerelease` and `+build` suffixes).

### Rationale

1. **Follow the standard.** semver.org explicitly includes pre-release identifiers as valid semver. Treating `v1.0.0-rc.1` as non-compliant would contradict the spec the signal is meant to measure.
2. **No dual-metric proliferation.** A split "compliance" / "stable-compliance" pair would be two signals where one is load-bearing; violates §IX YAGNI.
3. **Pre-release usage is already surfaced separately** via `preReleaseRatio` (FR-007), which is informational-only. Users who want to understand stability posture see that signal directly on the lens.

### Alternatives considered

- **Stable-only (option B)**: Rejected — a deliberate pre-1.0 project that religiously follows semver would get zero credit for discipline.
- **Split into two ratios (option C)**: Rejected — two signals doing one job.

---

## Q2 — Release-notes substantive threshold

**Context**: Below what body length does a release count as "non-substantive" for `releaseNotesQualityRatio`?

### Decision

**Configurable floor, defaulting to ≥ 40 characters (roughly one sentence), stored in shared scoring config as `RELEASE_NOTES_SUBSTANTIVE_FLOOR`.**

A body is substantive when its trimmed length is `>= RELEASE_NOTES_SUBSTANTIVE_FLOOR`. `null` and whitespace-only bodies count as non-substantive.

### Rationale

1. **Simple, auditable, config-driven.** Satisfies FR-006 and Constitution §VI. The default can be tuned during #152 calibration.
2. **40 characters is empirically permissive.** Even a one-line "Fix regression in login flow when the user has no avatar." clears 40 chars — this is a ceiling against empty / "minor fixes" bodies, not a quality judgment.
3. **Content-aware detection rejected for now.** Detecting bullet lists / headings / links is richer but adds regex complexity and false-positive risk (e.g., a one-word release with a single link). If #152 calibration reveals the simple threshold is too blunt, upgrade then.

### Alternatives considered

- **≥ 120 characters**: Rejected — too strict; penalizes legitimate one-sentence patch notes.
- **Content-aware**: Deferred per YAGNI. Ready to revisit post-#152 if data shows the floor is noisy.

---

## Q3 — tag-to-release ratio when tag count is unavailable

**Context**: If a repository has GitHub releases but the GraphQL `refs(refPrefix: "refs/tags/")` totalCount is not returned, should `tagToReleaseRatio` be `unavailable` or inferred?

### Decision

**`unavailable`. No inference.**

When `totalTags` cannot be read from GraphQL, `tagToReleaseRatio` is emitted as the literal `"unavailable"` value on `releaseHealthResult`. No REST fallback is introduced.

### Rationale

1. **Constitution §II.2 and §II.3.** "No estimation, interpolation, inference, or fabrication — ever. Missing data is a first-class outcome." Inferring `0` when tags are unreadable would violate this.
2. **Minimal surface area.** A REST fallback doubles the auth path and contract surface for one signal that is already best-effort (tag-to-release promotion is a Documentation bonus, not a primary score).
3. **Real-world impact is small.** The refs query denial scenario is rare on public repos; when it happens, the Documentation score is computed exactly as today and the user sees the row as `"unavailable"` with no confidence loss.

### Alternatives considered

- **Infer `0`**: Rejected on §II grounds.
- **REST fallback to `/tags`**: Rejected on YAGNI + surface-area grounds. Revisitable if calibration data shows GraphQL denials are frequent enough to matter.

---

## Additional implementation decisions (not in spec Open Questions)

### R4 — Staleness tier cutoffs

**Decision**: Three tiers, all values in shared config:

- **Never released**: `releaseHealthResult.releaseFrequency === 'unavailable'` AND `totalReleasesEver === 0`
- **Stale** (`STALE_RELEASE_CUTOFF_DAYS`, default 730): `daysSinceLastRelease >= 730`
- **Cooling** (`COOLING_RELEASE_CUTOFF_DAYS`, default 365, AND has commits in last 90 days): `365 <= daysSinceLastRelease < 730` AND `commits90d > 0`

The three tiers are mutually exclusive — FR-028 guarantees at most one staleness recommendation per repo. The recommendation engine evaluates in the order above and emits only the first match.

### R5 — Versioning scheme detection

**Decision**: Two regex matchers in `lib/release-health/semver.ts`:

- `SEMVER_REGEX` — accepts `v?<MAJOR>.<MINOR>.<PATCH>(-<pre>)?(\+<build>)?` per semver.org.
- `CALVER_REGEX` — accepts common CalVer shapes (`YYYY.MM.DD`, `YYYY.MM`, `YY.MM.MICRO`, `YYYY-MM-DD`).

For a given release's tag name:

- If `SEMVER_REGEX` matches → semver-compliant.
- Else if `CALVER_REGEX` matches → CalVer (suppresses the "adopt semver" recommendation per FR-029).
- Else → unrecognized scheme ("adopt *a* versioning scheme" recommendation).

Recommendation trigger (FR-029): if `semverComplianceRatio < SEMVER_ADOPTION_THRESHOLD` (default 0.5) **and** CalVer is not the dominant scheme → emit "adopt semver"; else if neither semver nor CalVer dominates → emit "adopt *a* scheme".

### R6 — Per-signal weights in host buckets

**Decision**: Small fixed weights, conservative — matches the pattern shipped for Community (P2-F05):

- **Activity `cadence` sub-factor** (currently 20% of Activity): split into `releasesPerYear` (existing, 12%) + `daysSinceLastRelease` (new, 8%). Weights documented in `lib/activity/score-config.ts`.
- **Documentation bonuses**:
  - `semverComplianceRatio`: +0.03 bonus multiplier on the Documentation percentile
  - `releaseNotesQualityRatio`: +0.02
  - `tagToReleaseRatio` (inverted): +0.02 when orphan ratio ≤ 0.3, 0 otherwise (bounded — never negative)

Total Documentation score shift is bounded at ~+7 percentile points for a release-health-rich repo and 0 for a release-health-poor repo. Matches SC-009's ~5-percentile guidance within noise.

Weights are shared-config values, read (not hardcoded) by `score-config.ts`. Tunable during #152 calibration.

### R7 — Completeness readout fallback

**Decision**: Linear ratio → percentile mapping, identical to the shipped Community implementation in `lib/community/completeness.ts`:

```ts
const ratio = present.length / (present.length + missing.length)
const percentile = Math.max(0, Math.min(99, Math.round(ratio * 99)))
```

When all five scored signals are `unavailable` (e.g., zero releases), `percentile === null` and the readout renders `"Insufficient verified public data"` (FR-020).

Signals that are per-field `unavailable` (e.g., `tagToReleaseRatio` when refs denied) are classified as `unknown` and excluded from both numerator and denominator (FR-021).

### R8 — GraphQL field selection

**Decision**: Extend `REPO_COMMIT_AND_RELEASES_QUERY` in `lib/analyzer/queries.ts` additively:

```graphql
releases(first: 100, orderBy: { field: CREATED_AT, direction: DESC }) {
  totalCount        # NEW
  nodes {
    tagName         # NEW
    name            # NEW (human-readable release title, used for fallback notes detection)
    body            # NEW
    isPrerelease    # NEW
    createdAt
    publishedAt     # kept — already present
  }
}
refs(refPrefix: "refs/tags/", first: 0) {   # NEW — totalCount only
  totalCount
}
```

No new query pass. Per-repo GraphQL request count stays within 1–3 (Constitution §III.2, SC-003).

### R9 — Recommendation percentile gate

**Decision**: Release-health recommendations flow through the existing `RECOMMENDATION_PERCENTILE_GATE` (currently imported in `lib/scoring/health-score.ts`). A release-health recommendation is suppressed when the host bucket's percentile for this repo already clears the gate. Same pattern Documentation, Security, and Community recommendations already use.

Implementation lives in `lib/release-health/recommendations.ts` — a pure function consuming the bucket percentile + the release-health signal state and returning either a `HealthScoreRecommendation[]` or `[]`.

---

## Summary of configuration values added

All in shared scoring config (Constitution §VI):

| Key | Default | Purpose |
|---|---|---|
| `SEMVER_REGEX` | semver.org spec | Matches semver-compliant tag names |
| `CALVER_REGEX` | common CalVer shapes | Suppresses inappropriate semver recommendation |
| `RELEASE_NOTES_SUBSTANTIVE_FLOOR` | 40 | Minimum body length for a substantive release note |
| `STALE_RELEASE_CUTOFF_DAYS` | 730 | Days since last release qualifying as "stale" |
| `COOLING_RELEASE_CUTOFF_DAYS` | 365 | Days since last release qualifying as "cooling" |
| `SEMVER_ADOPTION_THRESHOLD` | 0.5 | Compliance ratio below which the semver-adoption rec fires |
| `ACTIVITY_CADENCE_FREQUENCY_WEIGHT` | 0.12 | Weight of `releasesPerYear` inside the Activity cadence sub-factor |
| `ACTIVITY_CADENCE_RECENCY_WEIGHT` | 0.08 | Weight of `daysSinceLastRelease` inside the Activity cadence sub-factor |
| `DOCUMENTATION_SEMVER_BONUS` | 0.03 | Documentation percentile bonus for semver compliance |
| `DOCUMENTATION_NOTES_BONUS` | 0.02 | Documentation percentile bonus for substantive notes |
| `DOCUMENTATION_TAG_PROMOTION_BONUS` | 0.02 | Documentation percentile bonus when orphan tag ratio ≤ 0.3 |

No calibration payload changes — per-bracket percentiles for the five numeric signals are deferred to #152.
