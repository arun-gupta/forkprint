# Feature Specification: Ecosystem Map

**Feature Branch**: `005-ecosystem-map`  
**Created**: 2026-03-31  
**Status**: Draft  
**Input**: User description: "P1-F05 Ecosystem Map"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Show ecosystem metrics clearly for analyzed repos (Priority: P1)

A user can see the core ecosystem metrics for each successful repository as visible UI elements so stars, forks, and watchers are readable without relying on secondary interactions.

**Why this priority**: This delivers immediate value for both single-repo and multi-repo analysis, and it keeps the ecosystem feature useful even if users only read the profile cards.

**Independent Test**: Can be fully tested by supplying one or more successful `AnalysisResult` objects and confirming that stars, forks, and watchers are visible in the ecosystem-map area for each successful repository.

**Acceptance Scenarios**:

1. **Given** an analysis has returned one successful repository, **When** the ecosystem map section is shown, **Then** the repo’s exact stars, forks, and watchers are visible as UI elements outside the tooltip.
2. **Given** an analysis has returned multiple successful repositories, **When** the ecosystem map section is shown, **Then** each successful repository’s exact stars, forks, and watchers remain visible without requiring hover.
3. **Given** one or more repositories failed during analysis, **When** the ecosystem map section is shown, **Then** only successful repositories contribute visible ecosystem metrics and failed repositories do not create fabricated values.

---

### User Story 2 - Understand the ecosystem spectrum view (Priority: P2)

A user who has already run an analysis can see successful repositories summarized in a spectrum-based ecosystem view so ecosystem position is understandable even when only one repo is present.

**Why this priority**: The spectrum view is the signature interpretation layer for this feature, and it should remain useful for both single-repo and multi-repo analysis without requiring comparison-relative logic.

**Independent Test**: Can be fully tested by supplying one or more successful `AnalysisResult` objects and confirming that the ecosystem spectrum appears with shared legends and one profile card per successful repository, without any extra API calls.

**Acceptance Scenarios**:

1. **Given** an analysis has returned one or more successful repositories, **When** the ecosystem map is shown, **Then** the spectrum view explains Reach, Builder Engagement, and Attention using the current shared band definitions.
2. **Given** an analysis has returned exactly one successful repository, **When** the ecosystem map is shown, **Then** the single repository still renders as a useful spectrum/profile view with visible ecosystem metrics and derived rates.
3. **Given** one or more repositories failed during analysis, **When** the ecosystem map is shown, **Then** only successful repositories contribute ecosystem profiles and failed repositories do not create fabricated derived values.
4. **Given** a successful repository has the required ecosystem metrics, **When** it is rendered in the spectrum view, **Then** the derived profile values come directly from the existing `AnalysisResult[]` data and no additional fetching occurs.

---

### User Story 3 - Understand the ecosystem spectrum profile (Priority: P2)

A user can understand each successfully analyzed repository through a config-driven ecosystem profile rather than a comparison-relative label.

**Why this priority**: The spectrum profile is the interpretive layer for the feature and avoids misleading lifecycle implications from relative quadrant names.

**Independent Test**: Can be fully tested by supplying successful repositories with known stars, forks, and watchers, then confirming profile tiers and legends follow the shared spectrum configuration.

**Acceptance Scenarios**:

1. **Given** a repository is shown on the ecosystem map, **When** the profile summary is displayed, **Then** it surfaces Reach, Builder Engagement, and Attention tiers derived from shared config thresholds.
2. **Given** the UI renders the spectrum legend, **When** the user reviews it, **Then** the threshold bands shown in the UI are read from the same shared config used by the classification logic.
3. **Given** a repository is shown in the spectrum view, **When** the user inspects it, **Then** the profile reflects stars for reach, `forks / stars` for builder engagement, and `watchers / stars` for attention.

---

### User Story 4 - Inspect exact values and derived rates (Priority: P3)

A user can inspect exact ecosystem values from the repository cards and understand the derived rates behind the spectrum profile.

**Why this priority**: Exact-value displays make the spectrum trustworthy, but they depend on the profile layer already existing.

**Independent Test**: Can be fully tested by rendering successful repositories and confirming that exact values and derived rates appear in the cards while single-repo analysis still shows the same full profile behavior.

**Acceptance Scenarios**:

1. **Given** the user inspects a successful repository in the ecosystem map, **When** the card and profile are shown, **Then** they show the repo name, exact stars, exact forks, exact watchers, derived fork rate, and derived watcher rate.
2. **Given** there is exactly one successful repository in the analysis, **When** the ecosystem map is shown, **Then** the repo still receives its spectrum profile without requiring a comparison set.
3. **Given** there is exactly one successful repository, **When** the spectrum profile is shown, **Then** the ecosystem values and derived rates are visible without any fabricated comparison-relative label.

---

### Edge Cases

- What happens when one or more successful repositories have `"unavailable"` for stars, forks, or watchers?
- What happens when the analysis returns zero successful repositories because every repository failed?
- What happens when a repository has verified stars but a zero value that would make rate calculations invalid?
- What happens when a single successful repository is returned alongside one or more failures?
- What happens when very large ecosystem values make bubble labels or tooltips hard to read?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render an ecosystem spectrum view for successful repositories using only the already-fetched `AnalysisResult[]` data from the current analysis.
- **FR-002**: The system MUST derive Reach from stars, Builder Engagement from `forks / stars`, and Attention from `watchers / stars`.
- **FR-003**: The system MUST present shared band legends for Reach, Builder Engagement, and Attention within the ecosystem view.
- **FR-004**: The system MUST derive an ecosystem profile for each successful repository across Reach, Builder Engagement, and Attention.
- **FR-005**: The system MUST define spectrum bands in shared configuration and MUST read those same bands for both UI legends and classification logic.
- **FR-006**: The system MUST NOT hardcode spectrum thresholds independently in component logic.
- **FR-007**: The system MUST allow single successful repositories to be profiled without requiring comparison-relative behavior.
- **FR-008**: The system MUST surface exact repo name, stars, forks, watchers, derived fork rate, and derived watcher rate within the ecosystem view for each successful repository.
- **FR-009**: The system MUST exclude failed repositories from the ecosystem profile dataset while preserving any separate failure display owned by earlier features.
- **FR-010**: The system MUST visibly distinguish missing or unavailable ecosystem metrics rather than inventing derived rates or profile tiers.
- **FR-011**: The system MUST support desktop and mobile layouts for the spectrum legend and accompanying repository profile content.
- **FR-012**: The system MUST keep exact stars, forks, and watchers visible so the normalized profile never hides the underlying GitHub numbers.

### Key Entities

- **Ecosystem View**: The combined legend and repository-profile presentation for successful repositories using exact stars, derived builder engagement, derived attention, and exact ecosystem metrics.
- **Spectrum Profile**: The RepoPulse-defined ecosystem summary for one repository across Reach, Builder Engagement, and Attention tiers.
- **Spectrum Config**: The shared threshold definition that controls Reach, Builder Engagement, and Attention bands for both UI legends and profile logic.
- **Rate Summary**: The derived fork-rate and watcher-rate values shown in tooltips and profile detail.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For analyses with one or more successful repositories, 100% of successful repositories appear in the ecosystem spectrum view with reach, builder engagement, and attention derived from the current `AnalysisResult[]`.
- **SC-002**: For analyses with one or more successful repositories, 100% of ecosystem profile tiers and legends are derived from shared spectrum configuration rather than duplicated thresholds in component logic.
- **SC-003**: For single-success analyses, 100% of runs still show a repository spectrum profile when verified data exists.
- **SC-004**: Users can inspect exact ecosystem values and derived rates for any successful repository directly in the ecosystem view without navigating away from the map.

## Assumptions

- `P1-F04 Data Fetching` has already delivered successful `AnalysisResult[]`, failure state, and loading state on the client.
- This feature adds the first visualization layer but does not yet implement the full dashboard, comparison table, or repo cards from later features.
- The ecosystem spectrum may be rendered entirely through standard React/Tailwind UI without requiring a charting library.
- Repositories with unavailable ecosystem metrics may require a non-derived fallback or explanatory handling rather than guessed rates.
