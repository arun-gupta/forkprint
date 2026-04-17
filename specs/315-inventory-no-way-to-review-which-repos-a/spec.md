# Feature Specification: Review selected repos in org-inventory table

**Feature Branch**: `315-inventory-no-way-to-review-which-repos-a`
**Created**: 2026-04-16
**Status**: Draft
**Input**: User description: "Allow users to review which repos are currently in their selection from the org-inventory Repositories table without scrolling or paginating through all rows. See GitHub issue #315 for details — selecting repos updates the \"X selected · Y after filters\" counter but offers no way to audit which specific repos are in the selection. Implement a \"Selected only\" filter toggle (the cheapest option from the issue) that filters the table to show only currently-selected repos, allowing users to see/verify/deselect them in one view before clicking \"Analyze selected\". Must coexist with existing filter toggles (No archived, No forks) and preserve selection state when toggled on/off. Session-only selection (persistence is explicitly out of scope per the issue)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Audit my current selection before committing to analysis (Priority: P1)

A user on the org-inventory Repositories table selects several repositories across multiple pages, filters, or sort orders. Before clicking **Analyze selected (N)**, they want to see exactly which repositories are in the current selection — without scrolling through all rows or paginating to find checked rows. Turning on a **Selected only** filter collapses the table to just the N selected rows so the user can verify, deselect any mistakes, and then commit to the analysis with confidence.

**Why this priority**: This is the entire point of the issue. Without a way to audit the current selection, users either over-scope by clicking **Analyze all** (wasting quota) or hunt row-by-row to confirm their picks. On large orgs (e.g. nvidia, 710 repos), neither option is acceptable. Fixing this is the difference between a trustworthy bulk-analysis affordance and one that forces users around it.

**Independent Test**: Load the org-inventory Repositories table for an org with enough repos to paginate. Check four rows spread across different pages and/or different filter states. Turn on **Selected only**. Verify the table renders exactly those four rows, the counter still reads `4 selected · ...`, and nothing else appears. Deselect one row from within the filtered view; the counter decrements to `3 selected`, and only the remaining three rows are shown.

**Acceptance Scenarios**:

1. **Given** the Repositories table is loaded with N repos and the user has selected exactly M of them (M ≥ 1), **When** the user turns on the **Selected only** toggle, **Then** the table shows exactly those M rows, pagination reflects M rows (not N), and the existing selection counter still reports `M selected`.
2. **Given** **Selected only** is on and M rows are visible, **When** the user unchecks one of the visible rows, **Then** that row disappears from the filtered view, the counter decrements to `M−1 selected`, and the remaining rows stay visible in the same order.
3. **Given** **Selected only** is on, **When** the user turns it off, **Then** the table returns to whatever filter and pagination state was in effect before **Selected only** was turned on, and the full selection (same repos checked) is preserved.
4. **Given** **Selected only** is on, **When** the user changes sort order on a column, **Then** the filtered selection rows re-sort according to that column using the same rules as the unfiltered table.
5. **Given** **Selected only** is on with M rows visible, **When** the user clicks **Analyze selected**, **Then** the analysis launches against those same M repos (no change in which repos are sent).

---

### User Story 2 — Recover from an empty selection state without getting stuck (Priority: P2)

A user turns on **Selected only** when they have not yet selected any repos, or they deselect their last remaining repo from within the filtered view. The table must make it clear that the selection is empty and give the user a one-click way back to the full table — not leave them staring at an empty grid with no explanation.

**Why this priority**: An empty-state dead-end after a filter toggle is a classic UX trap. Without explicit handling, the user sees a blank table, assumes something broke, and loses trust in the inventory view. P2 rather than P1 because it only affects users who reach the empty state, but fixing it costs very little.

**Independent Test**: Load the table with zero repos selected, turn on **Selected only**. Observe an empty-state message explaining that no repos are currently selected and offering a way to turn the filter back off (or that clearly points to the selection checkboxes in the main table view).

**Acceptance Scenarios**:

1. **Given** no repos are selected, **When** the user turns on **Selected only**, **Then** the table area shows an empty-state message that names the cause ("no repositories are currently selected") and provides a way to turn off the **Selected only** toggle.
2. **Given** **Selected only** is on with M rows visible, **When** the user deselects all M rows one by one, **Then** after the last deselect the table transitions to the same empty-state message from scenario 1 rather than going blank silently.

---

### User Story 3 — Selected-only view coexists with existing filters (Priority: P3)

Existing **No archived** and **No forks** toggles remain available. When **Selected only** is on, the user can still apply **No archived** / **No forks**, and the visible rows are the intersection: selected AND matching the other filters. This lets the user see, for example, "just my selected non-archived repos" — and makes it visible if one of their selections is itself archived.

**Why this priority**: The issue explicitly requires **Selected only** to coexist with the existing filter toggles. P3 because the core value (seeing the current selection) is delivered even if filter composition were basic; intersection semantics are the polished behavior users expect from a filter row.

**Independent Test**: Select five repos, at least one of which is archived. Turn on **Selected only** — all five are visible. Then turn on **No archived** — the archived one is hidden but still counted as selected; the counter still shows `5 selected`, and the visible row count reflects only the 4 non-archived selected repos. Turn **No archived** off and the hidden row reappears.

**Acceptance Scenarios**:

1. **Given** **Selected only** is on and **No archived** is on, **When** the user views the table, **Then** only rows that are both selected AND not archived are shown.
2. **Given** **Selected only** is on and the user has a text filter (e.g. repo name search) active, **When** the search term matches a subset of the selected repos, **Then** the table shows only the selected repos that also match the search term, and the selection counter still reflects the full selection size (not the visible-subset size).
3. **Given** any combination of filters is applied while **Selected only** is on, **When** the user turns **Selected only** off, **Then** the other filters remain in their prior state and the table re-renders with them applied to the full repo list.

---

### Edge Cases

- **All repos selected**: When every repo in the org is selected, turning on **Selected only** produces a table identical to the unfiltered view. The toggle state is still reflected accurately (it's on) and turning it off is a no-op to the visible rows but a state change to the toggle.
- **Selection that no longer exists in the current org data**: Not reachable in scope. Selection is session-only and lives on top of the currently loaded org inventory; there is no scenario where a selected repo isn't in the underlying data set.
- **Page size vs. selection size**: If M (selected) is smaller than the current rows-per-page, pagination controls collapse accordingly rather than showing empty pages.
- **Sort order of visible rows**: **Selected only** does not change sort rules. Current sort order is preserved; selected rows appear in their sorted position within the filtered view.
- **Selection state persisting across `Selected only` toggle**: Selection is never cleared or reduced when the toggle is turned on or off. Only explicit checkbox interactions change selection.
- **Interaction with pagination**: When **Selected only** is on and the visible row count changes, the user is returned to the first page of the filtered view to avoid the "empty page" confusion.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The org-inventory Repositories table MUST expose a **Selected only** filter toggle in the same filter row as the existing **No archived** and **No forks** toggles.
- **FR-002**: When **Selected only** is on, the table MUST render only the rows whose repo is currently in the user's session selection.
- **FR-003**: Toggling **Selected only** on or off MUST NOT modify the user's selection. Only explicit checkbox clicks modify selection state.
- **FR-004**: When **Selected only** is on, unchecking a row's selection checkbox MUST remove that row from the filtered view and decrement the `N selected` counter.
- **FR-005**: When **Selected only** is on and the user has applied other filters (archived, forks, name search, language, etc.), the visible rows MUST be the intersection: selected AND matching all other active filters.
- **FR-006**: The selection counter in the header MUST continue to reflect the full selection size regardless of the **Selected only** state or other active filters.
- **FR-007**: When **Selected only** is on and zero rows match (either because nothing is selected or because no selected row passes the other filters), the table area MUST show an empty-state message that names the cause and provides a way back to the default view.
- **FR-008**: Column sort behavior MUST continue to function identically when **Selected only** is on — sort keys, direction, and rules are unchanged; only the row set being sorted is narrower.
- **FR-009**: Pagination controls MUST adjust to the visible (filtered) row count when **Selected only** is on; when the visible count changes, the view MUST reset to page 1 so users never land on an empty page.
- **FR-010**: The **Selected only** toggle state MUST be session-only, matching the existing selection model — no cross-session persistence.
- **FR-011**: The **Analyze selected** action MUST operate on the full selection regardless of **Selected only** state and regardless of other filters currently applied.
- **FR-012**: Clearing the full selection (e.g. via an explicit **Clear selection** action, if one exists or is added) MUST leave **Selected only** in its current toggle state but fall through to the empty-state message per FR-007.
- **FR-013**: The toggle MUST be keyboard-accessible (focusable, operable with the same keys as the existing filter toggles it sits alongside) and expose its on/off state to assistive technologies.

### Key Entities

- **Repo selection (session)**: The set of `owner/repo` slugs the user has checked in the current inventory view. Lives for the lifetime of the browser session. Not persisted.
- **Filter state**: The currently active filter toggles in the inventory filter row. Now includes **Selected only** alongside the existing entries. Lives in component state; not persisted.
- **Visible row set**: The derived set of repos rendered in the table. Computed as: org repos → filter intersection (archived / forks / search / ... / selected-only) → sorted → paginated.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user on a large org (500+ repos) with repos selected across multiple pages can confirm the full contents of their selection within one interaction (one click on the **Selected only** toggle), without scrolling or paginating through the full row set.
- **SC-002**: In user testing of the **Analyze selected** flow on a 500+-repo org with a non-contiguous selection, 100% of test users can correctly name every repo in their selection before clicking **Analyze selected** — compared to the baseline where the information is not observable at all.
- **SC-003**: Turning **Selected only** on or off produces the visible-row update within typical UI-interaction latency (perceptibly immediate; no new network request, no reload of the org inventory).
- **SC-004**: The counter label and the filtered row count remain consistent across every combination of filters; zero test scenarios produce a mismatch between what the counter says and what **Selected only** displays (subject to FR-006's definition: counter = total selection, visible rows = filtered intersection).
- **SC-005**: Zero regressions in existing inventory-table behaviors: sort, pagination, other filter toggles, **Analyze selected**, **Analyze all**, and row-level links into per-repo analysis all continue to work exactly as before when **Selected only** is off.

## Assumptions

- The existing session-only selection model (checkbox column + `N selected · M after filters` counter + **Analyze selected (N)** button) is already implemented and is the foundation this feature sits on top of. No new selection mechanics are introduced.
- The existing filter row already hosts **No archived** and **No forks** toggles and is the natural location for the new **Selected only** toggle. No structural redesign of the filter row is required.
- Session-only selection persistence is unchanged and explicitly out of scope for this feature, per the issue.
- The feature ships within the existing org-inventory Repositories table view; it does not affect per-repo analysis, comparison, export, or any non-inventory surface.
- Empty-state copy inside the table area for the "no rows match" case is the correct surface for the explanation; a modal or toast is not required.
- The **Analyze selected** button's existing behavior (operates on the full selection, not the visible subset) is correct and remains unchanged.
