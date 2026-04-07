# Quickstart: Export (P1-F13)

## Prerequisites

- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env.local`
- `npm run dev` running on `http://localhost:3000`
- Sign in with GitHub and run at least one analysis

## Verify JSON Export

1. Complete an analysis (one or more repos)
2. Locate "Download JSON" button in the export toolbar (above the result tabs)
3. Click — a file named `repopulse-YYYY-MM-DD-HHmmss.json` should download
4. Open the file and confirm it contains `results`, `failures`, and `rateLimit` keys

## Verify Markdown Export

1. Complete an analysis
2. Click "Download Markdown"
3. A file named `repopulse-YYYY-MM-DD-HHmmss.md` should download
4. Open the file and confirm it has one `##` section per repo with CHAOSS scores

## Verify Shareable URL

1. Enter one or more repos in the input
2. Click "Copy link"
3. Paste the URL in a new tab — confirm the repo list is pre-populated
4. Confirm the URL contains `?repos=...` and no token

## Run Tests

```bash
# Unit tests
npm test -- lib/export

# E2E tests
npx playwright test e2e/export.spec.ts
```
