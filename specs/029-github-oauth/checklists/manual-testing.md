# Manual Testing Checklist: GitHub OAuth Authentication (P1-F14)

## Setup

- [x] Start the dev server (`npm run dev`)
- [x] Register a GitHub OAuth App at https://github.com/settings/developers with callback URL `http://localhost:3000/api/auth/callback`
- [x] Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env.local`

---

## Default State (Unauthenticated)

- [x] Opening the app shows a "Sign in with GitHub" button
- [x] No PAT input field is visible
- [x] Submitting analysis without signing in is not possible

---

## Sign In Flow

- [x] Clicking "Sign in with GitHub" redirects to GitHub's authorization page
- [x] After authorizing, the app redirects back and shows the signed-in GitHub username
- [x] The "Sign in with GitHub" button is replaced by the username indicator and sign-out option
- [x] Analysis requests succeed using the OAuth token (no server token needed)
- [x] Refreshing the page returns to the unauthenticated state (in-memory only)

---

## Sign Out Flow

- [x] Clicking "Sign out" clears the session
- [x] The "Sign in with GitHub" button reappears
- [x] Analysis requests are no longer possible without signing in again

---

## OAuth Error Handling

- [x] Denying authorization on GitHub redirects back to the app with an error message
- [x] The "Sign in with GitHub" button is still available after an error
- [x] No partial token is stored after an error

---

## Rate Limit Display

- [x] After analysis, the rate limit shown reflects the authenticated user's own GitHub quota

---

## Signoff

| Item | Status | Notes |
|------|--------|-------|
| All automated tests pass (`npm test`) | ✅ 187 passed (43 files) | |
| All E2E tests pass (`npx playwright test e2e/auth.spec.ts`) | ✅ 5 passed | |
| Manual checklist reviewed | ✅ | |
| Reviewed by | arun-gupta | 2026-04-06 |
