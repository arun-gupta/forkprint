# Research: Responsiveness

## Decision 1: Use a dedicated `Responsiveness` workspace with pane-based grouping

- **Decision**: Implement `Responsiveness` as a dedicated top-level tab with five panes: `Issue & PR response time`, `Resolution metrics`, `Maintainer activity signals`, `Volume & backlog health`, and `Engagement quality signals`.
- **Rationale**: The metric set is too broad for a single flat card list, and the grouped pane structure keeps response, resolution, backlog, and quality signals understandable without turning the tab into a dense table.
- **Alternatives considered**:
  - Keep `Responsiveness` as a single summary card stack: rejected because it hides the structure of the feature and makes the score harder to explain
  - Push all responsiveness signals into overview cards only: rejected because the underlying metrics need a real home and explanation surface

## Decision 2: Treat first-response and first-review times as event-derived metrics, not approximations

- **Decision**: Compute first-response and first-review metrics only from exact publicly verifiable GitHub issue, PR, review, comment, and event timestamps. If the required public event trail is incomplete, mark the metric `unavailable`.
- **Rationale**: The project constitution forbids estimation, interpolation, or fabricated precision. Responsiveness is especially sensitive to guessed timestamps.
- **Alternatives considered**:
  - Approximate first response from the earliest visible comment only: rejected because it may miss reviews or event transitions and can distort the metric
  - Fall back to close or merge timestamps when first-response timestamps are missing: rejected because it substitutes one metric for another

## Decision 3: Expose `median` and `p90` together when enough data exists

- **Decision**: Show both median and `p90` values for response and resolution timing when enough verified public data exists to calculate them.
- **Rationale**: Median alone can make responsiveness look healthier than it feels in practice; `p90` highlights slow-tail behavior without requiring a full trend chart or distribution plot.
- **Alternatives considered**:
  - Show median only: rejected because it hides painful outliers
  - Show raw distributions/charts in the first slice: rejected because it expands scope beyond the first implementation

## Decision 4: Keep backlog and engagement-quality metrics in Responsiveness, but keep contributor concentration out

- **Decision**: Include stale issue/PR ratios, contributor response rate, bot-vs-human response ratio, PR review depth, and issues closed without comment in `Responsiveness`, but leave bus factor and responder concentration risk in `Contributors` / `Sustainability`.
- **Rationale**: Backlog and engagement-quality metrics explain responsiveness outcomes, but concentration-risk signals are more about contributor resilience than operational responsiveness.
- **Alternatives considered**:
  - Pull all responder-related metrics into Contributors: rejected because it would fragment responsiveness analysis
  - Include bus factor/responder concentration directly in Responsiveness: rejected because it overlaps too heavily with contributor-health scope

## Decision 5: Use GraphQL-first analyzer expansion and keep the tab local-only

- **Decision**: Extend `AnalysisResult`, GraphQL queries, and analyzer mapping so the `Responsiveness` tab and overview badge both consume the same shared analysis payload, and opening `Responsiveness` remains local UI work with no extra fetch.
- **Rationale**: This follows the analyzer-module boundary and avoids a second feature-specific fetch path.
- **Alternatives considered**:
  - Add a `Responsiveness`-specific client fetch after analysis: rejected because it breaks the existing shell model and complicates caching/consistency
  - Compute responsiveness metrics ad hoc in the client: rejected because it scatters logic and weakens testability
