# Feature Specification: Report Search

**Feature Branch**: `174-report-search`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "Add search across the generated report (GitHub Issue #172)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search for a Specific Recommendation by ID (Priority: P1)

A user has analyzed multiple repositories and wants to quickly locate a specific recommendation (e.g., `SEC-3` or `ACT-1`). They type the recommendation ID into the search bar in the toolbar. The system shows badge counts on each tab indicating matches, highlights the matching text in the active tab, and displays a summary of total matches across all tabs.

**Why this priority**: Finding specific recommendations by ID is the most targeted and common search use case. It validates the full search pipeline: indexing, badge counts, highlighting, and summary.

**Independent Test**: Can be fully tested by analyzing any repository, typing a known recommendation ID, and verifying the match count badge, text highlight, and summary appear correctly.

**Acceptance Scenarios**:

1. **Given** analysis results are displayed, **When** the user types `SEC-3` in the search bar, **Then** tabs containing that ID show badge counts and the matching text is highlighted in the active tab
2. **Given** a search query is active, **When** the user switches to a tab with matches, **Then** the matching text in that tab is highlighted
3. **Given** a search query is active, **When** the user clears the search input, **Then** all highlights and badge counts are removed

---

### User Story 2 - Filter by Risk Level Across Tabs (Priority: P1)

A user wants to see all "Critical" or "High" severity items across the report. They type `Critical` in the search bar and immediately see which tabs contain critical items, with badge counts showing how many matches each tab has.

**Why this priority**: Risk-level filtering is essential for users triaging security and compliance findings across a large report.

**Independent Test**: Can be tested by analyzing a repository with known security findings, searching for a risk level keyword, and verifying matches appear in the correct tabs with accurate counts.

**Acceptance Scenarios**:

1. **Given** analysis results include items with various risk levels, **When** the user types `Critical`, **Then** badge counts appear on tabs containing "Critical" text and a summary shows total matches across tabs
2. **Given** the search is case-insensitive, **When** the user types `critical` (lowercase), **Then** the same matches are found as with `Critical`

---

### User Story 3 - Search for a Metric or Data Point (Priority: P2)

A user wants to find where a specific metric (e.g., "merge rate", "stale issues", "commits") appears across the report. They type the metric name and the system surfaces matches across Activity, Responsiveness, Overview, and other relevant tabs.

**Why this priority**: Metric lookup is a frequent use case but less urgent than recommendation/risk filtering.

**Independent Test**: Can be tested by searching for a known metric name and verifying it appears highlighted in the correct tabs.

**Acceptance Scenarios**:

1. **Given** analysis results are displayed, **When** the user types `merge rate`, **Then** matching text is highlighted in tabs where merge rate data appears
2. **Given** a multi-word search query, **When** the user types `stale issues`, **Then** the exact phrase is matched and highlighted

---

### User Story 4 - Find Repo-Specific Data in Multi-Repo Analysis (Priority: P2)

A user has analyzed multiple repositories and wants to see all data for a specific repo (e.g., `facebook/react`). They type the repo name and see matches across every tab.

**Why this priority**: Multi-repo analysis is a core RepoPulse feature and users need to drill into individual repo data.

**Independent Test**: Can be tested by analyzing 2+ repos, searching for one repo name, and verifying matches span multiple tabs.

**Acceptance Scenarios**:

1. **Given** analysis results for multiple repos are displayed, **When** the user types a repo name, **Then** badge counts appear on tabs containing that repo's data and matches are highlighted

---

### User Story 5 - Search on Mobile Layout (Priority: P3)

A user accessing RepoPulse on a mobile device can use the search feature with the same functionality as desktop, adapted to the responsive layout.

**Why this priority**: Mobile support is important for accessibility but is secondary to core search functionality.

**Independent Test**: Can be tested by accessing the report on a mobile viewport and verifying the search input is visible, usable, and produces correct results.

**Acceptance Scenarios**:

1. **Given** a mobile viewport, **When** the user opens the report and views the toolbar, **Then** the search input is visible and usable alongside export controls
2. **Given** a mobile viewport with a search query active, **When** tabs show badge counts, **Then** the counts are readable and the overflow tab dropdown also shows counts

---

### Edge Cases

- What happens when the search query matches nothing? No badge counts shown, summary reads "0 matches", no highlights displayed.
- What happens when the user types very quickly? Input is debounced at 300ms to avoid excessive re-computation.
- What happens when analysis results are not yet available? The search bar is not visible in the toolbar.
- What happens when a search term matches content in a collapsed/overflow tab dropdown? Badge counts still appear on overflow tabs visible in the dropdown menu.
- What happens with special regex characters in the search query? The search treats input as literal text, not as a regular expression.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a search input in the toolbar area alongside export controls when analysis results are present
- **FR-002**: System MUST NOT display the search input when no analysis results are available
- **FR-003**: System MUST search across all rendered content in all 8 report tabs (Overview, Contributors, Activity, Responsiveness, Documentation, Security, Recommendations, Comparison)
- **FR-004**: System MUST display badge counts on each tab button indicating how many matches that tab contains (e.g., "Security (3)")
- **FR-005**: System MUST highlight matching text in the active tab using `<mark>` styling
- **FR-006**: System MUST display a match count summary (e.g., "12 matches across 4 tabs")
- **FR-007**: System MUST perform case-insensitive matching
- **FR-008**: System MUST debounce search input at 300ms to avoid excessive re-computation
- **FR-009**: System MUST remove all highlights, badge counts, and summary when the search input is cleared
- **FR-010**: System MUST work on both desktop and mobile layouts
- **FR-011**: System MUST treat search input as literal text, not as a regular expression
- **FR-012**: System MUST update search results when the user switches tabs (highlighting the matches in the newly active tab)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can locate a specific recommendation ID within 5 seconds of typing it
- **SC-002**: All 8 usage examples from the issue produce correct matches and highlights
- **SC-003**: Search results appear within 300ms of the user stopping typing (debounce delay)
- **SC-004**: Badge counts on tabs are accurate and sum to the total shown in the match summary
- **SC-005**: Search works identically on mobile and desktop viewports
- **SC-006**: Clearing the search restores the report to its pre-search state with no visual artifacts

## Assumptions

- Analysis results are already rendered in the DOM before search is invoked; the search operates on visible/rendered text content, not raw data structures
- The search bar shares the toolbar row with existing export controls and follows the same responsive behavior
- Badge counts on tabs update reactively as the user types (after debounce)
- The search does not persist across page reloads or tab navigation outside the report
- The search does not affect the underlying data or analysis results — it is a purely visual/UI feature
- Phrase matching is used for multi-word queries (the entire query string is matched as a substring, not individual words)
