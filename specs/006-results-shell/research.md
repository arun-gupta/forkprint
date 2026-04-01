# Research: Results Shell

## Decision 1: Keep the shell on the current home page

- **Decision**: Implement the shell on the existing `/` route rather than introducing a separate routed dashboard now.
- **Rationale**: This keeps the current analyze flow intact and avoids premature routing complexity before multiple result views are fully implemented.
- **Alternatives considered**:
  - Move immediately to `/dashboard`: rejected because it reshapes the flow before the shell itself is proven
  - Keep stacking views vertically: rejected because it fails the purpose of the shell feature

## Decision 2: Keep analysis state in `RepoInputClient` for now

- **Decision**: Let `RepoInputClient` continue owning analysis submission and result state, while the new shell components focus on layout and tab selection.
- **Rationale**: This minimizes churn to already-working data-fetching behavior and keeps `P1-F15` focused on shell/navigation responsibilities.
- **Alternatives considered**:
  - Lift all analysis state into a new page-level container immediately: rejected because it broadens the refactor without being necessary for this feature

## Decision 3: Use placeholder tabs intentionally

- **Decision**: Provide tabs for future views (`Comparison`, `Metrics`) with clear placeholder content until those features land.
- **Rationale**: The shell feature is about stable information architecture; placeholder tabs are acceptable if they are explicit and not misleading.
- **Alternatives considered**:
  - Only show implemented tabs: rejected because it weakens the shell’s role as the durable results workspace

## Decision 4: Put the GitHub repo link in the header’s top-right area on desktop

- **Decision**: Place the GitHub repo link in the top-right area of the header on desktop, with a visible but responsive placement within the header on mobile.
- **Rationale**: This matches the desired product framing while keeping the link predictable and easy to test.
- **Alternatives considered**:
  - Bury the link in footer copy: rejected because it reduces discoverability
  - Leave location vague: rejected because the shell feature needs a concrete layout target
