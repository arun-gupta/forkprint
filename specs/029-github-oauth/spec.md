# Feature Specification: GitHub OAuth Authentication

**Feature Branch**: `029-github-oauth`
**Created**: 2026-04-06
**Status**: Draft
**Input**: User description: "P1-F14 GitHub OAuth Authentication"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign In With GitHub (Priority: P1)

A visitor opens the app for the first time and sees a "Sign in with GitHub" prompt. They click it, complete the GitHub OAuth flow, and are returned to the app as an authenticated user. The PAT input field is gone — they can immediately start analyzing repositories using their own GitHub quota.

**Why this priority**: Authentication is a prerequisite for all analysis. Without it, no other feature in the app is accessible.

**Independent Test**: Can be tested by opening the app unauthenticated, completing the OAuth flow, and verifying the user is signed in and can submit an analysis request.

**Acceptance Scenarios**:

1. **Given** the user is not signed in, **When** they open the app, **Then** they see a "Sign in with GitHub" button and no PAT input
2. **Given** the user clicks "Sign in with GitHub", **When** they complete the GitHub OAuth authorization, **Then** they are redirected back to the app and shown a signed-in indicator with their GitHub username
3. **Given** the user is signed in, **When** they submit an analysis, **Then** the request uses their OAuth token — not a server-side token
4. **Given** the OAuth callback completes, **When** the token is stored in-memory, **Then** the user is signed in for the duration of the session but must sign in again after a page refresh

---

### User Story 2 - Sign Out (Priority: P2)

A signed-in user wants to sign out. They click "Sign out", their session is cleared, and they are returned to the unauthenticated state with the "Sign in with GitHub" prompt.

**Why this priority**: Sign-out is required for shared-device safety and account switching.

**Independent Test**: Can be tested by signing in, clicking sign out, and verifying the OAuth token is cleared and the sign-in prompt reappears.

**Acceptance Scenarios**:

1. **Given** the user is signed in, **When** they click "Sign out", **Then** their OAuth token is cleared from memory
2. **Given** the user has signed out, **When** they view the app, **Then** they see the "Sign in with GitHub" prompt and cannot submit analysis without signing in again

---

### User Story 3 - OAuth Error Handling (Priority: P3)

A user attempts to sign in but the OAuth flow fails (e.g., they deny the authorization, or the callback returns an error). The app shows a clear error message and lets them try again.

**Why this priority**: Error paths must be handled gracefully but are lower priority than the happy path.

**Independent Test**: Can be tested by denying authorization on GitHub's OAuth consent screen and verifying the app shows an appropriate error and a working retry option.

**Acceptance Scenarios**:

1. **Given** the user denies authorization on GitHub, **When** they are returned to the app, **Then** an error message is shown and the sign-in button is still available
2. **Given** the OAuth callback returns an error state, **When** the app processes it, **Then** no partial token is stored and the user can retry

---

### Edge Cases

- What happens when the stored OAuth token has expired or been revoked on GitHub's side? → The next analysis request fails with an auth error; the user is prompted to sign in again
- What happens if the user navigates directly to the OAuth callback URL without initiating a flow? → The app rejects the request and redirects to the sign-in prompt
- What happens after a page refresh? → The in-memory token is lost; the user must sign in again. This is expected and by design.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST require users to sign in with GitHub before they can submit analysis requests
- **FR-002**: The app MUST display a "Sign in with GitHub" button as the primary call-to-action for unauthenticated users
- **FR-003**: The OAuth flow MUST be initiated server-side; the client secret MUST never be sent to the browser
- **FR-004**: The OAuth callback MUST be handled server-side; the access token MUST NOT appear in the URL
- **FR-005**: After successful authentication, the app MUST display the signed-in user's GitHub username
- **FR-006**: The OAuth access token MUST be stored in-memory only — it is never written to localStorage, cookies, or any persistent storage. The user must sign in again after a page refresh.
- **FR-007**: Users MUST be able to sign out, which clears the stored token and returns them to the unauthenticated state
- **FR-008**: The PAT input field MUST be removed from the UI — OAuth is the sole authentication method
- **FR-009**: The server-side `GITHUB_TOKEN` environment variable MUST be removed — no shared server token is used
- **FR-010**: `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` MUST be stored as server-side environment variables and never exposed to the client
- **FR-011**: Unauthenticated users MUST NOT be able to submit analysis requests

### Key Entities

- **OAuth Session**: Represents an authenticated user — stores the GitHub OAuth access token and username in localStorage
- **OAuth Callback**: The server-side route that exchanges the GitHub authorization code for an access token

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the sign-in flow in under 30 seconds from clicking "Sign in with GitHub" to being ready to analyze
- **SC-002**: Each authenticated user's API calls count against their own GitHub quota — the app can scale to any number of concurrent users without shared rate limit exhaustion
- **SC-003**: 100% of analysis requests from authenticated users use that user's own OAuth token
- **SC-004**: Zero PAT input fields remain in the UI after this feature is shipped
- **SC-005**: Signing out clears all stored credentials in under 1 second
- **SC-006**: OAuth tokens are never written to persistent storage — eliminating the XSS token-theft risk present in the previous PAT-based flow

## Assumptions

- The app is registered as a GitHub OAuth App with `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` configured in the deployment environment before this feature can be used
- Phase 1 remains stateless — no server-side session storage is introduced; the OAuth token is held in-memory only, eliminating the XSS token-theft risk present in localStorage-based storage
- Token refresh is out of scope — if a token expires or is revoked, the user signs in again
- The OAuth App requires only `public_repo` read access, consistent with the existing analyzer requirements
- Multi-account support (switching between GitHub accounts) is out of scope
- The deployment environment supports server-side environment variables for the client secret
- Rate limit information (remaining calls, reset time) continues to be displayed in the UI — it now reflects the authenticated user's own personal quota, making it more actionable than the previous shared server token display
