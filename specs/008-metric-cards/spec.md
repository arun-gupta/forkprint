# Feature Specification: Metric Cards

**Feature Branch**: `008-metric-cards`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "P1-F07 Metric Cards"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan key repo health signals quickly (Priority: P1)

A user can see one summary card per successfully analyzed repository so the most important repo signals are readable at a glance without switching tabs or opening a comparison table.

**Why this priority**: This is the first user-facing summary layer for per-repo analysis and gives immediate value even before deeper score features are fully implemented.

**Independent Test**: Can be fully tested by supplying one or more successful `AnalysisResult` objects and confirming one card appears per repo with stars, forks, watches, created date, and the current ecosystem profile summary.

**Acceptance Scenarios**:

1. **Given** one successful repository has been analyzed, **When** the overview is shown, **Then** one summary card appears for that repo with stars, forks, watches, created date, and ecosystem profile summary.
2. **Given** multiple successful repositories have been analyzed, **When** the overview is shown, **Then** one summary card appears for each successful repository.
3. **Given** one or more repositories failed during analysis, **When** the overview is shown, **Then** only successful repositories produce summary cards and failed repositories do not create fabricated card content.

---

### User Story 2 - Understand CHAOSS-aligned score badges per repo (Priority: P2)

A user can see one score badge per CHAOSS category on each repo card so the repo’s health framing is visible without opening the detailed metrics views.

**Why this priority**: The metric cards become much more useful when they summarize the cross-category health framing, but they still depend on the earlier card shell being present first.

**Independent Test**: Can be fully tested by rendering repo cards with score values for Evolution, Contribution Dynamics, and Responsiveness and confirming the badges show the expected labels and color semantics, including the interim `Not scored yet` state before later scoring features land.

**Acceptance Scenarios**:

1. **Given** a repo card is rendered with Evolution, Contribution Dynamics, and Responsiveness scores, **When** the user views the card, **Then** one badge appears for each CHAOSS category.
2. **Given** a score badge is shown, **When** the user inspects it, **Then** the CHAOSS category label is displayed alongside or beneath the score so the framing is explicit.
3. **Given** score values of High, Medium, Low, or Not scored yet exist, **When** badges are rendered, **Then** they use a consistent visual treatment that matches the score semantics.

---

### User Story 3 - Expand a card to inspect repo detail (Priority: P3)

A user can click or expand a repo card to reveal fuller metric detail for that repository without leaving the current analysis workspace.

**Why this priority**: Expansion makes the cards more useful as a gateway into deeper repo detail, but it depends on the summary-card structure and badge framing already existing.

**Independent Test**: Can be fully tested by rendering a repo card, expanding it, and confirming fuller repo-specific detail becomes visible while the rest of the analysis workspace remains intact.

**Acceptance Scenarios**:

1. **Given** a repo summary card is shown, **When** the user clicks or expands the card, **Then** fuller metric detail for that repo becomes visible in place.
2. **Given** a repo card is expanded, **When** the user returns it to its collapsed state, **Then** the summary card remains intact and no analysis request is rerun.
3. **Given** a repo has unavailable metrics, **When** the expanded detail is shown, **Then** unavailable values remain explicitly marked rather than hidden or guessed.

### Edge Cases

- What happens when no successful repositories exist in the current analysis?
- What happens when a repo card must show score badges before later features have full scoring logic available?
- What happens when a repo contains unavailable values for fields shown in the card or expanded detail?
- What happens when multiple repo cards are expanded in a mobile-width layout?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render one summary card per successful repository in the current analysis.
- **FR-002**: Each summary card MUST show exact stars, forks, watches, created date, and ecosystem profile summary for that repository.
- **FR-003**: Ecosystem profile badges on the card MUST use consistent visual treatment across Reach, Builder Engagement, and Attention tiers.
- **FR-004**: Each summary card MUST surface one badge for each CHAOSS category represented by later scoring features: Evolution, Contribution Dynamics, and Responsiveness.
- **FR-005**: Score badge colors MUST map consistently to High, Medium, Low, and Not scored yet.
- **FR-006**: Each score badge MUST display the associated CHAOSS category label so the framing is always visible.
- **FR-007**: Users MUST be able to click or expand a repo card to reveal fuller metric detail for that repository.
- **FR-008**: Expanding or collapsing a repo card MUST NOT rerun the analysis request or trigger extra API calls.
- **FR-009**: Failed repositories MUST NOT render summary cards.
- **FR-010**: Unavailable metrics shown in the card or expanded detail MUST remain explicit and MUST NOT be hidden, zeroed, or guessed.

### Key Entities

- **Repo Summary Card**: The overview-level UI representation of one successful repository with key metrics, ecosystem profile badges, and CHAOSS score badges.
- **Score Badge**: A compact, color-coded UI element representing one CHAOSS category score and label.
- **Expanded Repo Detail**: The additional in-place card content that appears when a repo card is expanded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For analyses with one or more successful repositories, 100% of successful repositories render exactly one summary card in the overview.
- **SC-002**: For rendered score badges, 100% of badges show both the score value and CHAOSS category label with consistent color semantics.
- **SC-003**: Users can expand a repo card and view fuller metric detail without triggering additional analysis requests.
- **SC-004**: Unavailable values shown in cards or expanded details remain explicit in 100% of tested missing-data scenarios.

## Assumptions

- `P1-F05 Ecosystem Map` already provides the ecosystem profile summary values that metric cards can reuse.
- Full score computation for Evolution, Contribution Dynamics, and Responsiveness may be implemented incrementally, but the card contract should be ready to host those badges consistently.
- The cards live within the existing `P1-F15` results shell rather than introducing a new page layout.
- Comparison-table behavior remains out of scope for this feature and will still be handled later by `P1-F06`.
