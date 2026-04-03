# Feature Specification: Org-Level Repo Inventory (P1-F16)

**Feature Branch**: `016-org-inventory`  
**Created**: 2026-04-03  
**Status**: Draft  
**Input**: User description: "P1-F16 Org-Level Repo Inventory"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse an org's public repositories (Priority: P1)

A user can enter a GitHub organization and immediately see a lightweight inventory of that org's public repositories without running full deep analysis on every repo.

**Why this priority**: This is the core value of the feature. Without the inventory table and summary rollups, there is no org-level workflow.

**Independent Test**: Submit a valid public org slug or URL and confirm the app renders a summary area plus a repository table with one row per public repository using only lightweight org metadata.

**Acceptance Scenarios**:

1. **Given** a valid public GitHub org slug, **When** the user submits it, **Then** the app normalizes the org name and renders a repository inventory table plus org-level summary rollups.
2. **Given** a valid GitHub org URL, **When** the user submits it, **Then** the app extracts the org slug automatically and renders the same inventory view.
3. **Given** a successful inventory response, **When** the table renders, **Then** each row shows repository name, description, primary language, stars, forks, watchers, open issues count, last pushed date, and a repo link.

---

### User Story 2 - Narrow and sort the inventory (Priority: P1)

A user can quickly find relevant repositories within a larger organization by sorting and filtering the inventory table.

**Why this priority**: Org inventory becomes hard to use without filtering and sorting, especially for organizations with many repositories.

**Independent Test**: Render an org with multiple repositories and confirm the user can filter by repo name, language, and archived status, and sort the table without triggering a new inventory fetch.

**Acceptance Scenarios**:

1. **Given** a populated org inventory, **When** the user types into the repo-name filter, **Then** the table narrows locally to matching repositories.
2. **Given** repositories with multiple primary languages, **When** the user selects a language filter, **Then** only matching repositories remain visible.
3. **Given** a mix of archived and active repositories, **When** the user toggles archived-status filtering, **Then** the table updates locally to show the selected subset.
4. **Given** a populated table, **When** the user clicks any visible column header, **Then** the rows reorder locally without rerunning the org inventory request.
5. **Given** a sorted column, **When** the user activates that same column again, **Then** the sort direction toggles between ascending and descending.

---

### User Story 3 - Drill into repo analysis from the inventory (Priority: P2)

A user can move from org inventory to existing repo-level analysis without retyping repository slugs manually, either for one repo or for a small selected set.

**Why this priority**: The inventory view is most useful when it connects naturally to the existing repo-analysis flow and enables comparison-oriented analysis from a single org.

**Independent Test**: From a rendered org inventory table, activate either a row-level analyze action or a bulk `Analyze selected` action and confirm the existing repo analysis flow opens with the expected repository slugs.

**Acceptance Scenarios**:

1. **Given** a rendered org inventory table, **When** the user activates a repository drill-in action, **Then** the existing repo-level analysis flow opens or is prefilled for that repository.
2. **Given** the user drills into a repository from the org inventory, **When** the repo-level flow appears, **Then** the user does not need to manually retype the selected `owner/repo`.
3. **Given** a rendered org inventory table, **When** the user selects multiple repositories and activates `Analyze selected`, **Then** the existing repo-analysis flow opens with those repositories prefilled.
4. **Given** bulk analysis is available, **When** the user adjusts the selection-limit slider, **Then** the UI updates the maximum selectable repo count immediately up to the configured cap.
5. **Given** the inventory table supports bulk analysis, **When** the user tries to select more repositories than the current slider limit, **Then** the UI blocks the extra selection with a clear limit message.

---

### User Story 4 - Trust empty and error states (Priority: P2)

A user can distinguish between an empty organization, an invalid organization, and rate-limited or partial fetch states without fabricated results.

**Why this priority**: Org-level inventory needs explicit error handling because it is based on public GitHub metadata and can fail for several legitimate reasons.

**Independent Test**: Exercise empty-org, invalid-org, and rate-limit scenarios and confirm the UI shows clear states without pretending the org has data it does not have.

**Acceptance Scenarios**:

1. **Given** an invalid org slug, **When** the user submits it, **Then** the app shows a clear error state and does not render a fake inventory table.
2. **Given** a valid org with no public repositories, **When** the response returns zero rows, **Then** the app shows a clear empty state rather than a broken table.
3. **Given** GitHub rate-limit or retry metadata, **When** the inventory request is throttled, **Then** the app shows the limit state clearly without fabricating partial repo results.

---

## Edge Cases

- What happens when an organization has enough repositories that the table becomes difficult to scan on mobile or desktop?
- What happens when some repository fields such as description, primary language, or pushed date are unavailable for a subset of rows?
- What happens when the org contains archived repositories only?
- How does the UI behave when a filter combination returns zero matching repositories even though the org has repositories overall?
- How does the app handle organizations whose public repo count exceeds the first page of GitHub results?
- What happens when the user lowers the slider below the number of repos already selected?
- What happens when the user tries to select more repositories for bulk analysis than the current slider limit or the configured Phase 1 maximum?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST accept a GitHub organization slug or GitHub organization URL and normalize it to the org name before submission.
- **FR-002**: The system MUST fetch the organization's public repositories using verified public GitHub metadata only.
- **FR-003**: The system MUST render a summary area showing at least total public repos, total stars, most-starred repos, most recently active repos, language distribution, and archived vs active repo count.
- **FR-004**: The system MUST render a sortable table with one row per public repository.
- **FR-005**: Each table row MUST include repository name, description, primary language, stars, forks, watchers, open issues count, last pushed date, archived status, and repo URL.
- **FR-006**: The inventory table MUST support local filtering by repository name, primary language, and archived status without rerunning the org inventory request.
- **FR-007**: The inventory table MUST support local sorting on every visible column without rerunning the org inventory request.
- **FR-008**: Every sortable column MUST support both ascending and descending order.
- **FR-009**: The system MUST provide a repo-level drill-in action from each row that connects into the existing repo analysis flow for that repository.
- **FR-010**: The system MUST allow selecting multiple repositories from the org inventory table for bulk analysis using the existing repo-analysis flow.
- **FR-011**: The system MUST expose a slider control that lets the user set the current bulk-selection limit locally before choosing repositories to analyze.
- **FR-012**: The maximum number of repositories allowed by the slider in Phase 1 MUST be driven by shared configuration rather than hardcoded in the component layer, with a default cap of `5`.
- **FR-013**: The system MUST prevent extra selections or bulk analysis submissions that exceed the current slider limit and explain the limit clearly in the UI.
- **FR-014**: The system MUST define deterministic behavior when the slider is lowered below the current selected count, such as trimming selection or blocking the new limit until the selection is reduced.
- **FR-015**: The system MUST show clear invalid-org, empty-org, loading, and rate-limit states without fabricating results.
- **FR-016**: Missing per-row fields MUST render explicitly as unavailable or empty values appropriate to the field type rather than substituted metrics.
- **FR-017**: The Phase 1 implementation MUST avoid running full repo-level CHAOSS analysis automatically for every repository in the org inventory view.
- **FR-018**: The org inventory layout MUST remain usable on desktop and mobile, with pagination or virtualization available if needed for larger orgs.

### Key Entities *(include if feature involves data)*

- **OrgInventoryRequest**: A normalized org identifier plus optional token context used to fetch public repository inventory metadata.
- **OrgInventoryResponse**: The org-level payload containing rollup summary data, repository rows, and any rate-limit or failure metadata needed by the UI.
- **OrgRepoSummary**: A single repository row containing lightweight public metadata such as name, description, language, popularity signals, issue count, archived status, last pushed date, and URL.
- **OrgInventoryFilters**: Local UI state for repo-name search, language selection, archived-status filtering, and table sort preferences.
- **OrgInventorySelection**: Local UI state tracking the selected repositories for bulk analysis, the current slider-controlled selection limit, and selection-cap validation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can submit a valid org slug or URL and see an org inventory summary plus table without manually formatting the org identifier first.
- **SC-002**: A user can narrow a multi-repo inventory using local filters and sort controls without triggering an additional org inventory fetch.
- **SC-003**: A user can identify a repository of interest and begin the existing repo-level analysis flow from the inventory without manually retyping the repo slug.
- **SC-004**: A user can select up to the configured repository cap and start a multi-repo analysis directly from the org inventory without manually retyping repo slugs.
- **SC-005**: A user can adjust the current bulk-selection limit with a slider and immediately see the selection rules enforced in the inventory UI.
- **SC-006**: Invalid, empty, and rate-limited org scenarios are visually distinguishable and do not fabricate repository rows or summary values.

## Assumptions

- The org inventory uses lightweight public metadata only and does not compute the full per-repo analysis model inside this feature.
- GitHub token handling follows the existing app rules: a server-side token takes precedence, and the browser PAT flow remains available when no server token exists.
- Existing repo input and analysis flows can be reused for drill-in behavior rather than creating a second repo-analysis implementation path.
- The default Phase 1 bulk-analysis cap is `5`, but the specific limit is configurable through a shared config module.
- Phase 1 mobile support means the inventory remains usable and readable, not necessarily that every table column is visible without horizontal scrolling.
