# Quickstart: Activity

## Goal

Verify that the app now exposes a real `Activity` tab with local recent-activity window switching, explicit activity metrics, visible throughput ratios, and a real score/help surface that does not trigger additional analysis requests.

## Scenarios

### 1. Open the Activity tab after analysis

1. Run `npm run dev`
2. Open `http://localhost:3000`
3. Submit one or more repositories
4. Open the `Activity` tab
5. Confirm:
   - `Activity` appears as a top-level tab label
   - one activity section appears per successful repository
   - primary activity values are visible without tooltip interaction
   - PR and issue throughput percentages are shown with their raw-count context

### 2. Change the recent-activity window locally

1. With successful results visible, open the `Activity` tab
2. Switch between `30d`, `60d`, `90d`, `180d`, and `12 months`
3. Confirm:
   - the selected preset changes visually
   - rendered activity metrics update for the selected window
   - no additional analysis request or API call is triggered

### 3. Inspect score help and derived metrics

1. In the `Activity` tab, inspect the Activity score area
2. Open the "how is this scored?" help surface
3. Confirm:
   - thresholds and weighted factors are explained clearly
   - derived metrics can be explained without hiding the primary values
   - unavailable derived values remain explicit rather than guessed

### 4. Verify throughput-ratio context

1. In the `Activity` tab, inspect the selected-window PR and issue cards
2. Confirm:
   - `PR merge rate` is shown when both opened and merged counts exist for the selected window
   - `Issue closure rate` is shown when both opened and closed counts exist for the selected window
   - each percentage includes the underlying counts used to compute it

### 5. Verify unavailable-data behavior

1. Use a repository or mocked response with partial activity data
2. Open the `Activity` tab
3. Confirm:
   - unavailable metrics render explicitly
   - the score becomes `Insufficient verified public data` when required inputs are incomplete
   - missing inputs are called out clearly per repository
