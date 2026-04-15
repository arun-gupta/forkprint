# Feature Specification: Dev-only server-side PAT fallback

**Feature Branch**: `207-dev-only-server-side-pat-fallback-to-unb`
**Created**: 2026-04-14
**Status**: Draft
**Issue**: [#207](https://github.com/arun-gupta/repo-pulse/issues/207)
**Constitution**: v1.2 (§III.4 amended to carve out this narrow exception)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a second worktree on a non-default port without OAuth breakage (Priority: P1)

A developer has RepoPulse checked out in multiple local worktrees (e.g., `repo-pulse` on port 3000, `repo-pulse-issue-207` on port 3010). GitHub OAuth Apps accept only one registered callback URL, so any worktree not bound to the registered port cannot complete OAuth. The developer sets `DEV_GITHUB_PAT` in the worktree's `.env.local` and runs `next dev`. The app signs them in automatically using the PAT for server-side GitHub API calls, bypassing OAuth entirely.

**Why this priority**: Parallel worktree development is a routine part of this project's workflow (the `claude-worktree.sh` script explicitly supports it). Without this fallback, every worktree beyond the first requires either killing the primary dev server or registering an extra OAuth App — neither scales.

**Independent Test**: Start `next dev` on a non-3000 port with `DEV_GITHUB_PAT` set. Sign-in page does not appear; the app renders the repo-input screen immediately. Submitting a repo returns a valid analysis result.

**Acceptance Scenarios**:

1. **Given** `NODE_ENV=development` and `DEV_GITHUB_PAT` is set, **When** the user opens the app, **Then** the OAuth sign-in page is bypassed and the app shows the authenticated UI.
2. **Given** dev mode with PAT set, **When** an analyze request is made, **Then** the server-side handler uses `DEV_GITHUB_PAT` against the GitHub API regardless of what the client sent.
3. **Given** dev mode without `DEV_GITHUB_PAT`, **When** the user opens the app, **Then** OAuth behaves exactly as it does today (unchanged default).

---

### User Story 2 - Production cannot silently run with a misconfigured PAT (Priority: P1)

If `DEV_GITHUB_PAT` is accidentally set in a production environment (Vercel env var, staging deploy, etc.), the server must refuse to boot. Silent fallback to a shared PAT in production would violate §III.5 (each user consumes their own OAuth quota).

**Why this priority**: A silent leak of this behavior into production would undermine the rate-limit model and constitution §III.5. Loud failure at boot makes misconfiguration obvious.

**Independent Test**: Set `NODE_ENV=production` and `DEV_GITHUB_PAT=ghp_x`, then import the assertion module (or start the server). The process throws a descriptive error.

**Acceptance Scenarios**:

1. **Given** `NODE_ENV=production` and `DEV_GITHUB_PAT` is set, **When** the server starts, **Then** it throws with a message naming both variables.
2. **Given** `NODE_ENV=production` and `DEV_GITHUB_PAT` is unset, **When** the server starts, **Then** the assertion passes and OAuth is the only auth path.

---

### User Story 3 - The PAT never reaches the client bundle (Priority: P1)

The PAT is read only in server-side code paths (route handlers and instrumentation). It is never exposed to client components, never sent in responses, and never logged.

**Why this priority**: §X (Security & Hygiene) prohibits leaking credentials. The dev-only scope is meaningful only if the PAT truly stays server-side.

**Independent Test**: Grep the client bundle output of `next build` for the PAT value or for `DEV_GITHUB_PAT` — neither must appear. Verify the `/api/auth/dev-session` response body does not contain the PAT itself.

**Acceptance Scenarios**:

1. **Given** a production build, **When** the client bundle is inspected, **Then** `DEV_GITHUB_PAT` does not appear as a string.
2. **Given** a request to `/api/auth/dev-session` in dev-mode with PAT set, **When** the response is received, **Then** it contains `{ enabled: true, username }` and no token.

---

### Edge Cases

- `DEV_GITHUB_PAT` is set but empty string → treated as unset.
- `DEV_GITHUB_PAT` is set but `NODE_ENV !== 'development'` in a `next dev` run (unusual) → assertion path depends strictly on `NODE_ENV === 'production'`; non-dev, non-prod values (e.g., `test`) fall through to OAuth without assertion failure.
- Client still sends an OAuth token in the request body while PAT is active → server prefers PAT (per issue pseudocode).
- PAT is invalid or lacks `public_repo` scope → analyze request returns the same failure path as an invalid OAuth token (no special handling required).
- Multiple worktrees share the same PAT → acceptable; the PAT's rate limit is the developer's own.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `/api/analyze` and `/api/analyze-org` MUST prefer `DEV_GITHUB_PAT` over any client-supplied token when `NODE_ENV === 'development'` AND `DEV_GITHUB_PAT` is a non-empty string.
- **FR-002**: When the dev-PAT fallback is active, the API routes MUST NOT return 401 for a missing client token.
- **FR-003**: When the dev-PAT fallback is inactive (prod, test, or dev without the env var), the API routes MUST behave exactly as before (client-supplied OAuth token required).
- **FR-004**: A startup assertion MUST throw if `NODE_ENV === 'production'` AND `DEV_GITHUB_PAT` is set to a non-empty string. The assertion MUST run during server boot (Next.js instrumentation).
- **FR-005**: A new `GET /api/auth/dev-session` endpoint MUST return `{ enabled: true, username: "dev" }` when the dev-PAT fallback is active, and `{ enabled: false }` otherwise. The response body MUST NOT contain the PAT itself.
- **FR-006**: `AuthGate` MUST call `/api/auth/dev-session` on mount. If the response is `{ enabled: true, username }`, it MUST auto-sign-in with a sentinel token (literal `"dev-pat"`) and the returned username, bypassing OAuth.
- **FR-007**: `.env.example` MUST document `DEV_GITHUB_PAT` with a comment stating: dev-only, local worktree workflow, never commit, never set in production.
- **FR-008**: The PAT MUST be read only in server-side modules (route handlers, instrumentation, dev-session endpoint). It MUST NOT appear in any file under a client component's import graph.
- **FR-009**: The PAT value MUST NOT be logged or included in any API response body.
- **FR-010**: `docs/DEVELOPMENT.md` MUST document the multi-worktree workflow: how to set `DEV_GITHUB_PAT`, which ports work, and the security boundaries.

### Key Entities

- **Dev session descriptor**: `{ enabled: boolean, username?: string }` returned by `/api/auth/dev-session`. Client-safe — no secrets.
- **Resolved token**: The token the server uses for a given request. In dev-PAT mode = `process.env.DEV_GITHUB_PAT`; otherwise = `body.token` from the client.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can start a second worktree on any port (e.g., 3010) with `DEV_GITHUB_PAT` set and complete a full analyze flow in under 30 seconds without touching GitHub OAuth settings.
- **SC-002**: Zero code changes are required in production deployment configuration; Vercel builds continue to succeed and OAuth remains the only prod path.
- **SC-003**: 100% of existing OAuth tests pass unchanged (no regressions to the production auth path).
- **SC-004**: Startup assertion fires in ≥1 unit test simulating `NODE_ENV=production` + PAT set.
- **SC-005**: Client bundle grep for `DEV_GITHUB_PAT` returns zero matches in a production build.

## Assumptions

- Developers already know how to generate a GitHub PAT with `public_repo` scope (§III.4 minimum).
- `.env.local` is and will remain `.gitignore`'d (constitution §X.2).
- Next.js sets `process.env.NODE_ENV` to `'development'` only under `next dev`; `next build && next start` and Vercel force `'production'`.
- A sentinel client-side token value (`"dev-pat"`) is acceptable because the server disregards the client token when the dev-PAT fallback is active. The sentinel is never sent to GitHub.
- The dev-session endpoint is unauthenticated because, by construction, it only reveals information (`enabled: false`) that is already public in production.

## Out of Scope

- Any production PAT support.
- User-facing PAT input UI (explicitly prohibited by §III.4).
- Multi-user PAT pooling / calibration-script token rotation (unrelated).
- Changing the OAuth redirect-URI mechanism.
