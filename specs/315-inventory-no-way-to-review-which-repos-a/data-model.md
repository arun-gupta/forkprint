# Data Model — Selected-only filter toggle (issue #315)

This feature does not introduce new persistent entities. It adds one slice of React component state and extends one existing pure function signature.

## New state slice — `selectedOnly`

| Field | Type | Default | Owner | Scope |
|---|---|---|---|---|
| `selectedOnly` | `boolean` | `false` | `OrgInventoryView` (React component state, `useState<boolean>`) | Session-only. Resets to `false` on full page reload (no `localStorage`, no URL sync). |

**Transitions:**
- `false → true` when user checks the **Selected only** checkbox.
- `true → false` when user unchecks the **Selected only** checkbox, **or** clicks the "turn off Selected only" inline affordance inside the empty-state copy.
- Selection changes (checkbox in the table body) do NOT mutate `selectedOnly`.
- Other filter changes (query, language, archived, rows-per-page, pagination) do NOT mutate `selectedOnly`.

**Invariants:**
- `selectedOnly = true` AND `selectedRepos.length = 0` → empty state variant "nothing selected".
- `selectedOnly = true` AND `selectedRepos.length > 0` AND intersection with other filters = ∅ → empty state variant "filters hide all selected".
- Any change to `selectedOnly` triggers `setCurrentPage(1)`.

## Extended existing function — `filterOrgInventoryRows`

Current signature:

```ts
export function filterOrgInventoryRows(
  rows: OrgRepoSummary[],
  filters: OrgInventoryFilters
): OrgRepoSummary[]
```

New signature (third argument is optional; all existing callers remain valid):

```ts
export interface SelectedOnlyOptions {
  selectedOnly: boolean
  selectedRepos: string[]
}

export function filterOrgInventoryRows(
  rows: OrgRepoSummary[],
  filters: OrgInventoryFilters,
  options?: SelectedOnlyOptions
): OrgRepoSummary[]
```

Behavior:
- When `options` is undefined or `options.selectedOnly === false`, the function returns the same result it does today.
- When `options.selectedOnly === true`, the function applies its current filter pipeline, then filters the result to rows whose `repo` slug is in `options.selectedRepos`.
- `options.selectedRepos` is treated as an unordered set; duplicate entries produce no extra work.

## Derived state — `filteredRows` / `sortedRows` / `paginatedRows`

Unchanged shapes. Their inputs expand by one optional parameter:

```
results
  │
  ▼
filterOrgInventoryRows(results, filters, { selectedOnly, selectedRepos })
  │            ↳ new third arg
  ▼ filteredRows
sortOrgInventoryRows(filteredRows, sortColumn, sortDirection)
  ▼ sortedRows
paginatedRows = sortedRows.slice(start, end)
```

## Unchanged — `selectedRepos`, `filters`, `excludeArchivedRepos`, `excludeForks`, `currentPage`, `pageSize`

These state slices retain their current shape and semantics. The feature does not re-home or rename any of them.

## Non-changes

- No new API endpoint.
- No new GraphQL query.
- No change to `OrgRepoSummary` or `OrgInventoryResponse`.
- No change to the analyzer module.
- No new config keys.
- No new export or comparison behavior.
