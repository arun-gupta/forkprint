# RepoPulse — OSS Health Score

RepoPulse measures the health of open source projects with a composite **OSS Health Score** — a single percentile-based score computed from Activity, Responsiveness, and Sustainability, calibrated against 200+ real GitHub repositories.

Analyze any public repo, see exactly where it ranks, and get actionable recommendations for improvement.

Live: [repopulse-arun-gupta.vercel.app](https://repopulse-arun-gupta.vercel.app)

## What it measures

| Dimension | Weight | What it evaluates |
|-----------|--------|-------------------|
| **Activity** | 36% | PR throughput, issue flow, commit cadence, release frequency |
| **Responsiveness** | 36% | Issue/PR response times, resolution speed, backlog health, engagement quality |
| **Sustainability** | 28% | Contributor concentration, repeat/new contributor ratios |

Each dimension is scored as a percentile relative to repos in the same star bracket (Emerging, Growing, Established, Popular). The weighted composite becomes the overall health score.

### Coming soon

| Dimension | What it will evaluate |
|-----------|---------------------|
| **Documentation** | README, CONTRIBUTING, LICENSE, SECURITY, templates |
| **Security** | Dependency updates, branch protection, CI/CD, vulnerability disclosure |
| **Community** | Discussions, issue/PR templates, CODEOWNERS, governance |
| **Release Health** | Frequency, semver compliance, release notes |

## Features

- **OSS Health Score** — composite percentile with actionable recommendations
- **6-dimension scorecard** — Reach, Attention, Engagement, Activity, Responsiveness, Sustainability
- **Percentile-based scoring** — calibrated against 200+ repos across 4 star brackets
- **Individual metric percentiles** — every metric shows where the repo ranks
- **Multi-repo comparison** — side-by-side analysis of up to 4 repos
- **Organization inventory** — browse and analyze repos within a GitHub org
- **Scoring Methodology page** — full transparency into calibration data and thresholds
- **Export** — JSON, Markdown, and shareable URL

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

### Scoring dimensions

| Status | Dimension | Description |
|--------|-----------|-------------|
| ✅ | Activity | PR throughput, issue flow, commit cadence, releases |
| ✅ | Responsiveness | Response times, resolution speed, backlog health |
| ✅ | Sustainability | Contributor concentration, repeat/new ratios |
| Planned | Documentation | README, CONTRIBUTING, LICENSE, SECURITY, templates |
| Planned | Security | Dependency updates, branch protection, CI/CD |
| Planned | Community | Discussions, templates, CODEOWNERS, governance |
| Planned | Release Health | Frequency, semver compliance, release notes |

### Extensibility

| Feature | Description |
|---------|-------------|
| GitHub Action | Scheduled analysis with threshold alerting |
| MCP Server | Expose analysis as a tool for AI assistants (Claude, Cursor) |
| Embeddable badge | Health score badge for repository READMEs |

### Git provider support

| Provider | Status |
|----------|--------|
| GitHub | ✅ Supported |
| GitLab | Planned |
| Bitbucket | Future |
| Gitea | Future |

## Docs

- [`docs/PRODUCT.md`](docs/PRODUCT.md) — Product definition and feature specifications
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — Development workflow, implementation order, verification commands
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Vercel deployment guide
- [`docs/scoring-and-calibration.md`](docs/scoring-and-calibration.md) — Scoring methodology, calibration pipeline, statistical approach
