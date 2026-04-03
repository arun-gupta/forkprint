# ForkPrint

ForkPrint is a CHAOSS-aligned GitHub repository health analyzer. The current Phase 1 app accepts one or more `owner/repo` inputs, fetches verified public data from GitHub, and presents summary cards plus dedicated `Overview`, `Contributors`, `Activity`, `Responsiveness`, and `Health Ratios` views in a web dashboard. `Activity` and `Responsiveness` both support local recent-window switching, while broader comparison workflows and export remain on the roadmap.

Live in action: [forkprint-arun-gupta.vercel.app](https://forkprint-arun-gupta.vercel.app)

## Roadmap

- Phase 1: Next.js web app on Vercel for interactive repository analysis
- Phase 2: GitHub Action for scheduled analysis and alerting
- Phase 3: MCP server callable by tools such as Claude and Cursor

## Getting Started

ForkPrint supports a server-side `GITHUB_TOKEN` or the browser PAT flow. For local development, you can optionally set `GITHUB_TOKEN` in `.env.local`.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Optional local env:

```bash
GITHUB_TOKEN=
```

For recommended token type and permissions, use the `GITHUB_TOKEN` setup guidance in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md#local).

## Product

The complete product feature set is defined in [`docs/PRODUCT.md`](docs/PRODUCT.md).

The current implementation order is tracked in [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md#phase-1-feature-order).

## Docs

- Use [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the feature workflow, implementation order, current completion status, and verification commands.
- Use [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) when running or updating the Phase 1 Vercel deployment.
- Use [`docs/PRODUCT.md`](docs/PRODUCT.md) for the complete product feature set and feature definitions.
- Use [`.specify/memory/constitution.md`](.specify/memory/constitution.md) for project rules and Definition of Done requirements.
