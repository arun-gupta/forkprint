# Plan — 225

## Change surface

`lib/metric-cards/score-config.ts`

- Add `'Documentation'` to `SCORE_CATEGORIES`.
- Add a Documentation entry to `DEFAULT_SCORE_BADGES`.
- In `getScoreBadges`, when `result.documentationResult !== 'unavailable'`, call `getDocumentationScore(...)` and populate value/tone/description/detail. When unavailable, keep the default `'Not scored yet'` placeholder consistent with the other dimensions.

`components/metric-cards/MetricCard.tsx`

- Bump the score-cell grid from `sm:grid-cols-4` to `sm:grid-cols-5` to fit the fifth tile cleanly. Click-proxy logic already lowercases `badge.category` and targets `data-tab-id`, so Documentation routes to the Documentation tab without further changes.

## Tests

`components/metric-cards/MetricCard.test.tsx`

- Extend the navigation test to include a `documentation` fake tab and assert the Documentation tile dispatches a click on it.
- Add a case rendering with a `documentationResult` that produces a score, asserting the Documentation tile renders.

## Out of scope

- Documentation tab content itself (already implemented in P2-F01a).
- Reach / Attention / Engagement tiles (no dedicated tab).
- Lens pills (Community / Governance) — already handled separately.
