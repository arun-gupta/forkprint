# Phase 1 — Quickstart: Project Maturity Signals

Manual smoke-test checklist for a developer validating the feature in a running
dev server. All steps assume the app is running on `http://localhost:3012`.

## 1. Old, active repo (Accelerating trajectory expected)

1. Sign in with GitHub.
2. Analyze `vercel/next.js` (or any ≥ 2-year-old repo with rising recent commits).
3. On the results surface, confirm:
   - Stars card has a secondary caption like `1,200 /yr` (numeric, not "Too
     new").
   - Contributors card has a `… /yr` caption.
   - Commit density card shows a `… /mo` caption.
   - A "Growth Trajectory" indicator renders with color mapped per config
     (Accelerating = green).
   - Hovering the trajectory's "how is this computed?" tooltip lists recent
     commits/mo, lifetime commits/mo, ratio, and the configured cutoffs.
4. Open Comparison with two repos of different ages. Confirm there is a
   "Maturity" section with Age, Stars / year, Contributors / year, Commits /
   month, and Growth Trajectory rows.

## 2. Young, healthy repo (age-guard expected)

1. Analyze a repo younger than 180 days. (Fixture recommendation:
   any newly created public repo with ≥ 3 contributors.)
2. Confirm the Resilience score renders "Insufficient verified public data" and
   the tooltip cites "Repo is younger than the minimum age for confident
   Resilience scoring (180 d)."
3. For a repo younger than 90 days, confirm Activity follows the same pattern.
4. Confirm stars/year, contributors/year, commits/month all show "Too new to
   normalize" rather than an inflated rate.

## 3. Old, dormant repo (Declining trajectory expected)

1. Analyze a ≥ 5-year-old repo with near-zero recent commits.
2. Confirm trajectory label is "Declining" (red badge).
3. Confirm the raw commit counts still display — no synthetic "archived"
   inference.

## 4. Unavailable commits (fallback expected)

1. Find a repo where `defaultBranchRef.target.history.totalCount` does not
   return (rare — may need to simulate by mutating a fixture).
2. Confirm `commits/mo` caption reads "Unavailable", trajectory reads
   "Unavailable", and the per-repo missing-data panel lists "lifetime commit
   count" as a missing source.

## 5. Export round-trip

1. Analyze any healthy repo.
2. Click "Download JSON". Open the file and verify the following keys are
   present per repo: `ageInDays`, `lifetimeCommits`, `starsPerYear`,
   `contributorsPerYear`, `commitsPerMonthLifetime`,
   `commitsPerMonthRecent12mo`, `growthTrajectory`.
3. Click "Download Markdown". Verify the per-repo block has a "Maturity"
   subsection listing the same values.

## 6. Calibration bracket routing

1. With the dev server on, open DevTools console and import the config-loader
   (or run a quick Vitest file) to call `getBracket(500, 200, 'community')` and
   `getBracket(500, 1000, 'community')`. Expected:
   - `getBracket(500, 200, 'community')` returns `'growing-young'` **if** the
     stratum entry has `sampleSize > 0`; otherwise `'growing'` (fallback).
   - `getBracket(500, 1000, 'community')` returns `'growing-mature'` under the
     same rule.
2. With current placeholder entries (`sampleSize: 0`), both calls should return
   `'growing'` — the fallback is active until calibration regenerates under
   #152. This is intended behavior.

## 7. Pre-PR checks

Before opening the PR:

```bash
npm test
npm run lint
DEV_GITHUB_PAT= npm run build
```

All three must pass. E2E (`npm run test:e2e`) is optional locally; CI will run
it.
