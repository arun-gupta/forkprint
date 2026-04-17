# Feature Specification: Governance tab on org-summary view

**Feature Branch**: `303-add-a-governance-tab-to-the-org-summary`
**Created**: 2026-04-16
**Status**: Draft
**Input**: GitHub issue #303 — "Add a Governance tab to the org-summary view"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Surface org-level hygiene and policy signals as a single, coherent tab (Priority: P1)

A user analyzing an organization's repos on the org-summary view wants to see how the org is governed at a glance: which accounts hold authority, whether governance files are present consistently, and whether licensing is consistent across repos. Today these signals are spread across the Documentation and Contributors tabs, which means the user has to chase them across unrelated panels (e.g. "docs coverage" sits next to "license consistency", and "maintainers" sits next to "contributor diversity"). After this change, the user opens a single Governance tab and sees all org-level governance signals together, ordered by risk so the most actionable items appear first.

**Why this priority**: This is the core value of the feature — without it, every newly added governance signal continues to squat in the wrong bucket and the user keeps stitching the picture together manually. Shipping a single coherent tab is what unlocks the rest of the proposal.

**Independent Test**: Open the org-summary view for any organization that has at least one of the migrated panels' data. Confirm a Governance tab is visible in the org-summary tab strip, that it sits between Documentation and Security, and that opening it shows the four migrated panels (Org admin activity, Maintainers, Governance file presence, License consistency) in the documented risk-first order. No other tab should still display any of those four panels.

**Acceptance Scenarios**:

1. **Given** the org-summary view is rendered for an organization with verified data, **When** the user views the tab strip, **Then** a "Governance" tab is present, positioned between "Documentation" and "Security".
2. **Given** the user is on the org-summary view, **When** the user selects the Governance tab, **Then** the tab body shows the four migrated panels in order: Org admin activity, Maintainers, Governance file presence, License consistency.
3. **Given** the user has opened the Governance tab, **When** the user navigates to the Documentation tab, **Then** Governance file presence and License consistency are no longer rendered there.
4. **Given** the user has opened the Governance tab, **When** the user navigates to the Contributors tab, **Then** Maintainers is no longer rendered there.
5. **Given** the user has opened the Governance tab, **When** the user navigates to any tab other than Governance, **Then** the Org admin activity (Stale admins) panel is not rendered there.

---

### User Story 2 — Documentation, Contributors, and Security tabs stay focused after migration (Priority: P2)

A user already familiar with the org-summary view expects that when panels move out of Documentation and Contributors, the source tabs still render cleanly: no empty bucket, no orphaned section header, no duplicate panel. The Security tab — which is per-repo posture today — must not absorb any of the migrated governance signals.

**Why this priority**: This protects the existing UX from regressions caused by the migration. Without it, the headline win of P1 is undercut by visible breakage on neighboring tabs.

**Independent Test**: For an organization that previously rendered all migrated panels, open Documentation, Contributors, and Security in turn. Each tab still renders its remaining panels with the same visual structure as before — no empty-state takeover, no duplicate content, no orphaned heading where a migrated panel used to be.

**Acceptance Scenarios**:

1. **Given** an organization where Documentation previously rendered five panels, **When** the user opens Documentation after the migration, **Then** the tab renders the three remaining panels (Documentation coverage, Inclusive naming, Adopters) without an empty-state placeholder.
2. **Given** an organization where Contributors previously rendered four panels, **When** the user opens Contributors after the migration, **Then** the tab renders the three remaining panels (Contributor diversity, Org affiliations, Bus factor) without an empty-state placeholder.
3. **Given** an organization where Security previously rendered the Scorecard rollup, **When** the user opens Security after the migration, **Then** the tab still renders only the Scorecard rollup — none of the migrated governance panels appear there.
4. **Given** any tab on the org-summary view, **When** the tab is rendered, **Then** no panel appears in more than one tab.

---

### User Story 3 — Risk-first panel ordering inside Governance (Priority: P2)

When the user opens the Governance tab, the panels are ordered by descending risk so the highest-leverage hygiene signals appear before the lower-leverage structural signals. The order is: account hygiene first (admin activity), then authority delegation (maintainers), then structural hygiene (governance files, licensing).

**Why this priority**: Ordering is part of the contract this feature ships — it's what makes the tab "scannable" rather than just "co-located". Without it the tab is a junk drawer.

**Independent Test**: Open the Governance tab on an org with data for all four panels. Confirm that the panels render top-to-bottom in this exact sequence: (1) Org admin activity, (2) Maintainers, (3) Governance file presence, (4) License consistency.

**Acceptance Scenarios**:

1. **Given** the Governance tab is rendered with all four panels having data, **When** the user scrolls the tab body top-to-bottom, **Then** the panels appear in the order: Org admin activity, Maintainers, Governance file presence, License consistency.
2. **Given** the Governance tab is rendered for a non-Organization owner (a User), **When** the Org admin activity panel decides it is N/A, **Then** the remaining three panels still render in their relative risk-first order.

---

### Edge Cases

- **Non-Organization owner (User account analyzed instead of an Org)**: The Org admin activity (Stale admins) panel already renders an "N/A" state for `ownerType === 'User'`. That existing behavior is preserved on the Governance tab; no other panel's behavior changes.
- **Organization where no migrated panel has data**: The Governance tab renders the same generic "No data available for this section yet" empty state that other empty buckets use today. The tab itself is still visible in the strip.
- **Organization where some governance panels have data and others do not**: Only the panels with data render, in their relative risk-first order. Panels that have no data are skipped (matches existing per-panel behavior — this feature does not change panel-level rendering rules).
- **Stale admin extra-panel rendering**: The Stale admins panel is currently injected as an "extra panel" via a hardcoded branch in the bucket renderer (it is not in the registry's panel list). After this change, the same extra-panel injection happens under the Governance bucket id, not the Documentation bucket id — there must be no scenario in which it renders twice or under both buckets.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The org-summary view MUST expose a tab labeled "Governance", positioned between the existing "Documentation" tab and the existing "Security" tab in the org-summary tab strip.
- **FR-002**: The Governance tab MUST render the following four panels and only these four panels: Org admin activity (Stale admins), Maintainers, Governance file presence, License consistency.
- **FR-003**: The Governance tab MUST render its panels top-to-bottom in this exact order: (1) Org admin activity, (2) Maintainers, (3) Governance file presence, (4) License consistency.
- **FR-004**: The Documentation tab MUST NOT render the Governance file presence panel or the License consistency panel after this change.
- **FR-005**: The Documentation tab MUST NOT render the Org admin activity (Stale admins) panel after this change.
- **FR-006**: The Contributors tab MUST NOT render the Maintainers panel after this change.
- **FR-007**: The Security tab MUST continue to render only the OpenSSF Scorecard rollup — it MUST NOT absorb any of the four migrated panels.
- **FR-008**: No panel listed under FR-002 may simultaneously appear under any other tab on the org-summary view.
- **FR-009**: The migrated panels MUST reuse their existing rendering components and existing data sources without modification — only the bucket assignment changes.
- **FR-010**: Migration MUST NOT introduce any new analyzer code path, aggregator code path, GraphQL field, REST call, or scoring contribution. The composite OSS Health Score MUST be unchanged by this feature.
- **FR-011**: When the Governance tab has no panels with data for the current organization, the tab MUST render the same generic empty-state copy that other empty buckets render today, and MUST still be present in the tab strip.
- **FR-012**: When the analyzed owner is a User (not an Organization), the Org admin activity panel MUST continue to render its existing "N/A for non-org targets" state inside the Governance tab; the other three panels MUST continue to render normally if their data is present.
- **FR-013**: The Documentation tab, the Contributors tab, and the Security tab MUST continue to render their remaining panels without an empty-state placeholder for any organization that previously had data for those remaining panels — i.e., no neighboring tab regresses to empty as a side effect of this migration.
- **FR-014**: `docs/PRODUCT.md` MUST be updated so that any place which enumerates the org-summary tabs (or per-bucket panel mapping) reflects the new Governance tab and the new home of the four migrated panels. If `docs/PRODUCT.md` does not currently enumerate per-bucket panel mappings, the update is limited to adding a brief note about the Governance tab in the appropriate org-summary section so the document is not silent on the new tab.

### Key Entities

- **Panel bucket**: A grouping of org-summary panels rendered as a single tab in the tab strip. The set of buckets is fixed; this feature adds one new bucket (`governance`) to the existing set (`overview`, `contributors`, `activity`, `responsiveness`, `documentation`, `security`, `recommendations`, `repos`).
- **Migrated panel**: Any of the four panels (Org admin activity, Maintainers, Governance file presence, License consistency) whose bucket assignment changes under this feature. Their rendering components, data sources, and per-panel behavior are unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user opening the org-summary view sees the Governance tab in the tab strip on the first render, with no additional click required to reveal it.
- **SC-002**: 100% of governance-themed panels listed in this spec (4 of 4) are reachable from the Governance tab. 0% of those panels are reachable from any other tab.
- **SC-003**: For an organization whose data populated all four migrated panels before the change, all four panels remain visible after the change — only their tab location moves. No data is lost or hidden by the migration.
- **SC-004**: Documentation, Contributors, and Security tabs each render at least their pre-migration non-migrated panel set on every organization for which they previously had panels (no empty-state regression on neighboring tabs).
- **SC-005**: The composite OSS Health Score for any analyzed organization is identical before and after the change (this feature does not modify scoring inputs or weights).

## Assumptions

- The existing panel buckets in the org-summary view (`overview`, `contributors`, `activity`, `responsiveness`, `documentation`, `security`, `recommendations`, `repos`) are the correct base; this feature adds one new bucket and re-homes four existing panels but does not rename, remove, or reorder the existing buckets.
- The Stale admins panel is injected as an "extra panel" via the bucket renderer rather than as a registry entry; the migration moves the injection branch from the Documentation bucket to the Governance bucket without converting the panel into a registry entry. The choice between leaving it as an injected extra panel vs promoting it to a registry entry is an implementation decision left to the plan; from the spec's perspective, only the visible result matters: the panel appears under Governance and only under Governance.
- The four panels keep their existing in-component empty / N/A / unavailable states. This feature does not change the visual treatment of those states — it only changes which tab the panel renders under.
- `docs/PRODUCT.md` is the canonical product definition; updates to it are the only documentation surface this feature touches. No other doc (constitution, DEVELOPMENT.md) needs an edit because no constitution rule changes and no development workflow changes.
- The four planned governance issues (#286 org-level 2FA enforcement, #288 member permission distribution, #289 verified-publisher Actions usage, #290 dangerous Actions workflow patterns) are out of scope here; they will land into this tab under their own issues. Likewise, scoring integration for any panel landing in this tab is out of scope.
- The per-repo ResultsShell tabs are out of scope. Governance is an org-summary concept only; there is no per-repo Governance tab introduced by this feature.
- **Per-repo / org-summary asymmetry is intentional.** After this change, the org-summary view has a Governance tab while the per-repo view does not. This asymmetry is acknowledged and deliberately deferred, not an oversight: (1) the queued governance signals that motivate this tab — stale admins (#287), org 2FA enforcement (#286), member permission distribution (#288), verified-publisher Actions usage (#289), dangerous Actions workflow patterns (#290) — are org-scoped concepts that have no single-repo analogue; (2) per-repo governance signals already have surfacing — file presence in the Documentation tab, branch protection and code review in the Security tab, plus the cross-cutting Governance lens (per-repo completeness readout, `lib/governance/completeness.ts`, tracked under #191) on the per-repo metric cards; (3) constitution §IX rules 6–8 (YAGNI / KISS / no over-engineering) argue against shipping a near-empty per-repo Governance tab purely for cross-view symmetry. If real per-repo governance signals accumulate that don't fit Documentation or Security, a follow-up issue can re-open the question.
- The per-repo Governance lens (`lib/governance/completeness.ts`, surfaced via `buildLensReadouts()` in `lib/metric-cards/view-model.ts`) is unchanged by this feature. It stays a per-repo metric-card readout; it is neither moved into the new Governance tab nor used to populate it.
