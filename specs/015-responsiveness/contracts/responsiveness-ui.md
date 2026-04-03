# UI Contract: Responsiveness

## Top-Level Tab

- The results workspace shows `Responsiveness` as a top-level tab label
- Switching into `Responsiveness` does not trigger a new analysis request

## Repository Sections

For each successful repository:

- render one `Responsiveness` section
- show one pane per responsiveness metric group
- keep failed repositories in the existing failure surface outside the per-repo responsiveness sections
- do not fabricate sections for failed repositories

## Pane Structure

Each repository section includes these panes:

- `Issue & PR response time`
- `Resolution metrics`
- `Maintainer activity signals`
- `Volume & backlog health`
- `Engagement quality signals`

## Visible Metrics

The `Responsiveness` workspace surfaces, when publicly verifiable:

- time to first issue response
- time to first PR review
- median response times
- `p90` response times
- issue resolution duration
- PR merge duration
- issue resolution rate
- stale issue ratio
- stale PR ratio
- contributor response rate
- bot-vs-human response ratio
- PR review depth
- issues closed without comment
- Responsiveness score surface with the CHAOSS-aligned category label

## Help Surfaces

- The score area exposes a "how is this scored?" help surface
- Help surfaces may explain:
  - scoring thresholds
  - weighted score categories
  - derived metric definitions
- Help surfaces must not be the only place where primary values are shown

## Missing Data

- Unavailable values remain visible as explicit unavailable states
- Missing-data callouts identify which unavailable inputs affect the score or visible metrics
- Partial data is allowed: available values still render even when some fields are unavailable
