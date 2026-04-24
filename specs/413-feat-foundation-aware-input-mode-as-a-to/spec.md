# Feature Specification: Foundation Input Mode

**Feature Branch**: `413-feat-foundation-aware-input-mode-as-a-to`  
**Created**: 2026-04-23  
**Status**: Draft  
**Input**: User description: "issue #413 — foundation-aware input mode as a top-level tab (CNCF, Apache, ...)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Check one or more repos for foundation readiness (Priority: P1)

A maintainer signs in, sees the three top-level mode buttons (Repositories / Organization / Foundation), clicks Foundation, picks CNCF Sandbox, types their repo slug (or several), and gets a readiness report for each — health checks, maturity signals, top gaps. Same multi-repo pattern as the Repositories tab, but foundation-aware.

**Why this priority**: This is the direct replacement for the hidden "Foundation target" dropdown that previously lived in Repositories mode. Making it a first-class tab removes the discoverability problem.

**Independent Test**: Can be fully tested by selecting Foundation mode, picking CNCF Sandbox, entering one or more repo slugs, and verifying a readiness report renders for each repo.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the home page, **When** they click "Foundation" in the input mode selector, **Then** the input area shows a foundation picker, a single smart input field with helper text, and a "Scan" button.
2. **Given** Foundation mode is active with "CNCF Sandbox" selected and one or more valid `owner/repo` slugs entered, **When** the user clicks "Scan", **Then** the app detects repo input, and a foundation readiness report renders for each repo showing health checks, maturity signals, and top gaps.
3. **Given** Foundation mode is active and the input field is empty, **When** the user clicks "Scan", **Then** an inline validation error is shown and no fetch occurs.
4. **Given** multiple repos are entered and one is invalid, **When** the scan completes, **Then** an error is shown for that repo and readiness reports for valid repos are still rendered.

---

### User Story 2 - Scan all repos in an org for foundation readiness (Priority: P2)

A CNCF contributor wants to identify which repos in their GitHub org are the strongest CNCF Sandbox candidates. They go to Foundation tab, pick CNCF Sandbox, type their org slug, and get a candidacy ranking across all org repos — without running a full org health analysis.

**Why this priority**: This replaces the CNCF Candidacy tab that previously lived in Organization mode, consolidating all foundation work in one place. Org mode is now purely org health.

**Independent Test**: Can be fully tested by selecting Foundation mode, picking CNCF Sandbox, entering an org slug, and verifying the candidacy ranking panel renders without triggering org aggregation.

**Acceptance Scenarios**:

1. **Given** Foundation mode is active with a valid org slug entered, **When** the user clicks "Scan", **Then** the app auto-detects org input, fetches the org's public repo list (lightweight — no full aggregation pipeline), and renders the candidacy ranking panel.
2. **Given** Foundation mode is active and the input field is empty, **When** the user clicks "Scan", **Then** an inline validation error is shown and no fetch occurs.
3. **Given** the org has zero repos, **When** the scan completes, **Then** an empty state message is shown — no crash or blank panel.
4. **Given** an invalid or non-existent org is entered, **When** the scan completes, **Then** a clear error message is shown.

---

### User Story 3 - Nudge from Organization or Repositories tab toward Foundation readiness (Priority: P3)

A user has just run an org analysis or a repo health analysis and now wonders whether their repos are ready for a foundation submission. There is no longer a CNCF Candidacy tab in Organization mode or a foundation dropdown in Repositories mode — so the app provides a visible nudge pointing them to the Foundation tab.

**Why this priority**: Without this nudge, users who land in Org or Repositories mode and want foundation readiness have no signal that the Foundation tab exists for that purpose. Discoverability is the gap.

**Independent Test**: Can be fully tested by running an org analysis or repo analysis and verifying a callout or prompt is visible that links to or activates Foundation mode.

**Acceptance Scenarios**:

1. **Given** a user has run an org analysis in Organization mode, **When** results are displayed, **Then** a visible callout appears suggesting they check foundation readiness in the Foundation tab, with a direct link or button to switch to Foundation mode with the org pre-populated.
2. **Given** a user has run a repo analysis in Repositories mode, **When** results are displayed, **Then** a visible callout appears suggesting they check foundation readiness in the Foundation tab, with a direct link or button to switch to Foundation mode with the same repos pre-populated.
3. **Given** a user clicks the nudge from either mode, **When** Foundation mode opens, **Then** the relevant input (org slug or repo slugs) is pre-populated and the user only needs to select a foundation target and click Scan.

---

### User Story 4 - Scan repos from a GitHub Projects board for foundation readiness (Priority: P4)

A CNCF reviewer wants to run a foundation readiness scan across all projects in a specific column of the CNCF sandbox GitHub Projects v2 board (e.g. the "New" column of `https://github.com/orgs/cncf/projects/14`). They switch to Foundation mode, select the "Projects board" sub-mode, paste the board URL, pick a column, and get the same candidacy ranking they'd get from the org sub-mode — but scoped to just the repos on that board column.

**Why this priority**: This is a natural follow-on (#411) that slots directly into Foundation mode's sub-mode pattern. It is not required for the core feature value but the Foundation mode input design MUST accommodate it without structural change.

**Independent Test**: Can be partially tested in this PR by pasting a Projects board URL into the Foundation input field and verifying a "coming soon" message is shown rather than an error. Full end-to-end testing requires #411.

**Acceptance Scenarios**:

1. **Given** Foundation mode is active and the user pastes a `https://github.com/orgs/org/projects/N` URL, **When** they click "Scan", **Then** the app recognises it as a Projects board URL and shows a "Projects board support coming soon" message rather than an invalid input error.
2. **Given** #411 is implemented and a valid board URL is entered, **When** the user clicks "Scan", **Then** repos from the selected board column are resolved and fed into the same candidacy ranking panel used by the org input path.

---

### User Story 5 - Foundation picker shows the full roadmap (Priority: P5)

A user sees the Foundation tab and understands at a glance that it supports CNCF Sandbox today and will support CNCF Incubating, CNCF Graduation, Apache Incubator, and others in future iterations.

**Why this priority**: The picker must communicate extensibility intent clearly, but it does not block the core value delivery of P1–P4.

**Independent Test**: Can be fully tested by inspecting the foundation picker for the presence of all known targets, with only CNCF Sandbox interactive and the rest visibly disabled.

**Acceptance Scenarios**:

1. **Given** Foundation mode is active, **When** the foundation picker is displayed, **Then** it shows CNCF Sandbox as the active default and CNCF Incubating, CNCF Graduation, and Apache Incubator as visibly disabled with a "coming soon" label.
2. **Given** a disabled foundation option is clicked, **Then** it cannot be selected and no error state is triggered.

---

### Edge Cases

- What happens when one repo in a multi-repo Foundation scan fails? → Error shown for that repo; other repos' readiness reports still render (same per-repo isolation as Repositories mode).
- What happens when the org has zero repos? → Empty state message shown in the candidacy panel; no crash.
- How does a user arrive at a pre-encoded Foundation URL? Two paths: (1) clicking the nudge callout from Org or Repositories results, which builds and navigates to a Foundation URL with the current input pre-encoded; (2) sharing the Foundation tab URL after a scan has run — the URL encodes current state (repos or org + foundation target) so the recipient's form pre-populates and the scan auto-triggers on load, matching the existing shareable URL behaviour in Repositories mode.
- What happens when all org repos are already CNCF-hosted? → Candidacy panel renders noting their current CNCF status rather than showing an empty or broken state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The top-level input mode selector MUST expose three options in order: "Repositories", "Organization", "Foundation".
- **FR-002**: Foundation mode MUST expose a foundation picker and a single smart input field. The input type is auto-detected from what the user types — no explicit sub-mode selector is required:
  - One or more `owner/repo` slugs or `https://github.com/owner/repo` URLs → per-repo readiness
  - A bare org slug, `github.com/org`, or `https://github.com/org` → org candidacy ranking
  - A `https://github.com/orgs/org/projects/N` URL → Projects board (#411, out of scope for this iteration but the parsing path MUST be reserved)
  The input field MUST show a tooltip (on hover or tap of an info icon) listing the accepted formats:
  - Multiple repos: one `owner/repo` slug per line, or comma/space separated; full GitHub URLs accepted
  - One org: bare org slug, `github.com/org`, or `https://github.com/org`
  When a `https://github.com/orgs/org/projects/N` URL is pasted, the tooltip does NOT list it as an accepted format — instead the result area shows a "Projects board support coming soon" message (see FR-015).
- **FR-003**: The foundation picker MUST list the following targets in order, with only CNCF Sandbox active:
  - CNCF Sandbox *(active)*
  - CNCF Incubating *(disabled — coming soon)*
  - CNCF Graduation *(disabled — coming soon)*
  - Apache Incubator *(disabled — coming soon)*
  Adding a new foundation target MUST require only: (1) a picker entry and (2) its readiness criteria set — no structural changes to Foundation mode layout.
- **FR-004**: In "Repositories" sub-mode, Foundation mode MUST accept one or more repo slugs (same multi-repo formats as Repositories mode) and render a per-repo foundation readiness report (health checks, maturity signals, top gaps) for each.
- **FR-005**: In "Organization" sub-mode, Foundation mode MUST accept an org slug (same formats as Organization mode input), fetch the org's public repo list via the lightweight inventory endpoint (no full aggregation pipeline), and render the candidacy ranking panel.
- **FR-006**: Foundation mode MUST validate non-empty input before submission in both sub-modes and show an inline error when blank.
- **FR-007**: Foundation mode MUST support per-repo error isolation — a failed repo does not block results for others.
- **FR-008**: The "Foundation target" dropdown MUST be removed from Repositories mode input. The CNCF Readiness tab MUST be removed from Repositories mode results. All foundation readiness entry points now live exclusively in Foundation mode.
- **FR-009**: The CNCF Candidacy tab MUST be removed from Organization mode. All foundation candidacy scanning now lives exclusively in Foundation mode.
- **FR-010**: Foundation mode MUST encode current state in the URL (input value + foundation target) after a scan runs, so the URL is shareable. Opening a pre-encoded Foundation URL MUST pre-populate the form and auto-trigger the scan on load. This URL is also the target generated by the nudge callouts in Org and Repositories modes.
- **FR-011**: Foundation mode results MUST remain visible when the user switches to another input mode and switches back within the same session.
- **FR-012**: When Foundation mode is active, the result area MUST NOT show general health tabs (Contributors, Activity, Responsiveness, Documentation, Security, Comparison) — only foundation-specific output is shown.
- **FR-016**: Foundation mode results MUST preserve all existing metadata signals from the candidacy panel and readiness components without omission — including but not limited to: fork indicators, archived labels, CNCF landscape status pills (Sandbox / Incubating / Graduated / Landscape), name collision warnings, tier badges (Strong candidate / Needs work / Not ready), and status and tier filter chips. No signal is removed or simplified in this migration.
- **FR-013**: Organization mode MUST display a visible nudge (callout or banner) after an org analysis completes, pointing users to the Foundation tab for foundation readiness checks. The nudge MUST pre-populate Foundation mode with the analyzed org slug when clicked.
- **FR-014**: Repositories mode MUST display a visible nudge (callout or banner) after a repo analysis completes, pointing users to the Foundation tab for foundation readiness checks. The nudge MUST pre-populate Foundation mode with the analyzed repo slugs when clicked.
- **FR-015**: The Foundation mode input parser MUST recognise a `https://github.com/orgs/org/projects/N` URL as a Projects board input and surface a "Projects board support coming soon" message rather than treating it as an invalid input — reserving the path for #411.

### Key Entities

- **Foundation target**: A named foundation program that maps to a specific readiness criteria set. Known targets: CNCF Sandbox, CNCF Incubating, CNCF Graduation, Apache Incubator — and others to follow. Only CNCF Sandbox is actionable in this iteration. The data model MUST treat foundation targets as a registry — adding a new target is additive and requires no structural change.
- **Foundation input sub-mode**: The input method within Foundation mode. "Repositories" accepts repo slugs and returns per-repo readiness. "Organization" accepts an org slug and returns a candidacy ranking. "Projects board" (#411) is the planned third sub-mode.
- **Foundation readiness report**: Per-repo output showing health checks, maturity signals, and top gaps against the selected foundation target.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in user can reach a foundation readiness report for any repo in 3 or fewer interactions (click Foundation tab → enter repo → click Scan).
- **SC-002**: A signed-in user can reach a candidacy ranking for any org in 3 or fewer interactions (click Foundation tab → select Organization sub-mode → enter org → click Scan), without running a full org health analysis.
- **SC-003**: Repositories mode and Organization mode continue to function without regression — all existing tests pass.
- **SC-004**: The foundation picker renders all four known targets; only CNCF Sandbox is interactive.
- **SC-005**: Foundation mode results are preserved when the user navigates between input modes within the same session.
- **SC-006**: A user who has completed an org or repo analysis can reach Foundation mode with their input pre-populated in one click via the nudge callout.
- **SC-007**: Pasting a Projects board URL into the Foundation input shows a "coming soon" message rather than an error, confirming the extensibility path is reserved for #411.

## Assumptions

- The existing CNCF candidacy scan API (`/api/cncf-candidacy`) is reused as-is for the "Repositories" sub-mode — no new endpoint required.
- The existing lightweight org inventory endpoint is reused as-is for the "Organization" sub-mode — no new endpoint required.
- The CNCF Readiness tab content and the CNCF Candidacy panel that currently exist in Repositories and Organization mode respectively are re-rendered inside Foundation mode using the same underlying components — all existing pills, lenses, and metadata signals (fork, archived, landscape status, name collision, tier badges, filter chips) are preserved exactly as-is.
- GitHub Projects board input (#411) is out of scope for this iteration but slots in as a third Foundation sub-mode. The sub-mode selector design MUST NOT hard-code two options — it must be extensible.
- CNCF Incubating, CNCF Graduation, Apache Incubator, and other foundation targets are out of scope for this iteration — only CNCF Sandbox is functional. All must appear in the picker as disabled options.
- The app requires GitHub OAuth sign-in before any content is accessible — Foundation mode is always reached in an authenticated state. No unauthenticated UI states need to be handled within Foundation mode.
