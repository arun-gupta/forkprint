# RepoPulse — Deployment

Phase 1 deployment targets **Vercel**.

## Requirements

- Next.js app with default Vercel settings
- Stateless runtime
- A registered GitHub OAuth App with `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` configured

## Local

Register a GitHub OAuth App at https://github.com/settings/developers:

- Application name: RepoPulse (local)
- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/callback`

Then set the credentials in `.env.local`:

```bash
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
```

## Vercel

1. Register a GitHub OAuth App (separate from local) with:
   - Homepage URL: your Vercel deployment URL
   - Authorization callback URL: `https://your-app.vercel.app/api/auth/callback`
2. Import `arun-gupta/repo-pulse` into Vercel
3. Keep the default Next.js framework/build settings
4. In the Vercel project, open `Settings -> Environment Variables`
5. Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` from your OAuth App
6. Save for `Production` (and optionally `Preview`)
7. Deploy or redeploy the project

## Verify

1. Open the deployed URL
2. Confirm a "Sign in with GitHub" button appears
3. Click it and complete the GitHub OAuth authorization
4. Confirm your GitHub username is shown after sign-in
5. Submit one or more repos and confirm analysis succeeds
6. Confirm the token does not appear in the UI or browser URL

## Notes

- No `GITHUB_TOKEN` server-side environment variable is used — each user authenticates via their own GitHub OAuth session
- No database or custom auth system is required for Phase 1
- Self-hosted Docker and multi-region deployment are out of scope
