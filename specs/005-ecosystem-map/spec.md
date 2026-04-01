# Feature Specification: Ecosystem Map

**Feature Branch**: `005-ecosystem-map`  
**Created**: 2026-03-31  
**Status**: Draft  
**Input**: User description: "P1-F05 Ecosystem Map"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Show ecosystem metrics clearly for analyzed repos (Priority: P1)

A user can see the core ecosystem metrics for each successful repository as visible UI elements so stars, forks, and watchers are readable even without relying on chart hover interactions.

**Why this priority**: This delivers immediate value for both single-repo and multi-repo analysis, and it keeps the ecosystem feature useful before users rely on the interactive chart itself.

**Independent Test**: Can be fully tested by supplying one or more successful `AnalysisResult` objects and confirming that stars, forks, and watchers are visible in the ecosystem-map area for each successful repository.

**Acceptance Scenarios**:

1. **Given** an analysis has returned one successful repository, **When** the ecosystem map section is shown, **Then** the repo’s exact stars, forks, and watchers are visible as UI elements outside the tooltip.
2. **Given** an analysis has returned multiple successful repositories, **When** the ecosystem map section is shown, **Then** each successful repository’s exact stars, forks, and watchers remain visible without requiring hover.
3. **Given** one or more repositories failed during analysis, **When** the ecosystem map section is shown, **Then** only successful repositories contribute visible ecosystem metrics and failed repositories do not create fabricated values.

---

### User Story 2 - Visualize analyzed repos on the ecosystem map (Priority: P2)

A user who has already run an analysis can see successful repositories plotted on a bubble chart so the ecosystem position of each repo is immediately visible, even when only one repo is present.

**Why this priority**: The interactive chart is the signature visualization for this feature, but it should remain useful in both single-repo and multi-repo analysis instead of depending on comparison scenarios only.

**Independent Test**: Can be fully tested by supplying one or more successful `AnalysisResult` objects and confirming that each repo appears as a bubble positioned by stars and forks, sized by watchers, without any extra API calls.

**Acceptance Scenarios**:

1. **Given** an analysis has returned one or more successful repositories, **When** the ecosystem map is shown, **Then** one bubble appears per successful repository using stars on the X axis, forks on the Y axis, and watchers for bubble size.
2. **Given** an analysis has returned exactly one successful repository, **When** the ecosystem map is shown, **Then** the single repository still renders as a useful plotted bubble with visible ecosystem metrics even though quadrant classification may be skipped elsewhere.
3. **Given** one or more repositories failed during analysis, **When** the ecosystem map is shown, **Then** only successful repositories are plotted and failed repositories do not create empty or fabricated bubbles.
4. **Given** a successful repository has the required ecosystem metrics, **When** it is rendered on the map, **Then** the plotted values come directly from the existing `AnalysisResult[]` data and no additional fetching occurs.

---

### User Story 3 - Understand ForkPrint ecosystem classification (Priority: P2)

A user can understand which ForkPrint ecosystem classification each successfully analyzed repository belongs to based on the current analysis set.

**Why this priority**: This feature uses ForkPrint’s own quadrant classification as its ecosystem summary, aligned to the CHAOSS ecosystem category, but it depends on the plotted visualization and multi-repo input set already being in place.

**Independent Test**: Can be fully tested by supplying multiple successful repositories with known stars and forks, then confirming quadrant assignments follow the median split derived from that same input set.

**Acceptance Scenarios**:

1. **Given** an analysis returns two or more successful repositories, **When** the ecosystem map computes quadrant boundaries, **Then** it uses the median split of stars and forks from the current successful input set and never hardcoded thresholds.
2. **Given** a repository is plotted on the map, **When** the user inspects it, **Then** the assigned ForkPrint ecosystem classification is one of `Leaders`, `Buzz`, `Builders`, or `Early` based on the computed split.
3. **Given** the analysis input changes, **When** the ecosystem map re-renders, **Then** the quadrant boundaries and quadrant assignments are recomputed from the new successful input set.

---

### User Story 4 - Inspect bubble details and single-repo behavior (Priority: P3)

A user can inspect exact ecosystem values from the chart and receives a clear explanation when quadrant classification is not possible.

**Why this priority**: Tooltips and single-repo guidance make the chart understandable and trustworthy, but they depend on the chart already existing.

**Independent Test**: Can be fully tested by hovering a plotted bubble to inspect exact values and by rendering the feature with exactly one successful repository to confirm quadrant classification is intentionally skipped with an explanatory note.

**Acceptance Scenarios**:

1. **Given** the user hovers or focuses a plotted repository bubble, **When** the tooltip appears, **Then** it shows the repo name, exact stars, exact forks, exact watchers, and the assigned quadrant.
2. **Given** there is exactly one successful repository in the analysis, **When** the ecosystem map is shown, **Then** quadrant classification is skipped and a note explains that a single repo cannot be classified against a median split.
3. **Given** there is exactly one successful repository, **When** the tooltip is shown, **Then** the ecosystem values are still visible but the quadrant is not fabricated.

---

### Edge Cases

- What happens when one or more successful repositories have `"unavailable"` for stars, forks, or watchers?
- What happens when the analysis returns zero successful repositories because every repository failed?
- What happens when multiple repositories sit exactly on the median boundary for stars or forks?
- What happens when a single successful repository is returned alongside one or more failures?
- What happens when very large ecosystem values make bubble labels or tooltips hard to read?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render an ecosystem map for successful repositories using only the already-fetched `AnalysisResult[]` data from the current analysis.
- **FR-002**: The system MUST position each plotted repository by stars on the X axis and forks on the Y axis.
- **FR-003**: The system MUST size each plotted repository bubble by watchers.
- **FR-004**: The system MUST compute quadrant boundaries from the median stars value and median forks value of the current successful input set.
- **FR-005**: The system MUST assign each plotted repository one ForkPrint ecosystem classification label from `Leaders`, `Buzz`, `Builders`, or `Early` when quadrant classification is possible.
- **FR-006**: The system MUST NOT use hardcoded quadrant thresholds.
- **FR-007**: The system MUST skip quadrant classification when exactly one successful repository exists and MUST show an explanatory note instead of assigning a default quadrant.
- **FR-008**: The system MUST surface an inspectable tooltip for each plotted repository showing repo name, exact stars, exact forks, exact watchers, and assigned quadrant when available.
- **FR-009**: The system MUST exclude failed repositories from the plotted dataset while preserving any separate failure display owned by earlier features.
- **FR-010**: The system MUST visibly distinguish missing or unavailable ecosystem metrics rather than inventing chart coordinates or sizes.
- **FR-011**: The system MUST remain consistent with the constitution’s quadrant colors: Leaders = green, Buzz = amber, Builders = blue, Early = gray.
- **FR-012**: The system MUST support desktop and mobile layouts for the chart and accompanying note/legend content.

### Key Entities

- **Ecosystem Bubble**: A plotted representation of one successful repository using stars, forks, watchers, repo name, and optional quadrant classification.
- **Quadrant Boundary Set**: The median-derived X and Y split values computed from the current successful analysis input set.
- **Quadrant Assignment**: The ForkPrint-defined ecosystem classification label (`Leaders`, `Buzz`, `Builders`, `Early`) for a repository when enough successful repos exist to classify it.
- **Single-Repo Notice**: A user-facing explanation shown when only one successful repository exists and quadrant classification is intentionally skipped.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For analyses with two or more successful repositories, 100% of successful repositories appear on the ecosystem map with plotted stars, forks, and watchers values derived from the current `AnalysisResult[]`.
- **SC-002**: For analyses with two or more successful repositories, 100% of quadrant assignments use the median split computed from the current successful input set rather than hardcoded thresholds.
- **SC-003**: For single-success analyses, 100% of runs skip quadrant assignment and show an explanatory note instead of displaying a fabricated quadrant.
- **SC-004**: Users can inspect exact ecosystem values for any plotted repository through the chart tooltip without navigating away from the map.

## Assumptions

- `P1-F04 Data Fetching` has already delivered successful `AnalysisResult[]`, failure state, and loading state on the client.
- This feature adds the first visualization layer but does not yet implement the full dashboard, comparison table, or repo cards from later features.
- Chart rendering may rely on a client-side charting library compatible with the constitution’s approved stack.
- Repositories with unavailable ecosystem metrics may require a non-plotted fallback or explanatory handling rather than guessed coordinates.
