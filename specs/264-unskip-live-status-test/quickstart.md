# Quickstart: verify the FR-016a test locally

## Prerequisites

- Node 20+, `npm ci` already run
- Currently on branch `264-investigate-skipped-test-per-repo-status`

## Run the single test

```bash
npm test -- components/shared/hooks/useOrgAggregation.test.tsx
```

Expected: all three tests pass, zero skipped.

## Flake check (SC-002 — 20×)

```bash
for i in $(seq 1 20); do
  npm test -- components/shared/hooks/useOrgAggregation.test.tsx --run \
    || { echo "FLAKE on iteration $i"; break; }
done
```

Expected: 20 consecutive passes, no early-break message.

## Regression-injection sanity check (SC-003)

To confirm the un-skipped test *would* catch a regression, temporarily edit
`components/shared/hooks/useOrgAggregation.ts`'s `applyEvent` so the `'started'`
branch returns `r` unchanged (skipping the `in-progress` mutation), then run:

```bash
npm test -- components/shared/hooks/useOrgAggregation.test.tsx
```

Expected: the `per-repo status list updates live as repos complete (FR-016a)`
test fails with an assertion that `perRepoStatusList[0]?.status` was `'queued'`
instead of `'in-progress'`. Revert the edit afterward.

## Full suite

```bash
npm test
npm run lint
npm run build
```

All three must be green before opening the PR (Definition of Done §XII).
