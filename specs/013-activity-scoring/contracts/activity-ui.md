# UI Contract: Activity

## Top-Level Tab

- The results workspace shows `Activity` as a top-level tab label
- `Activity` replaces the current `Metrics` label in the shell
- Switching into `Activity` does not trigger a new analysis request

## Activity Header Controls

- The `Activity` tab exposes a `Recent activity window` control
- Required presets:
  - `30d`
  - `60d`
  - `90d`
  - `180d`
  - `12 months`
- `90d` is selected by default
- Changing the selected preset updates all successful repository sections consistently

## Repository Sections

For each successful repository:

- render one `Activity` section
- show raw counts and selected-window values directly in the section
- keep failed repositories in the existing failure surface outside the per-repo activity sections
- do not fabricate sections for failed repositories

## Visible Metrics

Each repository section includes:

- commits for the selected window
- PRs opened, merged, and closed for the selected window
- issues opened and closed for the selected window
- release cadence/version frequency for the selected window
- PR merge rate
- stale issue ratio
- median time to merge pull requests
- median time to close issues
- fixed comparison commit windows for `30d`, `90d`, and `180d`
- Activity score surface with the CHAOSS-aligned category label

## Help Surfaces

- The score area exposes a "how is this scored?" help surface
- Help surfaces may explain:
  - scoring thresholds
  - weighted score factors
  - derived metric definitions
- Help surfaces must not be the only place where primary values are shown

## Missing Data

- Unavailable values remain visible as explicit unavailable states
- Missing-data callouts identify which unavailable inputs affect the score or visible metrics
- Partial data is allowed: available values still render even when some fields are unavailable
