# Phase 0 Research — Selected-only filter toggle (issue #315)

No `[NEEDS CLARIFICATION]` markers are outstanding from the spec. This file captures the small set of design decisions made while preparing the plan, with the alternatives that were considered and rejected.

## Decision 1 — Where `selectedOnly` lives in the filter pipeline

**Decision**: Extend `filterOrgInventoryRows(rows, filters, options?)` in `lib/org-inventory/filters.ts` with an optional `options` parameter that carries `selectedOnly: boolean` and `selectedRepos: string[]`. When `selectedOnly === true`, the function filters to rows whose `repo` slug is in `selectedRepos`. All existing callers continue to work unchanged because the new parameter is optional.

**Rationale**:
- Keeps the filter logic pure and testable — no new React hook, no new module, no state leak out of the component.
- `OrgInventoryView` already calls `filterOrgInventoryRows(results, filters)` inside a `useMemo`; adding the optional options object is a one-line change at the call site.
- The unit tests for `filterOrgInventoryRows` in `lib/org-inventory/filters.test.ts` can extend symmetrically — one new `describe` block for the `selectedOnly` branch.

**Alternatives considered**:
- *Add `selectedOnly` and `selectedRepos` as named fields on `OrgInventoryFilters`.* Rejected: conflates selection (a separate session state) with filter state (archived / language / query). The two have different lifecycles — selection survives filter changes — so mixing them into one object makes reasoning about "reset filters" harder.
- *Introduce a `useSelectedOnly` custom hook.* Rejected: premature abstraction. Single call site; no reuse; extra indirection for zero payoff.
- *Filter in the component body with `.filter(...)` inline after `filterOrgInventoryRows`.* Rejected: the filter pipeline already exists; splitting it across two places makes later edits more error-prone. Consolidating into the single existing pipeline function is clearer.

## Decision 2 — Empty-state copy & recovery affordance

**Decision**: The existing `sortedRows.length === 0` branch in `OrgInventoryView` is split into two cases:

1. **`selectedOnly && selectedRepos.length === 0`** → render "No repositories are currently selected. Check a row's box to add it to your selection, or turn off *Selected only*." with an inline button/link that sets `selectedOnly = false`.
2. **`selectedOnly && selectedRepos.length > 0`** (i.e. the intersection with other filters is empty) → render "Your current filters hide every selected repository. Widen the filters or turn off *Selected only* to see your selection." with an inline button/link that sets `selectedOnly = false`.
3. **Default (no `selectedOnly`)** → retain the existing generic "No matching repositories" message.

**Rationale**: FR-007 requires the empty state to "name the cause and provide a way back to the default view." The two cases differ by cause — nothing selected vs. selection hidden by other filters — and users benefit from knowing which is in play. The inline button satisfies the "way back" requirement without adding a modal.

**Alternatives considered**:
- *Single empty-state with a generic message.* Rejected: the spec's P2 user story is specifically about not leaving users stuck in an unexplained empty state; conflating both cases reintroduces the ambiguity.
- *Toast / modal explanation.* Rejected: adds a dismissible surface for a condition the user can see; in-place copy is both cheaper and more discoverable.

## Decision 3 — Pagination behavior on toggle change

**Decision**: When `selectedOnly` toggles on or off, reset `currentPage` to 1. This mirrors what the component already does when the user edits the text filter, the language filter, the archived filter, or the rows-per-page control.

**Rationale**: Matches existing pattern (FR-009 explicitly requires it). Keeps the interaction model uniform across filter-row controls — users already expect filter changes to land them on page 1.

**Alternatives considered**:
- *Preserve page index across toggle.* Rejected: violates FR-009 and produces the "empty page" problem the spec calls out explicitly.

## Decision 4 — Counter semantics

**Decision**: `{selectedRepos.length} selected · {activeRunRepos.length} after filters` keeps its current meaning. `selectedRepos.length` remains the full selection count, not the visible-subset count.

**Rationale**: FR-006 is explicit. The counter is a trust signal — it must answer "how many repos will the Analyze selected button send?" and that answer never changes based on which filter toggles are on.

**Alternatives considered**:
- *Add a `(M of N visible)` suffix when `selectedOnly` + other filters are active.* Rejected for v1 — adds copy complexity for a condition that is only momentarily interesting. If users later ask for it, it can be appended without restructuring.

## Decision 5 — State ownership

**Decision**: `selectedOnly` lives as a `useState<boolean>` in `OrgInventoryView`, co-located with the other filter-row state (`filters`, `excludeArchivedRepos`, `excludeForks`, `pageSize`, `currentPage`). Default: `false`.

**Rationale**: Mirrors the existing pattern. No new context, no global store, no URL sync — matches constitution §IX (YAGNI) and the session-only persistence contract in the spec.

**Alternatives considered**:
- *Mirror the toggle into the URL query string.* Rejected: cross-session persistence is explicitly out of scope for the spec.
- *Hoist into a reducer-shaped filter state.* Rejected: the component already uses simple `useState` hooks for each slice; introducing a reducer for one new boolean is pure overhead.
