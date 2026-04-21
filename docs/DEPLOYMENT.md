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

## `/demo` route — data refresh pipeline

The `/demo` route ships pre-analyzed data so visitors can explore the app without authenticating. It is powered by JSON fixtures under `fixtures/demo/**` and refreshed weekly by a GitHub Action.

**Roster** (hard-coded in `scripts/generate-demo-fixtures.ts`):

- 6 repos: `simonw/llm-echo`, `333fred/compiler-developer-sdk`, `ossf/security-insights-spec`, `fluxcd/helm-controller`, `projectcalico/calico`, `prometheus/prometheus`
- 1 org: `ossf`

To change the roster, edit `DEMO_REPOS` / `DEMO_ORG` in that script and merge. The next run regenerates fixtures with the new set.

**Pipeline** — `.github/workflows/refresh-demo-fixtures.yml`:

1. Runs weekly (Mondays 09:00 UTC) or on manual `workflow_dispatch`.
2. Checks out `main` and runs `npm run demo:fixtures`, which invokes the **latest analyzer code** against the roster.
3. Opens a PR (`chore/demo-fixture-refresh`) with only the updated JSON under `fixtures/demo/**`.
4. On merge, Vercel's Git integration auto-redeploys `main`, which bundles:
   - Latest frontend (whatever merged during the week)
   - Latest analyzer code
   - Freshly-regenerated fixtures from the merged PR

The workflow only refreshes **data**. Frontend and analyzer changes deploy continuously via Vercel as their PRs merge — the weekly action does not ship code.

**Required repo setting** — Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests" must be enabled, otherwise the PR-open step fails with `GitHub Actions is not permitted to create or approve pull requests`.

**Operational tip** — merge the refresh PR promptly. If it sits open while frontend/analyzer PRs continue to land, the deployed `/demo` data can drift out of sync with the deployed UI/logic.

## Notes

- No `GITHUB_TOKEN` server-side environment variable is used — each user authenticates via their own GitHub OAuth session
- No database or custom auth system is required for Phase 1
- Self-hosted Docker and multi-region deployment are out of scope
