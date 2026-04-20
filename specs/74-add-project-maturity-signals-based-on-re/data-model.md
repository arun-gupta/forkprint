# Phase 1 — Data Model: Project Maturity Signals

## Entities

### `MaturitySignals` (additive block on `AnalysisResult`)

New optional fields on the existing `AnalysisResult` interface. Every field can
hold a number, the literal string `"too-new"`, or the literal string
`"unavailable"` (following the `Unavailable` union already used elsewhere).

| Field                           | Type                                          | Derivation                                                                                  |
|---------------------------------|-----------------------------------------------|---------------------------------------------------------------------------------------------|
| `ageInDays`                     | `number \| 'unavailable'`                     | `(now − createdAt) / 1 day`. Unavailable iff `createdAt === 'unavailable'`.                |
| `lifetimeCommits`               | `number \| 'unavailable'`                     | New GraphQL field (R1). Unavailable iff the default branch has no `history` or query fails. |
| `starsPerYear`                  | `number \| 'too-new' \| 'unavailable'`        | `stars / (ageInDays / 365.25)` gated by `minimumNormalizationAgeDays`.                     |
| `contributorsPerYear`           | `number \| 'too-new' \| 'unavailable'`        | `totalContributors / (ageInDays / 365.25)` under the same availability rules.              |
| `commitsPerMonthLifetime`       | `number \| 'too-new' \| 'unavailable'`        | `lifetimeCommits / (ageInDays / 30.4375)` under the same availability rules.               |
| `commitsPerMonthRecent12mo`     | `number \| 'unavailable'`                     | `commits365d / 12`. Unavailable iff `commits365d` is unavailable.                           |
| `growthTrajectory`              | `'accelerating' \| 'stable' \| 'declining' \| 'unavailable'` | Classify `recent/lifetime` ratio against config band; `unavailable` when either side is unavailable or `ageInDays < minimumTrajectoryAgeDays`. |

### `BracketKey` (extended union in `lib/scoring/config-loader.ts`)

```ts
export type BracketKey =
  | 'solo-tiny'
  | 'solo-small'
  | 'emerging'
  | 'emerging-young'
  | 'emerging-mature'
  | 'growing'
  | 'growing-young'
  | 'growing-mature'
  | 'established'
  | 'established-young'
  | 'established-mature'
  | 'popular'
  | 'popular-young'
  | 'popular-mature'
```

- Unstratified community keys (`emerging`, `growing`, `established`, `popular`)
  remain valid; they serve as the fallback when a stratified entry has
  `sampleSize: 0`.
- Solo keys unchanged.

### `BracketCalibration` (schema additions)

Each stratified entry carries the existing `BracketCalibration` fields **plus**
three new percentile blocks:

```ts
export interface BracketCalibration {
  // ... existing fields (sampleSize, stars, forks, watchers, forkRate,
  //     watcherRate, prMergeRate, issueClosureRate, staleIssueRatio, ...,
  //     documentationScore?) unchanged ...

  // New — maturity dimension
  starsPerYear?: PercentileSet
  contributorsPerYear?: PercentileSet
  commitsPerMonth?: PercentileSet
}
```

Optional (`?`) so existing callers and existing fixtures don't require a
simultaneous update. When absent, the cohort context caption degrades to the
unstratified bracket's entry and, failing that, omits the caption entirely.

### `MaturityConfig` (new block inside `config-loader.ts`)

```ts
export const MATURITY_CONFIG = {
  minimumNormalizationAgeDays: 90,
  minimumTrajectoryAgeDays: 730,
  acceleratingRatio: 1.25,       // recent/lifetime ≥ 1.25
  decliningRatio: 0.75,          // recent/lifetime ≤ 0.75
  minimumActivityScoringAgeDays: 90,
  minimumResilienceScoringAgeDays: 180,
  ageStratumBoundaryDays: 730,   // coherent with minimumTrajectoryAgeDays
} as const
```

## State Transitions

The only state machine is `growthTrajectory`'s classifier:

```text
ageInDays < 730 (config)                        → 'unavailable'
lifetimeCommits === 'unavailable' OR
  commits365d === 'unavailable'                 → 'unavailable'
ratio = (commits365d / 12) / (lifetime / ageMo)
ratio ≥ 1.25                                    → 'accelerating'
0.75 < ratio < 1.25                             → 'stable'
ratio ≤ 0.75                                    → 'declining'
```

Bracket routing:

```text
profile === 'solo' AND stars < 100 AND solo bracket has data
  → 'solo-tiny' | 'solo-small' (existing)
else                                            → community tier by stars
  if ageInDays available AND stratum entry has sampleSize > 0
    → `${tier}-${young|mature}`
  else
    → unstratified tier (fallback)
```

## Validation Rules (from spec requirements)

- `ageInDays === 'unavailable'` MUST propagate through every normalized field.
- Division by zero or near-zero (age < normalization threshold) MUST return
  `'too-new'`, never an infinite or NaN number.
- When `growthTrajectory === 'unavailable'`, the UI label MUST read
  "Insufficient verified public data" with the reason visible in the tooltip.
- No maturity field MAY appear in any GET URL (constitution §X.4 — token hygiene
  doesn't apply here, but the existing "nothing derived from token state in URLs"
  discipline does).
- All thresholds above MUST be read from `MATURITY_CONFIG` — not redefined
  inline in components, activity score-config, or the calibrate script.
