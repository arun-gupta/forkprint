# Data Model: Report Search

## Entities

### SearchState

Represents the current search context passed through the component tree.

| Field | Type | Description |
|-------|------|-------------|
| query | string | Raw input value (updates immediately on keystroke) |
| debouncedQuery | string | Query after 300ms debounce (triggers search execution) |
| matchCounts | Record<ResultTabId, number> | Number of matches per tab (0 if no matches) |
| totalMatches | number | Sum of all tab match counts |
| matchedTabCount | number | Number of tabs with at least one match |

### SearchIndex

Pre-computed searchable text extracted from analysis results, keyed by tab ID.

| Field | Type | Description |
|-------|------|-------------|
| entries | Record<ResultTabId, string[]> | Array of searchable text strings per tab |

## State Transitions

```
No Results → (analysis completes) → Idle (search bar visible, empty query)
Idle → (user types) → Typing (query updates immediately, debounce timer starts)
Typing → (300ms passes) → Searching (debouncedQuery updates, index queried)
Searching → (results computed) → Active (badges shown, highlights rendered)
Active → (user clears input) → Idle (badges removed, highlights cleared)
Active → (user types new query) → Typing (cycle repeats)
```

## Validation Rules

- Empty query produces zero matches (no badges, no highlights)
- Query is trimmed before matching — leading/trailing whitespace is ignored
- Special characters are treated as literal text (no regex interpretation)
- Match counting is case-insensitive
