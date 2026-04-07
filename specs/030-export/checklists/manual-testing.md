# Manual Testing Checklist: Export (P1-F13)

## Setup

- [x] Dev server running (`npm run dev`)
- [x] Signed in with GitHub OAuth
- [x] At least one analysis completed

---

## JSON Export

- [x] "Download JSON" button appears above the result tabs after analysis
- [x] "Download JSON" button is disabled (or absent) before analysis
- [x] Clicking "Download JSON" downloads a file named `repopulse-YYYY-MM-DD-HHmmss.json`
- [x] Downloaded JSON contains `results`, `failures`, and `rateLimit` keys
- [x] All analyzed repos appear in the `results` array
- [x] `"unavailable"` fields are preserved as the string `"unavailable"` (not null or 0)
- [x] Downloading multiple times produces files with different timestamps

---

## Markdown Export

- [x] "Download Markdown" button appears above the result tabs after analysis
- [x] Clicking "Download Markdown" downloads a file named `repopulse-YYYY-MM-DD-HHmmss.md`
- [x] Report has a top-level heading and generated timestamp
- [x] One `##` section per analyzed repo
- [x] Each section includes Activity, Sustainability, and Responsiveness scores
- [x] `"unavailable"` fields appear as `N/A` in the report
- [x] Multiple repos each have their own section in the same file

---

## Shareable URL

- [x] "Copy link" button appears above the result tabs
- [x] Clicking "Copy link" copies the URL to the clipboard
- [x] Copied URL contains `?repos=owner/repo1,owner/repo2` (comma-separated)
- [x] Copied URL does NOT contain the OAuth token
- [x] Pasting the URL in a new tab pre-populates the repo input textarea
- [x] After pre-population, the user can sign in and run analysis independently
- [ ] When clipboard API is unavailable, a fallback text field appears with the URL — NOT TESTED (requires clipboard API to be blocked)

---

## Signoff

| Item | Status | Notes |
|------|--------|-------|
| All automated tests pass (`npm test`) | ✅ 227 passed (47 files) | |
| All E2E tests pass (`npx playwright test e2e/export.spec.ts`) | ✅ 4 passed | |
| Manual checklist reviewed | ✅ | |
| Reviewed by | arun-gupta | 2026-04-07 |
