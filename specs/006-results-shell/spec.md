# Feature Specification: Results Shell

**Feature Branch**: `006-results-shell`  
**Created**: 2026-03-31  
**Status**: Draft  
**Input**: User description: "P1-F15 Results Shell"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit repos once and navigate result views (Priority: P1)

A user can submit repositories once and then move between result views through tabs without re-entering repos or re-running the analysis.

**Why this priority**: This is the core value of the shell. It creates a stable workflow for all later Phase 1 views and prevents each feature from reshaping the page independently.

**Independent Test**: Can be fully tested by submitting one or more valid repositories, confirming the analysis completes once, and switching between tabs without triggering another request.

**Acceptance Scenarios**:

1. **Given** the user has submitted valid repositories and analysis has completed, **When** they switch between result tabs, **Then** the displayed view changes without re-submitting the analysis.
2. **Given** the analysis input panel is visible, **When** the user changes tabs after a successful analysis, **Then** the repo input and analyze controls remain available without being rebuilt into a separate page flow.
3. **Given** no analysis has run yet, **When** the user sees the shell, **Then** the tab area remains presentable and does not imply that unavailable views already have data.

---

### User Story 2 - Understand the app structure at a glance (Priority: P1)

A user can immediately understand that ForkPrint is an application with a stable header, a clear GitHub repo link, and a dedicated analysis workspace.

**Why this priority**: This gives the app a durable product frame before more data views land and reduces the “prototype stack of boxes” feeling.

**Independent Test**: Can be fully tested by loading the app and confirming the header/banner, GitHub repo link, and stable analysis panel are visible and readable on desktop and mobile widths.

**Acceptance Scenarios**:

1. **Given** the user loads the app, **When** the page renders, **Then** a header/banner presents the ForkPrint brand and a GitHub repo link in a predictable location.
2. **Given** the user is on desktop or mobile, **When** the shell renders, **Then** the header and analysis panel remain readable and usable without layout breakage.
3. **Given** the user has not analyzed anything yet, **When** they view the shell, **Then** the page still feels intentional rather than like a collection of unrelated controls.

---

### User Story 3 - Use the shell as a host for present and future result views (Priority: P2)

A user can use tabs as a stable navigation model for current and upcoming result views, starting with the first populated tab and clearly differentiated placeholders for later ones.

**Why this priority**: Tabs are valuable only if they set up the future information architecture cleanly, but the shell itself can still deliver value before every tab is fully implemented.

**Independent Test**: Can be fully tested by confirming the shell exposes tabs for the planned views and that only currently implemented content is populated while unimplemented tabs show intentional placeholder states.

**Acceptance Scenarios**:

1. **Given** the shell is rendered, **When** the user looks at the result navigation, **Then** tabs exist for at least `Overview`, `Ecosystem Map`, `Comparison`, and `Metrics`.
2. **Given** only some tabs are implemented, **When** the user opens an unimplemented tab, **Then** it shows an intentional placeholder or “coming soon” state rather than empty space or broken UI.
3. **Given** the ecosystem map feature is present, **When** the user opens the `Ecosystem Map` tab, **Then** it can host the existing ecosystem-map UI without requiring a separate analysis flow.

---

### Edge Cases

- What happens when the user has no successful analysis results yet but the shell and tabs are already visible?
- What happens when the analysis returns only failures and no successful result views can be populated?
- What happens when the user changes tabs while a new analysis is still loading?
- What happens when there is only one successful repository and some result tabs have less to show than others?
- What happens on narrow mobile screens where the header, analysis panel, and tabs compete for vertical space?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a stable application shell around the analysis experience.
- **FR-002**: The shell MUST include a top header/banner with ForkPrint branding.
- **FR-003**: The shell MUST include a visible GitHub repository link in the header.
- **FR-004**: The shell MUST keep the repo input and Analyze controls in a stable analysis panel that remains available while browsing result views.
- **FR-005**: The shell MUST provide tabs for navigating between result views after analysis.
- **FR-006**: The shell MUST support at least `Overview`, `Ecosystem Map`, `Comparison`, and `Metrics` tabs.
- **FR-007**: Switching tabs MUST NOT trigger a new analysis request or additional API calls by itself.
- **FR-008**: The shell MUST allow currently implemented views to render meaningful content while unimplemented views show intentional placeholder states.
- **FR-009**: The `Ecosystem Map` tab MUST be able to host the existing ecosystem-map UI once that feature resumes.
- **FR-010**: The shell MUST work for both single-repo and multi-repo analyses.
- **FR-011**: The shell MUST support desktop and mobile layouts without breaking the analysis workflow.
- **FR-012**: The shell MUST preserve existing error, loading, and results state rather than hiding them behind navigation dead ends.

### Key Entities

- **Results Shell**: The stable page frame containing the header, analysis panel, and tabbed result area.
- **Header Banner**: The top application region containing ForkPrint branding and the GitHub repo link.
- **Analysis Panel**: The stable control area containing repo input, auth controls, and the Analyze action.
- **Result Tab**: A named navigation target for a result view such as `Overview`, `Ecosystem Map`, `Comparison`, or `Metrics`.
- **Placeholder View**: An intentional temporary state for a future tab that is not fully implemented yet.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can submit repositories once and switch between tabs without triggering another analysis request.
- **SC-002**: The shell exposes a stable header, GitHub repo link, and analysis panel on both desktop and mobile layouts.
- **SC-003**: The result area can host at least one implemented tab and multiple intentional placeholder tabs without broken or empty UI states.
- **SC-004**: The shell is reusable for subsequent Phase 1 features so future result views can be added without restructuring the analysis flow again.

## Assumptions

- `P1-F04 Data Fetching` remains the source of analysis results and request state for the shell.
- `P1-F05 Ecosystem Map` will resume after this feature and will render inside the `Ecosystem Map` tab rather than owning the full page layout.
- Placeholder tabs are acceptable in this feature as long as they are intentional and clearly differentiated from implemented views.
- The shell remains on the current main page flow rather than introducing a separate routed dashboard at this stage.
