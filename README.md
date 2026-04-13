# RepoPulse — OSS Health Score

RepoPulse measures the health of open source projects with a composite **OSS Health Score** — a single percentile-based score computed from Activity, Responsiveness, Contributors, Security, and Documentation, calibrated against 1600+ real GitHub repositories.

Analyze any public repo, see exactly where it ranks, and get actionable recommendations for improvement.

Live: [repopulse-arun-gupta.vercel.app](https://repopulse-arun-gupta.vercel.app)

## Features

- **OSS Health Score** — composite percentile with actionable recommendations
- **7-dimension scorecard** — Reach, Attention, Engagement, Activity, Responsiveness, Contributors, Documentation
- **Percentile-based scoring** — calibrated against 1600+ repos across 4 star brackets
- **Unified recommendations** — actionable improvement suggestions across all scoring dimensions
- **Individual metric percentiles** — every metric shows where the repo ranks
- **Multi-repo comparison** — side-by-side analysis of up to 4 repos
- **Organization inventory** — browse and analyze repos within a GitHub org
- **Scoring Methodology page** — full transparency into calibration data and thresholds
- **Export** — JSON, Markdown, and shareable URL

## What it measures

| Dimension | Weight | What it evaluates |
|-----------|--------|-------------------|
| **Activity** | 25% | PR throughput, issue flow, commit cadence, release frequency |
| **Responsiveness** | 25% | Issue/PR response times, resolution speed, backlog health, engagement quality |
| **Contributors** | 23% | Contributor concentration, repeat/new contributor ratios |
| **Security** | 15% | OpenSSF Scorecard checks, dependency automation, branch protection, SECURITY.md |
| **Documentation** | 12% | README, CONTRIBUTING, LICENSE, CODE_OF_CONDUCT, CHANGELOG, licensing & compliance, inclusive naming |

Each dimension is scored as a percentile relative to repos in the same star bracket (Emerging, Growing, Established, Popular). The weighted composite becomes the overall health score.

**Coming soon**: Governance & Transparency, Community, Accessibility & Onboarding, Release Health, Development Cadence, Project Maturity, and Ecosystem Reach. See the [Phase 2 roadmap](docs/DEVELOPMENT.md#phase-2-feature-order) for details.

## Getting started

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

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Web app + core scoring (Activity, Responsiveness, Contributors, Documentation) | ✅ Done |
| 2 | Expand scoring dimensions — Security, Licensing & Compliance, Inclusive Naming ✅; Community, Release Health, Governance & Transparency, Accessibility & Onboarding, Ecosystem Reach upcoming | In progress |
| 3 | Integrations (GitHub Action, MCP Server, CLI, PR bot, VS Code, Badge, Webhook) | Planned |
| 4 | Git provider support (GitLab, Bitbucket, Gitea) | Planned |

See [`docs/PRODUCT.md`](docs/PRODUCT.md) for detailed feature specifications per phase.

## Contributing

We welcome contributions! See [`CONTRIBUTING.md`](CONTRIBUTING.md) for setup instructions, development workflow, and how to submit a pull request. Check out issues labeled [`good first issue`](https://github.com/arun-gupta/repo-pulse/labels/good%20first%20issue) to get started.

## Docs

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — Product definition and feature specifications
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — Development workflow, implementation order, verification commands
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Vercel deployment guide
- [`docs/scoring-and-calibration.md`](docs/scoring-and-calibration.md) — Scoring methodology, calibration pipeline, statistical approach
