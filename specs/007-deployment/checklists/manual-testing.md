# Manual Testing Checklist: Deployment (P1-F03)

**Purpose**: Verify deployment behavior manually before PR submission  
**Feature**: [spec.md](../spec.md)

## Setup

- [ ] Confirm the app runs locally with `npm run dev`
- [ ] Confirm whether `.env.local` contains `GITHUB_TOKEN` before each scenario
- [ ] If a real Vercel deployment is available, confirm the project has the expected `GITHUB_TOKEN` environment variable configured

## US1 — Zero-config Vercel path

- [ ] Confirm the current app structure remains compatible with standard Next.js / Vercel deployment expectations
- [ ] Confirm no custom server, database, or deployment-only runtime service is required
- [ ] Confirm the deployed or deployment-ready app still serves the current Phase 1 UI flow

## US2 — Shared deployment token path

- [ ] Confirm that when server-side `GITHUB_TOKEN` is available, the PAT field is hidden
- [ ] Confirm that when server-side `GITHUB_TOKEN` is available, repo analysis still succeeds without entering a PAT in the browser
- [ ] Confirm the token is not exposed in the rendered UI, browser-visible URL, or other client-visible state

## US3 — Stateless and safe deployment

- [ ] Confirm local `.env.local` setup and shared Vercel environment-variable setup are documented distinctly
- [ ] Confirm the deployment setup does not introduce a database or custom auth system
- [ ] Confirm `.env.example` and README provide enough guidance to configure deployment without guessing where the token belongs

## Notes

_Sign off below when all items are verified:_

**Tested by**:  
**Date**:
