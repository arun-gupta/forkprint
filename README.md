# ForkPrint

ForkPrint is a CHAOSS-aligned GitHub repository health analyzer being built in phases. The long-term goal is to accept one or more `owner/repo` inputs, fetch real public data via the GitHub GraphQL API, and produce an interactive dashboard and raw JSON output.

Production deployment: [forkprint-arun-gupta.vercel.app](https://forkprint-arun-gupta.vercel.app)

## Roadmap

| Phase | Platform | Status |
|-------|----------|--------|
| 1 | Next.js web app (Vercel) | In progress |
| 2 | GitHub Action (scheduled analysis + alerting) | Planned |
| 3 | MCP Server (callable by Claude, Cursor, etc.) | Planned |

## Setup

ForkPrint currently supports a GitHub Personal Access Token with `public_repo` read-only scope. In shared deployments, you can also configure `GITHUB_TOKEN` server-side to hide the PAT field.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Local Development

For local development, you can optionally create `.env.local` with:

```bash
GITHUB_TOKEN=
```

If `GITHUB_TOKEN` is not set locally, the app falls back to the existing PAT flow in the browser.

### Shared Vercel Deployment

Phase 1 deployment targets Vercel with the standard Next.js deployment path.

For a shared deployment:

1. Import the repo into Vercel
2. Add `GITHUB_TOKEN` in the Vercel project's Environment Variables
3. Deploy with the default Next.js build/runtime settings

When `GITHUB_TOKEN` is configured server-side:

- the PAT field is hidden in the UI
- analysis requests use the server-side token path
- the token is not exposed in the browser URL or rendered UI state

Full deployment steps: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Planned Product Capabilities

- Analyze GitHub repos across four CHAOSS categories: **Ecosystem**, **Evolution**, **Sustainability**, and **Responsiveness**
- Visualize repos with an interactive ecosystem view and profile summaries
- Compare multiple repos side by side across all health metrics
- Export results as JSON or Markdown

## Current Status

The repo is currently in early Phase 1 development.

Implemented today:

- Repo input form on `/`
- PAT input with `localStorage` persistence and reload
- PAT-required validation with server-side `GITHUB_TOKEN` fallback
- Client-side repo parsing, validation, and deduplication
- `POST /api/analyze` data-fetching flow backed by the GitHub GraphQL API
- Per-repo result and failure handling with explicit `"unavailable"` placeholders
- Loading and rate-limit visibility on the home page
- Results shell with a full-width header, stable analysis panel, and tabbed result workspace
- Metric-card summaries in the `Overview` tab, including exact repo counters, ecosystem profile summaries, CHAOSS badge slots, and expandable in-place detail
- `Overview`, `Comparison`, and `Metrics` tabs, with placeholder states where later features are still pending
- Ecosystem spectrum guidance folded into the `Overview` experience, including visible stars/forks/watchers and config-driven Reach / Builder Engagement / Attention profiles
- Vercel-ready deployment path with server-side `GITHUB_TOKEN` support for shared deployments
- Automated coverage with Vitest, React Testing Library, and Playwright

Not implemented yet:

- Repo comparison content inside the `Comparison` tab
- Expanded metrics content inside the `Metrics` tab
- JSON/Markdown export
- GitHub OAuth authentication flow

## Testing

```bash
npm test              # unit tests (Vitest + React Testing Library)
npm run test:e2e      # E2E tests (Playwright)
npm run lint          # ESLint
npm run build         # production build check
```

## Development

Built with SpecKit / Specification-Driven Development. See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the feature loop and workflow, [`docs/PRODUCT.md`](docs/PRODUCT.md) for the feature registry, [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the Phase 1 Vercel deployment guide, and [`.specify/memory/constitution.md`](.specify/memory/constitution.md) for project rules.
