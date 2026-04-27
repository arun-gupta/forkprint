# Research: Repo Card Progressive Disclosure

**Feature**: 483-ux-repo-card-is-too-dense-for-first-time  
**Date**: 2026-04-27

## Findings

### Decision: State architecture for progressive disclosure

**Decision**: Add a second boolean state `detailsExpanded` to `MetricCard`, independent of the existing `paneCollapsed` state.

**Rationale**: `paneCollapsed` controls whether the entire card body is visible (existing feature). `detailsExpanded` controls whether the secondary content tier is visible within an already-expanded pane. They are orthogonal: a collapsed pane hides everything; an expanded pane may still show only the primary tier. Merging them would break the existing card-level collapse behaviour.

**Alternatives considered**: A single tri-state (`collapsed` / `summary` / `full`) was evaluated but rejected because it would require migrating existing localStorage keys and changing every place that reads `paneCollapsed`.

---

### Decision: What belongs in the default (primary) tier

**Decision**: The primary tier shows: repo header, description, solo-project banner (when applicable), OSS Health Score block, and the 3 ecosystem profile tiles (Reach, Attention, Engagement).

**Rationale**: The health score is the conceptual anchor. The 3 ecosystem profile tiles (Reach, Attention, Engagement) are already rendered as 3 large `ScorecardCell` blocks and represent the highest-signal, easiest-to-read summary of ecosystem position. They naturally answer "how big is this project?" which is the next question after "how healthy is it?".

**Alternatives considered**: Showing health score only (too sparse — no context). Showing all ecosystem + all score cells (defeats progressive disclosure).

---

### Decision: What belongs in the secondary tier

**Decision**: The secondary tier includes: health-dimension cells (scoreCells from `scoreBadges`), lenses row, raw details section, and recommendations link.

**Rationale**: Health-dimension cells require more domain context to interpret (Contributors, Activity, Responsiveness, etc.) and are most useful to returning/power users. Lenses and raw details are supplementary. Recommendations are discovery-oriented. Together they form the "deep dive" surface.

**Alternatives considered**: Keeping lenses in the primary tier was considered (lenses are relatively compact) but rejected to avoid adding a fourth visual pattern to the primary view — the spec explicitly calls out the four competing patterns as a source of confusion.

---

### Decision: localStorage key format for expanded state

**Decision**: Key format is `repopulse:card-expanded:${card.repo}`, value is the JSON string `"true"` or `"false"`. Per-repo granularity is required; users frequently compare multiple repos on the same page and may want different expand states for each.

**Rationale**: Using the repo slug as the key discriminator is stable (repos don't change their slug), human-readable, and naturally namespaced under the `repopulse:` prefix to avoid collisions with other localStorage keys.

**Alternatives considered**: A single global "expand all" flag was rejected because the spec requires per-repo state (user story 3, scenario 3). sessionStorage was considered but rejected — the spec requires state to survive page reloads.

**Failure mode**: When localStorage is unavailable (private browsing, quota exceeded), the `getItem` call throws or returns null. This is silently caught; the card defaults to collapsed. No error is shown.

---

### Decision: Expand/collapse affordance design

**Decision**: A text button reading "Show details" (collapsed) / "Hide details" (expanded), rendered below the ecosystem profile tiles section with a small chevron icon. Minimum touch target: 44×44px via `min-h-[44px]` and full-width click area.

**Rationale**: Text labels are more discoverable than icon-only affordances for first-time users. The position (below ecosystem tiles, above the secondary tier) naturally marks the boundary between the two tiers.

**Alternatives considered**: A floating "+" icon was rejected (too subtle). Inline "see more →" link was rejected (doesn't communicate collapsibility). A tab bar was considered but rejected (tabs imply peer-level navigation, not hierarchical disclosure).

---

### Decision: CNCF readiness badge placement

**Decision**: When `card.analysisResult.aspirantResult` is non-null (i.e., a Foundation/CNCF scan has been run for this repo), render the `CNCFReadinessPill` component inline in the card header row, to the right of the repo name, left of the "Created: …" date.

**Rationale**: The `aspirantResult` field is already on `AnalysisResult` and flows through to `MetricCardViewModel.analysisResult`. No view-model changes are needed. The header is always visible regardless of expand state, so the CNCF score is never hidden behind the secondary tier expand. The existing `CNCFReadinessPill` component is reused as-is.

**Context clarification**: The MetricCard currently has NO CNCF element. The `FoundationNudge` rendered below all metric cards in `RepoInputClient.tsx` is a separate nudge to invite users to run a CNCF scan — it is not the "full-width CNCF CTA" referenced in the issue, and it is out of scope for this feature. The scope of FR-006 is: if `aspirantResult` is already populated (from a Foundation-tab scan), surface it as a compact badge in the header rather than adding a bottom-of-card section.

**Alternatives considered**: Putting the badge below the health score (would add a fifth visual tier to the primary view). Adding it as a pill alongside the lenses row (hidden behind expand gate — violates FR-006's always-visible requirement).

---

### Decision: No view-model changes required

**Decision**: `MetricCardViewModel` is not changed. The `aspirantResult` is accessed via `card.analysisResult.aspirantResult`.

**Rationale**: The constitution (§IX-6, YAGNI) and §IX-8 (prefer smallest implementation) prohibit adding a field that's already reachable via `card.analysisResult`. The `analysisResult` field exists precisely for re-computation needs that can't be pre-derived in the view model.

---

### Decision: TDD order

**Decision**: Write failing tests first, implement second, run all existing tests last to catch regressions.

**Rationale**: Constitution §XI-1: TDD is mandatory (NON-NEGOTIABLE). Red-Green-Refactor cycle applies.

Order:
1. New Vitest tests for progressive disclosure state (detailsExpanded, localStorage persistence)
2. Implementation in MetricCard.tsx
3. New Vitest tests for CNCF badge in header
4. CNCF badge implementation
5. Playwright E2E smoke test covering: default collapsed-details state, expand interaction, CNCF badge presence
6. Run full test suite to verify no regressions
