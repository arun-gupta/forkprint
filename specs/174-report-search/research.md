# Research: Report Search

## Search Approach

**Decision**: Data-driven text index built from AnalysisResult[] and rendered tab content, with case-insensitive substring matching.

**Rationale**: The issue specifies a data-driven approach where "the search builds an index from the analysis results." This is more reliable than DOM-scanning because:
- It works for tabs that aren't currently rendered (only the active tab is in the DOM)
- It produces deterministic match counts without mounting hidden tabs
- It avoids complex DOM traversal and mutation

**Alternatives considered**:
- DOM text scanning (rejected: only active tab is mounted; would require mounting all 8 tabs simultaneously)
- Fuzzy search with libraries like Fuse.js (rejected: issue specifies literal substring matching; adds a dependency; constitution YAGNI)
- Full-text search index (rejected: over-engineering for the scale of 1-10 repos across 8 tabs)

## Text Indexing Strategy

**Decision**: Build a per-tab array of searchable text strings extracted from AnalysisResult data, keyed by tab ID. Each tab's index function extracts the text content that would appear when rendered.

**Rationale**: Each tab view renders specific fields from AnalysisResult. The index mirrors this by extracting the same fields as plain text. This ensures match counts are accurate relative to what the user sees.

**Approach**:
- `buildSearchIndex(results: AnalysisResult[]): Record<ResultTabId, string[]>` — one function per tab that extracts searchable strings
- Match counting: count occurrences of query substring in each tab's text array
- Highlighting: wrap matching substrings in `<mark>` in the active tab's rendered content

## Highlighting Strategy

**Decision**: Use a React component `SearchHighlighter` that wraps text content and splits/highlights matching substrings at render time.

**Rationale**: This avoids mutating the DOM after render (which causes React reconciliation issues). Instead, text nodes are split into highlighted and non-highlighted segments during render.

**Alternatives considered**:
- CSS Custom Highlight API (rejected: limited browser support as of 2026, Safari partial)
- DOM mutation with TreeWalker (rejected: conflicts with React's virtual DOM)
- dangerouslySetInnerHTML with regex replacement (rejected: XSS risk, React anti-pattern)

## Debounce Implementation

**Decision**: Use a simple `useEffect` + `setTimeout` pattern with 300ms delay.

**Rationale**: This is a common React pattern that doesn't require external dependencies. The debounce only affects when the search index is queried, not the input value itself (input remains responsive).

## Badge Count Display

**Decision**: Pass match counts as a `Record<ResultTabId, number>` to ResultsTabs, which displays non-zero counts as badges in the tab buttons.

**Rationale**: This is the minimal change to the existing tab system — ResultsTabs receives an optional map and renders badges when present. Zero counts are not displayed.

## State Management

**Decision**: Search state (query, debounced query, match counts) lives in RepoInputClient and is passed down through ResultsShell to ResultsTabs and tab content.

**Rationale**: RepoInputClient already manages the analysis response and toolbar. Adding search state here keeps the data flow consistent with existing patterns (e.g., activeTag, exportToolbar).
