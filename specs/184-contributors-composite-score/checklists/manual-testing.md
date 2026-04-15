# Manual testing — #184 Contributors composite score

- [x] `npm test` passes (all 630 tests).
- [x] `DEV_GITHUB_PAT= npm run build` succeeds.
- [ ] Analyze a repo with many maintainers and verify the "Maintainer depth" pill appears with a non-zero percentile in the Contributors score pane.
- [ ] Analyze a repo with `maintainerCount` unavailable and verify "Maintainer depth" factor is excluded from the composite (no percentile in pill, weights renormalize).
- [ ] Expand the "Show details" section under Contributors score and confirm all 5 factors render with label, weight, per-factor percentile, and description.
- [ ] Confirm two repos with the same top-20% share but different maintainer counts now get different Contributors percentiles.
- [ ] Confirm recommendations view shows per-factor entries (CTR-1 contributor_diversity, CTR-4 maintainer_depth, CTR-5 repeat_contributor_ratio, CTR-6 new_contributor_inflow, CTR-7 contribution_breadth) when inputs are verified.

Signed off by: arun-gupta
