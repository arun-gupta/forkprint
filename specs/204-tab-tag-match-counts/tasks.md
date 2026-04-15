# Tasks: Per-tab match-count badge for active lens filter

- [x] T01 Add `lib/tags/tab-counts.ts` with `computeTabTagCounts(results, tag)` covering documentation, contributors, activity, responsiveness, security tabs.
- [x] T02 Add `lib/tags/tab-counts.test.ts` with fixtures for community + governance + contrib-ex tags (mixed/present/missing).
- [x] T03 Wire `tagMatchCounts` prop through `ResultsShell`; prefer search counts when `searchQuery` is non-empty.
- [x] T04 Compute tag counts in `RepoInputClient` and pass to `ResultsShell`.
- [x] T05 Manual testing checklist completed.
