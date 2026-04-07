# Implementation Plan: GitHub OAuth Authentication

**Branch**: `029-github-oauth` | **Date**: 2026-04-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/029-github-oauth/spec.md`

## Summary

Replace the PAT input and server-side `GITHUB_TOKEN` with a GitHub OAuth App flow. Users sign in via "Sign in with GitHub", completing the OAuth authorization on GitHub and returning to the app with a token held in-memory only. All API calls use the authenticated user's own token. The PAT input, `lib/token-storage.ts`, and the `components/token-input/` component are removed.

## Technical Context

**Language/Version**: TypeScript 5
**Primary Dependencies**: Next.js 16.2 (App Router), React 19
**Storage**: In-memory React state only — no localStorage, no cookies, no server-side session
**Testing**: Vitest 4 + React Testing Library 16 (unit/integration), Playwright 1.58 (E2E)
**Target Platform**: Vercel (Next.js serverless)
**Project Type**: Web application
**Performance Goals**: OAuth round-trip completes in under 30 seconds (GitHub OAuth latency-bound)
**Constraints**: Stateless — no server-side session storage introduced
**Scale/Scope**: Unbounded concurrent users, each consuming their own GitHub API quota

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| III.4 OAuth-only auth, in-memory token | ✅ Pass | Spec removes PAT; token is in-memory |
| III.5 No server GITHUB_TOKEN | ✅ Pass | Route handlers updated to reject unauthenticated requests |
| III.6 GITHUB_CLIENT_ID/SECRET server-side only | ✅ Pass | Never sent to client bundle |
| III.7 Token never in URLs or logs | ✅ Pass | Callback exchanges code server-side, token never in URL |
| IX.6 YAGNI | ✅ Pass | No token refresh, no multi-account, no session management |
| X.1 No secrets committed | ✅ Pass | `.env.local` only, `.env.example` gets placeholder values |
| XI TDD mandatory | ✅ Pass | Tests written before implementation |

## Project Structure

### Documentation (this feature)

```text
specs/029-github-oauth/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/           ← Phase 1 output
│   └── oauth-api.md
└── tasks.md             ← Phase 2 output (speckit.tasks)
```

### Source Code Changes

```text
# New
app/api/auth/
├── login/route.ts          ← GET: redirects to GitHub OAuth authorize URL
└── callback/route.ts       ← GET: exchanges code for token, returns to client

components/auth/
├── AuthGate.tsx            ← wraps app; shows sign-in or children
├── AuthGate.test.tsx
├── SignInButton.tsx         ← "Sign in with GitHub" button
└── SignInButton.test.tsx

# Modified
components/repo-input/RepoInputClient.tsx   ← remove token/PAT state, read token from AuthContext
app/api/analyze/route.ts                    ← remove GITHUB_TOKEN env fallback, require OAuth token
app/api/analyze-org/route.ts               ← same

# Removed
components/token-input/TokenInput.tsx
components/token-input/TokenInput.test.tsx
lib/token-storage.ts
lib/token-storage.test.ts
```

### State Management

OAuth session state is held in a React context (`AuthContext`) at the app root. It exposes:
- `token: string | null` — the OAuth access token (in-memory)
- `username: string | null` — the signed-in GitHub username
- `signOut: () => void` — clears both from memory

The token is passed to API routes the same way the PAT was: in the request body. No new auth mechanism is needed server-side beyond removing the `GITHUB_TOKEN` env fallback.

---

## Phase 0: Research

See [research.md](research.md).

---

## Phase 1: Design & Contracts

See [data-model.md](data-model.md) and [contracts/oauth-api.md](contracts/oauth-api.md).
