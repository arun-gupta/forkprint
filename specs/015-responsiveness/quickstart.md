# Quickstart: Responsiveness

## Goal

Verify that the app now exposes a real `Responsiveness` tab with pane-based responsiveness metrics, explicit unavailable handling, and a real score/help surface that does not trigger additional analysis requests.

## Scenarios

### 1. Open the Responsiveness tab after analysis

1. Run `npm run dev`
2. Open `http://localhost:3000`
3. Submit one or more repositories
4. Open the `Responsiveness` tab
5. Confirm:
   - `Responsiveness` appears as a top-level tab label
   - one responsiveness section appears per successful repository
   - the five panes appear for each successful repository
   - primary responsiveness values are visible without tooltip interaction

### 2. Inspect response and resolution timing

1. In the `Responsiveness` tab, inspect the `Issue & PR response time` and `Resolution metrics` panes
2. Confirm:
   - first-response and first-review values render when publicly verifiable
   - median and `p90` timing values render when enough verified data exists
   - issue resolution rate and merge/close durations remain explicit when available

### 3. Inspect backlog and engagement quality

1. In the `Responsiveness` tab, inspect the `Volume & backlog health` and `Engagement quality signals` panes
2. Confirm:
   - stale issue/PR ratios render when publicly verifiable
   - PR review depth and issues closed without comment render when publicly verifiable
   - unavailable metrics remain explicit rather than guessed

### 4. Inspect score help and missing-data behavior

1. In the `Responsiveness` tab, inspect the score area
2. Open the "how is this scored?" help surface
3. Confirm:
   - the five weighted categories are explained clearly
   - thresholds are shown without hiding primary values
   - missing-data callouts identify which unavailable inputs affect the score

### 5. Verify no extra fetch behavior

1. With successful results visible, switch between `Overview`, `Activity`, `Contributors`, and `Responsiveness`
2. Confirm:
   - the `Responsiveness` tab opens without a second analysis request
   - score/help interactions stay local to the UI
