# Tasks — 190

1. Add failing tests in `components/metric-cards/MetricCard.test.tsx` for clickable score-badge tiles (Contributors, Activity, Responsiveness, Security).
2. Extend `ScorecardCell` with optional `onClick` + `ariaLabel`; render as `<button>` when `onClick` is set, with hover/focus styles.
3. Wire score-cell click handlers to dispatch a click on the matching tab via `document.querySelector('[role="tab"][data-tab-id="<id>"]')`.
4. Run `npm test` and `npm run lint`; fix failures.
5. Update manual testing checklist and mark acceptance complete.
