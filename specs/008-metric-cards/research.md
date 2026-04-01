# Research: Metric Cards

## Decision 1: Reuse `AnalysisResult` directly for card content

- **Decision**: Build metric cards from the existing `AnalysisResult` contract rather than creating a parallel feature-specific payload.
- **Rationale**: The analyzer output is already the shared source of truth for Phase 1. Reusing it keeps the overview cards honest and prevents drift between the overview, ecosystem, and later metric views.
- **Alternatives considered**:
  - Introduce a card-specific API response shape: rejected because it would duplicate analyzer output and increase drift risk.
  - Hide unavailable values from cards: rejected because the constitution requires explicit missing-data handling rather than omission.

## Decision 2: Use explicit interim CHAOSS score-badge semantics

- **Decision**: `P1-F07` will introduce the badge shell and color semantics now, with an explicit `Not scored yet` state until `P1-F08`–`P1-F10` provide real score computation.
- **Rationale**: The product contract requires the cards to host one badge per CHAOSS category. Shipping the card shell now keeps the overview stable while avoiding fabricated or premature category scores.
- **Alternatives considered**:
  - Omit score badges until later features land: rejected because it would leave `P1-F07` incomplete relative to the product contract.
  - Invent provisional score logic inside `P1-F07`: rejected because scoring belongs to the dedicated features and would violate separation of concerns.

## Decision 3: Reuse the `P1-F05` ecosystem spectrum profile

- **Decision**: Each card will summarize ecosystem using the existing three dimensions: Reach, Builder Engagement, and Attention.
- **Rationale**: The user already sees and understands these dimensions in the `Ecosystem Map` tab. Reusing them makes the overview and ecosystem views consistent.
- **Alternatives considered**:
  - Create a card-only ecosystem summary: rejected because it would fragment the meaning of ecosystem health across tabs.
  - Collapse the profile to a single badge: rejected because the product doc explicitly calls for the three-part profile summary.

## Decision 4: Expansion remains local UI state only

- **Decision**: Expanding a card will reveal more exact `AnalysisResult` fields already present in memory; no API calls or tab navigation will occur.
- **Rationale**: This preserves the results-shell promise that one analysis run powers multiple views without rerunning work.
- **Alternatives considered**:
  - Lazy-load detailed metrics when a card expands: rejected because it would add a second request path and complicate missing-data handling.

## Decision 5: Keep thresholds and badge semantics in shared config

- **Decision**: Ecosystem tier definitions continue to come from `lib/ecosystem-map/spectrum-config.ts`, and score-badge display semantics will live in a dedicated metric-card config module.
- **Rationale**: The constitution explicitly requires thresholds and score semantics to be config-driven, not scattered through components.
- **Alternatives considered**:
  - Hardcode colors/titles inside each card component: rejected because it would make future scoring features harder to keep consistent.
