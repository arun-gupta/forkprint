# ForkPrint

ForkPrint is a CHAOSS-aligned GitHub repository health analyzer being built in phases. The long-term goal is to accept one or more `owner/repo` inputs, fetch real public data via the GitHub GraphQL API, and produce an interactive dashboard and raw JSON output.

## Current Status

The repo is currently in early Phase 1 development.

Implemented today:

- Repo input form on `/`
- Client-side parsing of `owner/repo` slugs
- Support for newline-separated input, comma-separated input, and full GitHub repo URLs
- Inline validation for malformed or empty input
- Deduplication of duplicate repo entries before submission
- Unit/component tests with Vitest and React Testing Library
- End-to-end coverage for the repo input flow with Playwright

Not implemented yet:

- GitHub data fetching
- Dashboard and ecosystem map
- Repo comparison view
- JSON/Markdown export
- GitHub PAT and OAuth authentication flows

## Roadmap

| Phase | Platform | Status |
|-------|----------|--------|
| 1 | Next.js web app (Vercel) | In progress |
| 2 | GitHub Action (scheduled analysis + alerting) | Planned |
| 3 | MCP Server (callable by Claude, Cursor, etc.) | Planned |

## Setup

Requires a GitHub Personal Access Token with `public_repo` read-only scope.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Planned Product Capabilities

- Analyze GitHub repos across four CHAOSS categories: **Ecosystem**, **Evolution**, **Sustainability**, and **Responsiveness**
- Visualize repos on an interactive 2×2 ecosystem map (stars × forks)
- Compare multiple repos side by side across all health metrics
- Export results as JSON or Markdown

## Testing

```bash
npm test              # unit tests (Vitest + React Testing Library)
npm run test:e2e      # E2E tests (Playwright)
npm run lint          # ESLint
npm run build         # production build check
```

## Development

Built with SpecKit / Specification-Driven Development. See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for the feature loop and workflow, [`docs/PRODUCT.md`](docs/PRODUCT.md) for the feature registry, and [`.specify/memory/constitution.md`](.specify/memory/constitution.md) for project rules.
