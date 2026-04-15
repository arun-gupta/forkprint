# Implementation Plan: Solo-project Calibration Brackets

## Data model

Extend `BracketKey` in `lib/scoring/config-loader.ts`:

```ts
export type BracketKey = 'solo-tiny' | 'solo-small' | 'emerging' | 'growing' | 'established' | 'popular'
```

Extend `calibration-data.json` with two new entries under `brackets` (`solo-tiny`, `solo-small`) and two entries under `sampleSizes`. Community entries untouched.

## Routing

Add two helpers in `config-loader.ts`:

```ts
export function getBracketForRepo(result: AnalysisResult, profileOverride?: 'community' | 'solo'): BracketKey
export function getCalibrationForRepo(result: AnalysisResult, profileOverride?: 'community' | 'solo'): BracketCalibration
export function getBracketLabelForRepo(result: AnalysisResult, profileOverride?: 'community' | 'solo'): string
```

Logic for `getBracketForRepo`:
- If `profileOverride === 'community'` → delegate to stars-based `getBracket(stars)`
- Else determine `isSolo` via `detectSoloProjectProfile(result)` (or `profileOverride === 'solo'`)
- If solo and stars < 10 → `solo-tiny`
- If solo and stars < 100 → `solo-small`
- Otherwise → `getBracket(stars)` (community)

`getBracketLabelForRepo`: solo brackets return "Solo (< 10 stars)" / "Solo (10–99 stars)"; community labels unchanged; solo repos with ≥ 100 stars that fall back to community return the community label + " — limited solo sample" suffix.

Keep existing `getBracket(stars)` and `getCalibrationForStars(stars)` for legacy call sites that don't have a result (ecosystem classification, etc.) — they never need solo routing since they are community-shape signals.

## Score-config wiring

For each of `activity`, `responsiveness`, `contributors`, `documentation`, `security` score-configs: accept an optional `profileOverride` (same `'community' | 'solo' | undefined`) and use `getCalibrationForRepo(result, profileOverride)` when the result is passed. If only `stars` is available (external callers), fall back to the existing stars path.

In `lib/scoring/health-score.ts`:
- After resolving `profile`, pass the `profileOverride` into each score-config call so the bucket percentiles and `bracketLabel` come from the solo entry.
- Replace the `bracketLabel` derivation with `getBracketLabelForRepo(result, profile)`.

Responsiveness / Contributors are hidden in solo mode but still computed — we can keep them on community bracket since they're not displayed.

## Calibration script

`scripts/calibrate.ts`:
- Parse `--profile=solo` flag
- When set, replace `BRACKETS` with a solo-only set:
  - `solo-tiny` (stars 0–9): one stratum, target 200
  - `solo-small` (stars 10–99): one stratum, target 200
- During sampling, after `isGenuineSoftwareProject`, run a lightweight solo verification per candidate:
  - Fetch recent commit authors (90d) via existing GraphQL → count unique
  - Fetch contributors count via REST `/contributors?per_page=3&anon=1`
  - Check GOVERNANCE file via REST content API
  - Apply 3-of-4 heuristic: unique commit authors ≤ 2, contributors ≤ 2, maintainers ≤ 1 (proxy: contributors ≤ 1), no governance.
  - Since `maintainerCount` isn't trivially derivable in the lightweight flow, use a 2-of-3 of the observable signals instead for sampling (document the divergence).
- On the full run: write the two new keys into `calibration-data.json`, **merging** with existing community entries rather than overwriting.
- Metadata: bump `generated` and record `sampleSizes.solo-tiny` / `sampleSizes.solo-small`.

## Documentation

Update `docs/calibrate-repos.md` with a new section describing `--profile=solo` and the heuristic used.

## Tests

- Unit test `getBracketForRepo`: solo + <10 → tiny; solo + 50 → small; solo + 500 → growing; override community + solo-flagged → community by stars.
- Unit test `getBracketLabelForRepo` for each branch.
- Health-score test: solo result picks solo bracket label; community override picks community label.

## Rollout

Ship code changes first with placeholder solo calibration data (copied from `emerging` as a conservative starting point) so routing is testable end-to-end. Real solo sampling runs as a follow-up against live GitHub — too expensive to run synchronously in this PR; documented in the PR body as a follow-up task tracked against issue #229.
