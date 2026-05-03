# RepoPulse Constitution

**Version**: 1.5 — Amended 2026-05-03
**Amendment (v1.5, 2026-05-03)**: Section I updated to add `@anthropic-ai/sdk` (Anthropic Claude SDK) to the approved technology stack for Phase 1, gated behind the `ANTHROPIC_API_KEY` server-side environment variable. The LLM-powered Q&A chat panel (issue #271) requires this SDK to stream responses from Anthropic Claude models. The SDK is never bundled into client code and the API key is never sent to the client. The feature degrades gracefully (503) when the key is absent. Signed off by: arun-gupta.

**Amendment (v1.4, 2026-04-21)**: Section III rule 4 updated to reflect no-scope baseline OAuth (issue #401). Rationale: RepoPulse only reads public data; the previous `public_repo` baseline granted unnecessary write access. A no-scope token provides the same read access and full 5,000 req/hr rate limit without write permission. Signed off by: arun-gupta.

**Amendment (v1.3)**: Sections XII and XIII updated to drop the per-feature `specs/NNN-feature-name/checklists/manual-testing.md` file. The PR body's `## Test plan` section is now the single source of truth for manual testing signoff. Rationale: under the one-Claude-per-issue ephemeral-worktree workflow, the in-repo checklist file duplicated the PR Test Plan, drifted from it, and added ceremony without adding coverage. GitHub preserves PR bodies indefinitely and they are queryable via `gh pr view --json body`, so the test record remains durable. Signed off by: arun-gupta.

**Amendment (v1.3, 2026-04-20)**: Section XII updated to add a Definition of Done item requiring fixture generator parity for any PR that adds or changes a governance signal. Rationale: issue #385 revealed that `memberPermission` was hand-authored in `fixtures/demo/org-ossf.json` with fabricated values because `generate-demo-fixtures.ts` was not updated in the same PR as the feature. The new DoD item closes this gap by requiring generator parity and fixture regeneration whenever `OrgFixture.governance` changes. A CI check (`npm run demo:check-parity`) enforces this mechanically. Signed off by: arun-gupta.

**Previous amendment (v1.1, 2026-04-06)**: Section III rules 4 and 6 updated to reflect OAuth-only authentication (P1-F14). PAT input and server-side `GITHUB_TOKEN` removed. Rationale: GitHub OAuth distributes rate limit consumption across individual user quotas, enabling the app to scale to any number of concurrent users without a shared API quota bottleneck. Storing the OAuth token in-memory only (never in localStorage or cookies) eliminates the XSS token-theft risk present in the previous PAT-based localStorage flow, improving security while preserving the stateless Phase 1 architecture. Signed off by: arun-gupta.

**Single authoritative source of all project rules.**
Every spec, plan, task, and line of code must comply. No exceptions.

---

## I. Technology Stack

### Phase 1 — Web App
- **Framework**: Next.js 14+ (App Router) — no Pages Router
- **Deployment**: Vercel — zero-config
- **Styling**: Tailwind CSS
- **Charts**: Chart.js (via npm)
- **LLM**: `@anthropic-ai/sdk` (server-side only, gated by `ANTHROPIC_API_KEY`) — used for the Q&A chat panel (issue #271)
- **Stateless**: no database, no auth system, all analysis is on-demand

### Phase 2 — GitHub Action
- Implemented as a GitHub Action workflow
- Imports `analyze()` from the shared analyzer module — no runtime duplication
- `GITHUB_TOKEN` consumed from the action's built-in secret

### Phase 3 — MCP Server
- Deployable as a standalone Node.js process
- Deployable as a Vercel serverless function
- Wraps `analyze()` from the shared analyzer module

### API Contract (Phase 1)
```
POST /api/analyze
Body:     { "repos": ["owner/repo", ...], "token"?: "ghp_..." }
Response: { "results": AnalysisResult[] }
```

### Stack Constraints
- No technology outside this stack may be introduced without amending this constitution.
- The analyzer module must remain runtime-agnostic — it cannot import from Next.js, the Actions SDK, or any MCP library.

---

## II. Accuracy Policy (NON-NEGOTIABLE)

1. Every metric displayed or exported must originate from a verified GitHub GraphQL API response. No other origin is acceptable.
2. No estimation, interpolation, inference, or fabrication — ever. Missing data is a first-class outcome, not a failure to hide.
3. Missing fields are marked `"unavailable"` in JSON output and visually distinguished (never hidden, never zeroed) in the UI.
4. One metric may never substitute for another. Each field maps to exactly one GraphQL field or derived formula over verified fields.
5. Scores are assigned only when sufficient verified data exists. When data is insufficient, the output is the literal string `"Insufficient verified public data"` — not a score, not a guess.
6. If the GitHub GraphQL API does not expose a required field, that field is marked `"unavailable"` and listed explicitly in the per-repo missing data panel.
7. Narrow exception: `Elephant Factor` and `Single-vendor dependency ratio` may be shown as best-effort estimates only inside a clearly labeled `Experimental` UI surface with an explicit warning that heuristic public-org attribution may be incomplete or inaccurate.

---

## III. Data Source Rules

1. **Primary source**: GitHub GraphQL API (`https://api.github.com/graphql`).
2. Each repo requires 1–3 GraphQL requests. Precise field selection — no over-fetching.
3. REST API may supplement only where GraphQL cannot reach a specific metric. This is an exception, not a pattern.
4. Auth: GitHub OAuth App only — PAT input is not supported in Phase 1 (amended v1.1). OAuth token is held in-memory for the duration of the session; it is never written to localStorage, cookies, or any persistent storage. Baseline scope: no scope (empty string) — read-only access to all public data without write permission (amended v1.4). Elevated tiers: `read:org` and `admin:org` only — `public_repo` is not included in any tier.
5. No server-side `GITHUB_TOKEN` is used — each user authenticates via OAuth and their own quota is consumed (amended v1.1). Credentials are never hardcoded anywhere in the codebase.
6. ~~Server-side `GITHUB_TOKEN` takes precedence~~ — removed in v1.1. All API calls use the authenticated user's OAuth token. `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are stored as server-side environment variables and never sent to the client.
7. Token is never included in URLs, never exposed to the client bundle, never logged.
8. OAuth requires a `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` — both stored as environment variables, never committed to git, never sent to the client.

---

## IV. Analyzer Module Boundary

1. The core analysis logic lives in a single, **framework-agnostic analyzer module**.
2. The analyzer module is **shared across all three phases**: Phase 1 (Next.js), Phase 2 (GitHub Action), Phase 3 (MCP Server).
3. No phase duplicates analyzer logic. Phases 2 and 3 import and wrap `analyze()` — they do not reimplement it.
4. The analyzer module has no dependency on Next.js, GitHub Actions runner APIs, or any MCP framework.
5. Phase 1 architectural decisions must not block Phases 2 or 3. The module boundary enforces this.
6. The analyzer module is independently testable without any phase-specific harness.

---

## V. CHAOSS Alignment

Four CHAOSS categories. Each maps to exactly one feature and produces exactly one derived score. This mapping is fixed.

| CHAOSS Category  | Feature ID | Feature Name            | Score Name           | Score Values                              |
|------------------|------------|-------------------------|----------------------|-------------------------------------------|
| Ecosystem        | P1-F05     | Ecosystem Map           | Ecosystem profile    | Reach / Builder Engagement / Attention    |
| Activity         | P1-F08     | Activity                | Activity score       | High / Medium / Low                       |
| Sustainability   | P1-F09     | Contribution Dynamics   | Resilience score     | High / Medium / Low                       |
| Responsiveness   | P1-F10     | Responsiveness          | Responsiveness score | High / Medium / Low                       |

Rules:
- Every CHAOSS category label is always displayed alongside its score in the UI.
- Scores map to badge colors: High = green, Medium = amber, Low = red, Insufficient = gray.
- No new CHAOSS categories or additional scores may be introduced without amending this constitution.

---

## VI. Scoring Thresholds

1. **All thresholds are defined in configuration** — not hardcoded in logic, not inline in components, not in constants files treated as logic.
2. Threshold values must be readable and modifiable without touching scoring logic.
3. The UI exposes thresholds via a "how is this scored?" tooltip for each CHAOSS score.
4. Phase 2 threshold alerting sources values from the shared config — not from the workflow YAML.
5. The following scores use config-driven thresholds:
   - Activity score (P1-F08): commit frequency, PR merge rate, stale issue ratio, release cadence
   - Resilience score (P1-F09): contribution concentration, contributor count, repeat contributor ratio
   - Responsiveness score (P1-F10): median first response time, median time to close issues, median PR merge time

---

## VII. Ecosystem Spectrum

1. P1-F05 uses a **spectrum model**, not median-derived quadrants.
2. Axes: X = stars (reach), Y = builder engagement (`forks / stars`), bubble size = attention (`watchers / stars`).
3. Ecosystem profile tiers are **RepoPulse-defined** and aligned to the CHAOSS ecosystem category. They are not presented as an official CHAOSS taxonomy.
4. Spectrum thresholds are defined in shared configuration and read from that configuration by the UI and supporting logic.
5. Single-repo input remains fully valid: the UI still plots and profiles the repo when verified data exists.

---

## VIII. Contribution Dynamics Honesty

1. **Organizational affiliation is not verifiable via the GitHub GraphQL API.** This is a known platform constraint.
2. When org affiliation cannot be verified, the output is the exact string: `"Could not verify contributor organization publicly"` — never an approximation, never a guess, never inferred from username patterns.
3. The Resilience score logic acknowledges this constraint explicitly:
   - High concentration + single org → fragile
   - High concentration + multiple orgs → moderate
   - Distributed + multiple orgs → strong
   - Distributed + **unknown orgs** → moderate confidence *(not strong — org diversity is unverified)*
4. The UI never implies that org diversity has been confirmed when it has not.
5. Missing org data is listed in the per-repo missing data panel.
6. Narrow exception: `Elephant Factor` and `Single-vendor dependency ratio` may use heuristic public-org attribution only when they are rendered inside a clearly labeled `Experimental` surface with an explicit warning. They must never be presented as fully verified organizational metrics.

---

## IX. Feature Scope Rules

1. Each Phase 1 feature (P1-F01 through P1-F13) is a behavioral contract, not an implementation task.
2. Acceptance criteria in `docs/PRODUCT.md` define the testable surface. Implementation must satisfy all criteria.
3. Out-of-scope items listed in `docs/PRODUCT.md` are hard boundaries — do not implement them under any feature.
4. Future/backlog items (FUT-F01 through FUT-F05) must not influence Phase 1–3 architecture unless the constitution is amended.
5. `AnalysisResult` schema must be flat and consistent enough to diff across repos without transformation — design this from the start (P1-F06 constraint that applies to all upstream features).
6. **YAGNI applies by default**: do not add code, configuration, abstractions, UI states, or extensibility points unless they are required by the current accepted feature contract.
7. **Keep It Simple**: prefer the smallest, clearest implementation that satisfies the feature spec and constitution over cleverness, premature generalization, or speculative reuse.
8. Do not over-engineer for hypothetical future needs. When a simpler implementation satisfies the current feature safely, the simpler implementation is required.

---

## X. Security & Hygiene

1. No secrets (`GITHUB_TOKEN`, PATs, credentials) ever committed to git.
2. `.env*` files are always in `.gitignore`.
3. Token never transmitted anywhere except the GitHub GraphQL API endpoint.
4. Token never included in shareable URLs or query params.
5. Per-repo error isolation: one failed repo must not block or corrupt results for others.

---

## XI. Testing

1. **TDD is mandatory (NON-NEGOTIABLE)**: tests written and approved → tests fail → implement → tests pass. Red-Green-Refactor cycle strictly enforced.
2. Testing layers:
   - **Unit/Integration**: Vitest + React Testing Library for analyzer logic and UI components
   - **E2E**: Playwright for full user flows (repo input, dashboard rendering, export)
3. GitHub GraphQL API calls are mocked in unit tests. Real API calls are used only in E2E tests.
4. All tests must pass before merging to `main`.

---

## XII. Definition of Done

A feature is complete only when all of the following are true:

- [ ] All acceptance criteria in the feature spec are satisfied
- [ ] Tests pass and linting is clean
- [ ] No TODOs, dead code, `console.log`, or untyped values remain
- [ ] All spec documents for the feature are current
- [ ] `docs/DEVELOPMENT.md` reflects the feature's completed status in the implementation order
- [ ] PR Test Plan completed and signed off before merge
- [ ] README updated for any user-facing or setup changes
- [ ] Constitution compliance verified — no rule violated
- [ ] If a governance signal was added or changed: `scripts/generate-demo-fixtures.ts` updated in the same PR and `fixtures/demo/` regenerated via `npm run demo:fixtures` (never hand-authored)

---

## XIII. Development Workflow

1. All work happens on feature branches. No direct commits to `main`.
2. All tests must pass and linting must be clean before a PR is merged.
3. Every PR must include a `## Test plan` section in its body — this is the single source of truth for manual testing signoff. All checkboxes must be checked before merge.
4. README must be updated to reflect any user-facing or setup changes before submitting a PR.
5. `docs/DEVELOPMENT.md` must be updated when a feature is completed so the implementation order reflects current status.
6. A PR must be opened and merged before starting the next feature.
7. Credentials go in `.env.local` only — never committed. `.env.example` is committed with placeholder values.
8. README is updated when a completed feature changes the user-facing behavior or setup steps.

---

## Governance

- This constitution supersedes all other guidance when rules conflict.
- Amendments require: (1) a documented reason, (2) an updated version number and date, (3) a review of all existing specs for compliance impact.
- All specs, plans, and PRs must be verified against this constitution before approval.
- Any rule marked **(NON-NEGOTIABLE)** cannot be amended without explicit human sign-off — not by Claude Code autonomously.
