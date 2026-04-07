# Feature Specification: Missing Data & Accuracy

**Feature Branch**: `031-missing-data-accuracy`  
**Created**: 2026-04-06  
**Status**: Draft  
**Input**: User description: "P1-F12"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inline Unavailable Marking (Priority: P1)

A user analyzes one or more repositories. For any metric value that could not be verified from the GitHub API, the value is marked inline — directly at the field in the UI where it would normally appear — with a visual indicator that distinguishes it from a real value. The user immediately sees which specific metric is missing without having to consult a separate panel or list.

**Why this priority**: This is the core accuracy requirement. Marking data as absent at the point of display is the most direct and least disruptive way to communicate gaps — the user sees the problem exactly where they would look for the answer.

**Independent Test**: Can be fully tested by rendering any metric display component with an `"unavailable"` value and asserting the field's visual output is an em-dash in muted styling, distinct from a numeric value and from `0`.

**Acceptance Scenarios**:

1. **Given** a metric field is `"unavailable"`, **When** it is displayed anywhere in the UI (metric card, table, ratio view, activity tab, contributors tab), **Then** the value renders as `"—"` (em-dash) in muted slate styling (`text-slate-400`) — never as the string `"unavailable"`, never as `0`, never blank.
2. **Given** a metric field is `0` (a valid numeric result), **When** it is displayed, **Then** it renders as `"0"` in standard styling — visually distinct from the muted `"—"` used for absent data.
3. **Given** a metric field has a verified numeric value greater than zero, **When** it is displayed, **Then** it renders normally with no unavailability indicator.
4. **Given** multiple metrics for a repo, some unavailable and some present, **When** the view is rendered, **Then** each metric is independently marked — present metrics appear in standard styling, unavailable metrics show `"—"` in `text-slate-400`.

---

### User Story 2 - Consistent `"—"` Across All Views (Priority: P2)

The `"—"` (`text-slate-400`) treatment is applied uniformly across every surface that displays metric values: metric cards (summary stats and detail rows), Health Ratios table, Activity tab, Contributors tab, Responsiveness tab, and Comparison table. A user switching between tabs always sees the same marker for absent data — there is no surface where it appears as `0`, blank, the raw string `"unavailable"`, or any other treatment.

**Why this priority**: Consistency is the integrity guarantee. The existing codebase is inconsistent — Health Ratios already uses `"—"`, but metric card summary stats render the raw string `"unavailable"` in full bold styling, and some views use aggregate amber callout panels instead. This story standardizes everything to one treatment.

**Independent Test**: Each view can be tested independently by providing a result with all fields set to `"unavailable"` and asserting every field renders `"—"` in muted styling — no `0`, no raw `"unavailable"` string, no blank.

**Acceptance Scenarios**:

1. **Given** a repo result with several unavailable fields, **When** the user visits the Overview tab, **Then** each unavailable metric in the metric card summary stats (stars, forks, watchers) and detail rows renders `"—"` in `text-slate-400` — not the string `"unavailable"` in bold.
2. **Given** a repo result with unavailable activity metrics, **When** the user visits the Activity tab, **Then** each unavailable metric row or cell displays `"—"` in `text-slate-400` rather than `0` or blank.
3. **Given** a repo result with unavailable contributor metrics, **When** the user visits the Contributors tab, **Then** unavailable counts or ratios render `"—"` in `text-slate-400`.
4. **Given** unavailable ratio values in the Health Ratios table, **When** the user views the table, **Then** unavailable cells display `"—"` in `text-slate-400` (already uses `"—"` — confirm styling is muted).
5. **Given** an unavailable metric in the Comparison table, **When** the comparison is rendered, **Then** the cell shows `"—"` in `text-slate-400`, consistent with all other views.
6. **Given** an unavailable value in the Responsiveness tab, **When** the tab is rendered, **Then** the value displays `"—"` in `text-slate-400` inline at the field — not via an aggregate amber callout panel.

---

### User Story 3 - Analyzer Enforces No Estimation (Priority: P3)

A developer or auditor reviewing the analyzer output can verify that no metric value is derived from estimation, interpolation, or substitution. Every numeric value originates directly from the GitHub GraphQL API response, and any field that cannot be verified is marked `"unavailable"` in the output and listed in `missingFields`.

**Why this priority**: This is the data-layer guarantee that makes the UI marking trustworthy. If the analyzer silently fabricates a value, the inline marker never appears, and the user is shown false precision.

**Independent Test**: Can be tested by intercepting API responses with missing fields and asserting the analyzer sets the corresponding fields to `"unavailable"` and populates `missingFields` accordingly.

**Acceptance Scenarios**:

1. **Given** the GitHub API response is missing a tracked field, **When** the analyzer processes the response, **Then** the corresponding field in `AnalysisResult` is `"unavailable"` and its key appears in `missingFields`.
2. **Given** all expected fields are present in the API response, **When** the analyzer processes the response, **Then** `missingFields` is empty and no field is `"unavailable"` without cause.
3. **Given** a derived metric depends on a field that is `"unavailable"`, **When** the analyzer evaluates the derived metric, **Then** the derived metric is also `"unavailable"` — not estimated from partial data.

---

### Edge Cases

- What if a metric is `0` and also in `missingFields`? `missingFields` wins — the field is treated as unavailable, not as zero, since the analyzer should never set a field to `0` and also list it as missing.
- What if a view has no inline rendering for a particular field (e.g., a chart axis)? The chart must suppress or clearly label the absent data series rather than drawing a zero line.
- What if all metrics for a repo are `"unavailable"`? Every field is marked inline; no view crashes or renders silent zeros.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every metric value that is `"unavailable"` MUST render as `"—"` (em-dash) in muted slate styling at its display location — never as `0`, never blank, never hidden, never as the raw string `"unavailable"`.
- **FR-002**: The `"—"` marker MUST use visually muted styling (e.g., `text-slate-400`) so it is immediately distinguishable from a real value such as `0` rendered in standard styling.
- **FR-003**: The `"—"` marker MUST be applied consistently across all metric display surfaces: metric card summary stats, metric card detail rows, Health Ratios table, Activity tab, Contributors tab, Responsiveness tab, and Comparison table.
- **FR-004**: No separate aggregate "missing data" callout panel is used — the marking occurs at the individual field, not in a collected list elsewhere.
- **FR-005**: The analyzer MUST mark any field it cannot populate from a verified API response as `"unavailable"` and include its key in `missingFields`.
- **FR-006**: No metric value in the analyzer output may be estimated, inferred, interpolated, or substituted — this constraint is enforced at the analyzer layer.
- **FR-007**: A derived metric that depends on an `"unavailable"` input MUST itself be `"unavailable"`, not computed from partial data.

### Key Entities

- **AnalysisResult**: Per-repo data structure. Fields are typed as `number | "unavailable"` or `string | "unavailable"`. Includes `missingFields: string[]` listing keys of fields that could not be verified.
- **Inline Unavailability Indicator**: The single, universal visual treatment for absent data — `"—"` (em-dash) in muted slate styling (`text-slate-400`), applied at the individual field level across every display surface.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every metric surface in the app — when given a result with all fields set to `"unavailable"` — displays `"—"` in muted slate styling for each field and renders no `0`, blank, or raw `"unavailable"` string in its place.
- **SC-002**: A result with `0` for a metric and a separate result with `"unavailable"` for the same metric produce visually distinct outputs on every surface — `"0"` in standard styling vs `"—"` in muted styling.
- **SC-003**: The analyzer test suite confirms that every tracked field, when absent from the API response, appears in `missingFields` and is set to `"unavailable"` — not substituted.
- **SC-004**: All acceptance criteria in `docs/PRODUCT.md` for P1-F12 are satisfied and verifiable by manual checklist walkthrough.

## Assumptions

- The `missingFields: string[]` field in `AnalysisResult` is already populated by the analyzer; this feature ensures the UI fully reflects it by marking values inline rather than via a separate panel.
- The inline treatment is applied to all numeric and text metric fields across views. Window-based metrics inside `activityMetricsByWindow` and `contributorMetricsByWindow` are included where they are individually displayed.
- Experimental fields (`commitCountsByExperimentalOrg`, `experimentalAttributedAuthors90d`, `experimentalUnattributedAuthors90d`) are excluded from the unavailability treatment since they are labeled best-effort estimates by design.
- The existing codebase is inconsistent: Health Ratios already uses `"—"`, metric card summary stats render the raw bold string `"unavailable"`, and Activity/Responsiveness views use aggregate amber callout panels. This feature standardizes all of them to `"—"` in `text-slate-400` at the field level.
- No new data is fetched from the API for this feature — it is entirely a display and analyzer-enforcement concern.
