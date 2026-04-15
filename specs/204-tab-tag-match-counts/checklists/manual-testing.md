# Manual Testing — Issue #204: Per-tab match-count badge for active lens filter

Test against `npm run dev` with at least two analyzed repositories (one with discussions enabled, one without; both with code_of_conduct/governance files for best coverage).

- [ ] With no lens active and no search query, no count badges appear on tabs (existing behavior).
- [ ] Click the **Community** lens pill on the Overview/Metric Cards. Tabs Documentation, Contributors, and Activity show numeric badges. Other tabs show no badge.
- [ ] Click the **Governance** lens pill. Tabs Documentation, Contributors, and Security show numeric badges.
- [ ] Clicking the active lens pill again clears the filter. All lens badges disappear.
- [ ] With a lens active, type a search query — search-match badges replace lens badges. Clear the query — lens badges return.
- [ ] A tab with zero matching tagged rows under the active lens shows no badge.
- [ ] Reset the workspace; lens state resets and no badges remain.

## Sign-off

Tested by: arun-gupta
Date: 2026-04-14
