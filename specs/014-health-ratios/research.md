# Research: Health Ratios

## Decision 1: Keep ratios in home tabs first, then roll them up in `Health Ratios`

- **Decision**: Preserve ratios in their natural home views and add `Health Ratios` as a comparison surface rather than the first place ratios appear.
- **Rationale**: `repeat / total` is easiest to understand in `Contributors`, `merged / opened` is easiest to understand in `Activity`, and ecosystem ratios already have context in overview/ecosystem surfaces. The rollup tab then becomes a fast comparison view instead of a context-free dump.
- **Alternatives considered**:
  - Put all ratios only in `Health Ratios`: rejected because it weakens interpretability
  - Duplicate full explanatory text in every tab: rejected because it adds noise and risks wording drift

## Decision 2: Reuse the existing `AnalysisResult[]` payload instead of adding a ratio-specific fetch

- **Decision**: Compute and render all Health Ratios from existing verified analyzer outputs, extending `AnalysisResult` only for missing contributor-composition inputs.
- **Rationale**: This keeps the feature aligned with the shared analyzer boundary and avoids another API path just for table rendering.
- **Alternatives considered**:
  - Fetch ratio inputs on demand when the tab opens: rejected because it breaks the “no extra API call on tab switch” behavior
  - Compute all ratios purely in component code from ad hoc assumptions: rejected because it scatters logic and weakens consistency

## Decision 3: Introduce shared ratio definitions and help text

- **Decision**: Centralize ratio metadata, grouping, formatting, and short explanations in one shared Health Ratios module.
- **Rationale**: The same ratio values appear in multiple places, so a shared definition layer prevents formula drift and keeps tooltip/help wording consistent.
- **Alternatives considered**:
  - Let each tab define its own ratio labels and formulas: rejected because consistency would be hard to maintain
  - Omit help text entirely: rejected because several ratios are derived and need explanation

## Decision 4: Render unavailable ratio values as `—` in the rollup table

- **Decision**: Use `—` in the cross-repo table for unavailable ratio values while keeping home views free to use their existing explicit unavailable treatment.
- **Rationale**: The product definition explicitly calls for `—` in comparison surfaces, and it keeps the table compact while still remaining honest.
- **Alternatives considered**:
  - Use `unavailable` in every table cell: rejected because it hurts scanability in a dense comparison view
  - Convert unavailable values to `0`: rejected because it violates the accuracy policy

## Decision 5: Treat contributor-composition ratios as the only new analyzer-derived ratios in this slice

- **Decision**: Add `repeat contributors / total contributors` and `new contributors / total contributors` as the main new derived ratios for `P1-F11`.
- **Rationale**: Ecosystem and activity ratios already exist or can be derived from current features, while contributor-composition ratios are the clear missing piece called out by the product definition.
- **Alternatives considered**:
  - Expand immediately to one-time/active contributor ratios too: rejected for the initial slice to keep scope crisp
  - Defer contributor ratios entirely to `Health Ratios`: rejected because the product direction says they should live in `Contributors` first
