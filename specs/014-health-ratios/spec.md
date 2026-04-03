# Feature Specification: Health Ratios

**Feature Branch**: `014-health-ratios`  
**Created**: 2026-04-03  
**Status**: Draft  
**Input**: User description: "P1-F11 Health Ratios"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See contributor-composition ratios in the Contributors tab (Priority: P1)

A user can inspect contributor-composition ratios directly in the `Contributors` workspace so they can understand the makeup of the current contributor base before opening any cross-repo comparison surface.

**Why this priority**: `repeat contributors / total contributors` and `new contributors / total contributors` are most understandable in contributor context, and the product definition explicitly says ratios should first appear in their domain-specific home views.

**Independent Test**: Can be fully tested by rendering one or more successful `AnalysisResult` objects and confirming the `Contributors` tab shows the verified contributor-composition ratios without any additional fetch.

**Acceptance Scenarios**:

1. **Given** one successful repository has been analyzed, **When** the user opens the `Contributors` tab, **Then** the tab shows verified contributor-composition ratios including `repeat contributors / total contributors` and `new contributors / total contributors`.
2. **Given** contributor counts are partially unavailable, **When** the user views the `Contributors` tab, **Then** unavailable ratio values remain explicit rather than hidden or estimated.
3. **Given** the user switches between `Overview`, `Contributors`, `Activity`, and `Responsiveness`, **When** they inspect contributor ratios, **Then** no new analysis request or extra API call is triggered.

---

### User Story 2 - Compare verified ratios across repositories in a dedicated Health Ratios tab (Priority: P1)

A user can open a `Health Ratios` tab and compare ratios across repositories in one sortable table without losing the domain-specific context already provided in the other tabs.

**Why this priority**: The dedicated ratio rollup is the core value of `P1-F11`; it turns already-computed domain signals into a quick cross-repo comparison surface.

**Independent Test**: Can be fully tested by rendering two or more successful repositories and confirming the `Health Ratios` tab shows one sortable table containing the required ratios grouped by CHAOSS category.

**Acceptance Scenarios**:

1. **Given** multiple successful repositories have been analyzed, **When** the user opens the `Health Ratios` tab, **Then** the UI shows a cross-repo table with ratios grouped by category.
2. **Given** the user sorts the table by a ratio value, **When** sorting is applied, **Then** repositories reorder by that verified ratio without triggering another analysis request.
3. **Given** one repository failed in the same analysis request, **When** the `Health Ratios` tab is shown, **Then** only successful repositories appear in the ratios table and failed repositories remain in the existing failure surface.

---

### User Story 3 - Trust unavailable values and ratio definitions (Priority: P2)

A user can tell how each ratio is calculated and can clearly see when a ratio is unavailable, so they can trust the comparison table without worrying that missing data has been guessed.

**Why this priority**: Health ratios are only useful if the formulas are understandable and unavailable values are handled honestly.

**Independent Test**: Can be fully tested by rendering repositories with partial ratio inputs and confirming the UI keeps ratio formulas discoverable while showing unavailable values as `—`.

**Acceptance Scenarios**:

1. **Given** a ratio is derived from multiple public inputs, **When** the user inspects the ratio label, **Then** the UI exposes a short formula or explanation without hiding the primary value.
2. **Given** one or more ratio inputs are unavailable, **When** the user views the `Health Ratios` table, **Then** the unavailable ratio renders as `—`, not `0`, blank, or an estimated substitute.
3. **Given** the same ratio appears in a home tab and in `Health Ratios`, **When** the user compares those surfaces, **Then** the underlying value and wording stay consistent.

### Edge Cases

- What happens when only one repository succeeds and the user opens `Health Ratios`?
- What happens when one category has all ratios unavailable for a given repository?
- What happens when two repositories have the same ratio value and the user sorts the table?
- What happens when a ratio is greater than `100%` because more items were closed or merged in the selected window than were opened in that same window?
- What happens when contributor-composition ratios are unavailable because total-contributor inputs are missing?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST add a `Health Ratios` tab to the results workspace for successful analyses.
- **FR-002**: The `Health Ratios` tab MUST render a dedicated cross-repo comparison table driven entirely from the existing `AnalysisResult[]` payload.
- **FR-003**: The `Health Ratios` table MUST include these verified ecosystem ratios when available:
  - `forks / stars`
  - `watches / stars`
- **FR-004**: The `Health Ratios` table MUST include these verified activity ratios when available:
  - `merged PRs / opened PRs`
  - `stale issues / total open issues`
- **FR-005**: The `Health Ratios` table MUST include these verified contributor-composition ratios when available:
  - `repeat contributors / total contributors`
  - `new contributors / total contributors`
- **FR-006**: The `Contributors` tab MUST surface contributor-composition ratios before or alongside their later reuse in the `Health Ratios` table.
- **FR-007**: Existing home views MUST remain the primary context for their ratios:
  - ecosystem ratios remain in ecosystem and overview surfaces
  - activity-flow ratios remain in the `Activity` tab
  - contributor-composition ratios remain in the `Contributors` tab
- **FR-008**: The `Health Ratios` table MUST group ratios by CHAOSS-aligned category in the UI.
- **FR-009**: The `Health Ratios` table MUST support sorting by ratio value across repositories.
- **FR-010**: Unavailable ratios in the `Health Ratios` table MUST render as `—` and MUST NOT be hidden, zeroed, or estimated.
- **FR-011**: Ratio values reused between domain-specific tabs and the `Health Ratios` tab MUST be computed from the same verified source data and MUST stay consistent across surfaces.
- **FR-012**: The `Health Ratios` feature MUST NOT introduce another GitHub fetch path; all ratio rendering MUST reuse already-fetched and already-verified analysis inputs.
- **FR-013**: Opening or interacting with the `Health Ratios` tab MUST NOT rerun repository analysis or trigger extra API calls.
- **FR-014**: Derived ratio labels in the `Health Ratios` table SHOULD expose short formula/explanation help text where the calculation is not obvious.
- **FR-015**: The feature MUST remain usable for single-repo and multi-repo analyses, even though the strongest comparison value appears with two or more successful repositories.

### Key Entities

- **Health Ratios View**: The `Health Ratios` tab surface that renders one cross-repo table of verified ratios.
- **Ratio Definition**: A shared, named formula such as `forks / stars` or `repeat contributors / total contributors` that can be reused across domain-specific tabs and the ratio rollup.
- **Ratio Row**: A category-scoped comparison row in the `Health Ratios` table containing one ratio definition and one value per successful repository.
- **Contributor Composition Ratio Set**: The verified contributor ratios rendered in the `Contributors` tab and reused in the `Health Ratios` table.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For analyses with one or more successful repositories, 100% of successful repositories appear in the `Health Ratios` table.
- **SC-002**: For every ratio included in `Health Ratios`, 100% of unavailable values render as `—` rather than `0`, blank, or a fabricated number.
- **SC-003**: Users can sort the `Health Ratios` table by any supported ratio without triggering another analysis request.
- **SC-004**: The contributor-composition ratios shown in the `Contributors` tab match the same ratios shown in the `Health Ratios` table for the same repository.

## Assumptions

- The required ecosystem and activity ratios already exist or can be derived from current feature payloads without new GitHub requests.
- `P1-F11` is the first feature that introduces contributor-composition ratios such as `repeat / total` and `new / total`.
- The first `Health Ratios` implementation is a table-oriented comparison surface rather than a scored badge or chart-heavy visualization.
- Repositories may legitimately show ratios above `100%` for selected-window open/close or open/merge comparisons, and the UI should explain rather than suppress that outcome.
- Missing ratio inputs remain an expected honest outcome for some repositories and should not block the rest of the table from rendering.
