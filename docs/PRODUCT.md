# ForkPrint — Product Definition

**Repo**: `arun-gupta/forkprint`  
**Description**: CHAOSS-aligned GitHub repository health analyzer. Accepts one or more `owner/repo` inputs, fetches real public data via the GitHub GraphQL API, and produces an interactive dashboard and raw JSON output.  
**Phase 1 Platform**: Next.js deployed on Vercel  
**Phase 1 Data Layer**: Next.js API Routes  
**Development Methodology**: SpecKit / Specification-Driven Development (SDD)

This document is the canonical product definition for ForkPrint. It is the source of truth for all features across all phases. `.specify/memory/constitution.md` references this document. SpecKit specs are traceable to feature IDs defined here.

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
- Single auth mechanism: GitHub Personal Access Token with repository read access sufficient for the required GraphQL and REST calls
- REST API may supplement only where GraphQL cannot reach a specific metric
- `GITHUB_TOKEN` is always read from environment — never hardcoded

---

## CHAOSS Alignment

ForkPrint groups analysis into four CHAOSS-aligned reporting dimensions. These dimensions are product-level buckets, not a claim that they are the official top-level CHAOSS metric taxonomy.

| ForkPrint Dimension | CHAOSS Basis | Feature | Derived Score |
|---|---|---|---|
| Ecosystem | ForkPrint repo-profile layer informed by CHAOSS-style ecosystem signals | Ecosystem Map (P1-F05) | Ecosystem profile: Reach / Builder Engagement / Attention |
| Activity | CHAOSS-aligned activity and adjacent activity-flow signals | Activity (P1-F08) | Activity score: High / Medium / Low |
| Contributors | Contributor metrics with a dedicated Sustainability pane for resilience and organizational-risk signals | Contributors (P1-F09) | Core contributor metrics + Sustainability score |
| Responsiveness | CHAOSS-aligned time-to-response and time-to-resolution metrics | Responsiveness (P1-F10) | Responsiveness score: High / Medium / Low |

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
- **Visualization**: Spectrum/profile UI via React components
- **Stateless** — no database, no auth system, all analysis is on-demand

### API Contract

```
POST /api/analyze
Body:     { "repos": ["owner/repo", ...], "token"?: "ghp_..." }
Response: { "results": AnalysisResult[] }

POST /api/analyze-org
Body:     { "org": "github-org", "token"?: "ghp_..." }
Response: { "org": "github-org", "results": OrgRepoSummary[] }
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
- Textarea accepts one `owner/repo` slug per line, or comma-separated, or full GitHub URLs (`https://github.com/owner/repo`) — slug is extracted automatically
- Client-side validation rejects malformed slugs before submission (`owner/repo` pattern, trims whitespace)
- Empty submission is blocked with an inline error
- Duplicate slugs are removed client-side before passing to the data fetching layer
- Valid input is passed to the data fetching layer unchanged

**Out of scope**
- Saving or persisting repo lists across sessions
- Browsing or searching GitHub repos from within the UI

---

#### `[P1-F16]` Org-Level Repo Inventory

User can provide a GitHub organization and get a high-level inventory of its public repositories.

**Acceptance criteria**
- Input accepts a top-level GitHub org slug or GitHub org URL and normalizes it to the org name before submission
- App fetches the org's public repositories using public GitHub metadata only
- Results render in a sortable table with one row per repo
- Table includes at least: repository name, description, primary language, stars, forks, watchers, open issues count, last pushed date, and repo URL
- Table supports lightweight filtering by repo name, language, and archived status
- Org-level summary area shows high-level rollups such as total public repos, total stars, most-starred repos, most recently active repos, language distribution, and archived vs active repo count
- Each repo row links into the existing repo-level analysis flow so users can drill into a specific repository
- Empty orgs, invalid orgs, and rate-limit states are handled clearly without fabricating results

**Design constraints**
- This is a high-level organization inventory view, not a full CHAOSS analysis computed for every repo in the org
- Phase 1 implementation stays within lightweight public metadata and should avoid expensive per-repo deep fetches by default
- Table layout must remain usable on desktop and mobile, with pagination or virtualization available for large orgs

**Out of scope**
- Analyzing private repositories
- Running the full per-repo metric pipeline automatically for every repo in an org
- Historical org snapshots or trend charts
- Cross-org comparison

---

#### `[P1-F02]` Authentication

User can authenticate with GitHub to enable data fetching.

**Acceptance criteria**
- Token input field accepts a GitHub Personal Access Token
- Token is stored in `localStorage` — never transmitted anywhere except the GitHub GraphQL API
- UI displays the required token guidance for supported GitHub auth
- Missing token with no server-side fallback blocks submission with a clear error

**Out of scope**
- Multi-account or org-level token management
- OAuth flow is handled by P1-F14

---

#### `[P1-F03]` Deployment

ForkPrint deploys to Vercel with minimal configuration.

**Acceptance criteria**
- Deployable to Vercel with zero config
- `GITHUB_TOKEN` configurable as a Vercel environment variable for shared/team deployments
- When `GITHUB_TOKEN` is set as a Vercel environment variable, it is used server-side and the token input field is hidden in the UI
- No database, no auth system — stateless by default
- `GITHUB_TOKEN` never exposed to the client bundle

**Out of scope**
- Self-hosted Docker deployment (not blocked, just not documented in Phase 1)
- Multi-region or edge deployment configuration

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
- Data fetched per repo covers the following placeholders:
  - **Repo metadata**: name, description, created date, primary language
  - **Ecosystem signals**: stars, forks, watchers
  - **Activity**: commits (last 30d, last 90d, last 180d), releases (last 12mo), PRs opened / merged / closed, issues opened / closed, and contributor-activity flow timing where specified
  - **Contributors**: unique commit authors (last 90d), total contributors, commit counts per author
  - **Responsiveness**: issue first-response timestamps, issue close timestamps, PR merge timestamps

**Out of scope**
- Caching or persisting fetched data
- Webhook-triggered or scheduled fetching (Phase 2)

---

#### `[P1-F05]` Ecosystem Map

Repos are summarized in an interactive ecosystem view with a spectrum-based ecosystem profile.

**Acceptance criteria**
- Each successful repo surfaces an ecosystem profile with three tiered dimensions:
  - Reach
  - Builder Engagement
  - Attention
- Spectrum bands are defined in shared config and rendered consistently in the UI; component logic must not hardcode the thresholds independently
- Each successful repo card shows exact stars / forks / watches plus derived fork rate and watcher rate where they are verifiable
- Single-repo input remains fully useful: the repo is still profiled without requiring a comparison set
- Repos with unavailable ecosystem metrics are never given fabricated rates or derived profile tiers

**Out of scope**
- Saving or sharing a generated visualization directly
- Animating transitions between analyses

---

#### `[P1-F15]` Results Shell

ForkPrint presents analysis in a stable app shell so users can submit repos once and switch between result views cleanly.

**Acceptance criteria**
- A top header/banner shows the ForkPrint brand and a visible GitHub repo link
- Repo input and Analyze action live in a stable analysis panel that remains visible above the result views
- Successful analyses populate a tabbed result area rather than stacking every future view vertically
- The shell organizes result views in a stable order with `Overview` first and domain views such as `Contributors`, `Activity`, `Responsiveness`, and `Comparison` available as tabs
- The `Overview` tab is the first populated results tab and can absorb cross-feature summary content until later tabs deliver distinct value
- Switching tabs does not re-submit the analysis request or trigger extra API calls
- The shell works for single-repo and multi-repo analyses on desktop and mobile layouts

**Out of scope**
- Persisting the selected tab across sessions
- Replacing later feature-specific behavior inside each tab
- User-customizable tab sets or dashboard layout editing

---

#### `[P1-F06]` Repo Comparison

Users can compare two or more repos side by side across all health metrics.

**Acceptance criteria**
- Any analysis of 2+ repos surfaces a comparison view alongside the individual repo cards
- Comparison table shows all metrics in rows, repos in columns — delta values highlighted where meaningful
- Metrics unavailable for one repo are shown as `—` in that column, never omitted from the row
- Comparison is driven entirely from the already-fetched `AnalysisResult[]` — no additional API calls
- All metric categories represented: ecosystem signals, activity, contribution dynamics, responsiveness, health ratios
- Comparison view is exportable as JSON and Markdown alongside individual repo exports

**Design constraints** *(inform all upstream features)*
- `AnalysisResult` schema must be flat and consistent enough to diff across repos without transformation — design this from the start
- Ecosystem profile summaries are the visual entry point into comparison; the comparison table is the detail layer
- UI layout must accommodate 2–6 repos in comparison without horizontal scroll on desktop viewports

**Out of scope**
- Saving or naming a comparison set
- Diffing snapshots across time (Future — `FUT-F01`)
- More than 6 repos in a single comparison

---

#### `[P1-F07]` Metric Cards

Each repo is summarized in a scannable card showing key health signals.

**Acceptance criteria**
- One card per repo displaying: stars, forks, watches, created date, ecosystem profile summary (Reach / Builder Engagement / Attention), and one score badge per CHAOSS-aligned dimension (Activity, Sustainability, Responsiveness)
- Ecosystem profile badges use consistent visual treatment across Reach / Builder Engagement / Attention tiers
- Score badge colors: High = green, Medium = amber, Low = red, Insufficient = gray — consistent across all three CHAOSS score badges
- CHAOSS category label shown beneath each score badge so the framing is always visible
- Card click or expand reveals missing-data detail for that repo without duplicating the deeper metric views hosted in later tabs

**Out of scope**
- Pinning or reordering cards
- Inline side-by-side card layout — comparison detail is handled by P1-F06

---

#### `[P1-F08]` Activity *(CHAOSS-aligned: activity flow)*

The analyzer measures how a repo's recent activity and delivery flow change across configurable recent windows.

**Acceptance criteria**
- Metrics computed:
  - commits over time in `30d`, `90d`, and `180d` windows
  - PR throughput: opened, merged, closed
  - issue flow: opened, closed
  - release cadence and version frequency
  - PR merge rate (`merged / opened`)
  - issue closure rate (`closed / opened`) for the selected window
  - stale issue ratio (`open older than selected window / total open`)
  - median time to merge PRs
  - median time to close issues
- The `Activity` tab shows selected-window raw counts and throughput ratios together so users can interpret percentages in context
- The `Activity` score in the `Activity` tab follows the selected recent-activity window, while the overview badge may continue to use the canonical default score window
- The first implementation focuses on ratios and fixed-window comparisons; full time-series trend charts for commits, PRs, and issues are a follow-up once bucketed trend data is carried in the shared analysis payload
- Activity score — High / Medium / Low — assigned only when sufficient verified data exists; otherwise surfaces `Insufficient verified public data`
- Activity score is based on a weighted combination of:
  - recent volume: commits, PRs, and issues across `30d`, `90d`, and `180d`
  - flow: PRs merged vs. opened and issues closed vs. opened
  - cadence: release cadence and version frequency
  - completion speed: median time to merge PRs and median time to close issues
- Activity scoring proposal for the first implementation:
  - `20%` PR flow
    - PRs opened vs. merged vs. closed
    - PR merge rate
  - `20%` issue flow
    - issues opened vs. closed
    - stale issue ratio
  - `20%` completion speed
    - median time to merge PRs
    - median time to close issues
  - `20%` sustained activity
    - commits across `30d`, `90d`, and `180d`
  - `20%` release cadence
    - release frequency
    - version movement
- Score interpretation proposal:
  - `High`: sustained recent activity, healthy PR/issue flow, meaningful release cadence, and relatively fast merge/close medians
  - `Medium`: meaningful activity is present, but cadence, throughput, or completion speed is uneven
  - `Low`: weak recent activity, weak flow, stale completion times, or little meaningful release motion
  - `Insufficient verified public data`: minimum required activity and flow inputs are not available
- Activity score should balance absolute volume with ratios and medians, so larger repositories do not automatically outrank smaller but healthy ones
- `Activity` owns throughput, cadence, and time-to-completion signals, while `Responsiveness` remains focused on first-response and maintainer-engagement latency
- All thresholds defined in config, not hardcoded in logic
- UI exposes thresholds via a "How is Activity scored?" help surface and keeps primary values visible without tooltip-only disclosure
- CHAOSS category label displayed alongside the score in the UI

**Out of scope**
- User-adjustable thresholds in the UI (Future backlog)
- Commit frequency broken down by day of week or time of day
- Full commit / PR / issue sparkline charts before bucketed trend series are added to the shared `AnalysisResult` payload

---

#### `[P1-F09]` Contributors

The Contributors workspace measures the depth and distribution of contributor activity, with a dedicated Sustainability pane for broader resilience and organizational-risk signals.

**Acceptance criteria**
- Top-level results navigation places `Contributors` immediately after `Overview`
- The `Contributors` tab includes a `Recent activity window` control with presets:
  - `30d`
  - `60d`
  - `90d` (default)
  - `180d`
  - `365d`
- Changing the `Recent activity window` updates contributor-derived metrics locally without rerunning analysis
- The `Contributors` tab is organized into two panes:
  - `Core`
  - `Sustainability`
- The initial `Core` pane in `P1-F09` includes:
  - a `Contributor composition` summary card
  - `GitHub API contributors` as the top-level contributor-count source
  - active / repeat / one-time / inactive contributor composition for the selected recent-activity window
  - person-level contribution heatmap for the selected recent-activity window
- The `Sustainability` pane includes the Sustainability score and related explanation surfaces
- The `Sustainability` pane owns contribution concentration and related top-20%-share explanation surfaces
- The `Sustainability` pane also includes:
  - maintainer or owner count from supported public repository files such as `OWNERS`, `OWNERS.alias`, `MAINTAINERS`, `MAINTAINERS.md`, `.github/CODEOWNERS`, or `GOVERNANCE.md`
  - observed types of contributions from verified recent repository activity
- The `Sustainability` pane includes an `Experimental` subsection for:
  - Elephant Factor (best-effort heuristic using public GitHub org visibility)
  - single-vendor dependency ratio (best-effort heuristic using public GitHub org visibility)
  - explicit warning that these two estimates may be incomplete or inaccurate
- Resilience score — High / Medium / Low — derived from contribution dynamics data; assigned only when concentration data is verifiable
- Scoring logic: high contribution concentration = fragile; moderate concentration = moderate; distributed contributors = strong, with insufficient verified public data blocking the score when contributor-distribution evidence is incomplete
- All thresholds defined in config, not hardcoded in logic
- CHAOSS category label displayed alongside the score in the UI
- Missing data explicitly listed in the per-repo callout panel
- Additional later sustainability signals remain tracked in the product/docs roadmap rather than rendered as placeholder UI in the current pane:
  - no contributions in the last 6 months
  - new contributors (first verified contribution in last 90d)
  - new vs. returning contributor ratio per release cycle
  - organizational diversity
  - organization-level contribution heatmap
  - unique employer/org count among contributors
  - richer Elephant Factor and vendor-risk refinements beyond the experimental heuristic ([CHAOSS metric reference](https://chaoss.community/kb/metric-elephant-factor/))

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
- Activity ratios: merged PRs/opened PRs, stale issues/total open issues
- Contributors ratios: repeat contributors/total contributors, new contributors/total contributors
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

#### `[P1-F14]` GitHub OAuth Authentication

User can authenticate with GitHub via OAuth instead of manually entering a PAT.

**Acceptance criteria**
- "Sign in with GitHub" button initiates the OAuth flow using a registered GitHub OAuth App
- OAuth access token is stored in `localStorage` — same storage contract as PAT
- OAuth token grants the same repository read access expected by the analyzer
- After successful OAuth login, the token input field is replaced with a signed-in indicator showing the GitHub username
- User can sign out, which clears the stored OAuth token from `localStorage`
- If a server-side `GITHUB_TOKEN` is configured, the OAuth flow is hidden (same behavior as P1-F02)
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are stored as environment variables — never committed, never sent to the client
- OAuth callback is handled server-side; the access token is never exposed in the URL

**Out of scope**
- Multi-account or org-level OAuth management
- Token refresh / long-lived session management (Phase 1 is stateless)
- Replacing PAT support — PAT and OAuth coexist; PAT remains available for users who prefer it

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
- `[FUT-F03]` **CHAOSS expansion** — Bus Factor, Change Request Closure Ratio, Code Coverage metrics
- `[FUT-F04]` **Embeddable badge** — `![ForkPrint Health](https://forkprint.vercel.app/badge/owner/repo)` for READMEs
- `[FUT-F05]` **Webhook mode** — trigger analysis on push or release events via GitHub webhook

---

## Development Workflow

See [`docs/DEVELOPMENT.md`](./DEVELOPMENT.md) for the full SpecKit feature loop, Definition of Done, and phase-by-phase feature order.
