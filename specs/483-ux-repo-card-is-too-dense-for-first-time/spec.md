# Feature Specification: Repo Card Progressive Disclosure

**Feature Branch**: `483-ux-repo-card-is-too-dense-for-first-time`  
**Created**: 2026-04-27  
**Status**: Draft  
**Input**: GitHub issue #483 — UX: Repo card is too dense for first-time users — add progressive disclosure

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-time visitor understands score at a glance (Priority: P1)

A user who has never seen RepoPulse before arrives at a repo card after analysis completes. They should immediately grasp the repo's health status from the card without scrolling, clicking, or deciphering competing visual elements.

**Why this priority**: The primary UX complaint in the issue is that first-time visitors have no clear reading order. Establishing a clear visual anchor — the OSS Health Score — is the foundational fix. Everything else depends on this hierarchy being correct.

**Independent Test**: Can be fully tested by loading a repo card and verifying that the health score is the most visually dominant element and that the 3 ecosystem profile tiles (Reach, Attention, Engagement) are visible directly below it without any interaction required.

**Acceptance Scenarios**:

1. **Given** a completed repo analysis, **When** the card renders for the first time, **Then** the OSS Health Score occupies the most visually prominent position and draws the eye before any dimension tile or stat
2. **Given** a completed repo analysis, **When** the card renders, **Then** the 3 ecosystem profile tiles (Reach, Attention, Engagement) are visible below the health score without scrolling or clicking
3. **Given** a completed repo analysis, **When** the card renders, **Then** the 5 health-dimension tiles, lenses row, raw stats grid, and recommendations link are not visible in the default (collapsed-details) state
4. **Given** a card in the default state, **When** a user reads top-to-bottom, **Then** the information flows: repo name → health score → 3 ecosystem tiles → expand affordance — with no competing visual tiers interrupting this order

---

### User Story 2 - User expands to see full detail (Priority: P2)

A user who has understood the top-level score wants to drill into the 5 health-dimension tiles, lenses, raw stats, and recommendations without navigating away from the card.

**Why this priority**: Existing power users depend on all dimensions being accessible. Progressive disclosure must not remove data — it must defer it. The expand interaction is the bridge between the simplified default view and the full information density that existing users rely on.

**Independent Test**: Can be fully tested by clicking the "Show details" affordance on a card and verifying that all previously hidden sections (5 dimension tiles, lenses row, raw stats, recommendations) become visible and are identical in content and behavior to their current implementations.

**Acceptance Scenarios**:

1. **Given** a card in its default (collapsed-details) state, **When** the user clicks the expand affordance, **Then** the health-dimension tiles, lenses row, raw stats grid, and recommendations link all become visible
2. **Given** a card in its expanded state, **When** the user clicks the collapse affordance, **Then** those sections are hidden again and only the health score + 3 ecosystem tiles remain visible
3. **Given** a card in its expanded state, **When** the user interacts with dimension tiles, lenses, or any existing detail, **Then** all existing interactive behaviors (tab navigation, lens filtering, clipboard copy) continue to work without regression
4. **Given** any state of the card, **When** the user inspects it, **Then** no data that existed before this feature is permanently hidden — every data point is reachable via at most one expand interaction

---

### User Story 3 - Power user retains expanded state across page loads (Priority: P3)

A returning user who always wants to see full detail should not have to re-expand every card on every visit.

**Why this priority**: The issue explicitly calls out that power users must not be regressed. Persistent expand state is the minimal accommodation to preserve existing workflows.

**Independent Test**: Can be fully tested by expanding a card, reloading the page, and verifying that the card opens in the expanded state without any additional interaction.

**Acceptance Scenarios**:

1. **Given** a user who has expanded a card, **When** the page is reloaded, **Then** the card opens in the expanded state automatically
2. **Given** a user who has collapsed a card, **When** the page is reloaded, **Then** the card opens in the collapsed (default) state
3. **Given** multiple cards on the page, **When** the user expands some and collapses others and then reloads, **Then** each card independently restores its last-known state

---

### User Story 4 - CNCF readiness integrated into card header (Priority: P3)

When a repo has a CNCF Sandbox Readiness score, it is surfaced as a small badge in the card header area rather than as a full-width banner anchored to the bottom of the card.

**Why this priority**: The issue identifies the CNCF CTA as "bolted on" at the bottom. Moving it to the header integrates it into the primary reading path without requiring the user to scroll to the bottom of a dense card.

**Independent Test**: Can be fully tested by loading a repo with a CNCF readiness score and verifying that the score appears as a compact badge near the card header, and that no CNCF section exists at the bottom of the card.

**Acceptance Scenarios**:

1. **Given** a repo with a CNCF Sandbox Readiness score, **When** the card renders, **Then** the CNCF readiness information is visible in or adjacent to the card header as a compact badge — not as a standalone section below the raw stats
2. **Given** a repo without a CNCF Sandbox Readiness score, **When** the card renders, **Then** no CNCF element appears anywhere on the card
3. **Given** a card with the CNCF badge in the header, **When** the card is in its collapsed-details state, **Then** the CNCF badge remains visible (it belongs to the always-visible tier)

---

### Edge Cases

- What happens when a repo has no ecosystem profile data (no stars/forks/watchers)? The ecosystem tiles section should gracefully absent itself; the expand affordance should still be present if secondary sections have content.
- What happens when a repo has zero health-dimension tiles after filtering? The expanded section may render only lenses and stats; the expand affordance still exists if there is any secondary content.
- What happens when localStorage is unavailable (private browsing, storage quota exceeded)? Expanded state silently defaults to collapsed on each load — no error is surfaced to the user.
- What happens on mobile viewports? The expand/collapse affordance must be reachable via touch with a tap target of at least 44×44px.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: By default, a repo card MUST display: repo header, OSS Health Score block, and the 3 ecosystem profile tiles (Reach, Attention, Engagement) — and nothing else below those tiles except the expand affordance
- **FR-002**: The OSS Health Score block MUST be visually dominant relative to all other elements on the card — no other element may match or exceed its visual weight in the default view
- **FR-003**: The card MUST include a clearly labeled expand/collapse affordance (e.g., "Show details" / "Hide details") that reveals or hides the secondary content tier
- **FR-004**: The secondary content tier (revealed on expand) MUST include: all health-dimension tiles, lenses row, raw stats grid, and recommendations link — identical in content, layout, and behavior to their current implementations
- **FR-005**: The expand/collapse state for each card MUST be persisted to browser-side storage, keyed by repository identifier, so that state is restored on page reload
- **FR-006**: When a repo has a CNCF Sandbox Readiness score, it MUST be rendered as a compact badge within or immediately adjacent to the card header — the existing full-width CNCF section at the bottom of the card MUST be removed
- **FR-007**: When a repo does not have a CNCF Sandbox Readiness score, no CNCF element MUST appear anywhere on the card
- **FR-008**: All existing interactive behaviors (tab navigation from dimension tiles, lens pill filtering, clipboard copy on health score) MUST continue to work without regression in the expanded state
- **FR-009**: The existing card-level collapse (collapsing the entire card body via the header chevron) MUST continue to function and remain independent of the detail-level expand/collapse introduced by this feature
- **FR-010**: The expand affordance MUST have a touch target of at least 44×44px on mobile viewports

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user landing on a repo card for the first time can identify the OSS Health Score and its meaning within 5 seconds without scrolling or clicking
- **SC-002**: All data present on the card before this feature ships remains accessible after this feature ships — zero data loss, reachable via at most one expand interaction
- **SC-003**: A user who expands a card and reloads the page sees the card in the expanded state without any additional interaction — 100% of the time when browser storage is available
- **SC-004**: On mobile viewports (≤ 768px width), the expand/collapse affordance is reachable via a single tap with no precision requirement (minimum 44×44px touch target)
- **SC-005**: No existing automated tests for the repo card regress after this change

## Assumptions

- The 3 "primary" tiles are the ecosystem profile tiles (Reach, Attention, Engagement); the secondary tiles are the health-dimension tiles (Activity, Responsiveness, Resilience, etc.)
- The existing card-level collapse/expand (toggling the entire card body via the header chevron) is a separate, orthogonal feature that must remain intact
- Persistent expand state is stored in browser localStorage, keyed by repo identifier; per-repo granularity is required because users frequently compare multiple repos on the same page
- The CNCF badge in the header should be compact enough not to disrupt the header's primary information (repo name, date) — exact visual design is an implementation detail for the plan phase
- Solo-maintained project banners remain in the always-visible tier as they are today
- This is a pure UI change — no API changes, no analyzer changes, no scoring changes are required
- When ecosystem profile data is entirely absent for a repo, the default visible tier shows only the health score block and the expand affordance
