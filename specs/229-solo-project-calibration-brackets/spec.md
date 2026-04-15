# Feature Specification: Solo-project Calibration Brackets

**Feature Branch**: `229-solo-project-calibration-brackets-10-and`
**Created**: 2026-04-15
**Status**: Draft
**Issue**: #229 (follow-up to #214 / PR #228)

## User Scenarios & Testing

### User Story 1 — Solo repo sees solo-calibrated percentiles (Priority: P1)

A maintainer analyzes their single-maintainer repo. Today the scorecard compares it to a mixed sample dominated by community-shape repos, so its Activity / Documentation / Security percentiles are against the wrong cohort. After this change, a solo-classified repo with < 100 stars is scored against a solo-only bracket (`solo-tiny` for < 10 stars, `solo-small` for 10–99 stars), and the scorecard bracket label reflects that.

**Independent Test**: Analyze a known solo repo with e.g. 25 stars. Verify the scorecard bracket label reads "Solo (10–99 stars)" and bucket percentiles draw from the `solo-small` calibration entry.

**Acceptance Scenarios**:

1. Given a repo that `detectSoloProjectProfile` flags as solo with 5 stars, when the scorecard renders, then the bracket label is "Solo (< 10 stars)" and percentile anchors come from `solo-tiny`.
2. Given a solo repo with 50 stars, when the scorecard renders, then the bracket label is "Solo (10–99 stars)" and percentile anchors come from `solo-small`.
3. Given a solo repo with 500 stars, when the scorecard renders, then it falls back to the community `growing` bracket with a label note that solo-specific calibration is unavailable above 100 stars.
4. Given a solo repo where the user toggles the override to community scoring, when the scorecard renders, then the community star-tier bracket is used and the solo label is not shown.

### User Story 2 — Calibration script samples solo-only repos (Priority: P2)

An operator running `npm run calibrate -- --profile=solo --dry-run` gets a repo list composed only of repos that satisfy the 3-of-4 solo heuristic, split across `solo-tiny` and `solo-small` strata.

**Independent Test**: Run the dry-run; verify the output file lists only solo-classified repos partitioned by bracket.

**Acceptance Scenarios**:

1. Given `--profile=solo`, when sampling runs, then each candidate is verified against a lightweight solo heuristic (≤ 2 recent commit authors, ≤ 2 total contributors, no governance file) before admission.
2. Given the full solo run completes, when writing calibration data, then `lib/scoring/calibration-data.json` gains `solo-tiny` and `solo-small` entries alongside existing community brackets — community entries unchanged.

### Edge Cases

- Solo classification unavailable (analysis result missing data): fall back to community bracket by stars.
- Solo repo at exactly 100 stars: falls into community `growing` (boundary is `< 100`).
- `solo-tiny` sample too small to compute percentiles: admit sample and note thinness in calibration metadata.

## Requirements

### Functional

- FR-1: Extend `BracketKey` with `solo-tiny` and `solo-small` and add matching entries to `calibration-data.json`.
- FR-2: Introduce a routing helper that takes the analysis result (or explicit profile override) + stars and returns the correct bracket: solo brackets when `isSolo` and stars < 100; community brackets otherwise.
- FR-3: Update all scoring callers currently using `getCalibrationForStars(stars)` to pass the analysis result (or profile) so routing honors solo detection. Community override forces community bracket.
- FR-4: `getBracketLabel` returns "Solo (< 10 stars)" / "Solo (10–99 stars)" for the new brackets; existing community labels unchanged.
- FR-5: `scripts/calibrate.ts` accepts `--profile=solo`: replaces the community bracket set with `solo-tiny` (< 10) and `solo-small` (10–99), filters candidates via a lightweight solo heuristic, and writes results to the two new entries in the JSON output (community entries preserved).
- FR-6: Solo repos with stars ≥ 100 use the nearest community bracket. The scorecard bracket label in that case carries a short note ("calibrated against community repos — limited solo sample").
- FR-7: Update `docs/calibrate-repos.md` to document the `--profile=solo` methodology.

### Non-Functional

- NFR-1: Community bracket calibration values and routing behavior for community repos are unchanged.
- NFR-2: Target sample size ~200 per solo bracket; achievable sample may be smaller and is recorded in `sampleSizes`.

## Success Criteria

- SC-1: A solo-classified repo under 100 stars displays the solo bracket label and its percentiles are interpolated against the solo calibration entry.
- SC-2: `npm run calibrate -- --profile=solo --dry-run` produces a repo list split across `solo-tiny` and `solo-small` with zero community-shape false positives in spot checks.
- SC-3: Toggling to community scoring on a solo repo switches the bracket label back to the community star tier without recomputing the composite inputs twice.

## Out of Scope

- Solo brackets above 100 stars.
- Any change to community bracket data or community bracket routing.
- UI changes beyond the bracket label string (the solo profile banner from #214 already exists).

## Assumptions

- The solo sampling heuristic during calibration mirrors the runtime `detectSoloProjectProfile` rule (3-of-4): ≤ 2 unique commit authors over 90d, ≤ 2 total contributors, maintainer count ≤ 1 (or unavailable), no GOVERNANCE file.
- The calibrate script will fetch the additional solo-detection signals (contributor count, recent commit author count, governance file presence) per candidate during sampling.
