# Contract: Health Ratios UI

## Top-Level Navigation

- The results shell includes a `Health Ratios` top-level tab
- Opening the tab does not trigger another analysis request

## Contributors Home View

- The `Contributors` workspace surfaces contributor-composition ratios:
  - `Repeat contributors`
  - `New contributors`
- Ratios remain visible in context and expose short explanatory help text when needed
- Unavailable contributor-composition ratios remain explicit

## Health Ratios Tab

- Renders one grouped comparison table across all successful repositories
- Categories appear in this order:
  1. `Ecosystem`
  2. `Activity`
  3. `Contributors`
- Ratio rows appear beneath each category heading
- Each row includes:
  - label
  - formula/help affordance
  - one value cell per successful repository

## Sorting

- Users can sort by any supported ratio row
- Sort order is applied locally to repository columns or row values according to the chosen table interaction model
- Unavailable values remain `—` during sorting and do not become numeric placeholders

## Availability Rules

- Home views may continue using their local unavailable presentation, but the `Health Ratios` table uses `—`
- No ratio is hidden, guessed, or replaced with another metric

## Consistency Rules

- If a ratio appears in both a home view and the `Health Ratios` tab, the value and wording must match
- Help text should follow the same visible-affordance pattern already used in `Activity` and `Responsiveness`
