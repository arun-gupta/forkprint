# Plan — 190

## Change surface

`components/metric-cards/MetricCard.tsx`

- Extend `ScorecardCellProps` with optional `onClick?: () => void` and `ariaLabel?: string`.
- When `onClick` is provided, render the cell as a `<button type="button">` with focus/hover styles; otherwise keep the `<div>`.
- For `scoreCells`, map each `badge.category` → tab id (lowercase) and attach an `onClick` that finds `[role="tab"][data-tab-id="<id>"]` and clicks it. Provide `ariaLabel` like `Open Activity tab`.

## Tests

`components/metric-cards/MetricCard.test.tsx` — add a case that renders `MetricCard` inside a DOM containing a fake tab button (`role="tab"`, `data-tab-id="activity"`), clicks the Activity tile, asserts the fake tab was clicked. Same for Contributors.

## Out of scope

- Community lens pill behavior (already clickable).
- Reach / Attention / Engagement tiles (no dedicated tab — see issue open question).
