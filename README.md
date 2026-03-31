# ForkPrint

CHAOSS-aligned GitHub repository health analyzer. Accepts one or more `owner/repo` inputs, fetches real public data via the GitHub GraphQL API, and produces an interactive dashboard and raw JSON output.

## What it does

- Analyzes GitHub repos across four CHAOSS categories: **Ecosystem**, **Evolution**, **Sustainability**, and **Responsiveness**
- Visualizes repos on an interactive 2×2 ecosystem map (stars × forks)
- Compares multiple repos side by side across all health metrics
- Exports results as JSON or Markdown

## Roadmap

| Phase | Platform | Status |
|-------|----------|--------|
| 1 | Next.js web app (Vercel) | In progress |
| 2 | GitHub Action (scheduled analysis + alerting) | Planned |
| 3 | MCP Server (callable by Claude, Cursor, etc.) | Planned |

## Setup

Requires a GitHub Personal Access Token with `public_repo` read-only scope.

```bash
cp .env.example .env.local
# add your GITHUB_TOKEN to .env.local
npm install
npm run dev
```

## Development

Built with SpecKit / Specification-Driven Development. See `docs/PRODUCT.md` for the full feature registry and `.specify/memory/constitution.md` for project rules.
