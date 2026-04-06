# Feature Specification: GitHub PAT Authentication

**Feature Branch**: `002-github-pat-auth`
**Created**: 2026-03-31
**Status**: Draft
**Input**: User description: "P1-F02 Authentication"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter and Store Token (Priority: P1)

A user who wants to analyze repos enters a GitHub Personal Access Token. The token is accepted, stored locally in the browser, and persists so the user does not need to re-enter it on the next visit.

**Why this priority**: Without a token, data fetching is rate-limited or blocked entirely. This is the core of the feature — everything else depends on it.

**Independent Test**: Can be fully tested by entering a valid PAT into the token field, reloading the page, and verifying the token is still present without re-entry.

**Acceptance Scenarios**:

1. **Given** the user is on the home page, **When** they enter a token into the token field and submit, **Then** the token is stored in local browser storage and the form proceeds.
2. **Given** the user has previously entered a token, **When** they return to the home page, **Then** the token field is pre-populated so they do not need to re-enter it.
3. **Given** the user is on the home page, **When** the page renders, **Then** the UI displays the minimum required scope (`public_repo` read-only) adjacent to the token field.

---

### User Story 2 - Submit Without Token Is Blocked (Priority: P1)

A user who has not entered a token (and no server-side token is configured) attempts to submit the analysis form. The submission is blocked with a clear, actionable error before any API call is made.

**Why this priority**: Preventing a silent failure or confusing downstream API error when no token is present is critical to UX correctness.

**Independent Test**: Can be fully tested by clearing any stored token, leaving the field empty, and attempting to submit — an error is shown and no network request is made.

**Acceptance Scenarios**:

1. **Given** no token is stored and no server-side token is configured, **When** the user submits the form without a token, **Then** submission is blocked and a clear inline error explains that a token is required.
2. **Given** a server-side token is configured, **When** the user submits without a client-side token, **Then** submission proceeds normally and no token error is shown.

---

### User Story 3 - Token Field Hidden on Server-Token Deployments (Priority: P2)

When RepoPulse is deployed with a server-side `GITHUB_TOKEN`, the token input field is hidden from the UI. Users on a shared or team deployment do not need to supply their own token.

**Why this priority**: This is a deployment-time UX concern — important for team use but not required for basic single-user functionality.

**Independent Test**: Can be fully tested by simulating a server-side token (via environment variable) and verifying the token field is absent from the rendered page.

**Acceptance Scenarios**:

1. **Given** the server has `GITHUB_TOKEN` configured, **When** the home page renders, **Then** the token input field is not shown.
2. **Given** the server has no `GITHUB_TOKEN` configured, **When** the home page renders, **Then** the token input field is shown.

---

### Edge Cases

- What happens when a user enters a token that passes storage but is revoked at the API? → The error surfaces at analysis time (data fetching layer), not at token entry time.
- What if `localStorage` is unavailable (e.g., strict incognito mode)? → The token is accepted for the current session but not persisted; no storage error is surfaced to the user.
- What if the token field contains only whitespace? → Trimmed and treated as empty — same behavior as no token entered.
- What if the user clears the token field and resubmits? → Treated as "no token" — blocked with an inline error if no server-side fallback is configured.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The UI MUST include a token input field that accepts a GitHub Personal Access Token.
- **FR-002**: The token MUST be stored in `localStorage` — it is never transmitted anywhere except the GitHub GraphQL API endpoint.
- **FR-003**: The token field MUST be pre-populated from `localStorage` on page load if a token was previously stored.
- **FR-004**: The UI MUST display the minimum required token scope (`public_repo` read-only) adjacent to the token field.
- **FR-005**: Submitting the form without a token (and no server-side token configured) MUST be blocked with a clear inline error.
- **FR-006**: When a server-side `GITHUB_TOKEN` is configured, the token input field MUST be hidden.
- **FR-007**: The token MUST never be included in URLs, query parameters, or exposed to the client bundle beyond the input field and `localStorage`.
- **FR-008**: Whitespace-only token input is treated as empty and triggers the same blocked-submission behavior.

### Key Entities

- **GitHub Personal Access Token (PAT)**: A credential string supplied by the user. Stored in `localStorage`. Used exclusively to authorize GitHub GraphQL API requests. Never included in URLs or server logs.
- **Server-side token**: A `GITHUB_TOKEN` environment variable configured at deployment time. Takes precedence over any client-supplied token. Its presence determines whether the token UI is shown.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can enter and have their token auto-filled in under 10 seconds on return visits.
- **SC-002**: 100% of form submissions without a token (and no server-side fallback) are blocked before any API call is made.
- **SC-003**: The token field is absent from the rendered page in 100% of cases where a server-side token is configured.
- **SC-004**: The minimum required scope is visible to the user on the token entry UI without any additional navigation or interaction.
- **SC-005**: The token never appears in any browser URL, network request URL, or page source outside the token input field and `localStorage`.

## Assumptions

- This spec covers PAT-only authentication. GitHub OAuth is a separate Phase 1 feature (P1-F14).
- The token field is on the home page (`/`) alongside the repo input form — not on a separate settings page.
- Token validation at entry time is limited to empty/whitespace detection. No format regex or authenticity check is performed — errors from invalid tokens surface at analysis time.
- `localStorage` is the only required persistence mechanism. No cookie or session storage fallback is required.
- The server-side token presence is determined server-side and communicated to the UI (e.g., via a server-rendered prop or lightweight API response) as a boolean — the token value itself is never sent to the client.
- The token is never logged by the server or included in any error messages returned to the client.
