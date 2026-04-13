<p align="center">
  <img src="public/repo-pulse-banner.png" alt="RepoPulse — Measure the health of your open source projects" width="350" />
</p>

<p align="center">
  <strong>A single score that tells you how healthy your open source project really is.</strong><br/>
  Calibrated against 1,600+ real GitHub repositories.
</p>

<p align="center">
  <a href="https://repopulse-arun-gupta.vercel.app"><img src="https://img.shields.io/badge/Try%20it%20live-repopulse-blue?style=for-the-badge" alt="Live App" /></a>&nbsp;
  <a href="https://github.com/arun-gupta/repo-pulse/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-green?style=for-the-badge" alt="License" /></a>&nbsp;
  <a href="https://github.com/arun-gupta/repo-pulse/issues"><img src="https://img.shields.io/github/issues/arun-gupta/repo-pulse?style=for-the-badge" alt="Open Issues" /></a>
</p>

---

## What is RepoPulse?

RepoPulse analyzes any public GitHub repository and produces a composite **OSS Health Score** — a percentile-based rating computed from five dimensions, each weighted by importance. You get a clear picture of where a project stands and **actionable recommendations** to improve it.

> **Try it now** — paste any GitHub repo URL into [repopulse-arun-gupta.vercel.app](https://repopulse-arun-gupta.vercel.app) and get a health report in seconds.

## Key Features

| | Feature | Description |
|---|---------|-------------|
| :bar_chart: | **OSS Health Score** | Composite percentile with actionable recommendations |
| :card_index_dividers: | **8-Dimension Scorecard** | Quick signals (Reach, Attention, Engagement) plus deep-dive dimensions |
| :chart_with_upwards_trend: | **Percentile Scoring** | Every metric shows where the repo ranks vs. 1,600+ calibrated repos |
| :busts_in_silhouette: | **Multi-Repo Comparison** | Side-by-side analysis of up to 4 repositories |
| :office: | **Org Inventory** | Browse and analyze all repos within a GitHub organization |
| :bulb: | **Unified Recommendations** | Actionable improvement suggestions across all scoring dimensions |
| :book: | **Scoring Methodology** | Full transparency into calibration data and thresholds |
| :outbox_tray: | **Export** | JSON, Markdown, and shareable URL |

## How Scoring Works

| Dimension | Weight | What it evaluates |
|-----------|--------|-------------------|
| **Activity** | 25% | PR throughput, issue flow, commit cadence, release frequency |
| **Responsiveness** | 25% | Issue/PR response times, resolution speed, backlog health |
| **Contributors** | 23% | Contributor concentration, repeat/new contributor ratios |
| **Security** | 15% | OpenSSF Scorecard, dependency automation, branch protection |
| **Documentation** | 12% | README, CONTRIBUTING, LICENSE, CODE_OF_CONDUCT, licensing & compliance |

Each dimension is scored as a percentile relative to repos in the same **star bracket** (Emerging, Growing, Established, Popular). The weighted composite becomes the overall health score.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/arun-gupta/repo-pulse.git
cd repo-pulse
npm install

# 2. Set up environment (create a GitHub OAuth App first)
#    Callback URL: http://localhost:3000/api/auth/callback
echo "GITHUB_CLIENT_ID=your_id" >> .env.local
echo "GITHUB_CLIENT_SECRET=your_secret" >> .env.local

# 3. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and analyze your first repo.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for Vercel deployment instructions.

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Web app + core scoring (Activity, Responsiveness, Contributors, Documentation) | :white_check_mark: Done |
| 2 | Expand scoring — Security, Licensing & Compliance, Inclusive Naming :white_check_mark:; Community, Release Health, Governance & more upcoming | In progress |
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

---

<p align="center">
  <a href="https://repopulse-arun-gupta.vercel.app"><strong>Try RepoPulse now →</strong></a>
</p>
