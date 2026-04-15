# Implementation Plan: Per-tab match-count badge for active lens filter

## Approach

1. Add `lib/tags/tab-counts.ts` exporting `computeTabTagCounts(results, tag)` returning a `TabMatchCounts` keyed by `ResultTabId`. The helper consults the existing `COMMUNITY_*`, `GOVERNANCE_*`, `CONTRIB_EX_*`, `SUPPLY_CHAIN_*`, `QUICK_WIN_*`, `COMPLIANCE_*` mapping sets and returns 0 for tabs that have no tag-aware rows.
2. Thread `activeTag` and `tagMatchCounts` from `RepoInputClient` into `ResultsShell` via a new prop `tagMatchCounts`. `ResultsShell` chooses which counts to render: search counts (`domMatchCounts`) when `searchQuery` is non-empty, otherwise lens counts.
3. Reuse the existing `badgeCount` rendering on `TabButton` — no styling changes required.
4. Add `lib/tags/tab-counts.test.ts` with fixtures covering: documentation file/section + licensing pane, contributors metrics, activity cards + discussions card, responsiveness panes, security scorecard + direct checks. Cases include all-present, mixed, and all-missing.

## Files Changed

- `lib/tags/tab-counts.ts` (new)
- `lib/tags/tab-counts.test.ts` (new)
- `components/app-shell/ResultsShell.tsx` (accept + select between match-count sources)
- `components/repo-input/RepoInputClient.tsx` (compute tag counts, pass to shell)

## Constitution Verification

- No new tech (§I).
- No new data sources (§III); helper reads existing `AnalysisResult` fields.
- Analyzer module untouched (§IV).
- Tests added before/with implementation (§XI).
