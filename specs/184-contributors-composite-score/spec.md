# 184 — Contributors score composite

Source issue: [#184](https://github.com/arun-gupta/repo-pulse/issues/184)

## Problem

`getContributorsScore()` is computed from a single signal — top-20% commit concentration — so two repos with identical concentration but wildly different maintainer counts or repeat-contributor ratios get the same Contributors percentile. That does not match the Contributors tab, which already surfaces those additional signals.

## Solution

Rework `getContributorsScore()` into a weighted composite mirroring Activity and Responsiveness (`weightedFactors`). Sub-factors and initial weights (pending #152 recalibration):

| Sub-factor | Weight | Signal | Direction |
|---|---|---|---|
| Contributor concentration | 40% | Top-20% commit share | lower-is-better (existing calibration) |
| Maintainer depth | 15% | Maintainer count (CODEOWNERS/MAINTAINERS/OWNERS/GOVERNANCE) | higher-is-better (heuristic) |
| Repeat-contributor ratio | 20% | Repeat / active contributors in window | higher-is-better (heuristic) |
| New-contributor inflow | 10% | New / active contributors in window | project-lifecycle curve (peak ~0.4) |
| Contribution breadth | 15% | Commits + PRs + issues presence | presence signal (33/66/99) |

Weights renormalize across available factors so `unavailable` inputs are excluded — never counted as zero.

## Acceptance criteria (from issue)

- [x] `ContributorsScoreDefinition` exposes a `weightedFactors` array analogous to Activity/Responsiveness.
- [x] Each sub-factor produces a percentile against the calibrated peer set; the bucket percentile is a weighted composite.
- [x] When a sub-factor's input is `unavailable`, it is excluded from the weighted average (weights renormalize).
- [x] `ContributorsScorePane` shows a "How is this scored?" / details section with per-sub-factor percentiles.
- [x] Recommendations are emitted per sub-factor (`CTR-4..7` added).
- [ ] Calibration refresh tracked in #152 covers the new sub-factors.

## Out of scope

- Changing Contributors bucket's 23% composite weight.
- Experimental org-attribution signals (Elephant Factor, Single-vendor dependency ratio).
- Cross-bucket moves — Community scoring belongs to #70.
