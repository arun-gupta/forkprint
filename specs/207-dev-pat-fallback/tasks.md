# Tasks: Dev-only server-side PAT fallback

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Issue**: #207

Tasks are ordered; each has a verifiable outcome. TDD order: tests precede implementation.

## T001 — Add `lib/auth/dev-pat.ts` unit tests (RED)
Write failing tests in `lib/auth/dev-pat.test.ts` covering:
- `isDevPatActive()`: true only when NODE_ENV=development AND DEV_GITHUB_PAT is a non-empty string
- `resolveServerToken(body.token)`: returns PAT in dev+active, returns client token otherwise, null when neither
- `assertDevPatNotInProduction()`: throws when NODE_ENV=production AND DEV_GITHUB_PAT set; no-op otherwise

## T002 — Implement `lib/auth/dev-pat.ts` (GREEN)
Implement the three functions exactly as specified in plan §Phase 1. Tests pass.

## T003 — Update `/api/analyze` route + tests
- Update `app/api/analyze/route.ts` to use `resolveServerToken(body.token)`
- Extend `app/api/analyze/route.test.ts` with: (a) dev+PAT → PAT used; (b) prod+PAT → still requires client token (asserts no PAT leak into analyze call); (c) dev without PAT → OAuth behaviour unchanged

## T004 — Update `/api/analyze-org` route + tests
Mirror T003 for `app/api/analyze-org/route.ts`.

## T005 — Create `/api/auth/dev-session` route + tests
- `app/api/auth/dev-session/route.ts` exporting `GET` that returns `{ enabled, username? }`
- `app/api/auth/dev-session/route.test.ts`: (a) dev+PAT → `{ enabled: true, username: 'dev' }`; (b) prod → `{ enabled: false }`; (c) response body never contains the PAT value

## T006 — Wire startup assertion
- Add `assertDevPatNotInProduction()` invocation to `instrumentation.ts`
- Unit test: set NODE_ENV=production + DEV_GITHUB_PAT, dynamic-import the assertion module, assert throws

## T007 — Update `AuthGate`
- In `components/auth/AuthGate.tsx`, fetch `/api/auth/dev-session` on mount; when enabled, auto-`signIn({ token: 'dev-pat', username })` before the existing OAuth hash check
- Update `components/auth/AuthGate.test.tsx` to assert dev-session path and that existing OAuth path still works when dev-session returns `{ enabled: false }`

## T008 — Docs and env
- Add `DEV_GITHUB_PAT` entry to `.env.example` with the dev-only warning block
- Add a **"Multi-worktree local development"** section to `docs/DEVELOPMENT.md` with: port conflict explanation, how to set `DEV_GITHUB_PAT`, security boundary reminders
- Add short note to `README.md` under setup pointing at the new DEVELOPMENT.md section (only if setup section already references OAuth)

## T009 — Manual testing checklist
Create `specs/207-dev-pat-fallback/checklists/manual-testing.md` covering:
- [ ] Worktree on port 3010 with PAT set signs in automatically
- [ ] Repo analyze succeeds using the PAT
- [ ] Worktree on port 3010 without PAT still shows sign-in button (OAuth path unchanged)
- [ ] `NODE_ENV=production npm run start` with `DEV_GITHUB_PAT` set → server fails to start with descriptive error
- [ ] `next build` output searched: no `DEV_GITHUB_PAT` string in client bundle

## T010 — Run full CI locally
`npm test && npm run lint && npm run build`. All green.

## T011 — Manual testing signoff
Run through checklist in a second worktree (port 3010). Check off items; add signoff line with verified GitHub username.

## T012 — PR
Push branch, open PR referencing #207 with the full test plan. Do not merge.
