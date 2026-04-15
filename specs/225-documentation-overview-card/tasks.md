# Tasks — 225

1. Add failing tests in `components/metric-cards/MetricCard.test.tsx` covering: (a) Documentation tile rendered on the scorecard, (b) clicking it navigates to the Documentation tab.
2. Extend `lib/metric-cards/score-config.ts`: add `'Documentation'` to `SCORE_CATEGORIES`, add the default badge, and wire `getDocumentationScore` into `getScoreBadges`.
3. Update `components/metric-cards/MetricCard.tsx` grid layout to fit five score tiles (`sm:grid-cols-5`).
4. Run `npm test` and `npm run lint`; fix failures.
5. Complete the manual testing checklist and open a PR.
