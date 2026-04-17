# UI Contract — Selected-only filter toggle (issue #315)

The feature introduces one new UI control and one new empty-state variant inside the existing `OrgInventoryView`. This contract describes the observable behavior that the component tests MUST verify.

## Control — `Selected only` checkbox

**Location**: In the existing filter row of `OrgInventoryView`, immediately after the `No archived` / `No forks` checkboxes so the three read as a visually-adjacent group.

**ARIA**:
- Element: `<input type="checkbox">` wrapped in a `<label>` (same pattern as the adjacent checkboxes).
- `aria-label="Show only selected repositories"` or equivalent label text paired via the wrapping `<label>`.
- Default state: unchecked (`selectedOnly = false`).

**Interactions**:

| Trigger | Observable effect |
|---|---|
| User checks the box | Table renders the intersection of `selectedRepos` ∩ current filters. Pagination resets to page 1. Counter unchanged. Selection unchanged. |
| User unchecks the box | Table returns to the pre-toggle rows (same `filters` + sort state as before). Pagination resets to page 1. Counter unchanged. Selection unchanged. |
| Toggle is `on` and user unchecks a row's selection checkbox | That row disappears from the visible set (since it no longer matches `selectedOnly`). Counter decrements. Remaining visible rows hold their sorted order. No pagination reset (this is a selection change, not a toggle change). |
| Toggle is `on` and user changes sort order on any column | Rows re-sort using the normal sort rules; the visible row set does not change. No pagination reset beyond the existing sort-change reset. |
| Toggle is `on` and user edits the name search, language filter, or archived filter | Intersection semantics apply: visible rows = `selectedRepos ∩ (archived filter, language filter, name search)`. |

## Empty-state variants

| Condition | Copy (reference — exact wording finalized during implementation) | Recovery affordance |
|---|---|---|
| `selectedOnly` ON AND `selectedRepos.length === 0` | "No repositories are currently selected. Check a row to add it to your selection, or turn off *Selected only*." | Inline button/link that sets `selectedOnly = false`. |
| `selectedOnly` ON AND `selectedRepos.length > 0` AND intersection empty | "Your current filters hide every selected repository. Widen the filters or turn off *Selected only*." | Inline button/link that sets `selectedOnly = false`. |
| `selectedOnly` OFF AND `sortedRows.length === 0` | (Existing copy — unchanged) "No matching repositories". | (Existing.) |

Each empty-state variant MUST be reachable without a modal, toast, or external route change.

## Invariants (verified by tests)

| # | Invariant |
|---|---|
| I-1 | Counter in the header reads `{selectedRepos.length} selected · {activeRunRepos.length} after filters` under every combination of `selectedOnly` and other filters. |
| I-2 | `Analyze selected` button behavior is unchanged. It always operates on the full `selectedRepos` array regardless of `selectedOnly` or other filters. |
| I-3 | Turning `selectedOnly` on or off never mutates `selectedRepos`. |
| I-4 | Deselecting a row from within the filtered view removes it from the visible set AND decrements the counter. |
| I-5 | When `selectedOnly` toggles on or off, `currentPage` becomes 1. |
| I-6 | Sort, rows-per-page, and pagination controls continue to work identically when `selectedOnly` is on — only the underlying row set is narrower. |
| I-7 | The new control is keyboard-accessible: focusable via Tab, operable via Space (same as the adjacent `No archived` / `No forks` checkboxes). |

## Non-requirements (explicit)

- The toggle does not need its own URL query parameter.
- The toggle does not emit analytics / telemetry events (unless the component already does so for the adjacent checkboxes, in which case parity is sufficient — no new event type).
- The toggle does not need a different visual treatment (color, icon) from the existing checkboxes; parity is correct.
