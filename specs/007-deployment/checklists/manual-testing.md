# Manual Testing Checklist: Deployment (P1-F03)

**Purpose**: Verify deployment behavior manually before PR submission  
**Feature**: [spec.md](../spec.md)

## Setup

- [x] Confirm the app runs locally with `npm run dev`
- [x] Confirm whether `.env.local` contains `GITHUB_TOKEN` before each scenario
- [x] If a real Vercel deployment is available, confirm the project has the expected `GITHUB_TOKEN` environment variable configured

## US1 — Zero-config Vercel path

- [x] Confirm the current app structure remains compatible with standard Next.js / Vercel deployment expectations
- [x] Confirm no custom server, database, or deployment-only runtime service is required
- [x] Confirm the deployed or deployment-ready app still serves the current Phase 1 UI flow

## US2 — Shared deployment token path

- [x] Confirm that when server-side `GITHUB_TOKEN` is available, the PAT field is hidden
- [x] Confirm that when server-side `GITHUB_TOKEN` is available, repo analysis still succeeds without entering a PAT in the browser
- [x] Confirm the token is not exposed in the rendered UI, browser-visible URL, or other client-visible state
- [x] If testing on Vercel, confirm `GITHUB_TOKEN` is configured in Project Settings -> Environment Variables rather than in client-visible app state

## US3 — Stateless and safe deployment

- [x] Confirm local `.env.local` setup and shared Vercel environment-variable setup are documented distinctly
- [x] Confirm the deployment setup does not introduce a database or custom auth system
- [x] Confirm `.env.example` and README provide enough guidance to configure deployment without guessing where the token belongs
- [x] Note whether production build verification is blocked by the existing Google Fonts network-fetch limitation in the current environment

## Notes

_Sign off below when all items are verified:_

**Tested by**: Arun Gupta  
**Date**: 2026-04-01
