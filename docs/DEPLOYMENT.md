# ForkPrint — Deployment

Phase 1 deployment targets **Vercel**.

## Requirements

- Next.js app with default Vercel settings
- Stateless runtime
- `GITHUB_TOKEN` configured server-side for shared deployments

## Local

Use `.env.local` only for local development:

```bash
GITHUB_TOKEN=
```

If `GITHUB_TOKEN` is not set locally, ForkPrint uses the browser PAT flow.

## Vercel

1. Import `arun-gupta/forkprint` into Vercel
2. Keep the default Next.js framework/build settings
3. In the Vercel project, open `Settings -> Environment Variables`
4. Add a variable named `GITHUB_TOKEN`
5. Paste the GitHub token value
6. Save it for the environments you want to support:
   - `Production`
   - optionally `Preview`
   - optionally `Development`
7. Deploy or redeploy the project

## Verify

1. Open the deployed URL
2. Confirm the app loads
3. If `GITHUB_TOKEN` is configured:
   - confirm the PAT field is hidden
   - submit one or more repos
   - confirm analysis succeeds
4. Confirm the token does not appear in the UI or browser URL

## Notes

- Server-side `GITHUB_TOKEN` takes precedence over a client-supplied PAT
- No database or custom auth system is required for Phase 1
- Self-hosted Docker and multi-region deployment are out of scope
