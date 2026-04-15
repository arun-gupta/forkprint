# 225 — Documentation card on Overview

**Issue:** [#225](https://github.com/arun-gupta/repo-pulse/issues/225)

## Problem

The Overview scorecard renders summary tiles for Contributors, Activity, Responsiveness, and Security, but omits Documentation. Documentation is a scored CHAOSS dimension (P2-F01a, 12% of the composite OSS Health Score) with its own tab elsewhere in the app, so its absence makes the composite score opaque — users see 4 of the 5 contributing dimensions.

## Behavior

A fifth score-badge tile, **Documentation**, appears on the Overview metric card alongside Contributors, Activity, Responsiveness, and Security.

| Tile | Target tab |
|---|---|
| Documentation | `documentation` |

The tile follows the same conventions as the other dimension tiles (per #190):

- Shows the Documentation percentile score, or `Insufficient verified public data` when the analyzer cannot produce a score.
- Brief detail line — top recommendation category (e.g. "Files strongest"), or sub-score summary.
- Click navigates to the Documentation tab via the same `[role="tab"][data-tab-id="documentation"]` proxy used for the other tiles.
- Keyboard-accessible (`<button>` with `aria-label="Open Documentation tab"`), same hover/focus styling.

## Acceptance

- [ ] Documentation tile appears on the Overview scorecard alongside Contributors / Activity / Responsiveness / Security.
- [ ] Tile shows the Documentation score, or `Insufficient verified public data` when the documentation analyzer result is unavailable.
- [ ] Tile is keyboard-accessible and navigates to the Documentation tab on click.
- [ ] No regression on existing Overview test coverage.

## Related

- #190 — scorecard tiles clickable (this tile inherits the same affordance)
- P2-F01a (#66) — Documentation scoring
