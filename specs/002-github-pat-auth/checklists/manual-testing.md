# Manual Testing Checklist: GitHub PAT Authentication (P1-F02)

**Purpose**: Verify feature behaviour manually before PR submission
**Feature**: [spec.md](../spec.md)

## Setup

- [x] Confirm `.env.local` is absent or `GITHUB_TOKEN` is unset before testing the client-side PAT flow
- [x] Run `npm run dev` and confirm the app starts
- [x] Open `http://localhost:3000` in a browser

## US1 — Token entry and persistence

- [x] Confirm the PAT field is visible when no server-side `GITHUB_TOKEN` is configured
- [x] Confirm the scope hint shows `public_repo` read-only guidance
- [x] Enter a PAT and a valid repo slug, click Analyze, reload, and confirm the token is pre-populated

## US2 — Missing token is blocked

- [x] Clear the PAT field, enter a valid repo slug, click Analyze, and confirm an inline token-required error appears
- [x] Enter only whitespace in the PAT field, click Analyze, and confirm submission is blocked
- [x] Correct the PAT field after an error and confirm the inline token error clears

## US3 — Server token deployments

- [x] Copy `.env.example` to `.env.local`, set `GITHUB_TOKEN`, restart the app, and confirm the PAT field is hidden
- [x] Restart `npm run dev` after setting `GITHUB_TOKEN` so the server-rendered `hasServerToken` state is refreshed
- [x] With `GITHUB_TOKEN` configured, submit a valid repo slug and confirm token validation does not block submission

## Notes

_Sign off below when all items are verified:_

**Tested by**: arun-gupta  **Date**: 2026-03-31
