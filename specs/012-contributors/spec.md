# Feature Specification: Contributors

**Feature Branch**: `012-contributors`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "P1-F09 Contributors"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inspect core contributor metrics in the Contributors tab (Priority: P1)

A user can open the `Contributors` tab after analysis and see a dedicated contributor-health view for each successfully analyzed repository.

**Why this priority**: This is the most natural next detail surface after the Overview card, and it gives the `Contributors` tab a concrete purpose instead of leaving contributor detail scattered across the product.

**Independent Test**: Can be fully tested by supplying one or more successful `AnalysisResult` objects and confirming the `Contributors` tab renders the core contributor metrics and a person-level contribution heatmap for each successful repository without triggering another analysis request.

**Acceptance Scenarios**:

1. **Given** one successful repository has been analyzed, **When** the user opens the `Contributors` tab, **Then** the tab shows a `Core` pane for that repository with the contributor composition summary and person-level contribution heatmap.
2. **Given** multiple successful repositories have been analyzed, **When** the user opens the `Contributors` tab, **Then** each successful repository appears with its own contributor content and failed repositories do not create fabricated views.
3. **Given** the user switches between `Overview` and `Contributors` or changes the recent-activity window inside `Contributors`, **When** they view the contributor content, **Then** no new analysis request or extra API call is triggered.

---

### User Story 2 - Understand the Sustainability pane and contributor distribution (Priority: P1)

A user can see a real Sustainability score for each successful repository and understand the contributor-distribution signals that produced it.

**Why this priority**: The Overview card already reserves a Sustainability badge, so `P1-F09` needs to replace the current placeholder with a real score and supporting evidence.

**Independent Test**: Can be fully tested by rendering repositories with known contribution distributions and confirming the computed score and supporting contributor metrics match the config-driven rules within the `Sustainability` pane.

**Acceptance Scenarios**:

1. **Given** a repository has sufficient verified contribution data, **When** the user views its card or the `Sustainability` pane inside `Contributors`, **Then** the Sustainability badge shows `High`, `Medium`, or `Low`.
2. **Given** a repository does not have sufficient verified contribution data, **When** the score is computed, **Then** the UI shows `Insufficient verified public data` instead of a guessed score.
3. **Given** a Sustainability score is visible, **When** the user asks how it was scored, **Then** the UI exposes a tooltip or equivalent help surface describing the thresholds from shared config.
4. **Given** contributor-distribution data is available, **When** the user views the `Core` and `Sustainability` panes inside `Contributors`, **Then** the UI shows the implemented core contributor metrics and person-level heatmap and does not imply that the placeholder sustainability signals have already been computed.

---

### User Story 3 - See later sustainability signals reserved clearly without fabricated data (Priority: P2)

A user can see that broader sustainability signals are planned for this tab without the UI inventing unsupported values before those signals are fully implemented.

**Why this priority**: This preserves the intended information architecture for Sustainability while keeping the first implementation slice focused on the core contributor stats and score.

**Independent Test**: Can be fully tested by rendering the `Contributors` tab and confirming it shows the implemented `Core` pane plus a clearly labeled placeholder area in the `Sustainability` pane for later sustainability signals without fabricated values.

**Acceptance Scenarios**:

1. **Given** the user opens the `Contributors` tab, **When** broader sustainability signals are not yet implemented, **Then** the `Sustainability` pane shows a clearly labeled placeholder for later signals rather than invented values.
2. **Given** a repository lacks data for those later sustainability signals, **When** the user views the placeholder area, **Then** the UI does not imply that maintainer, organization, or contribution-type values have already been computed.
3. **Given** future sustainability signals such as maintainer count, organizational diversity, Elephant Factor, occasional contributors, inactive contributors, new contributors, or organization-level heatmaps are planned, **When** the user views the placeholder area, **Then** the UI makes clear that those signals will land later in `P1-F09`.

### Edge Cases

- What happens when a repository has no successful analysis result but the `Contributors` tab is opened?
- What happens when contributor counts exist but commit distribution data is unavailable?
- What happens when the number of active contributors is very small and concentration metrics would be misleading without enough underlying data?
- What happens when the placeholder section is visible but the advanced sustainability signals are not yet implemented?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST populate the `Contributors` tab with contributor-health content for successful repositories.
- **FR-002**: The `Contributors` tab MUST expose a `Recent activity window` control with exact presets `30d`, `60d`, `90d`, `180d`, and `365d`, with `90d` selected by default.
- **FR-002a**: The `Recent activity window` control MUST update contributor-derived metrics locally without rerunning repository analysis.
- **FR-002b**: The `Contributors` tab MUST expose a `Core` pane that surfaces the following exact core metrics per successful repository when publicly verifiable: a `Contributor composition` summary card built from `GitHub API contributors`, active contributors for the selected window, repeat contributors for the selected window, one-time contributors for the selected window, inactive contributors relative to the selected window, and a person-level contribution heatmap for the selected window.
- **FR-003**: The `Core` pane MAY frame active contributors as committers when that framing is derived from the same verified public data, but it MUST NOT introduce a second incompatible contributor definition in the initial implementation.
- **FR-003a**: The `Contributors` tab MUST expose a `Sustainability` pane for the Sustainability score, scoring explanation, missing-data callouts, and later sustainability signals.
- **FR-003b**: The `Sustainability` pane MUST surface maintainer or owner count from supported public repository files such as `OWNERS`, `OWNERS.alias`, `MAINTAINERS`, `MAINTAINERS.md`, `.github/CODEOWNERS`, or `GOVERNANCE.md` when those signals are publicly verifiable.
- **FR-003c**: The `Sustainability` pane MUST surface observed contribution types from verified recent repository activity.
- **FR-003d**: The `Sustainability` pane MUST expose a clearly labeled `Experimental` subsection for Elephant Factor and single-vendor dependency ratio, with an explicit warning that heuristic public-org attribution may be incomplete or inaccurate.
- **FR-004**: Contribution concentration MUST be computed as the share of commits attributable to the top 20% of contributors only when the required verified author-distribution data exists, with room for a later Lorenz/Gini-based implementation that preserves the same user-facing metric slot.
- **FR-005**: The system MUST compute a Sustainability score of `High`, `Medium`, or `Low` using shared config-driven thresholds and the approved contribution-dynamics logic.
- **FR-006**: When insufficient verified contribution data exists, the Sustainability score MUST be the literal string `Insufficient verified public data`.
- **FR-007**: The Sustainability score label MUST remain visible on the repo summary card and MUST update from the current placeholder state when real scoring is available.
- **FR-007a**: The Sustainability score presentation MUST include the user-facing CHAOSS-aligned dimension label alongside the score in the UI.
- **FR-008**: The UI MUST expose a "how is this scored?" help surface for Sustainability thresholds without requiring another analysis request.
- **FR-009**: Unavailable contribution metrics and unavailable derived values MUST remain explicit in the `Contributors` tab and MUST NOT be hidden, zeroed, or guessed.
- **FR-009a**: The `Sustainability` pane MUST provide a per-repository missing-data callout panel that lists unavailable contribution fields affecting the rendered pane content or Sustainability score.
- **FR-010**: Later sustainability signals such as no contributions in the last 6 months, new contributors in last 90d, new vs. returning contributor ratio per release cycle, organizational diversity, organization-level contribution heatmaps, unique employer/org count among contributors, and richer Elephant Factor or vendor-risk refinements beyond the initial experimental heuristic MUST remain tracked in the feature docs without requiring visible placeholder UI in the current pane.
- **FR-011**: The UI MUST NOT display fabricated or provisional values for those later sustainability signals.
- **FR-012**: The feature MUST reuse the existing `AnalysisResult[]` analysis payload for rendering and MUST NOT introduce a second fetch path for sustainability detail.

### Key Entities

- **Contributors View**: The `Contributors` tab surface that renders one repository’s `Core` and `Sustainability` panes.
- **Core Contributor Metrics**: The initial `P1-F09` metric set consisting of the contributor composition summary card, selected-window contributor-distribution counts, and a person-level contribution heatmap.
- **Contribution Concentration**: The sustainability-oriented contributor-distribution metric currently computed as the share of commits attributable to the top 20% of contributors, with room for a later Lorenz/Gini-based implementation that preserves the same user-facing meaning.
- **Sustainability Pane**: The pane inside `Contributors` that renders the config-driven Sustainability score, related explanation surfaces, verified contributor metrics, experimental organization metrics, and missing-data callout.
- **Experimental Organization Metrics**: A clearly labeled subsection inside `Sustainability` that renders best-effort Elephant Factor and single-vendor dependency ratio estimates using heuristic public-org attribution and an explicit warning about accuracy limitations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For analyses with one or more successful repositories, 100% of successful repositories render contributor content in the `Contributors` tab.
- **SC-002**: For repositories with sufficient verified contribution data, 100% of rendered Sustainability badges show `High`, `Medium`, or `Low` instead of `Not scored yet`.
- **SC-003**: For repositories with insufficient verified contribution data, 100% of rendered Sustainability scores show `Insufficient verified public data`.
- **SC-004**: In 100% of tested later-signal scenarios, the product docs track future sustainability signals without the UI displaying fabricated values for them.

## Assumptions

- The `Contributors` tab is the intended home for `P1-F09`, with `Core` and `Sustainability` panes replacing the earlier split between a feature name and a top-level `Sustainability` tab.
- `AnalysisResult` may need to grow to support the core contributor metrics and score inputs required by the first `P1-F09` slice, but the analyzer contract remains the single source of truth.
- The recent-activity window applies only to contributor-derived metrics inside `Contributors`; fixed-source metrics such as `GitHub API contributors` and `Maintainer count` remain unchanged when the window changes.
- Threshold help may initially be delivered as lightweight inline UI or a tooltip, as long as it is clear and sourced from shared config.
- The later sustainability signals tracked in the docs will be implemented inside `P1-F09`, but they are not part of the current required metric slice defined by this draft.
