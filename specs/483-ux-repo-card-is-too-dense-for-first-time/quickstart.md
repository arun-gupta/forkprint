# Quickstart: Repo Card Progressive Disclosure

**Feature**: 483-ux-repo-card-is-too-dense-for-first-time  
**Date**: 2026-04-27

## What changes

One file is primarily changed: `components/metric-cards/MetricCard.tsx`.

Two test files are updated: `components/metric-cards/MetricCard.test.tsx` (new tests) and a Playwright E2E test.

## Development setup

```bash
npm run dev        # start dev server (already running on port 3010)
npm test           # run Vitest unit tests
npm run lint       # ESLint check
npm run typecheck  # tsc --noEmit
```

## How to verify the feature manually

1. Open the app and analyze any repo (e.g. `facebook/react`)
2. Confirm: card shows health score + 3 ecosystem tiles, but NOT the dimension tiles/lenses/details
3. Click "Show details" → secondary tier expands
4. Click "Hide details" → secondary tier collapses
5. Expand, reload page → card re-opens expanded
6. Run a Foundation (CNCF Sandbox) scan on the same repo, then switch back to the Overview tab → verify CNCF badge appears in the card header

## Key invariants to preserve

- The existing header chevron (pane collapse) still works independently
- All existing test IDs remain unchanged
- Solo-project banner, override toggle, and solo scoring all work unchanged
- Lens pill filtering (`onTagChange`) continues to work in expanded state
- Tab navigation from dimension tiles continues to work in expanded state
