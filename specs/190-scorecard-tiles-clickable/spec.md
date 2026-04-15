# 190 — Scorecard tiles clickable (tab navigation)

**Issue:** [#190](https://github.com/arun-gupta/repo-pulse/issues/190)

## Problem

The four scored-dimension tiles on the metric scorecard (Contributors, Activity, Responsiveness, Security) render as static visual surfaces. They look like navigational cards but do nothing when clicked.

## Behavior

Each scored-dimension tile becomes a `<button>` that, when activated, switches the results-shell active tab to the dimension's tab.

| Tile | Target tab |
|---|---|
| Contributors | `contributors` |
| Activity | `activity` |
| Responsiveness | `responsiveness` |
| Security | `security` |

Tiles without a dedicated tab (Reach, Attention, Engagement) remain non-interactive in this change.

The Community lens pill already has a click behavior (toggles the lens filter) and is out of scope for this change; see PR discussion for whether to add a secondary `/baseline` link.

## Implementation

Follow the existing "see Recommendations tab" click-proxy pattern in `components/metric-cards/MetricCard.tsx:86-95`: locate the target tab button via `document.querySelector('[role="tab"][data-tab-id="<id>"]')` and dispatch a click.

The `ScorecardCell` component gets an optional `onClick` + `ariaLabel`; score cells pass both, profile cells do not.

## Acceptance

- [x] Each of the 4 score-badge tiles is clickable
- [x] Click navigates the results shell to the matching tab
- [x] Tiles are keyboard-accessible (Tab + Enter/Space) when rendered as `<button>`
- [x] `aria-label` present on each clickable tile
- [x] Visible hover/focus state
- [x] No regression on existing scorecard test coverage
