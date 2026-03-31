# ForkPrint — Product Definition

**Repo**: `arun-gupta/forkprint`  
**Description**: CHAOSS-aligned GitHub repository health analyzer. Accepts one or more `owner/repo` inputs, fetches real public data via the GitHub GraphQL API, and produces an interactive dashboard and raw JSON output.  
**Phase 1 Platform**: Next.js deployed on Vercel  
**Phase 1 Data Layer**: Next.js API Routes  
**Development Methodology**: SpecKit / Specification-Driven Development (SDD)

This document is the canonical product definition for ForkPrint. It is the source of truth for all features across all phases. `constitution.md` references this document. SpecKit specs are traceable to feature IDs defined here.

---

## Roadmap

ForkPrint is built in three phases. Phase 1 architectural decisions must not block Phases 2 or 3.

- **Phase 1** — Web app (Next.js / Vercel): interactive dashboard for on-demand repo analysis
- **Phase 2** — GitHub Action: scheduled or triggered analysis with artifact output and threshold alerting
- **Phase 3** — MCP Server: exposes analysis as a tool callable by AI assistants (Claude, Cursor, etc.)

The core analysis logic is shared across all three phases via a framework-agnostic analyzer module. No phase duplicates it.

---

## Data Source

**GitHub GraphQL API** (`https://api.github.com/graphql`) is the primary data source.

- Fetches all required metrics in 1–3 requests per repo vs. 10–15 REST calls
- Precise field selection — no over-fetching
- Single auth mechanism: Personal Access Token (classic), minimum `public_repo` read-only scope
- REST API may supplement only where GraphQL cannot reach a specific metric
- `GITHUB_TOKEN` is always read from environment — never hardcoded

---

## CHAOSS Alignment

All analysis is structured around four CHAOSS categories. Each maps to exactly one feature and one derived score.

| CHAOSS Category | Feature | Derived Score |
|---|---|---|
| Ecosystem | Ecosystem Map (P1-F05) | Quadrant: Leaders / Buzz / Builders / Early |
| Evolution | Evolution (P1-F08) | Evolution score: High / Medium / Low |
| Sustainability | Contribution Dynamics (P1-F09) | Resilience score: High / Medium / Low |
| Responsiveness | Responsiveness (P1-F10) | Responsiveness score: High / Medium / Low |

Scores are assigned only when sufficient verified data exists. Otherwise: `"Insufficient verified public data"`.

---

## Accuracy Policy

- Every metric must come from a verified public GitHub GraphQL API response
- No estimation, interpolation, inference, or fabrication — ever
- Missing data is acceptable and marked `"unavailable"` — invented precision is not
- Never substitute one metric for another
- Organizational diversity is surfaced as `"Could not verify contributor organization publicly"` when not inferable — never approximated

---

## Phase 1 — Web App (Next.js / Vercel)

### Stack

- **Framework**: Next.js 14+ (App Router)
- **Deployment**: Vercel — zero-config
- **Styling**: Tailwind CSS
- **Charts**: Chart.js via npm
- **Stateless** — no database, no auth system, all analysis is on-demand

### API Contract

```
POST /api/analyze
Body:     { "repos": ["owner/repo", ...], "token"?: "ghp_..." }
Response: { "results": AnalysisResult[] }
```

Server-side token (`GITHUB_TOKEN` env var) takes precedence. If absent, token is supplied client-side from `localStorage`. Token is never included in URLs or exposed to the client bundle.

### Pages

- `/` — repo input form and token entry
- `/dashboard` — ecosystem map, metric cards, analysis results, export controls

---

## Planned Features

Each feature is the unit of a SpecKit spec — one feature maps to one spec file. Acceptance criteria define the testable surface. Features are behavioral contracts, not implementation tasks.

---

### Phase 1 — Web App

---

#### `[P1-F01]` Repo Input

User can provide one or more GitHub repositories for analysis.

**Acceptance criteria**
- Textarea accepts one `owner/repo` slug per line
- Client-side validation rejects malformed slugs before submission (`owner/repo` pattern, trims whitespace)
- Empty submission is blocked with an inline error
- Valid input is passed to the data fetching layer unchanged

**Out of scope**
- Saving or persisting repo lists across sessions
- Browsing or searching GitHub repos from within the UI

---

#### `[P1-F02]` Deployment

ForkPrint deploys to Vercel with minimal configuration.

**Acceptance criteria**
- Deployable to Vercel with zero config
- `GITHUB_TOKEN` configurable as a Vercel environment variable for shared/team deployments
- No database, no auth system — stateless by default
- `GITHUB_TOKEN` never exposed to the client bundle

**Out of scope**
- Self-hosted Docker deployment (not blocked, just not documented in Phase 1)
- Multi-region or edge deployment configuration

---

#### `[P1-F03]` Authentication

User can authenticate with GitHub to enable data fetching.

**Acceptance criteria**
- Token input field accepts a GitHub Personal Access Token
- Token is stored in `localStorage` — never transmitted anywhere except the GitHub GraphQL API
- UI displays the minimum required scope: `public_repo` read-only
- If `GITHUB_TOKEN` is set as a Vercel environment variable, it is used server-side and the token field is hidden
- Missing token with no server-side fallback blocks submission with a clear error

**Out of scope**
- OAuth flow — PAT only for Phase 1
- Multi-account or org-level token management

---

#### `[P1-F04]` Data Fetching

The analyzer fetches exact, verified metric data from GitHub for each repo.

**Acceptance criteria**
- All data fetched via GitHub GraphQL API in 1–3 requests per repo
- Next.js API Route (`/api/analyze`) proxies GraphQL requests server-side
- Per-repo error isolation: one failed repo does not block results for others
- Rate limit state is surfaced to the user (remaining calls, `Retry-After` when exhausted)
- Loading state shown per repo during fetch
- No metric is estimated, inferred, or fabricated — missing fields are marked `"unavailable"`

**Out of scope**
- Caching or persisting fetched data
- Webhook-triggered or scheduled fetching (Phase 2)

---

#### `[P1-F05]` Ecosystem Map

Repos are visualized on an interactive 2×2 bubble chart to reveal their ecosystem position.

**Acceptance criteria**
- Bubble chart: X axis = stars (awareness), Y axis = forks (action), bubble size = watchers (sustained interest)
- Quadrant classification uses median split across the input set: Leaders / Buzz / Builders / Early
- Hover tooltip shows: repo name, exact stars / forks / watches, assigned quadrant
- Single-repo input: quadrant classification is skipped; a note explains why
- Quadrant boundaries are computed from the input set, never hardcoded

**Out of scope**
- Saving or sharing the chart image directly
- Animating transitions between analyses

---

#### `[P1-F06]` Repo Comparison

Users can compare two or more repos side by side across all health metrics.

**Acceptance criteria**
- Any analysis of 2+ repos surfaces a comparison view alongside the individual repo cards
- Comparison table shows all metrics in rows, repos in columns — delta values highlighted where meaningful
- Metrics unavailable for one repo are shown as `—` in that column, never omitted from the row
- Comparison is driven entirely from the already-fetched `AnalysisResult[]` — no additional API calls
- All metric categories represented: ecosystem signals, evolution, contribution dynamics, responsiveness, health ratios
- Comparison view is exportable as JSON and Markdown alongside individual repo exports

**Design constraints** *(inform all upstream features)*
- `AnalysisResult` schema must be flat and consistent enough to diff across repos without transformation — design this from the start
- Ecosystem Map bubble chart is the visual entry point into comparison; the comparison table is the detail layer
- UI layout must accommodate 2–6 repos in comparison without horizontal scroll on desktop viewports

**Out of scope**
- Saving or naming a comparison set
- Diffing snapshots across time (Future — `FUT-F01`)
- More than 6 repos in a single comparison

---

#### `[P1-F07]` Metric Cards

Each repo is summarized in a scannable card showing key health signals.

**Acceptance criteria**
- One card per repo displaying: stars, forks, watches, created date, quadrant badge, and one score badge per CHAOSS category (Evolution, Contribution Dynamics, Responsiveness)
- Quadrant badge colors: Leaders = green, Buzz = amber, Builders = blue, Early = gray
- Score badge colors: High = green, Medium = amber, Low = red, Insufficient = gray — consistent across all three CHAOSS score badges
- CHAOSS category label shown beneath each score badge so the framing is always visible
- Card click or expand reveals full metric detail for that repo

**Out of scope**
- Pinning or reordering cards
- Inline side-by-side card layout — comparison detail is handled by P1-F06

---

#### `[P1-F08]` Evolution *(CHAOSS: Evolution)*

The analyzer measures how a repo's activity has changed over time.

**Acceptance criteria**
- Metrics computed: commits in last 30d, commits in last 90d, releases in last 12 months, PRs opened in last 90d, PRs merged in last 90d, PR merge rate (merged / opened), open issues, closed issues in last 90d, stale issue ratio (open > 90d / total open)
- Evolution score — High / Medium / Low — assigned only when sufficient verified data exists; otherwise surfaces `Insufficient verified public data`
- All thresholds defined in config, not hardcoded in logic
- UI exposes thresholds via a "how is this scored?" tooltip
- CHAOSS category label displayed alongside the score in the UI

**Out of scope**
- User-adjustable thresholds in the UI (Future backlog)
- Commit frequency broken down by day of week or time of day

---

#### `[P1-F09]` Contribution Dynamics *(CHAOSS: Sustainability)*

The analyzer measures the depth, distribution, and sustainability of contributor activity.

**Acceptance criteria**
- Metrics computed: active contributors in last 90d (unique commit authors), total contributors, new contributors (first commit in last 90d), repeat contributors, contribution concentration (% of commits from top 20% of authors)
- Organizational diversity surfaced as `Could not verify contributor organization publicly` when not inferable — never fabricated
- Resilience score — High / Medium / Low — derived from contribution dynamics data; assigned only when concentration data is verifiable
- Scoring logic: high concentration + single org = fragile; high concentration + multiple orgs = moderate; distributed + multiple orgs = strong; distributed + unknown orgs = moderate confidence
- All thresholds defined in config, not hardcoded in logic
- CHAOSS category label displayed alongside the score in the UI
- Missing data explicitly listed in the per-repo callout panel

**Out of scope**
- Manually overriding org affiliation
- Bus Factor calculation (Future backlog)

---

#### `[P1-F10]` Responsiveness *(CHAOSS: Responsiveness)*

The analyzer measures how quickly maintainers engage with community activity.

**Acceptance criteria**
- Metrics computed: median time to first issue response, median time to close issues, median time to merge PRs
- Computed from exact timestamps in GraphQL issue and PR event data — no estimation
- Responsiveness score — High / Medium / Low — assigned only when sufficient event data exists; otherwise surfaces `Insufficient verified public data`
- All thresholds defined in config, not hardcoded in logic
- If GitHub does not surface required event timestamps via GraphQL, fields are marked `"unavailable"` and called out explicitly in the missing data panel
- CHAOSS category label displayed alongside the score in the UI

**Out of scope**
- First response time broken down by label or contributor type
- SLA tracking over time (Future backlog)

---

#### `[P1-F11]` Health Ratios

Computed diagnostic ratios provide a quick cross-repo comparison surface, drawn from all four CHAOSS categories.

**Acceptance criteria**
- Ecosystem ratios: forks/stars, watches/stars
- Evolution ratios: merged PRs/opened PRs, stale issues/total open issues
- Contribution Dynamics ratios: repeat contributors/total contributors, new contributors/total contributors
- Unavailable ratios displayed as `—`, never estimated
- Ratios grouped by CHAOSS category in the UI
- Table is sortable by ratio value across repos
- Ratios computed only from verified API values

**Out of scope**
- Custom ratio definitions by the user

---

#### `[P1-F12]` Missing Data & Accuracy

The UI makes data gaps explicit and never hides them.

**Acceptance criteria**
- Per-repo callout panel lists every field that could not be verified from the API
- Fields marked unavailable in the JSON output are visually distinguished in the UI (not hidden, not zeroed out)
- No metric is estimated, inferred, or substituted — enforced in the analyzer module and visible in the UI

**Out of scope**
- Suggesting alternative data sources for missing fields

---

#### `[P1-F13]` Export

Users can take analysis results out of the UI in standard formats.

**Acceptance criteria**
- Download full `AnalysisResult[]` as JSON
- Download summary as Markdown report (CHAOSS-aligned format)
- Copy shareable URL that encodes the repo list as query params — token never included in the URL

**Out of scope**
- PDF export
- CSV export
- Saved reports or report history (Future backlog)

---

### Phase 2 — GitHub Action

---

#### `[P2-F01]` Scheduled Analysis

ForkPrint runs as a GitHub Action on a schedule or manual trigger.

**Acceptance criteria**
- Action supports `schedule` (cron) and `workflow_dispatch` triggers
- Repo list supplied as action input: multiline string or JSON array
- Imports `analyze()` directly from the shared analyzer module — no logic duplication
- Outputs JSON artifact uploaded to GitHub Actions artifacts
- Optional Markdown summary posted as a GitHub Actions job summary
- `GITHUB_TOKEN` consumed from the action's built-in secret — no extra setup for public repos

**Out of scope**
- Push or release event triggers (Future backlog)

---

#### `[P2-F02]` Threshold Alerting

The action can open a GitHub Issue when health drops below a defined threshold.

**Acceptance criteria**
- Optional step: opens a GitHub Issue if any CHAOSS score falls below configured threshold
- Issue body includes the Markdown health report
- Threshold values sourced from the shared config — not hardcoded in the workflow

**Out of scope**
- Slack or email notifications (Future backlog)

---

### Phase 3 — MCP Server

---

#### `[P3-F01]` Analyze Tool

ForkPrint exposes repo health analysis as an MCP tool callable by AI assistants.

**Acceptance criteria**
- MCP Server exposes an `analyze_repo` tool
- Tool accepts: `repos: string[]`, optional `token?: string`
- Tool returns a typed `AnalysisResult` object matching the shared analyzer output contract
- Wraps `analyze()` from the shared analyzer module — no logic duplication
- Usable from Claude, Cursor, or any MCP-compatible AI assistant

**Out of scope**
- Streaming partial results during analysis
- Tool for adjusting scoring thresholds

---

#### `[P3-F02]` Deployment & Integration Docs

The MCP Server is deployable and documented for common AI assistant setups.

**Acceptance criteria**
- Deployable as a standalone Node.js process
- Deployable as a Vercel serverless function
- README section documents how to connect to Claude Desktop and Claude Code
- `GITHUB_TOKEN` passed via environment variable — never hardcoded

**Out of scope**
- GUI for configuring the MCP server

---

### Future / Backlog

Not specced. Captured here so Phase 1–3 decisions don't foreclose them.

- `[FUT-F01]` **Historical trending** — store snapshots over time, chart metric trajectory per repo
- `[FUT-F02]` **Org-level view** — analyze all public repos under a GitHub org in one pass
- `[FUT-F03]` **CHAOSS expansion** — Bus Factor, Change Request Closure Ratio, Code Coverage metrics
- `[FUT-F04]` **Embeddable badge** — `![ForkPrint Health](https://forkprint.vercel.app/badge/owner/repo)` for READMEs
- `[FUT-F05]` **Webhook mode** — trigger analysis on push or release events via GitHub webhook

---

## SpecKit Workflow

This section describes how to feed this product definition into SpecKit to initialize the project.

### Prerequisites

- `arun-gupta/forkprint` repo is cloned locally
- `CLAUDE.md` already exists — it contains a single line pointing Claude Code to `constitution.md`
- Claude Code is running in the repo root

### Step 1 — Commit this document

Place this file at `docs/PRODUCT.md` in the repo and commit it before starting any SpecKit session.

```bash
mkdir -p docs
cp PRODUCT.md docs/PRODUCT.md
git add docs/PRODUCT.md
git commit -m "docs: add product definition"
```

### Step 2 — Initialize constitution.md

Open Claude Code and run the following prompt verbatim:

> Read `docs/PRODUCT.md`. Generate `constitution.md` in the repo root as the single authoritative source of all project rules for ForkPrint. It must cover: accuracy policy, data source rules, module boundary (analyzer module is framework-agnostic and shared across all three phases), CHAOSS alignment (four categories, one feature each, one score each), scoring thresholds (all in config, none hardcoded), quadrant classification (median split, never hardcoded), Contribution Dynamics honesty (org affiliation not verifiable via GitHub GraphQL — never fabricate), and operational rules for Claude Code. Do not touch `CLAUDE.md`.

Review `constitution.md` before proceeding. Every rule in this document must be represented there.

### Step 3 — Initialize specs for Phase 1

Once `constitution.md` is committed, run the following prompt for each Phase 1 feature in order, one at a time:

> Read `docs/PRODUCT.md` and `constitution.md`. Create a SpecKit spec for feature `[P1-F01]` Repo Input. The spec must be traceable to the acceptance criteria and out-of-scope boundaries defined in `docs/PRODUCT.md`. All rules in `constitution.md` apply.

Repeat for `P1-F02` through `P1-F13`, in order. Review each spec before moving to the next — specs are contracts, not drafts.

### Step 4 — Implement against specs

With all Phase 1 specs in place, begin implementation feature by feature. For each feature:

> Read `constitution.md` and the spec for `[P1-F01]`. Implement this feature. Run tests before marking it complete. Do not implement anything outside the spec's acceptance criteria.

### Step 5 — Phase 2 and Phase 3

When Phase 1 is complete and deployed, repeat Steps 3–4 for Phase 2 features (`P2-F01`, `P2-F02`), then Phase 3 (`P3-F01`, `P3-F02`). The analyzer module must not be modified to accommodate Phase 2 or 3 — only wrapped.