# Feature Specification: Audit Member Permission Distribution at Org Level

**Feature Branch**: `288-audit-member-permission-distribution-at`  
**Created**: 2026-04-20  
**Status**: Draft  
**Input**: User description: "288 — Audit member permission distribution at org level"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Role Distribution on Org Page (Priority: P1)

A user analyzing a GitHub organization through RepoPulse wants to see a breakdown of how many members hold each role (admin vs. member vs. outside collaborator) so they can assess whether the principle of least privilege is being followed.

**Why this priority**: This is the core deliverable of the feature — without role counts and percentages, none of the other stories are meaningful.

**Independent Test**: Navigate to the org-level view for any multi-member org and verify that role counts and percentages appear in the permission distribution panel.

**Acceptance Scenarios**:

1. **Given** an org has been analyzed, **When** the user views the org governance panel, **Then** the panel shows the count and percentage of admins, members, and outside collaborators.
2. **Given** an org with 10 members (2 admins, 8 members), **When** the user views the distribution, **Then** the panel shows "Admins: 2 (10%), Members: 8 (80%), Outside Collaborators: 0 (0%)".
3. **Given** a single-repo input (not an org), **When** the user views the permission section, **Then** the section shows "N/A — not an organization".

---

### User Story 2 - Admin-Heavy Flag (Priority: P2)

A user wants to be immediately alerted when an organization's admin ratio exceeds a safe threshold so they can act on over-privileged access without manually calculating ratios.

**Why this priority**: The heuristic flag is the security value-add that differentiates mere reporting from actionable insight.

**Independent Test**: Analyze an org with >10% admins and verify a visible flag or warning indicator appears alongside the role distribution.

**Acceptance Scenarios**:

1. **Given** an org with >10% admins, **When** the distribution is displayed, **Then** a warning flag appears indicating "Admin ratio exceeds recommended threshold".
2. **Given** a small org (≤25 members) with >5 admins, **When** the distribution is displayed, **Then** a warning flag appears regardless of percentage.
3. **Given** an org with ≤10% admins and ≤5 admins (or >25 members with ≤10%), **When** the distribution is displayed, **Then** no flag is shown.
4. **Given** an org with exactly 10% admins and 26 members, **When** the distribution is displayed, **Then** no flag is shown (boundary: >10% triggers the flag, not ≥10%).

---

### User Story 3 - Links to Member Lists (Priority: P3)

A user reviewing an org's permission distribution wants to navigate directly from a role count to the corresponding member list on GitHub so they can take action without leaving their workflow.

**Why this priority**: Navigation links add convenience but the feature delivers security value without them.

**Independent Test**: Click the admin count link on an analyzed org and verify it opens the correct GitHub members page filtered to admins.

**Acceptance Scenarios**:

1. **Given** the permission distribution panel is visible, **When** the user clicks the admin count, **Then** the browser opens `https://github.com/orgs/{org}/people?query=role%3Aowner` in a new tab.
2. **Given** the permission distribution panel is visible, **When** the user clicks the member count, **Then** the browser opens the org members page filtered to non-admin members in a new tab.
3. **Given** a solo-repo input (N/A state), **When** the panel is shown, **Then** no links are rendered.

---

### Edge Cases

- What happens when the org has 0 members returned (private org or API access denied)? → Show "Unavailable — insufficient permissions or private org" and list in the missing data panel.
- What happens when outside collaborator count cannot be retrieved (no repos in scope)? → Show "Unavailable" for outside collaborators specifically; still show admin/member counts if available.
- What happens when the org has exactly 1 member who is also an admin? → Show "Admins: 1 (100%)" with the warning flag (>10% ratio threshold is breached).
- What happens when the API returns a partial result (rate limited mid-pagination)? → Surface whatever data was retrieved with a "Partial data — rate limit reached" note in the missing data panel.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display the count and percentage of org members in each role (admin, member, outside collaborator) on the org governance panel.
- **FR-002**: The system MUST flag the org with a visible warning when the admin ratio exceeds 10% OR when the org has ≤25 members and more than 5 admins.
- **FR-003**: The system MUST provide links from each role count to the corresponding filtered GitHub member list, opening in a new tab.
- **FR-004**: When the analyzed input is a single repo (not an org context), the permission distribution section MUST show "N/A" and render no role data or links.
- **FR-005**: When org member data is unavailable (insufficient permissions, private org), the system MUST display "Unavailable" and list the missing data in the org-level missing data callout — it MUST NOT zero-fill or fabricate counts.
- **FR-006**: The admin-flag thresholds (>10% ratio, >5 admins in orgs ≤25 members) MUST be defined in shared configuration — not hardcoded in component logic.
- **FR-007**: The system MUST source role counts from the GitHub API — no estimation or fabrication is permitted. The admin count MUST be derived from the same fetch used by the Stale Admins panel (P2-F13) and MUST NOT issue a duplicate `GET /orgs/{org}/members?role=admin` call. The admin count displayed in the distribution panel MUST match the total admin count shown in the Stale Admins panel header; any discrepancy is a bug.
- **FR-008**: Outside collaborator counts MUST be aggregated across org repos when the org context is available.

### Key Entities *(include if feature involves data)*

- **OrgPermissionDistribution**: Represents the role breakdown for an organization — contains admin count, member count, outside collaborator count, total count, percentages, and a flag indicating whether the distribution exceeds safe thresholds.
- **PermissionFlag**: A structured indicator (flag type, threshold breached, human-readable message) attached to the distribution when thresholds are exceeded.
- **RoleLink**: A URL pointing to the GitHub member list filtered by role, derived from the org name and role type.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The permission distribution panel populates in the same network round-trip as the org governance panel — no additional user action is required after the analysis response is received, and the panel MUST be visible within 500 ms of the governance data being processed.
- **SC-002**: The admin-heavy flag appears for 100% of orgs that exceed either configured threshold, and is absent for 100% of orgs that do not.
- **SC-003**: Role count links navigate to the correct GitHub filtered member page for every org where the distribution data is available.
- **SC-004**: When org member data is unavailable, the org-level missing data callout lists the permission distribution signal — the counts are never displayed as zero.
- **SC-005**: The feature renders "N/A" for all single-repo inputs, with no role counts, percentages, or links visible.

## Assumptions

- The analyzed entity must be an org (not a user-owned repo) for role data to be available; single-repo or user-namespace inputs always yield N/A.
- Outside collaborators are aggregated across repos in the org scope; repos not included in the current analysis session may be excluded.
- The GitHub API endpoints used require the authenticated user's token to have at least `read:org` scope; without it, counts are shown as "Unavailable".
- Cohort-based comparison is implemented via the two-threshold rule (absolute >5 for small orgs, ratio >10% for larger orgs) — full cohort-scoring is a follow-up.
- Team-level admin permission surfacing is out of scope for this feature (explicitly noted as a follow-up in the issue).
- Thresholds default to: admin ratio > 10%, or > 5 admins when org size ≤ 25; both values live in shared config and are not hardcoded. The 10% figure is provisional — it will be updated after calibration against real org data tracked in issue #152.
- The GitHub REST API is used for member listing (GraphQL does not expose org member role filtering in a single query); this follows the established pattern from P2-F13 (`github-rest.ts`) where the OAuth token is already transmitted to `api.github.com` REST endpoints. This is an approved exception per constitution §III rule 3. Constitution §X.3 ("token never transmitted except to the GraphQL endpoint") is effectively superseded in practice by P2-F13's merged implementation; a formal §X.3 amendment is a follow-up governance item outside this feature's scope.
