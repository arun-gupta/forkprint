# ForkPrint

ForkPrint is a CHAOSS-aligned GitHub repository health analyzer being built in phases. The long-term goal is to accept one or more `owner/repo` inputs, fetch real public data via the GitHub GraphQL API, and produce an interactive dashboard and raw JSON output.

Production: [forkprint-arun-gupta.vercel.app](https://forkprint-arun-gupta.vercel.app)

## Roadmap

| Phase | Platform | Status |
|-------|----------|--------|
| 1 | Next.js web app (Vercel) | In progress |
| 2 | GitHub Action (scheduled analysis + alerting) | Planned |
| 3 | MCP Server (callable by Claude, Cursor, etc.) | Planned |

## Setup

ForkPrint currently supports a GitHub Personal Access Token with `public_repo` read-only scope. For local development, you can optionally set `GITHUB_TOKEN` in `.env.local`.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Optional local env:

```bash
GITHUB_TOKEN=
```

## Planned Product Capabilities

- Analyze GitHub repos across four CHAOSS categories: **Ecosystem**, **Evolution**, **Sustainability**, and **Responsiveness**
- Visualize repos with an interactive ecosystem view and profile summaries
- Compare multiple repos side by side across all health metrics
- Export results as JSON or Markdown

## Docs

- Develop: [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)
- Deploy: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- Product: [`docs/PRODUCT.md`](docs/PRODUCT.md)
- Rules: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)
