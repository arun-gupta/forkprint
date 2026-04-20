# Quickstart — Org Recommendations tab

Manual test walkthrough for the feature.

## Prerequisites

- Dev server running on `http://localhost:3011` (already running for this worktree).
- Signed in via GitHub OAuth **or** `DEV_GITHUB_PAT` set in `.env.local`.

## A — `/demo/organization` smoke test (FR-015, SC-004)

1. Navigate to `http://localhost:3011/demo/organization`.
2. Wait for the demo aggregation to complete (it uses fixture data, should be instantaneous).
3. **Expect**: the tab strip shows `Overview · Contributors · Activity · Responsiveness · Documentation · Governance · Security · Recommendations`.
4. Click the **Recommendations** tab.
5. **Expect**: one or more bucket sections render (Activity / Responsiveness / Contributors / Documentation / Security in that order, skipping any that have zero items). Each section lists its aggregated recommendations sorted by affected-repo count descending.
6. Expand any aggregated entry.
7. **Expect**: the list of affected repo slugs appears, alphabetically sorted, and its length equals the "N of M repos" count shown in the header.

## B — Live org run (FR-001, FR-002, US1-4)

1. Navigate to `http://localhost:3011`.
2. In the org input, enter an organization with a mix of repos — e.g. `facebook`, `google`, or a small personal org where some repos are missing common governance files.
3. Submit to start the org-aggregation run.
4. While the run is in-progress, click the **Recommendations** tab (once at least one repo has completed).
5. **Expect** (in-progress): aggregated entries render with denominators reflecting only the repos completed so far.
6. Wait for the run to complete.
7. **Expect** (final):
   - Each aggregated recommendation shows `<ID> · <title> · N of M repos`.
   - Buckets with zero items are not rendered.
   - Within each bucket, higher counts come first; ties broken by catalog ID asc.
   - Expanding any entry shows its affected repos, alphabetical order, length == N.

## C — Empty run (edge case — FR-012)

1. Run an aggregation on a single clean repo (e.g. the user's own repo that's fully set up with README, LICENSE, SECURITY.md, branch protection, etc.).
2. Open the **Recommendations** tab.
3. **Expect**: the tab is still present. The body renders an empty-state message such as "No systemic issues found across the N analyzed repos."

## D — Regression guard (FR-017, FR-018, SC-005)

1. Open a single-repo report (not an org run).
2. Navigate to its per-repo **Recommendations** tab.
3. **Expect**: the view renders exactly as it did before this feature — no changes to the per-repo Recommendations surface.

## E — Automated checks before PR

Run from the repo root:

```bash
npm test
npm run lint
DEV_GITHUB_PAT= npm run build
npm run test:e2e          # includes /demo/organization smoke
```

All must pass. The unit tests for the aggregator and the RTL tests for `OrgRecommendationsPanel` are the primary regression guards; `npm run build` asserts the bucket-visibility filter still compiles with the narrowed union.
