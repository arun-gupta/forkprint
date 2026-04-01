# Research: Ecosystem Map

## Decision 1: Use a spectrum-first UI instead of a chart

- **Decision**: Implement the visualization as a spectrum/profile view in standard React/Tailwind UI.
- **Rationale**: The spectrum cards made the ecosystem signal easier to explain than the earlier chart-driven prototype and removed misleading quadrant-style interpretation.
- **Alternatives considered**:
  - Keep the Chart.js bubble chart: rejected because the spectrum/profile view was clearer for the current product direction
  - SVG/D3-first implementation: rejected because it adds more implementation surface than this feature needs

## Decision 2: Keep visible ecosystem metrics outside the profile summary

- **Decision**: Show stars, forks, and watchers as visible text UI for each successful repo alongside the derived spectrum profile.
- **Rationale**: This preserves value for single-repo analysis, improves accessibility, and prevents the normalized profile from being the only place users can inspect key metrics.
- **Alternatives considered**:
  - Tooltip-only metrics: rejected because it is weaker for accessibility and single-repo use
  - Separate card system: rejected because detailed repo cards belong to `P1-F07`

## Decision 3: Replace quadrants with a config-driven ecosystem spectrum

- **Decision**: Present the ecosystem summary as a profile across Reach, Builder Engagement, and Attention instead of median-derived quadrants.
- **Rationale**: Spectrum tiers avoid misleading lifecycle implications, work for single-repo analysis, and let the UI show exact thresholds from shared config.
- **Alternatives considered**:
  - Keep median quadrants: rejected because the resulting labels were too relative and confusing for mature projects
  - Remove any interpretive layer entirely: rejected because the map needs a readable summary beyond exact numbers

## Decision 4: Use normalized rates for builder engagement and attention

- **Decision**: Use `forks / stars` for builder engagement and `watchers / stars` for attention in the spectrum profile.
- **Rationale**: Raw forks and watchers overly reward sheer size; normalized rates better describe how attention converts into engagement.
- **Alternatives considered**:
  - Keep raw forks as the primary engagement signal: rejected because it made outliers dominate the interpretation
  - Keep raw watchers as the attention signal: rejected because the number is less comparable across differently sized repos

## Decision 5: Exclude unavailable ecosystem metrics from derived profile values

- **Decision**: If a successful repository has `"unavailable"` for stars, forks, or watchers, do not fabricate derived rates or profile tiers; instead, keep the visible metrics honest and surface an explanatory state.
- **Rationale**: The accuracy policy forbids invented precision, and derived rates are themselves a form of interpreted display data.
- **Alternatives considered**:
  - Convert `"unavailable"` to zero: rejected because it fabricates a false interpretation
  - Drop the repo silently: rejected because missing data must stay explicit
