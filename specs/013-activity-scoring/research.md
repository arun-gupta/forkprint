# Research: Activity

## Decision 1: Use `Activity` consistently for the workspace and score label

- **Decision**: Use `Activity` as the top-level tab, detailed workspace name, and score label for this implementation slice.
- **Rationale**: Keeping one user-facing term avoids confusion and keeps the product, spec, and UI language aligned.
- **Alternatives considered**:
  - Keep a legacy score label while using `Activity` for the tab: rejected because it creates unnecessary terminology drift
  - Keep the tab labeled `Metrics`: rejected because it weakens the information architecture and no longer matches the accepted spec direction

## Decision 2: Add a local recent-activity window control with fixed presets

- **Decision**: Provide `30d`, `60d`, `90d`, `180d`, and `12 months` presets inside the `Activity` tab, with `90d` selected by default, and update the rendered activity view locally without rerunning analysis.
- **Rationale**: This gives users a meaningful way to inspect short-term versus sustained repo momentum while preserving the current single-request analysis flow.
- **Alternatives considered**:
  - Hardcode a single `12 months` view: rejected because it is less useful and does not match the updated spec direction
  - Fetch new data each time the window changes: rejected because it violates the intended local-tab behavior and adds unnecessary API churn

## Decision 3: Keep primary values visible; reserve tooltips/help for explanations

- **Decision**: Raw counts and selected-window values stay visible in the `Activity` tab, while tooltips or equivalent help surfaces are reserved for derived metrics, scoring explanations, and non-obvious definitions.
- **Rationale**: The repo already favors visible primary data over tooltip-only discovery, which is better for accessibility, mobile use, and manual verification.
- **Alternatives considered**:
  - Put derived values and primary values behind hover-only interactions: rejected because it hides important data and weakens accessibility
  - Avoid any help surfaces: rejected because Activity includes derived metrics and score logic that need explanation

## Decision 4: Extend the analyzer with verified activity inputs instead of adding a second fetch path

- **Decision**: Extend `AnalysisResult`, GraphQL queries, and analyzer mapping so the `Activity` tab and overview badge both consume the same shared analysis payload.
- **Rationale**: This follows the analyzer-module boundary and avoids duplicating feature logic in the client.
- **Alternatives considered**:
  - Add an `Activity`-specific client fetch after analysis: rejected because it creates a second data path and breaks tab-switch locality
  - Compute scores directly inside components from ad hoc fetch results: rejected because it scatters logic and weakens testability

## Decision 5: Use GitHub GraphQL as the primary source for releases, flow counts, and timing inputs

- **Decision**: Keep GitHub GraphQL as the primary source for activity inputs, using additional GraphQL fields/searches for releases, opened/merged/closed counts, and the timestamps required to derive median merge/close times. Only use REST if GraphQL proves insufficient for a required field.
- **Rationale**: The constitution and product doc both require GraphQL-first behavior and allow REST only as a narrow exception.
- **Alternatives considered**:
  - Move all activity fetching to REST for convenience: rejected because it conflicts with the project’s GraphQL-first rules
  - Skip timing inputs and score only on counts: rejected because it would fail the accepted feature contract
