# Manual Testing Checklist: Report Search

**Feature**: 174-report-search
**Created**: 2026-04-13
**Tester**: _pending_
**Date Completed**: _pending_

## Prerequisites

- [ ] Application running locally (`npm run dev`)
- [ ] Authenticated via GitHub OAuth
- [ ] At least 1 repository analyzed successfully

## Search Bar Visibility

- [ ] Search bar is visible in toolbar alongside export controls when analysis results are present
- [ ] Search bar is NOT visible when no analysis results are available (empty state)
- [ ] Search bar has placeholder text indicating its purpose

## Basic Search Functionality

- [ ] Typing a query produces badge counts on matching tabs
- [ ] Match summary displays (e.g., "12 matches across 4 tabs")
- [ ] Clearing the search input removes all badges and highlights
- [ ] Search is case-insensitive (e.g., "critical" matches "Critical")
- [ ] Input is debounced — rapid typing does not cause visual flicker

## Text Highlighting

- [ ] Matching text in the active tab is highlighted with `<mark>` styling
- [ ] Switching to a different tab with matches shows highlights in the new tab
- [ ] Multiple matches in the same tab are all highlighted
- [ ] Highlights are removed when search is cleared

## Usage Examples (from Issue #172)

- [ ] Type `SEC-3` or `ACT-1` — locates recommendation by ID across tabs
- [ ] Type `Critical` or `High` — surfaces risk-level items in Security/Recommendations
- [ ] Type `merge rate` or `stale issues` — finds metric data in Activity/Responsiveness
- [ ] Type `Apache-2.0` or `MIT` — finds license info in Documentation tab
- [ ] Type a repo name (e.g., `facebook/react`) — shows data for that repo across all tabs
- [ ] Type `CONTRIBUTING` or `SECURITY.md` — finds documentation file checks
- [ ] Type a contributor name or `sustainability` — finds contributor metrics
- [ ] Type `Dependabot` or `Branch Protection` — finds security check results

## Edge Cases

- [ ] Empty search query — no badges, no highlights
- [ ] Query with no matches — no badges, summary shows "0 matches"
- [ ] Special characters in query (e.g., `/`, `.`, `-`) — treated as literal text

## Mobile Layout

- [ ] Search bar is visible and usable on mobile viewport (< 640px)
- [ ] Badge counts are readable on mobile tab buttons
- [ ] Overflow tab dropdown shows badge counts on mobile

## Multi-Repo Analysis

- [ ] Analyze 2+ repositories, search for one repo name — matches span multiple tabs
- [ ] Badge counts are accurate across all tabs for multi-repo searches

## Signoff

- **Tester**: _pending_
- **Date**: _pending_
- **Result**: _pending_
