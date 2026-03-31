# Quickstart: P1-F02 GitHub PAT Authentication

## What's being built

A token input field on the home page that:
- Persists the user's GitHub PAT in `localStorage`
- Pre-populates on return visits
- Blocks form submission if no token is present and no server token is configured
- Hides itself when a server-side `GITHUB_TOKEN` is set

## Files created

| File | Purpose |
|------|---------|
| `lib/token-storage.ts` | `readToken` / `writeToken` / `clearToken` — single source of storage key |
| `components/token-input/TokenInput.tsx` | Controlled token input field with scope label |
| `components/token-input/TokenInput.test.tsx` | Vitest unit tests |

## Files modified

| File | Change |
|------|--------|
| `app/page.tsx` | Read `process.env.GITHUB_TOKEN` server-side; pass `hasServerToken` to `RepoInputClient` |
| `components/repo-input/RepoInputClient.tsx` | Accept `hasServerToken` prop; read/write token via `token-storage`; extend `onSubmit` signature |

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `GITHUB_TOKEN` | `.env.local` (never committed) | Server-side token; hides PAT field when set |

`.env.example` gets a placeholder entry: `GITHUB_TOKEN=` (blank, not a real token).

## Running tests

```bash
npm test                          # unit tests (Vitest)
npm run test:e2e                  # E2E tests (Playwright)
```

## Manual verification

1. Start dev server: `npm run dev`
2. Open `http://localhost:3000`
3. Token field and scope label should be visible
4. Enter a token → submit → reload → field should be pre-populated
5. Clear token → submit → inline error should appear
6. Set `GITHUB_TOKEN=any_value` in `.env.local` → restart → token field should be hidden
