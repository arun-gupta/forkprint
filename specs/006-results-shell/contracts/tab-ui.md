# UI Contract: Results Shell

## Header

- Shows RepoPulse title and short product framing
- Shows a visible GitHub repo link in the header
- On desktop, the GitHub link is placed in the top-right area of the header
- On mobile, the link remains visible within the header without overlap or clipping

## Analysis Panel

- Contains the existing repo input and auth flow
- Remains visible while tabs switch
- Does not move into individual result tabs

## Tabs

- Required tabs:
  - `Overview`
  - `Contributors`
  - `Metrics`
  - `Responsiveness`
  - `Comparison`
- `Overview` is implemented in this feature
- `Contributors` sits immediately after `Overview` and becomes the home for contributor detail, with `Core` and `Sustainability` panes inside it
- `Metrics` is the primary destination for detailed repo metrics as scoring features land
- `Responsiveness` and `Comparison` can show placeholder states until those features land

## Interaction Rules

- Switching tabs does not trigger a new analysis request
- Current loading/error/results state remains preserved while switching tabs
- Tabs remain usable before and after analysis, with empty or placeholder states where appropriate
