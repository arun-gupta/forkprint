# Research: GitHub OAuth Authentication (P1-F14)

## OAuth Flow in Next.js App Router (Stateless)

**Decision**: Use the GitHub OAuth Web Application Flow with two server-side API routes.
**Rationale**: Next.js API routes run server-side, keeping `GITHUB_CLIENT_SECRET` out of the client bundle. The two-route pattern (`/api/auth/login` → GitHub → `/api/auth/callback`) is the standard stateless OAuth implementation for Next.js.
**Alternatives considered**:
- NextAuth.js — ruled out; introduces a session database dependency and significant complexity beyond what is needed
- Client-side PKCE flow — ruled out; GitHub OAuth Apps do not support PKCE; GitHub Apps do but require a different registration and installation model

**Flow**:
1. `/api/auth/login` → redirects browser to `https://github.com/login/oauth/authorize?client_id=...&scope=public_repo&state=...`
2. GitHub redirects to `/api/auth/callback?code=...&state=...`
3. Callback route exchanges `code` for access token via `POST https://github.com/login/oauth/access_token` (server-to-server)
4. Callback fetches `/api/user` to get the GitHub username
5. Callback returns token + username to the client (via redirect with fragment or a minimal HTML page that passes data to the opener)

## Returning the Token to the Client Securely

**Decision**: The callback route redirects to the app root with the token passed as a URL fragment (`/#token=...&username=...`). The client reads the fragment, stores it in React state, then immediately replaces the URL to clear the fragment.
**Rationale**: Fragments are not sent to the server in HTTP requests, so the token never appears in server logs. The fragment is only accessible to the current page's JavaScript.
**Alternatives considered**:
- HttpOnly cookie set by the callback — more secure but requires server-side session, violating the stateless constraint
- Redirect with query param — ruled out; query params appear in server logs and browser history
- postMessage from a popup window — viable but significantly more complex; fragment approach is simpler and sufficient given in-memory-only storage

## CSRF Protection

**Decision**: Generate a random `state` parameter before redirecting to GitHub. Store it in `sessionStorage` for the duration of the OAuth round-trip only. Validate it in the callback.
**Rationale**: The `state` parameter prevents CSRF attacks on the OAuth callback. `sessionStorage` is tab-scoped and cleared when the tab closes — appropriate for a transient CSRF token. This is the only use of browser storage in this feature; the OAuth access token itself remains in-memory React state.

## GitHub API Scope

**Decision**: Request `public_repo` scope only.
**Rationale**: The analyzer only reads public repository data. Requesting broader scopes (e.g., `repo`) would grant unnecessary write access. Consistent with the existing PAT minimum scope requirement in the constitution.

## Removing GITHUB_TOKEN Fallback

**Decision**: Remove `process.env.GITHUB_TOKEN ?? body.token` from both API routes. Routes now require `body.token` and return 401 if absent.
**Rationale**: The server-side token was a shared pool — a single quota shared across all users. With OAuth, every user supplies their own token. Removing the fallback eliminates the shared quota problem and simplifies the route logic.

## Username Fetch

**Decision**: After exchanging the code for a token, the callback route calls `GET https://api.github.com/user` with the new token to retrieve the GitHub `login` (username).
**Rationale**: The username is displayed as a signed-in indicator in the UI. GitHub's OAuth token response does not include the username — a separate `/user` call is required. This call counts against the user's own quota (not a shared pool).
