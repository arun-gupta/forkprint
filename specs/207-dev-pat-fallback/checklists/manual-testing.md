# Manual Testing Checklist: Dev-only server-side PAT fallback

**Issue**: [#207](https://github.com/arun-gupta/repo-pulse/issues/207)
**Feature Branch**: `207-dev-only-server-side-pat-fallback-to-unb`

## Prerequisites

- A GitHub PAT with `public_repo` scope (classic or fine-grained).
- This worktree running on a non-primary port (e.g., 3010).

## Scenarios

### A. Dev mode + PAT — auto sign-in (primary value)

- [ ] Set `DEV_GITHUB_PAT=ghp_...` in `.env.local`
- [ ] Start `next dev -p 3010`
- [ ] Open `http://localhost:3010`
- [ ] The sign-in page does **not** appear; app renders the repo-input screen
- [ ] Submit a repo (e.g., `facebook/react`) and confirm a valid analysis result renders
- [ ] Check server logs — no "Authentication required" errors

### B. Dev mode without PAT — OAuth unchanged

- [ ] Remove/comment `DEV_GITHUB_PAT` in `.env.local`
- [ ] Restart `next dev`
- [ ] Sign-in page appears as before
- [ ] (Skip full OAuth on non-registered ports; this step only verifies the gate still shows)

### C. Production + PAT — loud failure

- [ ] `DEV_GITHUB_PAT=ghp_x NODE_ENV=production npm run start` after a build
- [ ] Server fails to start with an error that names both `DEV_GITHUB_PAT` and `NODE_ENV=production`

### D. Client bundle leak check

- [ ] `npm run build`
- [ ] `grep -r "DEV_GITHUB_PAT" .next/static/` — zero matches
- [ ] `grep -r "ghp_" .next/static/` — zero matches (confirms PAT value never ships to client)

### E. dev-session endpoint

- [ ] With dev fallback active, `curl http://localhost:3010/api/auth/dev-session` returns `{"enabled":true,"username":"dev"}`
- [ ] Response body does not contain the PAT value
- [ ] With PAT unset, the same curl returns `{"enabled":false}`

## Signoff

- [ ] All scenarios pass
- Signed off by: _____________ (GitHub username)
- Date: _____________
