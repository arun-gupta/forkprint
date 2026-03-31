# Implementation Plan: GitHub PAT Authentication

**Branch**: `002-github-pat-auth` | **Date**: 2026-03-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-github-pat-auth/spec.md`

## Summary

Allow users to enter and persist a GitHub Personal Access Token in `localStorage` so ForkPrint can authenticate against the GitHub GraphQL API. Blocks form submission when no token is available. Hides the token input field when a server-side `GITHUB_TOKEN` is configured. Token never appears in URLs or server responses.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16.2 (App Router)
**Primary Dependencies**: Tailwind CSS 4, Vitest 4, React Testing Library 16, Playwright 1.58
**Storage**: `localStorage` (browser) — no server-side persistence
**Testing**: Vitest + React Testing Library (unit), Playwright (E2E)
**Target Platform**: Vercel (server-side env vars), modern browsers
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Token read/write is synchronous localStorage — sub-millisecond
**Constraints**: Token must never appear in URLs, network logs, or client bundle beyond the input field
**Scale/Scope**: Single home page (`/`), two new files, two modified files

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| III.4 — PAT or OAuth supported | PASS | This feature implements PAT; OAuth is P1-F14 |
| III.5 — Token read from env, never hardcoded | PASS | `process.env.GITHUB_TOKEN` only |
| III.6 — Server token takes precedence | PASS | `hasServerToken` flag gates client token requirement |
| III.7 — Token never in URLs or client bundle | PASS | localStorage only; boolean flag passed to client, not token value |
| III.8 — OAuth secrets as env vars | N/A | OAuth is P1-F14 |
| X.1 — No secrets committed | PASS | `.env.local` in `.gitignore`; `.env.example` has blank placeholder |
| XI — TDD mandatory | PASS | Tests written before implementation |
| XII — Definition of Done | Tracked | Checklist in `checklists/` |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-github-pat-auth/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── token-storage.ts      ← storage interface contract
│   └── component-props.ts    ← component prop contracts
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code

```text
app/
└── page.tsx                         ← MODIFIED: read GITHUB_TOKEN env var server-side,
                                       pass hasServerToken boolean to RepoInputClient

components/
├── repo-input/
│   ├── RepoInputClient.tsx          ← MODIFIED: accept hasServerToken prop,
│   │                                  read/write token via lib/token-storage,
│   │                                  extend onSubmit(repos, token) signature,
│   │                                  gate submission on token presence
│   └── RepoInputForm.tsx            ← UNCHANGED
└── token-input/
    ├── TokenInput.tsx               ← NEW: controlled token field + scope label
    └── TokenInput.test.tsx          ← NEW: unit tests (TDD — written first)

lib/
└── token-storage.ts                 ← NEW: readToken / writeToken / clearToken
                                       defines TOKEN_STORAGE_KEY constant

tests/
└── e2e/
    └── auth.spec.ts                 ← NEW: Playwright E2E tests

.env.example                         ← MODIFIED: add GITHUB_TOKEN= placeholder
```

## Implementation Sequence

### Step 0 — Tests first (TDD)

1. Write `components/token-input/TokenInput.test.tsx` — unit tests for all acceptance scenarios
2. Write `tests/e2e/auth.spec.ts` — E2E scenarios
3. Run tests → confirm red (all fail — nothing implemented yet)

### Step 1 — Token storage utility

4. Implement `lib/token-storage.ts`
   - Export `TOKEN_STORAGE_KEY = 'forkprint_github_token'`
   - `readToken()`: try/catch localStorage.getItem; return null if unavailable
   - `writeToken(value)`: trim; if empty call clearToken(); else localStorage.setItem
   - `clearToken()`: localStorage.removeItem wrapped in try/catch

### Step 2 — TokenInput component

5. Implement `components/token-input/TokenInput.tsx`
   - Controlled `<input type="password">` (masks token by default)
   - Label: "GitHub Personal Access Token"
   - Scope hint: "Required scope: `public_repo` (read-only)" — always visible
   - Props: `initialValue`, `onChange` (see contracts/component-props.ts)
   - No submission logic — display only

### Step 3 — Wire up RepoInputClient

6. Update `components/repo-input/RepoInputClient.tsx`
   - Add `hasServerToken: boolean` prop
   - On mount: call `readToken()` to set initial token state
   - Render `<TokenInput>` only when `!hasServerToken`
   - On submit: call `writeToken(token)`; if `!hasServerToken && !token.trim()` → set error, return
   - Call `onSubmit(repos, hasServerToken ? null : token)`

### Step 4 — Server component wiring

7. Update `app/page.tsx`
   - Read `!!process.env.GITHUB_TOKEN` server-side
   - Pass `hasServerToken` to `<RepoInputClient>`
   - Update `.env.example` to include `GITHUB_TOKEN=`

### Step 5 — Verify

8. Run unit tests → green
9. Run E2E tests → green
10. Manual checklist (see quickstart.md)
11. Run lint → clean

## Complexity Tracking

No constitution violations. No complexity justification required.
