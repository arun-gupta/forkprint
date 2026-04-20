# Feature Specification: Recommendations tab on the org-summary view

**Feature Branch**: `359-add-recommendations-tab-to-organization`
**Created**: 2026-04-20
**Status**: Draft
**Input**: GitHub issue #359 — "Add Recommendations tab to Organization view"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Systemic issues across the analyzed repo set are visible at a glance (Priority: P1)

A user who just finished an org-wide aggregation run wants to know *what's broken across the org*, not what's broken in any one repo. Today the only way to answer that question is to click into each per-repo report's Recommendations tab and manually tally which issues recur. After this change, the user opens the org-summary view's Recommendations tab and sees, in one place, the recommendations that show up in the most repos — e.g., "Add a `SECURITY.md` policy — affects 12 of 15 repos" — so they can prioritize the fixes that move the most of the org at once.

**Why this priority**: This is the headline value the issue asks for. The org-aggregation shell already exposes a `recommendations` bucket in the registry with `panels: []` and is filtered out of the UI — so the tab shape is reserved but inert. Without a real aggregator and a real panel, the org view remains silent on the question users ask first after a run completes: "what should we fix first across all our repos?"

**Independent Test**: Run an org aggregation that completes successfully with a mix of repos (some with recommendations, some clean). Open the org-summary view and select the Recommendations tab. Confirm the tab is visible in the tab strip, is positioned after Security, and renders one or more recommendations sorted by the number of affected repos (descending).

**Acceptance Scenarios**:

1. **Given** an org aggregation run has completed with at least one repo having at least one recommendation, **When** the user views the org-summary tab strip, **Then** a "Recommendations" tab is present.
2. **Given** the Recommendations tab is open, **When** the user reads the rendered content, **Then** each entry shows the catalog reference ID, the short title from the recommendation catalog, the count of affected repos, and the total number of analyzed repos (e.g., "SEC-14 · Add a security vulnerability disclosure policy · 12 of 15 repos").
3. **Given** the Recommendations tab is open, **When** the user reads the entries in document order, **Then** they are sorted primarily by affected-repo count descending, with a stable secondary order (catalog ID ascending) for ties.
4. **Given** an org aggregation run completed but no repo produced any recommendations, **When** the user opens the Recommendations tab, **Then** the tab still renders with a clear empty-state message stating that no systemic issues were found in the analyzed set; the tab itself is still present in the strip.

---

### User Story 2 — Recommendations are grouped by CHAOSS dimension so the tab mirrors the scorecard spine (Priority: P1)

A user who knows the per-repo view's bucket model (Activity / Responsiveness / Contributors / Documentation / Security) expects the same mental model on the org Recommendations tab. Grouping the top-N list under those five headings — in the same order as the per-repo Recommendations view — means the user can scan by dimension ("show me the security systemic issues first"), and the org view doesn't introduce a new taxonomy to learn.

**Why this priority**: The primary framing was chosen explicitly in issue #359 over three rejected alternatives (weighted-by-stars, flat inventory, un-grouped top-N). Without grouping, the tab is a flat wall of recommendations with no navigational affordance; with grouping, the tab inherits the scorecard spine already taught elsewhere in the product. This is part of the core contract, not polish.

**Independent Test**: On an org run whose repos collectively produce recommendations in multiple CHAOSS buckets (e.g., at least Security and Documentation), confirm the Recommendations tab renders separate group sections whose headings match the five CHAOSS bucket labels. Each group lists its recommendations in the Priority-1 sort order (affected-repo count descending). Empty groups are not rendered.

**Acceptance Scenarios**:

1. **Given** the Recommendations tab is open on a run with recommendations in multiple buckets, **When** the user reads the page top-to-bottom, **Then** each CHAOSS bucket that has at least one recommendation renders as its own section with a labeled heading (Activity, Responsiveness, Contributors, Documentation, Security).
2. **Given** the bucket sections are rendered, **When** the user reads their order, **Then** they appear in the same order used by the per-repo Recommendations view.
3. **Given** a run has zero recommendations in one or more buckets (e.g., no Responsiveness findings), **When** the user views the Recommendations tab, **Then** those empty buckets are not shown as empty headings — only buckets with content are rendered.
4. **Given** the tab is open, **When** the user counts the recommendations within any bucket, **Then** they are sorted by affected-repo count descending, with catalog ID as the stable tiebreaker.

---

### User Story 3 — Each aggregated recommendation can be drilled down to the exact repos it applies to (Priority: P2)

After seeing "Add a `SECURITY.md` policy — 12 of 15 repos", a user wants to know *which* 12 repos. The aggregation is only useful if the user can act on it, and the action surface is per-repo. Expanding an aggregated recommendation reveals the exact list of affected repo slugs (in a stable order) so the user can triage directly.

**Why this priority**: This is what turns the tab from a reporting surface into an actionable one. Without it, the user sees the counts but still has to chase per-repo reports to find the affected repos — which is the exact click path this tab is supposed to eliminate. It is P2 rather than P1 because shipping US1 + US2 alone already delivers meaningful visibility; this is the drill-down that makes it actionable.

**Independent Test**: On the Recommendations tab, expand any aggregated recommendation. Confirm the list of affected repo slugs renders; confirm the count matches the "X of Y" shown in the header; confirm the list is in a stable order (alphabetical by `owner/repo`); confirm each slug is shown as the same identifier the user would recognize from the per-repo reports.

**Acceptance Scenarios**:

1. **Given** an aggregated recommendation rendered on the Recommendations tab, **When** the user expands it, **Then** the exact list of repo slugs that produced that recommendation is shown.
2. **Given** an aggregated recommendation's count is "N of M", **When** the user expands it, **Then** the expanded list contains exactly N repo slugs.
3. **Given** an aggregated recommendation is expanded, **When** the user reads the list, **Then** the repo slugs are in alphabetical order by `owner/repo` (case-insensitive).
4. **Given** the user collapses an expanded recommendation, **When** the user expands it again later, **Then** the same repo slugs are shown in the same order.

---

### User Story 4 — The `/demo/organization` route renders the Recommendations tab automatically (Priority: P3)

The internal `/demo/organization` route introduced in issue #213 currently renders six of the seven intended org tabs (it skips Recommendations because the bucket is filtered out). After this change the demo route picks up the new tab without any demo-specific wiring, so design/product reviewers see the full tab set when they open the demo.

**Why this priority**: The demo route consumes the same registry and view-model as the production org-summary view, so nothing extra should need to be done. The acceptance is that *nothing* extra is needed — it is a regression guard, not additive work.

**Independent Test**: Open `/demo/organization`. Confirm the Recommendations tab is visible in the tab strip, selecting it renders the aggregated output produced by the demo's fixture data, and no demo-specific branching is required to make this happen.

**Acceptance Scenarios**:

1. **Given** the `/demo/organization` route is loaded, **When** the user views the tab strip, **Then** the Recommendations tab is present alongside the other org tabs (Overview, Contributors, Activity, Responsiveness, Documentation, Governance, Security).
2. **Given** the demo fixture contains repos whose analysis produces recommendations, **When** the user opens the demo Recommendations tab, **Then** the aggregated recommendations render using the same component as production.

---

### Edge Cases

- **All repos clean**: If the completed run produced zero recommendations across every analyzed repo, the Recommendations tab is still present and renders an empty-state message ("No systemic issues found across the N analyzed repos"). The tab is never hidden when the run has completed.
- **Run not yet complete**: While the run is in-progress or paused, the tab's status follows the same `in-progress` / `final` / `unavailable` lifecycle used by other aggregated panels. Partial data during an in-progress run is acceptable; counts reflect the repos completed so far, and the denominator ("X of Y") uses the count of successfully analyzed repos so far (not the total queued), with a visible indicator that the run has not completed.
- **Repos that failed analysis**: Failed repos are not counted in the denominator of any aggregated recommendation — only successfully analyzed repos contribute to both the numerator and denominator. This matches the existing aggregator contract: failed repos contribute no signals.
- **A recommendation key that has no catalog entry**: If a generated recommendation carries a key that is not in the unified catalog (`lib/recommendations/catalog.ts`) — for example, a dynamically-generated key — the aggregation MUST still include it; the display falls back to whatever stable label the per-repo Recommendations view already uses for that key today. The aggregator MUST NOT silently drop unknown keys.
- **Mixed sources (security recommendations vs non-security)**: Per-repo recommendations come from two sources — the OpenSSF Scorecard enriched recommendations (security) and the generic health-score recommendations (non-security). The aggregator treats both as the same kind of recommendation for counting purposes; the catalog entry (or security catalog alias) resolves both to the same bucket and title.
- **Tie on affected-repo count**: When two recommendations affect the same number of repos, the stable tiebreaker is catalog ID ascending (e.g., `SEC-3` before `SEC-14`). This ensures identical output across renders for the same input.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The org-summary view MUST expose a tab labeled "Recommendations", positioned after the Security tab in the org-summary tab strip (mirroring the registry order).
- **FR-002**: The Recommendations tab MUST render the output of an org-level recommendations aggregator whose input is the `AnalysisResult[]` produced by the completed (or in-progress) org aggregation run.
- **FR-003**: The aggregator MUST NOT invent new recommendation rules. For each analyzed repo, it MUST consume the same per-repo recommendations the single-repo Recommendations view already renders (both the non-security health-score recommendations and the OpenSSF Scorecard-enriched security recommendations).
- **FR-004**: Each aggregated recommendation MUST report: the catalog reference ID (e.g., `SEC-14`), the bucket (one of Activity, Responsiveness, Contributors, Documentation, Security), the title from the recommendation catalog, the count of analyzed repos in which the recommendation appears, and the list of those repo slugs.
- **FR-005**: Aggregation MUST dedupe by catalog entry identity: a recommendation that appears once in each of 12 repos counts as one aggregated entry with affected-repo count 12, not 12 separate entries. Keys that resolve to the same catalog entry via existing aliases (e.g., Scorecard key vs direct-check key for the same underlying recommendation) MUST be counted together, not twice.
- **FR-006**: The Recommendations tab MUST group its entries by CHAOSS bucket (Activity, Responsiveness, Contributors, Documentation, Security) in the same bucket order the per-repo Recommendations view uses.
- **FR-007**: Within each bucket, the Recommendations tab MUST sort entries by affected-repo count descending, with catalog ID ascending as a stable tiebreaker.
- **FR-008**: Buckets that contain zero aggregated recommendations for the current run MUST NOT be rendered — only non-empty buckets show as group sections.
- **FR-009**: Each aggregated recommendation MUST be expandable to show the exact list of affected repo slugs. The list MUST be sorted alphabetically (case-insensitive) by `owner/repo`.
- **FR-010**: When expanded, the number of repo slugs shown MUST equal the affected-repo count displayed in the recommendation's header.
- **FR-011**: The denominator shown next to each aggregated recommendation MUST be the number of successfully analyzed repos in the run (not the total repos queued, and not the count of repos still in progress or failed).
- **FR-012**: When the completed run produced zero recommendations across every successfully analyzed repo, the Recommendations tab MUST render an empty-state message that references the number of analyzed repos, and the tab itself MUST still be present in the tab strip.
- **FR-013**: The Recommendations tab MUST follow the same in-progress / final / unavailable lifecycle used by existing aggregated panels. Once at least one repo has completed, the tab becomes visible with current-at-render counts.
- **FR-014**: The bucket visibility filter in the org-summary view MUST be updated so the `recommendations` bucket is no longer filtered out. After this change, the only bucket still filtered out at render time is `repos` (which has its own non-panel rendering surface).
- **FR-015**: The Recommendations tab MUST work on the `/demo/organization` route without any demo-specific branching: the demo renders the tab using the same registry, view-model, and panel component as the production org-summary view.
- **FR-016**: The feature MUST NOT introduce a new scoring contribution, a new GraphQL field, or a new REST call. The composite OSS Health Score MUST be unchanged by this feature.
- **FR-017**: The feature MUST NOT introduce a per-repo Recommendations rollup into any other org-summary tab (Overview, Contributors, Activity, Responsiveness, Documentation, Governance, Security). Recommendations are rendered only on the new Recommendations tab.
- **FR-018**: The existing per-repo Recommendations view (`components/recommendations/RecommendationsView.tsx`) MUST continue to render exactly as it does today. This feature only *consumes* the per-repo recommendation outputs via the shared catalog — it does not change, narrow, or widen what the per-repo view shows.
- **FR-019**: When a generated recommendation key has no entry in the unified catalog, the aggregator MUST still include that recommendation in the aggregated output, and the display MUST fall back to the same stable label the per-repo Recommendations view uses for that key. The aggregator MUST NOT silently drop unknown keys.
- **FR-020**: `docs/PRODUCT.md` MUST be updated in any place that enumerates the org-summary tabs (or per-bucket panel mapping) to reflect that the `recommendations` bucket is now live and to describe its primary framing (top-N most common issues grouped by CHAOSS dimension). If `docs/PRODUCT.md` does not currently enumerate per-bucket panel mappings, the update is limited to a brief note in the appropriate org-summary section so the document is not silent on the new tab.

### Key Entities

- **Aggregated recommendation**: A single entry on the org Recommendations tab. Identified by its catalog reference ID; carries the bucket, title, an integer affected-repo count, an integer denominator (total successfully analyzed repos), and the ordered list of affected repo slugs.
- **Panel bucket**: A grouping of org-summary panels rendered as a single tab. This feature activates the existing-but-empty `recommendations` bucket by giving it a panel and removing the bucket from the render-time exclusion list.
- **Recommendation catalog entry**: A stable reference record in the unified catalog (`lib/recommendations/catalog.ts`) holding the catalog ID, bucket, key, title, and tags for a recommendation. The aggregator resolves each per-repo recommendation key to its catalog entry, which provides the identity used for deduping and the title used for display.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user opening the org-summary view after a completed run sees the Recommendations tab in the tab strip with zero additional clicks beyond the usual "run completed" flow.
- **SC-002**: For any completed run, the aggregated affected-repo counts displayed on the Recommendations tab equal the counts a user would derive manually by opening each analyzed repo's Recommendations view and tallying. No recommendation is silently dropped, double-counted, or mis-bucketed.
- **SC-003**: For any completed run with at least one recommendation, the top entry in each rendered bucket is the recommendation with the highest affected-repo count in that bucket. Ties are resolved deterministically by catalog ID, so the same input always produces the same ordered output.
- **SC-004**: The `/demo/organization` route renders the Recommendations tab on page load using the same component path as production; no additional code path is needed to make the demo display it.
- **SC-005**: The composite OSS Health Score, the per-repo Recommendations view, and every other org-summary panel (Overview, Contributors, Activity, Responsiveness, Documentation, Governance, Security) are byte-for-byte identical in their rendered output before and after this feature for any organization — i.e., this feature is purely additive and touches only the new tab.
- **SC-006**: A user who clicks to expand an aggregated recommendation sees the exact list of affected repo slugs within a single page render, with no additional server call required (the list is derived from the same `AnalysisResult[]` already loaded for the run).

## Assumptions

- The existing panel bucket layout (`overview`, `contributors`, `activity`, `responsiveness`, `documentation`, `governance`, `security`, `recommendations`, `repos`) is the correct base. This feature activates the already-reserved `recommendations` bucket; it does not rename, remove, or reorder other buckets.
- The unified recommendation catalog (`lib/recommendations/catalog.ts`) is the single source of truth for recommendation identity, bucket assignment, and display title. The aggregator relies on it; no parallel catalog is introduced.
- The per-repo recommendation outputs used as aggregator input are the same outputs the single-repo Recommendations view already renders today — both the `getHealthScore(result).recommendations` stream and the `getSecurityScore(...).recommendations` stream. This feature does not change how per-repo recommendations are generated.
- Repos that fail analysis contribute no recommendations to the aggregation (they carry no `AnalysisResult`). This matches the existing aggregator contract across all other org panels: failed repos do not contribute signals.
- Per-repo / org-summary asymmetry on Recommendations is expected and intentional. The per-repo Recommendations view renders recommendations with full richness (explanation, remediation hint, docs link, risk level); the org tab renders the aggregated rollup with a drill-down to affected repo slugs. The org tab is a top-N summary, not a full re-render of every recommendation's long-form body.
- The primary framing (top-N most common issues, grouped by CHAOSS dimension, with per-recommendation affected-repo drill-down) is the product decision for this feature. The three alternatives raised in the issue — weighted-by-stars / flagship, flat "repos missing X" inventory, un-grouped flat top-N — are explicitly out of scope for this spec; they can be re-opened as follow-up issues.
- No new analyzer code path, GraphQL field, REST call, or scoring contribution is added. The aggregator is a pure function of the existing `AnalysisResult[]`.
- The constitution's accuracy policy (§II) is preserved: the aggregated counts are derived entirely from verified recommendation outputs that already satisfy the policy on the per-repo side. No estimation, interpolation, or inference is introduced by the aggregation.
- `docs/PRODUCT.md` is the canonical product definition; updates to it are the only documentation surface this feature touches. No constitution change and no `docs/DEVELOPMENT.md` change are required beyond the normal feature-completion status update done during `/speckit.implement`.
