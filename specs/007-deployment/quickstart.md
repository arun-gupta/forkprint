# Quickstart: Deployment

## Goal

Verify that ForkPrint can be prepared for a shared Vercel deployment while preserving the existing local-development and token-handling behavior.

## Scenarios

### 1. Local development without server token

1. Run `npm install`
2. Run `npm run dev` without setting `GITHUB_TOKEN`
3. Confirm:
   - the PAT field is visible
   - missing-token validation still works
   - analysis can run with a valid PAT

### 2. Local development with server token

1. Set `GITHUB_TOKEN` in `.env.local`
2. Run `npm run dev`
3. Confirm:
   - the PAT field is hidden
   - analysis still works through the server-side token path

### 3. Shared deployment setup guidance

1. Review `.env.example` and `README.md`
2. Confirm:
   - local `.env.local` usage is documented separately from Vercel environment variables
   - Vercel shared deployment is described as the Phase 1 target
   - the setup does not require a database or custom auth system
