# RepoPulse

RepoPulse is a CHAOSS-aligned GitHub repository health analyzer. The Phase 1 app lets you analyze one or more public repositories, explore an organization’s public repo inventory, and compare repositories side by side in a web dashboard. Results can be exported as JSON or Markdown, or shared via a shareable URL.

Live in action: [repopulse-arun-gupta.vercel.app](https://repopulse-arun-gupta.vercel.app)

## Roadmap

- Phase 1: Next.js web app on Vercel for interactive repository analysis
- Phase 2: GitHub Action for scheduled analysis and alerting
- Phase 3: MCP server callable by tools such as Claude and Cursor
- Phase 4: GitLab support — port the analyzer and data layer to work with GitLab in addition to GitHub

## Getting Started

RepoPulse uses GitHub OAuth for authentication. Sign in with your GitHub account to analyze repositories — no personal access token needed.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Required env vars (create a [GitHub OAuth App](https://github.com/settings/developers) with callback URL `http://localhost:3000/api/auth/callback`):

```bash
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for full setup and Vercel deployment instructions.

## Product

The complete product feature set is defined in [`docs/PRODUCT.md`](docs/PRODUCT.md).

The current implementation order is tracked in [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md#phase-1-feature-order).

## Docs

- Use [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the feature workflow, implementation order, current completion status, and verification commands.
- Use [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) when running or updating the Phase 1 Vercel deployment.
- Use [`docs/PRODUCT.md`](docs/PRODUCT.md) for the complete product feature set and feature definitions.
- Use [`.specify/memory/constitution.md`](.specify/memory/constitution.md) for project rules and Definition of Done requirements.
