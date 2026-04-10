# RepoPulse — Product Definition

**Repo**: `arun-gupta/repo-pulse`  
**Description**: OSS Health Score — measures the health of open source projects with percentile-based scoring calibrated against 200+ GitHub repositories. Produces a composite health score from Activity, Responsiveness, and Sustainability dimensions with actionable recommendations.  
**Phase 1 Platform**: Next.js deployed on Vercel  
**Phase 1 Data Layer**: Next.js API Routes  
**Development Methodology**: SpecKit / Specification-Driven Development (SDD)

This document is the canonical product definition for RepoPulse. It is the source of truth for all features across all phases. `.specify/memory/constitution.md` references this document. SpecKit specs are traceable to feature IDs defined here.

---

## Roadmap

### Scoring dimensions

RepoPulse's health score evolves by adding new scoring buckets. Each bucket adds a new dimension to the composite health score.

| Status | Dimension | Weight | Issues |
|--------|-----------|--------|--------|
| ✅ Done | Activity | 36% | — |
| ✅ Done | Responsiveness | 36% | — |
| ✅ Done | Sustainability | 28% | — |
| Planned | Documentation | 15% | #66, #67 |
| Planned | Security | 15% | #68, #71 |
| Planned | Community | 10% | #70 |
| Planned | Release Health | 5% | #69 |

Weights are rebalanced as new buckets are added.

### Extensibility

The core analysis logic is shared via a framework-agnostic analyzer module. These extensions wrap the same analyzer without duplicating logic.

| Feature | Description | Status |
|---------|-------------|--------|
| Web app | Next.js / Vercel interactive dashboard | ✅ Done |
| GitHub Action | Scheduled analysis with threshold alerting | Planned |
| MCP Server | Expose analysis as a tool for AI assistants | Planned |
| Embeddable badge | Health score SVG badge for READMEs | Planned (#72) |

### Git provider support

A provider abstraction layer will allow the analyzer to work with multiple Git hosting platforms.

| Provider | Status |
|----------|--------|
| GitHub | ✅ Supported |
| GitLab | Planned |
| Bitbucket | Future |
| Gitea | Future |

---

## Data Source

**GitHub GraphQL API** (`https://api.github.com/graphql`) is the primary data source.

- Fetches all required metrics in 1–3 requests per repo vs. 10–15 REST calls
- Precise field selection — no over-fetching
- Single auth mechanism: GitHub Personal Access Token with repository read access sufficient for the required GraphQL and REST calls
- REST API may supplement only where GraphQL cannot reach a specific metric
- `GITHUB_TOKEN` is always read from environment — never hardcoded

---

## OSS Health Score

RepoPulse computes a composite **OSS Health Score** from weighted scoring buckets. Each bucket produces a percentile score (0–99) relative to repos in the same star bracket, calibrated against 200+ real GitHub repositories.

### Current buckets (Phase 1)

| Bucket | Weight | What it measures | Derived from |
|---|---|---|---|
| Activity | 36% | PR flow, issue flow, commit cadence, completion speed, release frequency | Weighted composite of 5 sub-scores |
| Responsiveness | 36% | Response times, resolution speed, maintainer signals, backlog health, engagement quality | Weighted composite of 5 sub-scores |
| Sustainability | 28% | Contributor concentration (top 20% commit share) | Inverted percentile of concentration ratio |

### Planned buckets (Phase 2+)

| Bucket | Planned Weight | What it will measure |
|---|---|---|
| Documentation | 15% | README, CONTRIBUTING, LICENSE, SECURITY, templates (#66) |
| Security | 15% | Dependency updates, branch protection, CI/CD, vulnerability disclosure (#68) |
| Community | 10% | Discussions, templates, CODEOWNERS, governance (#70) |
| Release Health | 5% | Frequency, semver compliance, release notes (#69) |

Weights will be rebalanced as new buckets are added.

### Ecosystem profile

Three additional percentile dimensions are shown on the scorecard but not included in the health score composite:

| Dimension | Metric | Purpose |
|---|---|---|
| Reach | Star count percentile | Project visibility and adoption |
| Attention | Watcher-to-star ratio percentile | Active follower interest |
| Engagement | Fork-to-star ratio percentile | Builder participation |

### Scoring methodology

All scores are percentile-based, not categorical. The scoring methodology, calibration data, and statistical approach are documented in [`docs/scoring-and-calibration.md`](scoring-and-calibration.md).

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
- Every visible column supports ascending and descending local sorting without rerunning the org request
- Table includes at least: repository name, description, primary language, stars, forks, watchers, open issues count, last pushed date, and repo URL
- Users can choose which optional columns are visible while `Repository` remains pinned
- Table supports lightweight filtering by repo name, language, and archived status
- Large org inventories support local pagination controls with configurable rows per page
- Org-level summary area shows high-level rollups such as total public repos, total stars, most-starred repos, most recently active repos, language distribution, and archived vs active repo count
- Each repo row links into the existing repo-level analysis flow so users can drill into a specific repository
- Users can select multiple repositories from the org inventory table and launch the existing repo-analysis flow for that selection, up to the configured bulk-selection limit
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

RepoPulse deploys to Vercel with minimal configuration.

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

RepoPulse presents analysis in a stable app shell so users can submit repos once and switch between result views cleanly.

**Acceptance criteria**
- A top header/banner shows the RepoPulse brand and a visible GitHub repo link
- Repo input and Analyze action live in a stable analysis panel that remains visible above the result views
- Successful analyses populate a tabbed result area rather than stacking every future view vertically
- The shell organizes result views in a stable order with `Overview` first and domain views such as `Contributors`, `Activity`, `Responsiveness`, `Health Ratios`, and `Comparison` available as tabs
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
- Repository input exposes both `Analyze` and `Compare` actions in repo mode, both backed by the same analysis request
- `Compare` is available only when at least two valid repos are entered and no more than four repos are eligible for comparison
- Any analysis of 2+ repos surfaces a comparison view alongside the individual repo cards
- Choosing `Compare` opens the results workspace directly on `Comparison` after analysis completes
- Comparison table shows selected metrics in rows, repos in columns, with comparison-focused delta messaging highlighted more prominently than raw values
- Comparison view uses a user-selectable anchor repo as the baseline for delta interpretation; the first mentioned successful repo is the default anchor
- Comparison table is organized into clearly labeled sections such as Overview, Contributors, Activity, Responsiveness, and Health Ratios
- Users can enable or disable entire comparison sections, with all sections enabled by default
- Users can choose which comparison attributes are shown; all supported attributes are selected by default
- Comparison view includes a user-selectable median column across the chosen repos; it is visible by default
- Every visible comparison column is sortable in ascending or descending order within the current section context
- The UI clearly communicates the maximum of 4 compared repositories before and during analysis input
- Metrics unavailable for one repo are shown as `—` in that column, never omitted from the row
- Comparison is driven entirely from the already-fetched `AnalysisResult[]` — no additional API calls
- All metric categories represented: ecosystem signals, activity, contribution dynamics, responsiveness, health ratios
- Comparison view is exportable as JSON and Markdown alongside individual repo exports

**Design constraints** *(inform all upstream features)*
- `AnalysisResult` schema must be flat and consistent enough to diff across repos without transformation — design this from the start
- Ecosystem profile summaries are the visual entry point into comparison; the comparison table is the detail layer
- UI layout must accommodate 2–4 repos in comparison without horizontal scroll on desktop viewports
- The anchor model should make "better or worse than the baseline" easier to understand than a neutral spreadsheet alone

**Out of scope**
- Saving or naming a comparison set
- Diffing snapshots across time (Future — `FUT-F01`)
- More than 4 repos in a single comparison

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
- The `Activity` tab is the primary home for activity-flow ratios such as PR merge rate, issue closure rate, and stale issue ratio; these ratios are explained in context here before they are reused in any later cross-repo ratio rollup
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
  - contributor-composition ratios such as repeat contributors / total contributors and new contributors / total contributors when those ratios are publicly verifiable from the shared analysis payload
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
- The `Responsiveness` tab is organized into panes that map directly to the feature's metric groups:
  - `Issue & PR response time`
  - `Resolution metrics`
  - `Maintainer activity signals`
  - `Volume & backlog health`
  - `Engagement quality signals`
- `Issue & PR response time` includes:
  - time to first issue response
  - time to first PR review
  - median response times
  - 90th percentile response times
- `Resolution metrics` includes:
  - issue resolution duration
  - PR merge duration
  - issue resolution rate (`closed / opened`) for the selected window
- `Maintainer activity signals` includes:
  - contributor response rate
  - ratio of bot responses vs. human responses
- `Volume & backlog health` includes:
  - stale issue ratio
  - stale PR ratio
- `Engagement quality signals` includes:
  - PR review depth
  - issues closed without comment
- Computed from exact timestamps in GraphQL issue and PR event data — no estimation
- Response and resolution metrics SHOULD expose both median and `p90` values when enough verified public data exists, so outliers are visible without requiring full event-history charts
- Responsiveness score — High / Medium / Low — assigned only when sufficient event data exists; otherwise surfaces `Insufficient verified public data`
- Responsiveness score is based on a weighted combination of:
  - `30%` Issue & PR response time
  - `25%` Resolution metrics
  - `15%` Maintainer activity signals
  - `15%` Volume & backlog health
  - `15%` Engagement quality signals
- All thresholds defined in config, not hardcoded in logic
- If GitHub does not surface required event timestamps via GraphQL, fields are marked `"unavailable"` and called out explicitly in the missing data panel
- CHAOSS category label displayed alongside the score in the UI

**Out of scope**
- Bus Factor and responder concentration risk, which belong in contributor/sustainability analysis
- Review turnaround time per reviewer
- Label assignment lag
- Open issue or PR trend charts over time
- Reopened issue rate
- SLA tracking over time (Future backlog)

---

#### `[P1-F11]` Health Ratios

Computed diagnostic ratios provide a quick cross-repo comparison surface, drawn from all four CHAOSS categories.

**Acceptance criteria**
- Ecosystem ratios: forks/stars, watches/stars
- Activity ratios: merged PRs/opened PRs, stale issues/total open issues
- Contributors ratios: repeat contributors/total contributors, new contributors/total contributors
- Ratios continue to appear first in their domain-specific home views where they are easiest to interpret:
  - ecosystem ratios remain in ecosystem and overview surfaces
  - activity-flow ratios remain in the `Activity` tab
  - contributor-composition ratios remain in the `Contributors` tab
- The `Health Ratios` tab aggregates those verified ratios into a dedicated cross-repo comparison table rather than becoming the first or only place the user sees them
- The `Health Ratios` tab groups those rollups into `Overview`, `Contributors`, and `Activity` sections so the comparison view mirrors the main workspace navigation
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

User authenticates with GitHub via OAuth. OAuth replaces the PAT input and the server-side `GITHUB_TOKEN` — each user's own OAuth token is used for all API calls, distributing rate limit consumption across users rather than sharing a single server quota.

**Acceptance criteria**
- "Sign in with GitHub" button initiates the OAuth flow using a registered GitHub OAuth App
- OAuth access token is stored in `localStorage`
- OAuth token grants the same repository read access expected by the analyzer
- After successful OAuth login, the token input field is replaced with a signed-in indicator showing the GitHub username
- User can sign out, which clears the stored OAuth token from `localStorage`
- OAuth is required to use the app — unauthenticated access is not supported
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are stored as environment variables — never committed, never sent to the client
- OAuth callback is handled server-side; the access token is never exposed in the URL
- Server-side `GITHUB_TOKEN` environment variable is removed — no longer needed
- PAT input field is removed from the UI

**Out of scope**
- Multi-account or org-level OAuth management
- Token refresh / long-lived session management (Phase 1 is stateless)
- Coexistence with PAT — PAT support is fully replaced by OAuth

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

### Extensibility features

These features wrap the shared analyzer module without duplicating logic.

---

#### GitHub Action — Scheduled Analysis & Alerting

RepoPulse runs as a GitHub Action on a schedule or manual trigger, with optional threshold alerting.

**Key capabilities**
- `schedule` (cron) and `workflow_dispatch` triggers
- JSON artifact output and Markdown job summary
- Opens a GitHub Issue when health score drops below a configured threshold
- `GITHUB_TOKEN` from the action's built-in secret

---

#### MCP Server — AI Assistant Integration

RepoPulse exposes repo health analysis as an MCP tool callable by AI assistants.

**Key capabilities**
- `analyze_repo` tool accepting `repos: string[]`
- Returns typed `AnalysisResult` matching the shared analyzer contract
- Usable from Claude, Cursor, or any MCP-compatible AI assistant
- Deployable as standalone Node.js process or Vercel serverless function

---

#### Embeddable Badge

Health score badge for repository READMEs: `![RepoPulse](https://repopulse.dev/api/badge/owner/repo)`

---

### Git provider support

A provider abstraction layer allows the analyzer to work with multiple Git hosting platforms. GitHub is supported; GitLab, Bitbucket, and Gitea are planned.

---

### Future / Backlog

- **Historical trending** — store snapshots over time, chart metric trajectory per repo
- **Webhook mode** — trigger analysis on push or release events
- **Bus Factor** — contributor risk beyond concentration ratio

---

## Development Workflow

See [`docs/DEVELOPMENT.md`](./DEVELOPMENT.md) for the full SpecKit feature loop, Definition of Done, and phase-by-phase feature order.
