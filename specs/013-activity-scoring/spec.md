# Feature Specification: Activity

**Feature Branch**: `013-activity-scoring`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "[P1-F08] Activity"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inspect repo activity metrics in the Activity tab (Priority: P1)

A user can open the `Activity` tab after analysis and see a dedicated activity view for each successfully analyzed repository so repo momentum and delivery flow are no longer buried in placeholder text.

**Why this priority**: `P1-F08` is the first feature that gives the `Activity` tab real value and turns the existing results shell into a more complete dashboard.

**Independent Test**: Can be fully tested by supplying one or more successful `AnalysisResult` objects and confirming the `Activity` tab renders the required activity metrics per repository without rerunning analysis.

**Acceptance Scenarios**:

1. **Given** one successful repository has been analyzed, **When** the user opens the `Activity` tab, **Then** the tab shows that repository's activity metrics including commit windows, PR flow, issue flow, throughput ratios, release cadence, and completion-speed metrics.
2. **Given** multiple successful repositories have been analyzed, **When** the user opens the `Activity` tab, **Then** each successful repository appears with its own activity section and failed repositories do not produce fabricated metric views.
3. **Given** the user switches between `Overview` and `Activity`, **When** the activity content is shown, **Then** no new analysis request or extra API call is triggered.

---

### User Story 2 - Change the recent activity window without rerunning analysis (Priority: P1)

A user can switch the recent activity window in the `Activity` tab so they can inspect shorter-term and longer-term repo momentum using the same analysis payload.

**Why this priority**: Window control changes the meaning of the activity view and makes the feature more useful than a single fixed timeframe.

**Independent Test**: Can be fully tested by rendering one or more successful repositories, changing the activity window between the supported presets, and confirming the displayed metrics update locally without another analysis request.

**Acceptance Scenarios**:

1. **Given** the `Activity` tab is open, **When** the user selects `30d`, `60d`, `90d`, `180d`, or `12 months`, **Then** the activity metrics update to reflect the selected window.
2. **Given** the user changes the recent activity window, **When** the activity content refreshes, **Then** no new analysis request or extra API call is triggered.
3. **Given** one or more repositories are shown in the `Activity` tab, **When** the selected window changes, **Then** every successful repository updates consistently to the same selected window.

---

### User Story 3 - Understand the Activity score and how it was derived (Priority: P1)

A user can see a real Activity score for each successful repository and understand which verified public signals contributed to that score.

**Why this priority**: The overview cards already reserve an Activity score position, so `P1-F08` needs to replace the current placeholder state with a real, explainable score.

**Independent Test**: Can be fully tested by rendering repositories with known activity inputs and confirming the computed score and score explanation match the shared config-driven thresholds and weights.

**Acceptance Scenarios**:

1. **Given** a repository has sufficient verified activity data, **When** the score is computed, **Then** the UI shows `High`, `Medium`, or `Low` for Activity.
2. **Given** a repository does not have sufficient verified activity data, **When** the score is computed, **Then** the UI shows `Insufficient verified public data` instead of a guessed score.
3. **Given** an Activity score is visible in the overview card or `Activity` tab, **When** the user asks how it was scored, **Then** the UI exposes the scoring thresholds and weighted factors from shared config.

---

### User Story 4 - See missing activity data clearly without fabricated values (Priority: P2)

A user can tell which activity inputs were unavailable so they can trust the metrics and scores that do appear.

**Why this priority**: Transparency around missing public GitHub data is part of the product's accuracy policy and prevents the feature from overstating certainty.

**Independent Test**: Can be fully tested by rendering repositories with partial activity data and confirming unavailable values remain explicit in the `Activity` tab and score surfaces.

**Acceptance Scenarios**:

1. **Given** one or more required activity inputs are unavailable, **When** the user views the `Activity` tab, **Then** unavailable values remain explicitly marked and are not hidden, zeroed, or guessed.
2. **Given** missing activity inputs prevent scoring, **When** the user views the overview card or `Activity` tab, **Then** the score shows `Insufficient verified public data` and the missing inputs are called out clearly.
3. **Given** some activity metrics are available and others are unavailable, **When** the user views the tab, **Then** the available metrics still render while unavailable metrics remain explicit.

### Edge Cases

- What happens when a repository has enough raw counts to render some activity metrics but not enough verified timing or cadence data to compute an Activity score?
- What happens when a repository has no releases in the selected activity window or no merged pull requests in the scoring window?
- What happens when one repository succeeds and another fails in the same analysis request?
- What happens when the `Activity` tab is opened on a narrow mobile viewport with multiple repositories in the analysis?
- What happens when a selected activity window has no verifiable data for one metric but longer windows do?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST populate the `Activity` tab with activity content for successful repositories.
- **FR-002**: The `Activity` tab MUST expose a `Recent activity window` control with exact presets `30d`, `60d`, `90d`, `180d`, and `12 months`.
- **FR-003**: Changing the `Recent activity window` control MUST update activity-derived metrics locally without rerunning repository analysis.
- **FR-004**: The `Activity` tab MUST surface the following verified activity metrics per successful repository when publicly verifiable for the selected window: commits; PRs opened, merged, and closed; issues opened and closed; release cadence and version frequency; PR merge rate; issue closure rate; stale issue ratio; median time to merge pull requests; and median time to close issues.
- **FR-004a**: The feature MUST continue to support the fixed comparison windows required by the product contract where they remain part of scoring logic, including commit windows in `30d`, `90d`, and `180d`.
- **FR-005**: The default recent activity window in the `Activity` tab MUST be `90d`.
- **FR-006**: The system MUST compute an Activity score of `High`, `Medium`, or `Low` using a shared config-driven scoring model when sufficient verified activity data exists.
- **FR-007**: When sufficient verified activity data does not exist, the Activity score MUST be the literal string `Insufficient verified public data`.
- **FR-008**: The Activity score MUST be based on the weighted activity groups defined by the product contract: PR flow, issue flow, completion speed, sustained activity, and release cadence.
- **FR-009**: The overview card's `Activity` score badge MUST update from the current placeholder state when a real Activity score is available.
- **FR-010**: The score presentation MUST keep the CHAOSS-aligned category label visible alongside the score in the UI.
- **FR-011**: All Activity thresholds, score bands, and weighting inputs MUST be defined in shared config rather than hardcoded in scoring logic.
- **FR-012**: The UI MUST expose a "how is this scored?" help surface for Activity without requiring another analysis request.
- **FR-013**: Unavailable activity metrics and unavailable derived values MUST remain explicit in the `Activity` tab and MUST NOT be hidden, zeroed, or guessed.
- **FR-014**: The feature MUST reuse the existing `AnalysisResult[]` analysis payload for rendering and MUST NOT introduce a second client-side fetch path for activity detail.
- **FR-015**: Opening, closing, or switching to the `Activity` tab MUST NOT rerun repository analysis or trigger extra API calls.
- **FR-016**: Primary activity values such as raw counts and selected-window values MUST remain visible in the `Activity` tab and MUST NOT require tooltip interaction to be discovered.
- **FR-017**: Tooltip or equivalent help surfaces MAY be used for derived metrics, scoring explanations, and non-obvious definitions, but MUST NOT be the only place where primary activity values are shown.
- **FR-018**: The `Activity` tab SHOULD render selected-window throughput ratios together with the raw counts they are derived from so percentages remain interpretable at a glance.
- **FR-019**: Full time-series trend charts for commits, PRs, and issues are deferred until bucketed trend data is present in the shared `AnalysisResult[]` payload.

### Key Entities

- **Activity View**: The `Activity` tab surface that renders one repository's activity metrics, score, explanation, and missing-data callouts.
- **Activity Score**: The config-driven classification of repository activity as `High`, `Medium`, `Low`, or `Insufficient verified public data`.
- **Activity Metric Set**: The verified public metrics used by this feature, including commit windows, PR and issue flow, throughput ratios, release cadence, and completion-speed medians.
- **Missing Activity Data Callout**: The per-repository explanation surface that lists unavailable inputs affecting the rendered metrics or score.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For analyses with one or more successful repositories, 100% of successful repositories render activity content in the `Activity` tab.
- **SC-002**: For repositories with sufficient verified activity data, 100% of rendered Activity scores show `High`, `Medium`, or `Low` instead of `Not scored yet`.
- **SC-003**: For repositories with insufficient verified activity data, 100% of rendered Activity score surfaces show `Insufficient verified public data`.
- **SC-004**: Users can switch to the `Activity` tab and inspect activity scoring detail without triggering additional analysis requests.

## Assumptions

- The existing results shell will expose an `Activity` tab as the intended home for `P1-F08`.
- `AnalysisResult` will grow to carry the verified raw inputs and derived values required for Activity, but it remains the single source of truth for rendering.
- The first implementation slice will focus on repository-level activity metrics, throughput ratios, and score explanation rather than historical trend charts or day-by-day visualizations.
- The product's accuracy policy continues to forbid inferred or fabricated activity values when verified public GitHub data is missing.
- Tooltips or equivalent help surfaces will be reserved for scoring explanations, derived metrics, and terminology clarification rather than serving as the primary container for raw metric values.
