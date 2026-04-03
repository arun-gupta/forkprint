# Feature Specification: Responsiveness

**Feature Branch**: `015-responsiveness`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "P1-F10 Responsiveness"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inspect responsiveness metrics in the Responsiveness tab (Priority: P1)

A user can open the `Responsiveness` tab after analysis and inspect one dedicated responsiveness workspace per successfully analyzed repository.

**Why this priority**: The Overview card already reserves a Responsiveness badge, and users need a clear home for response and resolution behavior before any cross-repo rollup or advanced ratio work becomes useful.

**Independent Test**: Can be fully tested by supplying one or more successful `AnalysisResult` objects and confirming the `Responsiveness` tab renders one section per successful repository with the expected pane structure and no extra analysis request.

**Acceptance Scenarios**:

1. **Given** one successful repository has been analyzed, **When** the user opens the `Responsiveness` tab, **Then** the tab shows one responsiveness section for that repository with the required panes.
2. **Given** multiple successful repositories have been analyzed, **When** the user opens the `Responsiveness` tab, **Then** each successful repository appears with its own responsiveness content and failed repositories do not produce fabricated views.
3. **Given** the user switches between `Overview`, `Activity`, `Contributors`, and `Responsiveness`, **When** they view responsiveness content, **Then** no new analysis request or extra API call is triggered.

---

### User Story 2 - Understand response, resolution, and engagement quality for a repository (Priority: P1)

A user can inspect first-response speed, resolution duration, backlog health, and engagement-quality metrics in one place without leaving the `Responsiveness` tab.

**Why this priority**: The feature should do more than show one score; it needs to explain how maintainers respond, review, and resolve community activity with enough detail to reveal slowdowns and low-quality handling.

**Independent Test**: Can be fully tested by rendering repositories with known responsiveness inputs and confirming the five pane groups show the correct durations, ratios, and quality signals from verified public data.

**Acceptance Scenarios**:

1. **Given** verified response and resolution data exists, **When** the user views the `Responsiveness` tab, **Then** the UI shows the five panes `Issue & PR response time`, `Resolution metrics`, `Maintainer activity signals`, `Volume & backlog health`, and `Engagement quality signals`.
2. **Given** response-time data contains outliers, **When** the user views the tab, **Then** the UI can show both median and `p90` values when publicly verifiable.
3. **Given** some responsiveness fields are unavailable, **When** the user views the tab, **Then** unavailable values remain explicit and the UI does not hide or fabricate them.

---

### User Story 3 - Understand the Responsiveness score and its missing-data limits (Priority: P2)

A user can see a real Responsiveness score, understand the weighted categories that produced it, and know which missing inputs block scoring when event data is incomplete.

**Why this priority**: The score is valuable only if it is transparent and if the product stays honest when GitHub data is incomplete or unavailable.

**Independent Test**: Can be fully tested by rendering repositories with known responsiveness inputs and confirming the score, weighted category explanation, and insufficient-data behavior match the shared config-driven rules.

**Acceptance Scenarios**:

1. **Given** a repository has sufficient verified responsiveness data, **When** the score is computed, **Then** the card and tab show `High`, `Medium`, or `Low`.
2. **Given** the repository lacks required verified responsiveness inputs, **When** the score is computed, **Then** the UI shows `Insufficient verified public data` instead of a guessed score.
3. **Given** a Responsiveness score is visible, **When** the user asks how it was scored, **Then** the UI exposes the weighted categories and thresholds from shared config without requiring another fetch.

### Edge Cases

- What happens when a repository has enough issue data for response metrics but not enough PR review data for the full score?
- What happens when GitHub exposes issue or PR timestamps but not the event history needed to determine a first human response?
- What happens when only bot activity is present in the response history for an issue or PR?
- What happens when an issue or PR is resolved without any visible public comment trail?
- What happens when the selected repository has no recent issues or PRs in the relevant window?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST populate the `Responsiveness` tab with responsiveness content for successful repositories.
- **FR-002**: The `Responsiveness` tab MUST render one repository section per successful analysis result and MUST exclude failed repositories from the responsiveness workspace.
- **FR-003**: The `Responsiveness` tab MUST be organized into these panes for each successful repository:
  - `Issue & PR response time`
  - `Resolution metrics`
  - `Maintainer activity signals`
  - `Volume & backlog health`
  - `Engagement quality signals`
- **FR-004**: The `Issue & PR response time` pane MUST surface the following metrics when publicly verifiable:
  - time to first issue response
  - time to first PR review
  - median response times
  - 90th percentile response times
- **FR-005**: The `Resolution metrics` pane MUST surface the following metrics when publicly verifiable:
  - issue resolution duration
  - PR merge duration
  - issue resolution rate (`closed / opened`) for the selected window
- **FR-006**: The `Maintainer activity signals` pane MUST surface the following metrics when publicly verifiable:
  - contributor response rate
  - ratio of bot responses vs. human responses
- **FR-007**: The `Volume & backlog health` pane MUST surface the following metrics when publicly verifiable:
  - stale issue ratio
  - stale PR ratio
- **FR-008**: The `Engagement quality signals` pane MUST surface the following metrics when publicly verifiable:
  - PR review depth
  - issues closed without comment
- **FR-009**: Responsiveness metrics MUST be computed from exact publicly verifiable GitHub issue, pull request, review, comment, and event timestamps when those timestamps are available; the analyzer MUST NOT estimate or infer unavailable data.
- **FR-010**: Response and resolution metrics SHOULD expose both median and `p90` values when sufficient verified public data exists for those calculations.
- **FR-011**: The system MUST compute a Responsiveness score of `High`, `Medium`, or `Low` using shared config-driven thresholds and the approved weighted category model.
- **FR-012**: The Responsiveness score MUST use these weighted categories:
  - `30%` Issue & PR response time
  - `25%` Resolution metrics
  - `15%` Maintainer activity signals
  - `15%` Volume & backlog health
  - `15%` Engagement quality signals
- **FR-013**: When sufficient verified responsiveness inputs do not exist, the Responsiveness score MUST be the literal string `Insufficient verified public data`.
- **FR-014**: The Responsiveness score label MUST remain visible on the repo summary card and MUST update from the current placeholder state when real scoring is available.
- **FR-015**: The Responsiveness score presentation MUST include the user-facing CHAOSS-aligned dimension label alongside the score in the UI.
- **FR-016**: The UI MUST expose a "how is this scored?" help surface for Responsiveness thresholds and weighted categories without requiring another analysis request.
- **FR-017**: Unavailable responsiveness metrics and unavailable derived values MUST remain explicit in the `Responsiveness` tab and MUST NOT be hidden, zeroed, or guessed.
- **FR-018**: The `Responsiveness` tab MUST provide a per-repository missing-data callout panel that lists unavailable responsiveness fields affecting the rendered pane content or Responsiveness score.
- **FR-019**: The feature MUST reuse the existing `AnalysisResult[]` analysis payload for rendering and MUST NOT introduce a second fetch path for responsiveness detail.
- **FR-020**: Opening or interacting with the `Responsiveness` tab MUST NOT trigger a second analysis request.

### Key Entities

- **Responsiveness View**: The `Responsiveness` tab surface that renders one repository’s responsiveness panes and score explanation.
- **Response-Time Pane**: The pane that groups first-response and first-review latency metrics, including median and `p90` values when available.
- **Resolution Metrics Pane**: The pane that groups issue close duration, PR merge duration, and issue resolution-rate signals.
- **Maintainer Activity Signals Pane**: The pane that groups responder participation metrics such as contributor response rate and bot-vs-human response ratio.
- **Backlog Health Pane**: The pane that groups stale issue and stale PR signals.
- **Engagement Quality Pane**: The pane that groups review-depth and low-context-resolution signals such as issues closed without comment.
- **Responsiveness Score**: The config-driven score derived from the five weighted responsiveness categories.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For analyses with one or more successful repositories, 100% of successful repositories render responsiveness content in the `Responsiveness` tab.
- **SC-002**: For repositories with sufficient verified responsiveness data, 100% of rendered Responsiveness badges show `High`, `Medium`, or `Low` instead of `Not scored yet`.
- **SC-003**: For repositories with insufficient verified responsiveness data, 100% of rendered Responsiveness scores show `Insufficient verified public data`.
- **SC-004**: In 100% of tested tab-switching scenarios, opening or interacting with `Responsiveness` does not rerun repository analysis.

## Assumptions

- The `Responsiveness` tab is the intended home for `P1-F10`, and its pane structure mirrors the grouped metric categories defined in `docs/PRODUCT.md`.
- `AnalysisResult` will need to expand to carry the verified issue, PR, review, and event-derived inputs required for the first `P1-F10` slice, but the analyzer contract remains the single source of truth.
- Some responsiveness signals may rely on GitHub event/comment/review history that is more expensive to fetch than the current Activity and Contributors slices, so missing data is an expected honest outcome in some repositories.
- The first implementation focuses on repository-level responsiveness metrics, score explanation, and missing-data clarity rather than trend charts or reviewer-by-reviewer breakdowns.
- Bus Factor, responder concentration risk, label assignment lag, reopened issue rate, and other broader workflow-governance signals remain out of scope for `P1-F10`.
