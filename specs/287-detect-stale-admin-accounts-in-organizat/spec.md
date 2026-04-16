# Feature Specification: Stale Admin Detection

**Feature Branch**: `287-detect-stale-admin-accounts-in-organizat`
**Created**: 2026-04-16
**Status**: Draft
**Input**: GitHub issue #287 (child of #285 "Org-level governance audit"). The issue is the authoritative requirements spec per `docs/DEVELOPMENT.md` Phase 2+ flow. Quoted here for traceability:

> Identify organization admins who have been inactive for an extended period (configurable threshold, default 90 days). Stale admins are a classic privilege-escalation risk — Legitify flags these explicitly.
>
> **Data sources**: `GET /orgs/{org}/members?role=admin` for the admin list; per-admin activity via `GET /users/{username}/events/public` or last commit to org repos via GraphQL. Threshold: 90 days default; configurable.
>
> **Acceptance criteria**:
> - Org page lists admins with last-activity timestamp and a "stale" flag when past threshold
> - Handles private-activity-only admins gracefully (mark as "no public activity" vs. "stale")
> - Solo repos show N/A
> - Data freshness documented (activity is eventually consistent)
>
> **Open questions** (issue): Do we count admin actions (granting access, editing settings) or only code contributions? Privacy consideration: don't expose inferred inactivity for users with private profiles beyond what the API already discloses.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Spot stale admins on an organization at a glance (Priority: P1)

A security-minded maintainer or auditor analyzes a GitHub organization in RepoPulse. On the organization-level view, they see every admin of the org listed with that admin's last known public activity timestamp and, for admins inactive beyond the stale threshold, a clearly visible "stale" flag. This lets the auditor triage privilege-escalation risk without leaving the page or inspecting each admin manually on github.com.

**Why this priority**: This is the headline value the issue was filed for. Without the stale flag on the org view, the feature does not exist. All other stories extend or refine this core capability.

**Independent Test**: Analyze a public GitHub organization that has at least one admin whose most recent public activity is older than the stale threshold and at least one admin who is recently active. Verify the org view lists both admins, shows last-activity timestamps for each, and visually flags only the stale admin. Delivers the primary governance signal on its own.

**Acceptance Scenarios**:

1. **Given** an organization with an admin whose most recent public activity is 120 days ago, **When** the auditor opens the organization view, **Then** that admin is listed with a last-activity timestamp of ~120 days ago and a visibly distinct "stale" flag.
2. **Given** an organization with an admin whose most recent public activity is 10 days ago, **When** the auditor opens the organization view, **Then** that admin is listed with a last-activity timestamp of ~10 days ago and no stale flag.
3. **Given** an organization with multiple admins spanning active, stale, and borderline cases, **When** the auditor opens the organization view, **Then** each admin is shown with their individual last-activity timestamp and only those past the threshold carry the stale flag.

---

### User Story 2 — Distinguish "no public activity" from "stale" (Priority: P1)

Some admins keep their GitHub activity private (private profile, private contributions only). RepoPulse must not flag those admins as "stale" based on the absence of public events, because the absence is a reporting choice, not evidence of inactivity. These admins are shown in a distinct, neutral state — "no public activity" — with no stale flag, so the auditor understands the signal is unavailable rather than negative.

**Why this priority**: Flagging a private-activity admin as stale is a false positive that erodes trust in every other flag on the page. The distinction must ship with the core feature to keep the signal honest, in line with the constitution's accuracy policy (II.2, II.5).

**Independent Test**: Analyze an organization that includes an admin with no public events available. Verify that admin appears in the list with a "no public activity" state and no stale flag, distinct from admins who are publicly active and from admins who are publicly stale.

**Acceptance Scenarios**:

1. **Given** an admin for whom no public activity signal is available, **When** the auditor opens the organization view, **Then** the admin is listed with a "no public activity" state, no last-activity timestamp, and no stale flag.
2. **Given** an admin with verifiable public activity older than the stale threshold **and** an admin with no public activity, **When** the auditor views both on the same page, **Then** the two states are visually and textually distinct so neither can be mistaken for the other.

---

### User Story 3 — Opt in to a deeper admin view (Priority: P2)

An auditor who is a member of the organization they are analyzing can, on the landing page, check an opt-in affordance before signing in — something like "Request a deeper GitHub permission to see more of your orgs". When the box is checked, the sign-in flow requests broader permission from GitHub; when the user approves, the resulting session can enumerate **all** admins of orgs the user belongs to, including those with concealed (private) org membership. When the box is left unchecked, the sign-in flow is unchanged and the feature falls back to publicly-listed admins only.

**Why this priority**: Default-off and explicitly user-consented, so it cannot regress the baseline flow. It unlocks a complete view for the most common auditor profile (a maintainer auditing their own org). The affordance is written generically on purpose — the same session-scoped grant can unlock deeper views in future features without re-adding a checkbox — but this spec only binds it to stale-admin detection.

**Independent Test**: On the landing page, check the "deeper permission" opt-in, sign in to GitHub and approve the broader grant, then analyze an organization the signed-in user is a member of that has at least one admin with concealed org membership. Verify the concealed admin appears in the admin list with a resolved classification, and that signing out and signing back in **without** checking the opt-in returns the list to publicly-listed admins only.

**Acceptance Scenarios**:

1. **Given** the landing page, **When** the user checks the deeper-permission opt-in and starts sign-in, **Then** the authorization request sent to GitHub includes the broader scope.
2. **Given** a signed-in session that holds the broader grant and the user is a member of the analyzed org, **When** the auditor opens the organization view, **Then** all admins (publicly-listed and concealed) are listed, each with their resolved classification.
3. **Given** a signed-in session that holds the broader grant but the user is **not** a member of the analyzed org, **When** the auditor opens the organization view, **Then** only publicly-listed admins are listed (GitHub still withholds concealed admins from non-members) **and** the section indicates that the broader grant did not widen the view for this particular org.
4. **Given** a signed-in session that does **not** hold the broader grant, **When** the auditor opens the organization view, **Then** only publicly-listed admins are listed (baseline behavior, unchanged).
5. **Given** a signed-in session that holds the broader grant, **When** the user signs out and signs back in without checking the opt-in, **Then** the broader grant is not requested and is not available to the new session.

---

### User Story 4 — Non-organization targets surface N/A, not a false signal (Priority: P2)

RepoPulse also analyzes individual repositories that do not belong to an organization (personal accounts, solo-maintainer repos). For those targets there is no org-admin concept, so the stale-admin signal is reported as "not applicable" rather than omitted silently or zero-filled.

**Why this priority**: Ships alongside P1 at low incremental cost and prevents the governance panel from looking "broken" or silently empty on non-org targets. The issue names this explicitly ("Solo repos show N/A").

**Independent Test**: Analyze a repository owned by an individual user account (not an organization). Verify the governance panel explicitly states that stale-admin detection is not applicable and does not display a misleading empty state.

**Acceptance Scenarios**:

1. **Given** a target repository owned by a user account (not an organization), **When** the auditor opens the analysis, **Then** the stale-admin section states the signal is not applicable for non-organization targets.
2. **Given** an organization-owned target, **When** the auditor opens the analysis, **Then** the stale-admin section populates normally without the N/A state.

---

### User Story 5 — Understand freshness and the limits of the signal (Priority: P3)

The auditor can see, next to the stale-admin signal, the stale threshold in use (e.g. "90 days"), an explanation that the underlying activity data is eventually consistent, and a note that only publicly visible activity is considered. This prevents the auditor from treating the timestamp as a real-time or private-audit-grade measurement.

**Why this priority**: Necessary for the feature to be read correctly but not blocking — a reasonable auditor will interpret a stale flag conservatively even without explicit framing. Ships last of the in-scope work.

**Independent Test**: From the organization view, hover or click the affordance that explains the stale-admin signal. Verify the displayed text names the current threshold, references public activity only, and notes eventually-consistent freshness.

**Acceptance Scenarios**:

1. **Given** the auditor is viewing the stale-admin section, **When** they invoke the explanatory affordance, **Then** the displayed text names the active threshold value, states that only public activity is considered, and notes that the data is eventually consistent.
2. **Given** the threshold is changed in configuration, **When** the auditor re-opens the explanatory affordance, **Then** the displayed threshold value reflects the new configured value.

---

### Edge Cases

- **Admin list fetch failure** (network, rate limit, auth scope): the stale-admin section shows an unavailable state explaining why; it does not fabricate an empty admin list.
- **Admin activity fetch fails for one admin but succeeds for others**: the failing admin is shown with an "activity unavailable" state; other admins still render their resolved state. Per-admin error isolation must hold (Constitution X.5).
- **Admin appears in the admin list but the user account itself cannot be fetched** (deleted/suspended account): the admin row is shown with the username and an explicit "account unavailable" state; no stale flag.
- **Organization has no admins returned** (highly unusual, e.g. API-side anomaly): the section explicitly states zero admins were returned rather than implying the org has no governance.
- **Organization with a very large admin roster**: every admin is evaluated; no silent truncation. If display-level pagination is used, every admin is reachable — none are suppressed.
- **Admin's most recent activity is exactly at the threshold boundary**: treated as not stale (strictly greater than the threshold is required to flag). Deterministic.
- **Threshold value is missing, malformed, or not one of the allowed windows (30/60/90/180/365)**: the section does not silently fall back to zero (which would flag everyone). It surfaces a configuration error state or the documented default, consistent with how other config-driven thresholds behave.
- **Admin is a bot or machine account**: treated the same as any other admin for this feature — flagged stale if its public activity is past threshold. No special-casing in v1.
- **Opt-in elevated grant requested but denied by the user on the GitHub consent screen**: the session proceeds with the baseline scope only; no error is raised, the section renders as if the opt-in were never checked, and the section's mode indicator (FR-016) shows "baseline".
- **Opt-in elevated grant requested and approved but GitHub returns no additional admins** (e.g., the target org has no concealed members, or the user is not a member of the target org — see FR-017): the feature renders the same list it would have on the baseline path and the section discloses that the grant did not change the result for this particular org.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST, for an organization-level analysis, retrieve the list of organization admins (users with the admin role on the organization) from the GitHub API using the authenticated session's existing OAuth token. In the baseline flow (without the broader grant described in FR-013), this returns the **publicly-listed admins only**; admins with concealed org membership are not observable and are therefore not part of the evaluated population.
- **FR-002**: The system MUST, for each admin returned, determine the timestamp of that admin's most recent publicly visible activity, using public user events as the primary source and, when public events are unavailable, falling back to the admin's most recent commit authored to a repository in the same organization.
- **FR-003**: The system MUST classify each admin into exactly one of three states based on the resolved activity signal: **active** (most recent public activity is on or within the stale threshold), **stale** (most recent public activity is strictly older than the stale threshold), or **no public activity** (no usable public activity signal is available).
- **FR-004**: The system MUST render, on the organization-level view, a list of every admin returned in FR-001, showing for each admin: their username, their resolved classification (active / stale / no public activity / unavailable), and — when available — the resolved last-activity timestamp.
- **FR-005**: The system MUST visually and textually distinguish the **stale** state from the **no public activity** state. The two MUST NOT be rendered with the same flag, same color, or same wording. A user visually scanning the list MUST be able to tell them apart without reading additional help text.
- **FR-006**: The stale threshold MUST be sourced from the shared scoring configuration described in Constitution Section VI, with a default value of **90 days**. The threshold MUST be drawn from a fixed set of standard windows — **30, 60, 90, 180, or 365 days** — so classification, display, and tooltip copy all align to recognizable windows. Arbitrary values outside this set MUST be rejected by configuration validation rather than silently honored. The threshold MUST NOT be hardcoded in rendering or classification logic.
- **FR-007**: When the analysis target is not an organization (for example, a repository owned by an individual user account), the system MUST surface the stale-admin signal as explicitly "not applicable" on that target's view. It MUST NOT hide the section silently, render an empty list, or reuse an unrelated empty state.
- **FR-008**: If retrieval of the admin list itself fails for the organization, the system MUST render an unavailable state for the stale-admin section that names the failure (e.g. "admin list could not be retrieved"). It MUST NOT fall back to an empty admin list.
- **FR-009**: If retrieval of activity fails for one admin while succeeding for others, the system MUST render the failing admin with an "activity unavailable" state and MUST still render every other admin's resolved state. A single admin's fetch failure MUST NOT block the section from rendering.
- **FR-010**: The system MUST provide an in-context affordance (tooltip, inline help, or equivalent) on the stale-admin section that discloses: (a) the stale threshold currently in effect, in days; (b) the fact that only public activity is evaluated; (c) the fact that underlying GitHub activity data is eventually consistent.
- **FR-011**: The stale-admin signal MUST NOT attribute organizational affiliation to any admin beyond what is already publicly disclosed by the GitHub API. The system MUST NOT infer or guess private employer information.
- **FR-012**: The stale-admin signal, in this feature's initial scope, MUST NOT be folded into the composite OSS Health Score. It is an org-level governance signal surfaced alongside — not inside — the health score, consistent with parent issue #285.
- **FR-013**: The landing page MUST present an **opt-in affordance** (checkbox or equivalent) that, when selected before sign-in, causes the OAuth authorization request to ask GitHub for the broader scope needed to enumerate concealed org members for orgs the signed-in user belongs to. The affordance MUST be worded generically enough to support future deeper-view features without UX changes and MUST disclose, in plain language, that checking it requests broader GitHub access.
- **FR-014**: When the opt-in affordance is **not** selected, the sign-in flow MUST request only the minimum scope already in use today. The baseline flow MUST remain unchanged for users who do not opt in; no existing behavior may regress.
- **FR-015**: Any elevated scope granted via FR-013 MUST be held in-memory for the session only and MUST NOT be persisted to localStorage, cookies, or any server-side store. This mirrors the existing OAuth token-handling rule in Constitution III.4.
- **FR-016**: The stale-admin section MUST indicate, inside the section itself (not only in a tooltip), which admin-visibility mode produced the list: baseline (publicly-listed admins only) or elevated (includes concealed admins the grant made visible). The indication MUST be unambiguous to a user scanning the page.
- **FR-017**: When a session holds the elevated grant but the authenticated user is **not** a member of the analyzed organization, the stale-admin section MUST behave as if the grant were absent for that org (GitHub returns only publicly-listed admins to non-members) **and** MUST state that the grant did not widen the view for this specific organization, so the auditor is not misled.
- **FR-018**: Every other functional requirement in this spec (FR-001 through FR-012) MUST continue to hold on the baseline (non-elevated) path. The elevated path MUST NOT be a prerequisite for the feature's core value.

### Key Entities *(include if feature involves data)*

- **Organization admin record**: Represents one admin of the analyzed organization. Attributes: username, resolved classification (active / stale / no public activity / unavailable), resolved last-activity timestamp (when available), and the source that produced that timestamp (public event vs. org-repo commit) for transparency.
- **Stale-admin section**: Represents the org-level rendering surface that lists admin records and carries the explanatory affordance (threshold, public-only scope, freshness).
- **Stale threshold**: A single configuration value in days, sourced from shared scoring configuration. Default 90.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On an organization-level analysis, 100% of admins returned by the GitHub admin-list API are rendered on the org view (no silent omissions).
- **SC-002**: Every rendered admin resolves into exactly one of the four states (active, stale, no public activity, unavailable) — no admin renders in an ambiguous or blank state.
- **SC-003**: In a controlled test comparing the rendered timestamps to the same data fetched directly from the GitHub API, 100% of resolved last-activity timestamps match the API-returned value (no invented, rounded-away, or fabricated dates).
- **SC-004**: In user-testing with auditors (or equivalent review), 0 participants mistake a "no public activity" admin for a "stale" admin when asked to name which admins are flagged as stale.
- **SC-005**: For non-organization targets, 100% of analyses render the stale-admin signal as "not applicable" rather than a blank, empty, or error state.
- **SC-006**: A change to the stale-threshold configuration value is reflected on the next analysis without any code change to rendering or classification logic.
- **SC-007**: A single-admin activity-fetch failure does not prevent any other admin's state from rendering in the same section (per-admin error isolation holds under induced failure).
- **SC-008**: A session that did not opt into the elevated grant renders the stale-admin section with a visible "baseline" mode indicator in 100% of analyses; a session that opted in and was granted the elevated scope renders a visible "elevated" mode indicator whenever it is in effect, and reverts to "baseline" on any subsequent session that did not opt in.
- **SC-009**: In a controlled test on an org the signed-in user is a member of and which has concealed admins, the elevated-grant flow surfaces those concealed admins and the baseline flow does not — verifying the two modes behave distinguishably.

## Assumptions

- The analysis target is identified as an organization vs. a user account via existing RepoPulse logic for distinguishing the two; this feature does not redefine that distinction.
- The GitHub admin-list endpoint returns admins in a form the authenticated session is entitled to read under the OAuth scope already used by RepoPulse. If additional scope would be required in some environments, the feature degrades to the "unavailable" state rather than requesting elevated scope in v1.
- "Public activity" is intentionally interpreted broadly enough to cover the most recent commit, pull request, issue action, or review on public org repos as reflected in the public events feed; whether admin-only actions (granting access, editing org settings) are visible through the public API is an implementation detail — those audit-log events are not expected to be accessible to RepoPulse's OAuth session in v1. The feature relies on the signals the public API actually exposes and does not claim to cover admin-action auditing.
- The stale threshold is a single, org-wide value configured in the shared scoring configuration, drawn from the standard set {30, 60, 90, 180, 365} days. Per-user overrides, in-UI threshold editing, and arbitrary day counts outside this set are out of scope for this feature. Constraining to standard windows keeps the signal legible (a "stale at 90+ days" admin is easier to reason about than "stale at 77+ days") and lets future bucketed displays — e.g. "30–60 / 60–90 / 90+" breakdowns — align naturally without changing the classification rule.
- Rendering a small number of rows per organization is within typical org sizes; display-level pagination (if needed) is a UI-level choice and does not change which admins are classified.
- This feature ships observation and surfacing only — it does not send notifications, create tickets, open issues, or otherwise take automated action against stale admins. The auditor is the actor.
- This feature does not introduce a new scoring bucket or modify existing bucket weights. Scoring integration (if any) is deferred to a separate, later feature under parent #285, consistent with that parent's "Scoring weight TBD" framing.
- Data freshness is bounded by the GitHub public-events feed's own eventual consistency; the feature documents this rather than attempting to reconcile against private audit sources it cannot access.
- On the baseline (non-opt-in) path, the admin list returned by GitHub includes **publicly-listed org members only**. Admins who have concealed their organization membership are not observable and therefore not part of the evaluated population on the baseline path. This is disclosed in the in-section affordance (FR-010) so the auditor does not misread the list as exhaustive.
- The elevated opt-in path (FR-013 through FR-018) widens the view for the subset of orgs the signed-in user is a member of. For any other org the signed-in user analyzes, GitHub still returns publicly-listed admins only, irrespective of granted scope; this is a GitHub API behavior, not a RepoPulse choice, and the UI discloses it (FR-017).
- The opt-in affordance is worded generically on purpose. The same session-scoped grant could unlock deeper views in future features (e.g. organizational affiliation for Contribution Dynamics, 2FA-enforcement audits). Those future uses are explicitly **out of scope** for this feature — this spec only binds the grant to stale-admin detection. Adding further consumers will happen in their own specs.
- Constitution Section III.4 states `Minimum scope: public_repo read-only`. Because it says *minimum*, an opt-in elevation above that minimum is compatible — the minimum remains `public_repo` and users who do not opt in retain today's behavior. If reviewers feel an explicit constitutional amendment is warranted to document the elevation path as a first-class capability, that amendment is a prerequisite to implementation and would precede `/speckit.plan`.

