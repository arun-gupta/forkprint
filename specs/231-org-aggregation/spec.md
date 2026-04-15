# Feature Specification: Org-Level Aggregation with Client-Orchestrated Multi-Repo Analysis

**Feature Branch**: `231-org-aggregation`
**Created**: 2026-04-15
**Status**: Draft
**Input**: GitHub issue [#212](https://github.com/arun-gupta/repo-pulse/issues/212) — Org-level aggregation + async background analysis (lift per-run repo cap)
**Related**: #210 (CNCF Incubation Readiness), #211 (CNCF Graduation Readiness), #119 (Foundation-aware recommendations), P1-F16 (Org Inventory)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Aggregate contributor diversity across all repos in a foundation-scale org (Priority: P1)

A maintainer of a CNCF-sized project (e.g. Konveyor, ~64 active repos) opens the Org Inventory for their organization, clicks "Analyze all active repos", and waits while the browser works through every repo. When the run completes, they see an Org Summary that reports contributor diversity and elephant factor *across the whole project* — not per-repo — so they can answer foundation due-diligence questions like "what's our top-20% contributor concentration project-wide?"

**Why this priority**: This is the gap that prevents RepoPulse from being useful at foundation scale. CNCF (and similar foundations) score diversity at the project level. Without aggregation the existing per-repo views are unusable for that audience. Everything else in this spec depends on the aggregation existing.

**Independent Test**: Pick an org with multiple repos (any N), trigger "Analyze all active repos", let it complete, and verify the Org Summary's contributor-diversity readout reflects the union of `commitCountsByAuthor` across all completed repos with no truncation.

**Acceptance Scenarios**:

1. **Given** an org with 64 active repos selected, **When** the user clicks "Analyze all active repos", **Then** the browser begins analyzing them in a controlled-concurrency queue and shows live progress (repos completed / total, currently analyzing).
2. **Given** the run is in progress, **When** an individual repo's analysis fails, **Then** the failure is recorded against that repo and the queue continues with the remaining repos (per-repo error isolation per constitution §X.5).
3. **Given** the run has completed for at least 2 repos, **When** the user opens the Org Summary, **Then** contributor diversity displays the project-wide top-20% share and elephant factor computed from the union of `commitCountsByAuthor` across completed repos.

---

### User Story 2 - See cross-repo signals (maintainers, releases, security, governance) at the org level (Priority: P1)

After a successful org-wide run, the user wants the rest of the project-level picture: how many distinct maintainers does the project have across all repos, what is the worst OpenSSF Scorecard score in the project (the "weakest link"), is `GOVERNANCE.md` published at the org level, what is the project-wide release cadence?

**Why this priority**: A diversity number alone is not enough to answer "is this project foundation-ready?" The remaining aggregated signals are what foundation reviewers actually look at, and they share the same aggregation substrate as Story 1, so shipping them together avoids double-investment.

**Independent Test**: Run aggregation on an org and verify each Org Summary panel renders with values derived from per-repo results: maintainer count is a deduplicated union, OpenSSF roll-up is the worst per-repo score, releases are summed, governance detection checks the org's `.github` repo plus per-repo `GOVERNANCE.md` files.

**Acceptance Scenarios**:

1. **Given** completed per-repo results for an org, **When** the Org Summary renders, **Then** the "Maintainers" panel shows (a) the deduplicated union of CODEOWNERS / MAINTAINERS sources across repos with a project-wide count, and (b) a per-repo breakdown listing each repo's own maintainer set, so the user can see both the project-level roster and per-repo coverage (including which repos have unique maintainers not listed elsewhere).
2. **Given** completed per-repo results, **When** the Org Summary renders, **Then** the "Security posture" panel shows each repo's OpenSSF Scorecard score and the worst (lowest) score as the org roll-up.
3. **Given** completed per-repo results, **When** the Org Summary renders, **Then** "Release cadence" shows total releases in the last 12 months across the project plus the flagship repo's cadence.
4. **Given** the org has a `.github` repo containing `GOVERNANCE.md`, **When** the Org Summary renders, **Then** the "Governance" panel reports governance present at the org level; otherwise it lists per-repo `GOVERNANCE.md` presence.
5. **Given** a signal is unavailable for a repo (e.g. no Scorecard data), **When** the aggregate is computed, **Then** that repo is shown as `unavailable` in its row and excluded from numeric roll-ups (per constitution §II.3).
6. **Given** completed per-repo results, **When** the Org Summary renders, **Then** the additional panels defined by FR-019 through FR-029 (Project Footprint, Activity Rollup, Responsiveness Rollup, License Consistency, Inclusive Naming Rollup, Documentation Coverage, Languages, Stale Work, Bus-Factor Risk, Repo Age, Inactive Repos) each populate from already-fetched per-repo data and honor the same `unavailable` rules — no panel silently zeroes a missing source.

---

### User Story 3 - Live Org Summary that updates as repos complete (Priority: P2)

A run over 64 repos may take many minutes. The user expects the Org Summary to open immediately when they start the run and to fill in live as each repo completes — diversity, maintainers, releases, security, governance, and adopters panels all re-render incrementally — with per-repo failures visible inline without aborting the run.

**Why this priority**: Without a live, immediately-visible Org Summary, users will assume the app is hung and refresh — destroying in-memory results. This is a usability prerequisite for Stories 1–2 to actually be reachable in practice. It is not P1 only because the underlying aggregation can be demonstrated on smaller orgs without the live-view treatment.

**Independent Test**: Start an aggregation run; verify the Org Summary view auto-opens, that aggregate panels and the per-repo status list re-render after each repo completes, and that the view is clearly marked as "in progress (X of N)" until the run finishes.

**Acceptance Scenarios**:

1. **Given** the user clicks "Analyze all active repos", **When** the run starts, **Then** the UI auto-navigates to the Org Summary view (the user does not have to find it manually).
2. **Given** a run is in progress, **When** a repo completes, **Then** by default the Org Summary re-aggregates and re-renders within 2 seconds of that completion (per-completion update cadence).
3. **Given** the user has set the update cadence to a non-default value (e.g. "every 5 completions" or "on completion only"), **When** repos complete, **Then** the Org Summary re-renders according to that cadence; the per-repo status list still updates live regardless.
4. **Given** a repo fails mid-run, **When** the failure occurs, **Then** the user sees that repo marked as failed with the error reason inline in the Org Summary's per-repo status list and the run continues.
5. **Given** the run is still in progress, **When** the user views the Org Summary, **Then** every aggregate panel is clearly labeled "in progress (X of N)" so partial values are not mistaken for final ones.
6. **Given** the user has enabled the client-side completion notification toggle and granted browser Notification permission, **When** the run reaches terminal completion, **Then** the browser delivers a single notification summarizing the outcome (e.g. "Org analysis complete — N of M repos succeeded"). The notification fires only once at terminal completion and never for individual repo completions.
7. **Given** the user has enabled the toggle but the browser has denied Notification permission, **When** the run completes, **Then** the toggle clearly surfaces the denied state and the run still completes normally with the in-page Org Summary; no notification is attempted via any other channel.
8. **Given** a run is in progress, **When** the user views the Org Summary, **Then** a rotating open-source quote (with verified author and context, sourced from `lib/loading-quotes.ts`) is displayed and rotates every ~6 seconds; the rotation stops when the run reaches terminal completion.
9. **Given** the user initiates a run on a large org (default ≥ 25 repos), **When** they click "Analyze all active repos", **Then** a pre-run warning dialog appears stating the repo count, estimated total time, the requirement to keep the tab open, and the option to enable a completion notification; the run starts only after the user explicitly confirms.
10. **Given** a run is in progress and an individual repo's analysis is taking a long time, **When** the user watches the Org Summary, **Then** the progress bar, elapsed/remaining timer (updating at least once per second), and rotating quote continue to update on a wall-clock timer so the UI never appears frozen between repo completions.

---

### Edge Cases

- The org has 0 active repos selected → the "Analyze all active repos" button is disabled or yields a no-op with an informative message.
- All repos in a run fail → the Org Summary surfaces this state explicitly (no panels are silently zeroed).
- A repo's `commitCountsByAuthor` is missing → that repo is excluded from the contributor-diversity union and listed in the consolidated missing-data panel (FR-033) for the Org Summary.
- The user closes or refreshes the browser tab mid-run → in-memory state is lost; on return, no resumption is offered (out of scope; documented in Assumptions).
- The org has no `.github` repo and no per-repo `GOVERNANCE.md` → governance panel reports "unavailable" with a per-repo breakdown.
- Two repos report the same maintainer under different identities (handle vs. email) → maintainers are deduplicated by GitHub login when available; otherwise treated as distinct (documented limitation).
- Rate-limit exhaustion mid-run → handled per FR-032: queue pauses, in-flight rate-limited requests are re-queued (not counted as failures), countdown to auto-resume is displayed, run can be cancelled during the pause; multi-cycle pauses are supported for runs that exhaust more than one window.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow the user, from the Org Inventory tab, to trigger an org-aggregation run over any number of selected repos (N ≥ 1) via an "Analyze all active repos" action. There is no size threshold that switches between the org-aggregation flow and any other flow — the org-aggregation flow handles all sizes uniformly.
- **FR-002**: The system MUST orchestrate per-repo analysis from the user's browser, calling the existing per-repo analysis path once per repo, and MUST NOT introduce any new server-side persistence, job store, or background worker.
- **FR-003**: The system MUST limit concurrent in-flight per-repo analyses to a bounded number, **user-configurable** before starting a run, to let the user trade speed against rate-limit risk.
  (a) **Default**: 3 (a conservative balance — fast enough to feel responsive on small orgs, low enough to avoid GitHub's secondary/abuse rate limits on most accounts).
  (b) **Allowed range**: 1 to 10. The lower bound prevents a useless 0-concurrency setting; the upper bound is well below GitHub's documented concurrent-request ceiling but high enough to give a meaningful speedup. Values outside this range MUST be rejected by the UI.
  (c) **Where set**: the concurrency control MUST appear in the pre-run warning dialog (FR-017c) for large orgs, and as a setting on the Org Inventory page for all runs. The chosen value MUST be displayed in the run-status header during the run so the user knows what setting they used.
  (d) **Speed/risk guidance**: the UI MUST include a brief inline hint that higher concurrency speeds up the run but increases the chance of hitting GitHub's secondary rate limit (which then triggers the FR-032 pause/resume flow). The user MUST NOT be blocked from choosing any value in the allowed range — surfacing the trade-off is sufficient (per constitution §II — never hide data, let the user decide).
  (e) **Adaptive backoff**: if a secondary rate limit is hit (FR-032b), on auto-resume the system MUST temporarily reduce effective concurrency by half (rounded down, minimum 1) for the remainder of the run, to reduce the chance of immediately re-tripping the same limit. The reduction MUST be visible in the run-status header.
  (f) **System-level configurability**: the default concurrency value, the allowed minimum, the allowed maximum, and the adaptive-backoff factor MUST live in a single shared configuration module (consistent with constitution §VI — *"All thresholds are defined in configuration — not hardcoded in logic, not inline in components, not in constants files treated as logic"*). The configuration MUST be readable by both the UI control and the queue dispatcher without either reaching into the other. Changing any of these values MUST require only a configuration edit — no changes to scoring or queue logic.
- **FR-004**: The system MUST display live progress during a run, including: total repos, repos completed, repos failed, currently analyzing, and an estimate of remaining time.
- **FR-005**: The system MUST isolate per-repo failures so that a failing repo does not abort the run; failed repos MUST be listed with their error reason in the Org Summary.
- **FR-005a**: The per-repo status list in the Org Summary MUST be sorted **alphabetically by repo name** (case-insensitive) regardless of the order in which repos complete. Each entry MUST carry a status badge (`queued`, `in-progress`, `done`, `failed`) so the user can scan completion state without depending on row order. Alphabetical ordering is required because concurrency > 1 makes completion order non-deterministic, and a list that reorders itself on each completion would be disorienting.
- **FR-006**: The org-aggregation path MUST NOT route through `limitComparedResults()` (`lib/comparison/view-model.ts:45`); it MUST consume the full per-repo `AnalysisResult[]` directly. The Comparison table's 4-repo display cap (`COMPARISON_MAX_REPOS` in `lib/comparison/sections.ts:596`) and its enforcement on the existing Comparison view MUST remain unchanged. (The cap is a column-legibility constraint specific to the side-by-side table, not a limit on analysis itself.)
- **FR-006a**: There MUST be **no upper bound** on the number of repos the org-aggregation flow accepts. An org may have any number of repos (10, 64, 200, 1000+) and all of them MUST enter the queue and contribute to the Org Summary if selected. No constant, configuration value, slice, `.slice(0, N)`, default page-size cutoff, or implicit truncation anywhere in the org-aggregation code path may impose a maximum repo count. The only natural limits are the user's GitHub rate budget and browser memory — both of which surface as observable run state (rate-limit pause messages, per-repo failures), never as silent truncation.
- **FR-006b**: Code review for this feature MUST verify that no value of `4`, `5`, or any other small integer constant is used as a repo-count cap on the org-aggregation path. Any apparent constant must be either (a) the unrelated Comparison table's `COMPARISON_MAX_REPOS` (which the org-aggregation path does not import or call), or (b) explicitly justified with a code comment naming what it bounds and why.
- **FR-007**: The system MUST render an Org Summary view aggregating across completed per-repo results, computed entirely in the browser from in-memory data.
- **FR-008**: The Org Summary's contributor-diversity panel MUST report the project-wide top-20% contributor share and elephant factor computed from the union of `commitCountsByAuthor` across completed repos. Missing per-repo data MUST be shown as `unavailable` for that repo.
- **FR-009**: The Org Summary's maintainer panel MUST show both:
  (a) the **project-wide deduplicated union** of CODEOWNERS / MAINTAINERS sources across repos, deduplicating by GitHub login when available, with a count; and
  (b) a **per-repo breakdown** listing each repo's own maintainer set so the user can see per-repo coverage and identify maintainers unique to a single repo (i.e. not present in any other repo's maintainer set).

  **Team handles**: when CODEOWNERS lists a GitHub team handle (e.g. `@org/team-name` rather than a user login), the system MUST treat the team handle itself as a single deduplication token — it MUST NOT expand the team to its member list (team-membership lookup is out of scope). Team handles MUST be visually distinguished from user logins in the panel (e.g. a "team" tag) so the count of distinct *people* is not conflated with the count of distinct *tokens*.
- **FR-010**: The Org Summary's organizational-affiliations panel MUST aggregate `commitCountsByExperimentalOrg` across repos and MUST be rendered inside an Experimental surface with the warning required by constitution §II.7 / §VIII.6.
- **FR-011**: The Org Summary's release-cadence panel MUST surface both the sum of `releases12mo` across repos and each flagship repo's individual cadence (one row per flagship repo as defined by FR-011a).
- **FR-011a**: **Flagship repo selection.** The system MUST identify flagship repos using the org's own GitHub "pinned repositories" signal, fetched via the GraphQL `Organization.pinnedItems` field (filtered to `Repository` items only; pinned gists are ignored). Up to 6 pinned repos may be returned by GitHub.
  (a) **Primary source**: the set of pinned repos returned by `Organization.pinnedItems`, intersected with the set of repos in the current run (a pinned repo not selected for the run is not a flagship for that run's Org Summary).
  (b) **Fallback when no pinned repos exist**: the system MUST fall back to the single repo with the highest star count in the run, labeled as a "fallback flagship (no pinned repos on the org profile)" so the user knows it's a heuristic, not the org's own choice.
  (c) **Display**: flagship repos MUST be visually marked in the per-repo status list and in the panels that reference them (release cadence FR-011, adopters FR-014, governance FR-013).
  (d) **No flagship at all**: if `Organization.pinnedItems` returns nothing AND every repo in the run has `stars: unavailable`, the panels that reference a flagship MUST report "no flagship repo identified" rather than picking arbitrarily.
- **FR-012**: The Org Summary's security panel MUST list each repo's OpenSSF Scorecard score and report the worst (lowest) score as the project-level roll-up.
- **FR-013**: The Org Summary's governance panel MUST first check for `GOVERNANCE.md` in the org's `.github` repo and report org-level governance when present; otherwise it MUST list per-repo `GOVERNANCE.md` presence.
- **FR-014**: The Org Summary's adopters panel MUST parse `ADOPTERS.md` from the flagship repos (FR-011a). When multiple flagships are pinned, the panel MUST check each in pinned-order and use the first one that has an `ADOPTERS.md` (with a note showing which flagship was used). Full adopter scoring is delegated to issue #210 and is out of scope here.
- **FR-015**: When a signal is unavailable for a given repo, the system MUST honor constitution §II.3: mark it as `unavailable` and surface it in the Org Summary's consolidated missing-data panel (FR-033); it MUST NOT be silently zeroed or estimated.
- **FR-016**: When the user starts an org-aggregation run, the UI MUST auto-navigate to the Org Summary view so the run's progress and partial aggregates are immediately visible without further user action.
- **FR-016a**: The Org Summary MUST re-aggregate and re-render incrementally as repos complete. The update cadence MUST be user-configurable with the following supported settings: `per-completion` (default), `every-N-completions` (user-supplied N), and `on-completion-only` (no incremental aggregate updates; only the per-repo status list updates live).
- **FR-016b**: While a run is in progress, every aggregate panel in the Org Summary MUST be labeled "in progress (X of N)" so partial values are not mistaken for final ones.
- **FR-017**: The system MUST NOT introduce any new external service, email provider, persistence layer, or background worker. (Compliance with constitution §I — stateless Phase 1.)
- **FR-017a**: The Org Summary view MUST display a **run-status header** that shows, at all times during and after the run: total repos in the run, repos succeeded, repos failed, and repos still queued/in-progress (when applicable). These counts MUST be visible alongside the aggregate panels — not buried in a sub-view — and MUST update live as repos complete (subject to the user-configurable cadence per FR-016a).
- **FR-017b**: While a run is in progress, the Org Summary MUST display a rotating **open-source quote attribution** sourced from the existing `lib/loading-quotes.ts` collection (each quote shown with its verified author and context). Quotes MUST rotate periodically (default: every ~6 seconds) and MUST stop rotating when the run reaches terminal completion. The quote display is decorative and MUST NOT block, delay, or interfere with the run-status header, the per-repo status list, or the aggregate panels.
- **FR-017c**: When the user initiates a run on a **large org** (default threshold: ≥ 25 selected repos), the system MUST present a pre-run warning dialog summarizing: the number of repos to be analyzed, an estimated total time (derived from a per-repo estimate × N ÷ default concurrency), the fact that the browser tab must remain open, and the option to enable the client-side completion notification (FR-018). The user MUST explicitly confirm to proceed; cancelling returns them to the Org Inventory selection without starting a run. The threshold MUST be a single configurable value (not hardcoded inline). For runs below the threshold, the warning is skipped.
- **FR-017d**: To keep a long-running run feeling responsive ("constant visible progress"), the Org Summary MUST surface at least one continuously-changing visual indicator at all times during a run, even between repo completions. At minimum: a determinate progress bar (X of N), an "elapsed / estimated remaining" timer that updates at least once per second, and the rotating quote (FR-017b). These MUST update on a wall-clock timer, not solely on repo-completion events, so the user never sees a frozen UI even when an individual repo's analysis takes a long time.
- **FR-019**: The Org Summary MUST include a **Project Footprint** panel showing project-wide totals: stars (sum across repos), forks (sum), watchers (sum), and total contributors (sum of `totalContributors`). Repos with `unavailable` values for a metric MUST be excluded from that metric's sum and counted in the consolidated missing-data panel (FR-033).
- **FR-020**: The Org Summary MUST include an **Activity Rollup** panel showing project-wide totals over the last 12 months: commits (sum), PRs merged (sum), issues closed (sum), plus the most-active and least-active repo by commit count.
- **FR-021**: The Org Summary MUST include a **Responsiveness Rollup** panel showing the project-wide median first-response time on issues and median PR merge time, computed as a volume-weighted median across repos (weight = repo's issue/PR count). Repos with `unavailable` responsiveness values are excluded from the weighted median.
- **FR-022**: The Org Summary MUST include a **License Consistency** panel listing the distinct licenses (`spdxId`) detected across repos with a count per license, and flagging any non-OSI-approved license (`osiApproved === false`) as a compliance warning.
- **FR-023**: The Org Summary MUST include an **Inclusive Naming Rollup** panel showing project-wide totals of tier-1, tier-2, and tier-3 violations (summed across per-repo `InclusiveNamingCheck` results) and the count of repos with at least one violation.
- **FR-024**: The Org Summary MUST include a **Documentation Coverage** panel showing, for each documentation check (README, CONTRIBUTING, LICENSE, CODE_OF_CONDUCT, etc.), the percentage of repos in the run for which `detected === true`.
- **FR-025**: The Org Summary MUST include a **Languages** panel listing distinct `primaryLanguage` values across repos with a repo count per language. Repos with `unavailable` primary language are listed under "unknown".
- **FR-026**: The Org Summary MUST include a **Stale Work** panel showing project-wide totals of open issues, open PRs, and a volume-weighted stale-issue ratio (weight = repo's open-issue count).
- **FR-027**: The Org Summary MUST include a **Bus-Factor Risk** panel listing the repos in the run where a single contributor authored more than 50% of commits in the analyzed window (computed from `commitCountsByAuthor`). The list MUST be sorted by concentration descending. If no repos meet the threshold, the panel MUST display "no high-concentration repos found".
- **FR-028**: The Org Summary MUST include a **Repo Age** panel showing the newest and oldest repo in the run by `createdAt`, with the date for each. Useful for spotting potential archive candidates and recently-launched additions.
- **FR-029**: The Org Summary MUST include an **Inactive Repos** panel listing repos with no commits in the last 12 months (using the same activity window as FR-020). Each entry MUST show the repo name and last-commit date when available; this is presented as an abandoned-repo flag for foundation reviewers.
- **FR-030**: The Org Summary MUST be exportable in both JSON and Markdown formats via the existing export substrate (`lib/export/json-export.ts`, `lib/export/markdown-export.ts`). The export MUST include every aggregate panel (FR-008 through FR-029), the run-status header (total / succeeded / failed), the consolidated missing-data panel (FR-033), and the per-repo status list with failure reasons. Foundation reviewers MUST be able to attach the exported artifact to a submission without re-running analysis.
- **FR-031**: The Org Summary MUST expose a **Cancel run** control while a run is in progress. Activating it MUST stop dispatching new per-repo work, allow already-in-flight requests to settle (succeed or fail), and render the partial Org Summary with the run-status header marked as "cancelled (X of N completed)". A cancelled run MUST NOT be silently restartable; the user must explicitly initiate a new run.
- **FR-032**: The system MUST surface **GitHub rate-limit visibility** and handle mid-run exhaustion gracefully across both primary and secondary GitHub rate limits.

  (a) **Pre-run check**: the warning dialog (FR-017c) MUST display the user's current remaining rate budget and a coarse estimate of points required (~3 GraphQL points per repo plus any REST supplements). If the estimate exceeds remaining budget, the dialog MUST show a clear warning but MUST NOT block the user from proceeding (per constitution §II — never hide data, let the user decide). The estimate MUST be labeled as approximate.

  (b) **Detection**: the system MUST distinguish between **primary rate limits** (HTTP 403 with `x-ratelimit-remaining: 0` and an `x-ratelimit-reset` Unix timestamp) and **secondary rate limits** (HTTP 403 or 429 with a `Retry-After` header in seconds, used for abuse / concurrent-request limits). It MUST use the appropriate header for resume timing — primary uses `x-ratelimit-reset`, secondary uses `Retry-After`.

  (c) **In-flight handling on detection**: when any in-flight per-repo call returns a rate-limit response, the queue MUST immediately stop dispatching new per-repo work. Already-in-flight requests MUST be allowed to settle naturally; if they also fail with rate-limit responses, those failures MUST NOT be counted as "real" repo failures (i.e. they MUST NOT show up in the failed count or the per-repo failure list with a generic error). Instead, those repos MUST be returned to the queue in the `queued` state to be retried automatically when dispatching resumes.

  (d) **Pause UI**: while paused, the run-status header MUST clearly show: "rate-limited — auto-resumes at HH:MM (in M minutes S seconds)", a countdown that updates at least once per second (consistent with FR-017d), which limit was hit (primary vs. secondary), and the number of repos that will be re-dispatched on resume. The rotating quote and progress bar MUST continue to update so the UI never appears frozen.

  (e) **Auto-resume**: at the GitHub-reported reset time (primary) or after the `Retry-After` interval (secondary), dispatching MUST automatically resume from where the queue left off, without requiring user action. The run-status header MUST transition from "rate-limited" back to "in progress" on resume.

  (f) **Cancel during pause**: the Cancel control (FR-031) MUST remain active during a rate-limit pause. Cancelling during a pause MUST behave identically to cancelling mid-run: stop dispatching, keep partial results, mark the run "cancelled (X of N completed, paused at rate-limit)".

  (g) **Multi-cycle pauses**: the system MUST handle the case where a long run hits the rate limit more than once (each new window can also be exhausted). Each pause MUST follow the same detect → pause → auto-resume cycle. The run-status header MUST show a cumulative "pauses so far: K" counter so the user understands progress is being made between pauses.

  (h) **Tab-close during pause**: if the user closes the tab during a rate-limit pause, in-memory state is lost and the run cannot resume on return (consistent with FR-017's stateless constraint). This MUST be communicated in the pause UI as a tooltip or short note so the user can choose whether to keep the tab open.
- **FR-033**: The Org Summary MUST include a single **consolidated missing-data panel scoped to the entire org** (not per-repo, not duplicated per metric). Each entry MUST identify the (repo, missing signal) pair and the reason (e.g. "scorecard not published", "no CODEOWNERS file", "API field unavailable"). The panel MUST satisfy constitution §II.6 at the org level — every signal that any aggregate panel marked `unavailable` for any repo MUST appear here exactly once per (repo, signal) pair. Per-repo missing-data panels for individual repos remain unchanged on their own per-repo views.
- **FR-034**: When the Org Summary view is opened and zero repos have completed yet (run just started), each aggregate panel MUST render an explicit "waiting for first result" placeholder. The panels MUST NOT render numeric defaults (e.g. "0 stars"), MUST NOT render skeleton loaders that look like real data, and MUST clearly communicate that no results have arrived yet. The run-status header (FR-017a) MUST show "0 of N completed" so the user understands progress is genuinely zero, not stalled.
- **FR-035**: The per-repo status list MUST expose a **Retry** action for any repo whose status is `failed`. Activating Retry MUST re-enqueue that repo through the same queue and concurrency limits as the original run, and on success MUST update both the per-repo status and the aggregate panels per the configured cadence (FR-016a). Retry MUST be available both during and after the run.
- **FR-036**: The Org Inventory selection that feeds the org-aggregation flow MUST expose **pre-filters** for archived repos and forks (both default: excluded). The pre-filters MUST be applied before the warning dialog (FR-017c) so the displayed repo count and ETA reflect what will actually be analyzed. The user MUST be able to override either default within the same flow.
- **FR-018**: The Org Summary view MUST expose a user-controlled toggle to enable a **client-side completion notification**. When enabled, the system MUST request the browser's Notification permission on first use and, when the run finishes, deliver a single notification via the browser's Web Notifications API summarizing the result (e.g. "Org analysis complete — N of M repos succeeded"). The toggle defaults to **off**; the notification fires only on terminal completion of the run, not for individual repo completions; and no notification is delivered through any non-browser channel (no email, no push service, no server-side delivery). If the user denies browser permission, the toggle MUST surface the denied state and the run MUST still complete normally.

### Key Entities *(include if feature involves data)*

- **Org Aggregation Run**: An in-browser, ephemeral object representing a single user-initiated multi-repo analysis. Holds the list of target repos, per-repo status (queued / in-progress / done / failed), per-repo result references, and aggregate progress. Lives only in browser memory; never persisted server-side.
- **Per-Repo Result Reference**: A pointer to an existing per-repo `AnalysisResult` produced by the standard analysis path. The Org Summary computes its panels by iterating over these references in memory.
- **Org Summary**: A computed view derived purely from the set of completed Per-Repo Result References for a given org. Contains panels for contributor diversity, maintainers, org affiliations (Experimental), release cadence, security posture, governance, adopters, and a missing-data list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can run org-aggregation against an org of approximately 64 active repos end-to-end and view a populated Org Summary. Manual validation steps and signoff for this run live in the PR's `## Test plan` section (per constitution v1.2 amendment, §XII / §XIII), which is the single source of truth for manual testing — not in any in-repo checklist file.
- **SC-002**: For runs with N selected repos at any N ≥ 1 with **no upper bound** (10, 64, 200, 1000+ all behave identically apart from time taken), all N repos enter the queue. Verifiable by counting queue entries vs. selection across small, medium, and large org sizes; the Comparison table's 4-repo cap MUST NOT appear anywhere on the org-aggregation code path.
- **SC-003**: A single failed repo never aborts the run; if any repos succeed, the Org Summary still renders aggregates over those that succeeded. The Org Summary's run-status header always reports total repos, succeeded count, failed count, and (during a run) in-progress/queued count, so the user can see at a glance how many repos contributed to the aggregates and how many did not.
- **SC-004**: Progress feedback updates within 2 seconds of a repo completing, so the user does not perceive the app as hung during a multi-minute run.
- **SC-005**: Every aggregate panel in the Org Summary distinguishes "value computed from N of M repos" from "unavailable" — no panel is shown as a definitive number when sources are missing.
- **SC-006**: No new server-side persistence, background worker, email provider, or external service is introduced (verifiable by code review against constitution §I).

## Assumptions

- The existing per-repo analysis path (the synchronous request used today by the comparison flow) is reusable as the unit of work for the org-aggregation queue without modification beyond the cap change. If per-repo work itself needs to change (e.g. for rate-limit reasons), that is a separate effort.
- The user keeps the browser tab open for the duration of the run. Tab closure or refresh loses in-memory state and aborts the run; resumability is explicitly out of scope here (it would require server-side persistence, which violates constitution §I).
- The user is authenticated via OAuth (or `DEV_GITHUB_PAT` in development per issue #207) and their personal GitHub rate budget is sufficient for the run; the system does not provision a shared API quota.
- "Active repos" is already a concept defined by the Org Inventory tab (P1-F16). This spec adopts that definition without redefining it.
- Flagship repos are identified per FR-011a using the GitHub `Organization.pinnedItems` GraphQL field (the org's own "pinned repositories" choice on its profile page), with a most-stars fallback when no pinned repos exist. This is one additional GraphQL request per run (against the org, not per-repo) and adds negligible cost to the rate budget.
- CNCF readiness lens consumption of the Org Summary (#210, #211) is wired in those issues, not here. This spec only ensures the Org Summary exists and exposes the necessary aggregated values.
- Email notification, server-side `job_id` persistence, and "we'll notify you when done" out-of-tab delivery (mentioned in issue #212) are deferred. They require either a constitution amendment (to drop the stateless Phase 1 constraint) or a new infrastructure dependency. They will be filed as follow-up issues if the constraint is later relaxed.
- Multi-org compare, historical org snapshots, and real-time incremental updates remain out of scope per the issue's own out-of-scope list.
