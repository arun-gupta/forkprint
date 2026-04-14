# Quickstart: Report Search

## What this feature does

Adds a free-text search bar to the report toolbar that searches across all 8 dashboard tabs. Shows match count badges on tab buttons, highlights matching text in the active tab, and displays a match summary.

## Key files to modify

| File | Change |
|------|--------|
| `components/repo-input/RepoInputClient.tsx` | Add search state, wire search bar into toolbar alongside ExportControls |
| `components/app-shell/ResultsShell.tsx` | Pass matchCounts to ResultsTabs |
| `components/app-shell/ResultsTabs.tsx` | Accept optional matchCounts prop, render badges on tab buttons |

## Key files to create

| File | Purpose |
|------|---------|
| `components/search/ReportSearchBar.tsx` | Search input + match summary display |
| `components/search/SearchHighlighter.tsx` | Wraps text and highlights matching substrings |
| `lib/search/search-index.ts` | Builds searchable text index from AnalysisResult[] |
| `lib/search/search-engine.ts` | Executes case-insensitive substring search against index |

## How to test locally

1. `npm run dev` — start the dev server
2. Authenticate via GitHub OAuth
3. Analyze 1+ repositories
4. Verify search bar appears in toolbar next to export controls
5. Type a query (e.g., `SEC-3`, `Critical`, repo name) and verify:
   - Badge counts appear on matching tabs
   - Match summary shows total count
   - Highlighted text appears in the active tab
6. Clear the search and verify all highlights/badges disappear
7. Test on mobile viewport (< 640px)

## TDD order

1. `search-engine.test.ts` — pure logic: substring matching, case insensitivity, empty query
2. `search-index.test.ts` — index builder: extracts correct text per tab from mock AnalysisResult
3. `ReportSearchBar.test.tsx` — component: input rendering, debounce, summary display
4. `SearchHighlighter.test.tsx` — component: text splitting, mark rendering, edge cases
5. Integration tests in existing tab test files if needed
