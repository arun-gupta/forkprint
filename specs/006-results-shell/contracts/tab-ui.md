# UI Contract: Results Shell

## Header

- Shows ForkPrint title and short product framing
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
  - `Ecosystem Map`
  - `Comparison`
  - `Metrics`
- `Overview` is implemented in this feature
- `Ecosystem Map` may host current or resumed feature work
- `Comparison` and `Metrics` can show placeholder states until those features land

## Interaction Rules

- Switching tabs does not trigger a new analysis request
- Current loading/error/results state remains preserved while switching tabs
- Tabs remain usable before and after analysis, with empty or placeholder states where appropriate
