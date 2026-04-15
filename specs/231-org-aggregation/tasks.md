# Tasks: Org-Level Aggregation with Client-Orchestrated Multi-Repo Analysis

**Feature branch**: `231-org-aggregation`
**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Data model**: [data-model.md](./data-model.md) · **Contracts**: [contracts/](./contracts/)

**TDD ordering**: Per constitution §XI (NON-NEGOTIABLE), every implementation task is preceded by a failing test task in the same story. Red → Green → Refactor.

**Format**: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- **[P]** = parallelizable with other [P] tasks in the same phase (different files, no shared deps)
- **[US1]/[US2]/[US3]** = maps to spec.md user story
- Setup, Foundational, and Polish phases have no story label

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration, types, and directory scaffolding shared by all stories.

- [ ] T001 Create directory `lib/org-aggregation/` and `lib/org-aggregation/aggregators/` with empty `index.ts` placeholders so subsequent imports resolve
- [ ] T002 Create directory `components/org-summary/` and `components/org-summary/panels/` with empty `index.ts` placeholders
- [ ] T003 Create directory `app/api/org/pinned/` (route file populated in T040)
- [ ] T004 [P] Create `lib/config/org-aggregation.ts` with `ORG_AGGREGATION_CONFIG` per data-model.md (concurrency default/min/max/backoff factor, large-org warning threshold, update cadence default, quote rotation interval, wall-clock tick interval, inactive-repo window, pre-filter defaults)
- [ ] T005 [P] Create `lib/config/org-aggregation.test.ts` asserting the config shape, value bounds (`min < default < max`, `0 < backoffFactor < 1`), and that all required keys exist (constitution §VI gate)

**Checkpoint**: config exists, importable; directories exist.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Framework-agnostic types and pure utility functions used by every story. Must complete before any story phase. No React, no Next.js imports allowed in this phase.

- [ ] T006 [P] Create `lib/org-aggregation/types.ts` re-exporting every interface and type from `specs/231-org-aggregation/contracts/org-aggregation-types.ts` (the contract file is the source of truth)
- [ ] T007 [P] Create `lib/org-aggregation/aggregators/types.ts` re-exporting every interface from `specs/231-org-aggregation/contracts/aggregator-contracts.ts`
- [ ] T008 [P] Write `lib/org-aggregation/rate-limit.test.ts` (Red): exhaustive tests for `classifyRateLimitResponse(res)` — primary (403 + `x-ratelimit-remaining: 0` + `x-ratelimit-reset`), secondary (403 or 429 + `Retry-After`), neither header → `none`, both headers → `primary` wins (per research R4)
- [ ] T009 Implement `lib/org-aggregation/rate-limit.ts` to make T008 green; pure function, no I/O
- [ ] T010 [P] Write `lib/org-aggregation/missing-data.test.ts` (Red): for a given `AnalysisResult[]` and an `unavailable` map per signal, returns `MissingDataEntry[]` with each `(repo, signalKey)` pair appearing exactly once across all panels (FR-033 invariant 6)
- [ ] T011 Implement `lib/org-aggregation/missing-data.ts` to make T010 green
- [ ] T012 [P] Write `lib/org-aggregation/flagship.test.ts` (Red): `selectFlagshipRepos(pinnedFromApi, runRepos, perRepoStars)` — pinned ∩ runRepos preserves rank; empty pinned + at-least-one star → fallback-most-stars with single marker; empty pinned + all stars unavailable → `[]`; pinned-only-gists treated as empty (FR-011a a/b/d)
- [ ] T013 Implement `lib/org-aggregation/flagship.ts` to make T012 green
- [ ] T014 Add an ESLint rule (or a `npm test` gate via a small custom test) that fails if any file under `lib/org-aggregation/` imports from `react`, `next/`, or `components/` — enforces constitution §IV / data-model invariant 7. Place the gate at `lib/org-aggregation/__no-framework-imports.test.ts`

**Checkpoint**: pure utilities tested + green; framework-isolation gate active.

---

## Phase 3: User Story 1 — Aggregate contributor diversity across all repos in a foundation-scale org (P1)

**Story goal**: A maintainer of a CNCF-sized project triggers "Analyze all active repos" and sees a project-wide contributor-diversity readout (top-20% share + elephant factor) computed from the union of `commitCountsByAuthor` across all completed repos.

**Independent test**: Pick an org with multiple repos, trigger the flow, let it complete, verify Story 1 acceptance scenario 3 (contributor diversity reflects union across all completed repos, not just the first N). Quickstart §4 covers the smaller-org variant.

### TDD: queue (Red → Green)

- [ ] T015 [US1] Write `lib/org-aggregation/queue.test.ts` (Red): a single test file covering — bounded concurrency (never more than `concurrency` in flight), queue drains in alphabetical-by-repo order with concurrency=1, all complete → `complete` event, single per-repo failure does not abort run (FR-005 / §X.5), cancel during run stops dispatch and emits `cancelled` (FR-031), retry of failed repo via `retry(repo)` re-enters queue (FR-035), rate-limited response triggers `paused` event with re-queue of in-flight repos as `queued` (FR-032c), auto-resume at `resumesAt` triggers `resumed` event, secondary-limit resume halves `effectiveConcurrency` per `ORG_AGGREGATION_CONFIG.concurrency.secondaryRateLimitBackoffFactor` (FR-003e), multi-cycle pauses tracked in `pauseHistory` (FR-032g)
- [ ] T016 [US1] Implement `lib/org-aggregation/queue.ts` to make T015 green: in-house Promise-based concurrency limiter per research R1; emits `QueueEvent` per contracts; takes a `dispatchOne(repo) => Promise<DispatchResult>` injection so the queue stays GitHub-agnostic and is unit-testable without network

### TDD: contributor-diversity aggregator (Red → Green)

- [ ] T017 [P] [US1] Write `lib/org-aggregation/aggregators/contributor-diversity.test.ts` (Red) covering the four mandatory cases per `aggregator-contracts.ts` "Test-coverage contract" (typical, all-unavailable, mixed, empty) plus FR-008 specifics: union of `commitCountsByAuthor` across repos, top-20% share = sum of top quintile / total commits, elephant factor = min count of authors covering 50% of commits
- [ ] T018 [US1] Implement `lib/org-aggregation/aggregators/contributor-diversity.ts` to make T017 green

### TDD: view-model composition for Story 1's MVP slice

- [ ] T019 [US1] Write `lib/org-aggregation/view-model.test.ts` (Red) for the MVP composition: `buildOrgSummaryViewModel(run, panels)` returns a `RunStatusHeader` with correct counts (FR-017a invariants — total = succeeded + failed + inProgress + queued), `perRepoStatusList` sorted alphabetically with badges (FR-005a), and the contributor-diversity panel populated. Other panels deferred to US2.
- [ ] T020 [US1] Implement `lib/org-aggregation/view-model.ts` to make T019 green; exports `buildOrgSummaryViewModel` and a pure `computeRunStatusHeader(run)` helper

### Wiring (React + UI for the MVP slice)

- [ ] T021 [US1] Write `components/shared/hooks/useOrgAggregation.test.tsx` (Red) using RTL + Vitest fake timers: starting a run dispatches per-repo calls, `QueueEvent`s update React state, on `complete` the hook fires the optional notification (FR-018) only if user opted in, hook honors `updateCadence` (per-completion / every-N / on-completion-only) for re-aggregation, but the per-repo status list updates live regardless (FR-016a)
- [ ] T022 [US1] Implement `components/shared/hooks/useOrgAggregation.ts` to make T021 green; bridges `lib/org-aggregation/queue.ts` events to React state via `useReducer`; injects a `dispatchOne` that calls the existing `POST /api/analyze`
- [ ] T023 [US1] Write `components/org-summary/OrgSummaryView.test.tsx` (Red): renders RunStatusHeader, PerRepoStatusList, ContributorDiversityPanel, EmptyState (when zero done), and the in-progress label "in progress (X of N)" on each panel mid-run
- [ ] T024 [US1] Implement `components/org-summary/OrgSummaryView.tsx`
- [ ] T025 [P] [US1] Implement `components/org-summary/RunStatusHeader.tsx` + test (FR-017a — total / succeeded / failed / in-progress / queued + concurrency display)
- [ ] T026 [P] [US1] Implement `components/org-summary/PerRepoStatusList.tsx` + test (FR-005a alphabetical with status badges; retry button on failed entries, FR-035 — handler comes from hook)
- [ ] T027 [P] [US1] Implement `components/org-summary/EmptyState.tsx` + test (FR-034 — explicit "Waiting for first result" copy, no zeros, no skeletons)
- [ ] T028 [P] [US1] Implement `components/org-summary/panels/ContributorDiversityPanel.tsx` + test (renders `AggregatePanel<ContributorDiversityValue>`; "in progress (X of N)" when status === 'in-progress'; "unavailable" placeholder when status === 'unavailable')
- [ ] T029 [US1] Modify `components/org-inventory/OrgInventoryView.tsx` to add the "Analyze all active repos" button that initializes a run via `useOrgAggregation` and auto-navigates to OrgSummaryView (FR-016). For US1 the warning dialog is bypassed (covered in US3); pre-filters covered in T076. Update `components/org-inventory/OrgInventoryView.test.tsx` to assert the new button and its handler.

**Checkpoint US1**: A user can run the org-aggregation flow on a small org, see live progress, and see a populated contributor-diversity panel at the end.

---

## Phase 4: User Story 2 — See cross-repo signals (maintainers, releases, security, governance, and 12 other panels) at the org level (P1)

**Story goal**: Beyond contributor diversity, the Org Summary surfaces 15 additional aggregated panels (FR-009 through FR-029) so foundation reviewers can answer the rest of their due-diligence questions in one view.

**Independent test**: After a successful run, every panel either renders a value derived from per-repo data or is shown as `unavailable`; spot-check 2–3 panel values against the per-repo source data.

### Server-side flagship endpoint

- [ ] T030 [P] [US2] Write `app/api/org/pinned/route.test.ts` (Red): GET with valid org returns the contract shape from `contracts/pinned-repos-api.md`; missing `org` → 400; unauthenticated → 401; GraphQL pinned-only-gists → empty `pinned` array; `stargazerCount: null` → `stars: "unavailable"`. Mock GraphQL per constitution §XI.3.
- [ ] T031 [US2] Implement `app/api/org/pinned/route.ts` to make T030 green; uses the GraphQL query in research R5

### TDD: aggregators (one Red→Green pair per panel — all parallelizable across files)

- [ ] T032 [P] [US2] Write `lib/org-aggregation/aggregators/maintainers.test.ts` (Red) — 4 mandatory cases + FR-009 specifics: project-wide deduplicated union, per-repo breakdown, GitHub-team handles (`@org/team-name`) treated as single tokens not expanded, kind tag `'user' | 'team'` set correctly, dedup by login when available
- [ ] T033 [US2] Implement `lib/org-aggregation/aggregators/maintainers.ts`
- [ ] T034 [P] [US2] Write `lib/org-aggregation/aggregators/org-affiliations.test.ts` (Red) — 4 mandatory cases + FR-010 (Experimental surface; aggregates `commitCountsByExperimentalOrg`, attributed/unattributed counts)
- [ ] T035 [US2] Implement `lib/org-aggregation/aggregators/org-affiliations.ts`
- [ ] T036 [P] [US2] Write `lib/org-aggregation/aggregators/release-cadence.test.ts` (Red) — 4 mandatory cases + FR-011 (sum of `releases12mo` across repos; per-flagship rows in pinned-rank order)
- [ ] T037 [US2] Implement `lib/org-aggregation/aggregators/release-cadence.ts`
- [ ] T038 [P] [US2] Write `lib/org-aggregation/aggregators/security-rollup.test.ts` (Red) — 4 mandatory cases + FR-012 (per-repo Scorecard scores list, worst score as roll-up; null roll-up if every repo unavailable)
- [ ] T039 [US2] Implement `lib/org-aggregation/aggregators/security-rollup.ts`
- [ ] T040 [P] [US2] Write `lib/org-aggregation/aggregators/governance.test.ts` (Red) — 4 mandatory cases + FR-013 (`.github` repo `GOVERNANCE.md` org-level detection; per-repo `GOVERNANCE.md` fallback list)
- [ ] T041 [US2] Implement `lib/org-aggregation/aggregators/governance.ts`
- [ ] T042 [P] [US2] Write `lib/org-aggregation/aggregators/adopters.test.ts` (Red) — 4 mandatory cases + FR-014 (walks flagship repos in pinned-rank order, uses first one with `ADOPTERS.md`, records `flagshipUsed`)
- [ ] T043 [US2] Implement `lib/org-aggregation/aggregators/adopters.ts`
- [ ] T044 [P] [US2] Write `lib/org-aggregation/aggregators/project-footprint.test.ts` (Red) — 4 mandatory cases + FR-019 (sum of stars/forks/watchers/totalContributors; unavailable values excluded from sums)
- [ ] T045 [US2] Implement `lib/org-aggregation/aggregators/project-footprint.ts`
- [ ] T046 [P] [US2] Write `lib/org-aggregation/aggregators/activity-rollup.test.ts` (Red) — 4 mandatory cases + FR-020 (sum of commits/PRs merged/issues closed; most- and least-active repo)
- [ ] T047 [US2] Implement `lib/org-aggregation/aggregators/activity-rollup.ts`
- [ ] T048 [P] [US2] Write `lib/org-aggregation/aggregators/responsiveness-rollup.test.ts` (Red) — 4 mandatory cases + FR-021 weighted-median algorithm per research R6 with the worked example as a test
- [ ] T049 [US2] Implement `lib/org-aggregation/aggregators/responsiveness-rollup.ts` including a `weightedMedian(pairs)` helper
- [ ] T050 [P] [US2] Write `lib/org-aggregation/aggregators/license-consistency.test.ts` (Red) — 4 mandatory cases + FR-022 (distinct SPDX IDs with counts; non-OSI flag)
- [ ] T051 [US2] Implement `lib/org-aggregation/aggregators/license-consistency.ts`
- [ ] T052 [P] [US2] Write `lib/org-aggregation/aggregators/inclusive-naming-rollup.test.ts` (Red) — 4 mandatory cases + FR-023 (tier-1/2/3 totals; reposWithAnyViolation)
- [ ] T053 [US2] Implement `lib/org-aggregation/aggregators/inclusive-naming-rollup.ts`
- [ ] T054 [P] [US2] Write `lib/org-aggregation/aggregators/documentation-coverage.test.ts` (Red) — 4 mandatory cases + FR-024 (per-check % of repos with `detected === true`)
- [ ] T055 [US2] Implement `lib/org-aggregation/aggregators/documentation-coverage.ts`
- [ ] T056 [P] [US2] Write `lib/org-aggregation/aggregators/languages.test.ts` (Red) — 4 mandatory cases + FR-025 (group-by primaryLanguage; "unknown" bucket)
- [ ] T057 [US2] Implement `lib/org-aggregation/aggregators/languages.ts`
- [ ] T058 [P] [US2] Write `lib/org-aggregation/aggregators/stale-work.test.ts` (Red) — 4 mandatory cases + FR-026 (sums of open issues/PRs; weighted stale-issue ratio)
- [ ] T059 [US2] Implement `lib/org-aggregation/aggregators/stale-work.ts`
- [ ] T060 [P] [US2] Write `lib/org-aggregation/aggregators/bus-factor.test.ts` (Red) — 4 mandatory cases + FR-027 (repos where one author > 50%; sorted descending; "no high-concentration repos" empty state)
- [ ] T061 [US2] Implement `lib/org-aggregation/aggregators/bus-factor.ts`
- [ ] T062 [P] [US2] Write `lib/org-aggregation/aggregators/repo-age.test.ts` (Red) — 4 mandatory cases + FR-028 (newest/oldest by createdAt)
- [ ] T063 [US2] Implement `lib/org-aggregation/aggregators/repo-age.ts`
- [ ] T064 [P] [US2] Write `lib/org-aggregation/aggregators/inactive-repos.test.ts` (Red) — 4 mandatory cases + FR-029 (no commits in `inactiveRepoWindowMonths` from config)
- [ ] T065 [US2] Implement `lib/org-aggregation/aggregators/inactive-repos.ts`

### View-model expansion + consolidated missing-data + flagship integration

- [ ] T066 [US2] Extend `lib/org-aggregation/view-model.test.ts` (Red): all 18 panels populate; `OrgSummaryViewModel.missingData` is the consolidated org-level panel (FR-033 — each `(repo, signalKey)` once); `flagshipRepos` is set from the result of `selectFlagshipRepos`
- [ ] T067 [US2] Extend `lib/org-aggregation/view-model.ts` to make T066 green; calls every aggregator and `composeMissingData(panels)`

### Panel components (parallelizable — one file per panel)

- [ ] T068 [P] [US2] Implement `components/org-summary/panels/MaintainersPanel.tsx` + test (FR-009 — visual distinction between user and team tokens)
- [ ] T069 [P] [US2] Implement `components/org-summary/panels/OrgAffiliationsPanel.tsx` + test (rendered inside the existing Experimental surface with the §II.7 / §VIII.6 warning)
- [ ] T070 [P] [US2] Implement `components/org-summary/panels/ReleaseCadencePanel.tsx` + test
- [ ] T071 [P] [US2] Implement `components/org-summary/panels/SecurityRollupPanel.tsx` + test
- [ ] T072 [P] [US2] Implement `components/org-summary/panels/GovernancePanel.tsx` + test
- [ ] T073 [P] [US2] Implement `components/org-summary/panels/AdoptersPanel.tsx` + test (shows which flagship was used)
- [ ] T074 [P] [US2] Implement `components/org-summary/panels/ProjectFootprintPanel.tsx` + test
- [ ] T075 [P] [US2] Implement `components/org-summary/panels/ActivityRollupPanel.tsx` + test
- [ ] T076 [P] [US2] Implement `components/org-summary/panels/ResponsivenessRollupPanel.tsx` + test
- [ ] T077 [P] [US2] Implement `components/org-summary/panels/LicenseConsistencyPanel.tsx` + test
- [ ] T078 [P] [US2] Implement `components/org-summary/panels/InclusiveNamingRollupPanel.tsx` + test
- [ ] T079 [P] [US2] Implement `components/org-summary/panels/DocumentationCoveragePanel.tsx` + test
- [ ] T080 [P] [US2] Implement `components/org-summary/panels/LanguagesPanel.tsx` + test
- [ ] T081 [P] [US2] Implement `components/org-summary/panels/StaleWorkPanel.tsx` + test
- [ ] T082 [P] [US2] Implement `components/org-summary/panels/BusFactorPanel.tsx` + test
- [ ] T083 [P] [US2] Implement `components/org-summary/panels/RepoAgePanel.tsx` + test
- [ ] T084 [P] [US2] Implement `components/org-summary/panels/InactiveReposPanel.tsx` + test
- [ ] T085 [P] [US2] Implement `components/org-summary/ConsolidatedMissingDataPanel.tsx` + test (FR-033 — flat list of `(repo, signal, reason)` entries)
- [ ] T086 [US2] Extend `components/org-summary/OrgSummaryView.tsx` to render all 18 panels + the consolidated missing-data panel; mark flagship repos in the per-repo status list (FR-011a.c). Update its test to cover the full layout.
- [ ] T087 [US2] Wire `useOrgAggregation` to call `GET /api/org/pinned` once at run start, pass the result through `selectFlagshipRepos`, and store on the run before dispatch begins. Extend the hook's test.

### Pre-filters for archived/forks (FR-036)

- [ ] T088 [US2] Extend `components/org-inventory/OrgInventoryView.tsx` with two checkboxes "Exclude archived repos" and "Exclude forks", both default true per `ORG_AGGREGATION_CONFIG.preFilters`. Apply filters before computing the run repo list. Extend the existing test.

**Checkpoint US2**: After a run, the Org Summary renders all 18 panels, the consolidated missing-data panel, flagship markers, and pre-filters work.

---

## Phase 5: User Story 3 — Live Org Summary that updates as repos complete (P2)

**Story goal**: The Org Summary auto-opens at run start, fills in incrementally per the configured update cadence, and uses progress + a wall-clock tick + a rotating quote so the UI never appears frozen during long runs. Large-org runs gate behind a pre-run warning dialog with concurrency control and a completion-notification opt-in. Cancel and rate-limit handling complete the loop.

**Independent test**: Quickstart §4 covers small-org live updates; §5 covers the large-org / rate-limit / multi-cycle pause scenario.

### Pre-run warning dialog (FR-017c)

- [ ] T089 [US3] Write `components/org-summary/PreRunWarningDialog.test.tsx` (Red): appears only at >= `largeOrgWarningThreshold` repos; shows repo count, ETA estimate (per-repo × N ÷ concurrency), tab-open warning; concurrency control accepts only 1–10; notification opt-in toggle; rate-budget pre-check rendered; explicit confirm starts the run; cancel returns to inventory
- [ ] T090 [US3] Implement `components/org-summary/PreRunWarningDialog.tsx`
- [ ] T091 [US3] Wire the dialog into `OrgInventoryView` so clicking "Analyze all active repos" with N >= threshold opens the dialog (T029 path becomes the small-org path). Update tests.

### Progress indicators + rotating quote (FR-017b/d)

- [ ] T092 [US3] Write `components/org-summary/ProgressIndicator.test.tsx` (Red) using fake timers: progress bar = (succeeded + failed) / total; elapsed timer increments at least once per second from a `setInterval` (per research R3); rotating quote sourced from `lib/loading-quotes.ts` rotates every `quoteRotationIntervalMs`; rotation stops on terminal completion
- [ ] T093 [US3] Implement `components/org-summary/ProgressIndicator.tsx`
- [ ] T094 [US3] Embed `ProgressIndicator` in `OrgSummaryView`; test integration

### Configurable update cadence (FR-016a)

- [ ] T095 [US3] Extend `useOrgAggregation` and its test to honor the three cadence modes — per-completion (default, re-aggregate every event), every-N (re-aggregate every Nth done), on-completion-only (re-aggregate only on `complete`). Per-repo status list MUST update live regardless of cadence (FR-016a).
- [ ] T096 [US3] Add a cadence selector to `OrgSummaryView` (default from config); test

### Cancel (FR-031)

- [ ] T097 [US3] Add a Cancel button to `RunStatusHeader` that calls `queue.cancel()`; verify per existing T015 tests that already cover queue cancel behavior; assert the cancelled run's header reads "cancelled (X of N completed)". Extend `OrgSummaryView.test.tsx`.

### Rate-limit pause UI (FR-032)

- [ ] T098 [US3] Write `components/org-summary/RateLimitPausePanel.test.tsx` (Red): shows when `RunStatusHeader.pause !== null` — kind (primary/secondary), live countdown (≥ 1Hz from setInterval), reposToReDispatch count, "pauses so far: K" counter, Cancel still active during pause; unmounts on resume
- [ ] T099 [US3] Implement `components/org-summary/RateLimitPausePanel.tsx`
- [ ] T100 [US3] Wire `RateLimitPausePanel` into `OrgSummaryView`; test that on `paused` event the panel appears, on `resumed` it disappears, and effective concurrency in the header reflects the FR-003e backoff for secondary

### Completion notification (FR-018)

- [ ] T101 [US3] Extend `components/org-summary/RunStatusHeader.test.tsx` (Red) to assert the notification toggle: defaults off, requesting permission on first toggle-on, denied state surfaces "denied — re-enable in browser settings" without re-prompting (per research R2)
- [ ] T102 [US3] Implement the toggle in `RunStatusHeader.tsx`; wire `useOrgAggregation` to fire `new Notification(...)` exactly once on terminal completion when `notificationOptIn === true` and permission is `granted`

### Retry failed repos (FR-035)

- [ ] T103 [US3] Confirm the per-repo Retry button (already in `PerRepoStatusList` from T026) calls `useOrgAggregation.retry(repo)`; ensure both during-run and after-run retries work. Extend `PerRepoStatusList.test.tsx`.

### Export (FR-030)

- [ ] T104 [P] [US3] Write `lib/export/org-summary-json-export.test.ts` (Red): JSON includes run-status header, every panel value, consolidated missing-data, per-repo status list with reasons; round-trips through `JSON.parse` cleanly
- [ ] T105 [US3] Implement `lib/export/org-summary-json-export.ts`
- [ ] T106 [P] [US3] Write `lib/export/org-summary-markdown-export.test.ts` (Red): Markdown structure matches existing per-repo Markdown export style; every panel section present; missing-data table rendered
- [ ] T107 [US3] Implement `lib/export/org-summary-markdown-export.ts`
- [ ] T108 [US3] Add Export buttons (JSON, Markdown) to `OrgSummaryView`; test

**Checkpoint US3**: Live updates, pre-run warning, cancel, rate-limit pause/resume, retry, notification, and export all green. All 17 functional requirement groups covered.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T108a [P] Dark-mode sweep: every component under `components/org-summary/` (OrgSummaryView, RunStatusHeader, PerRepoStatusList, ProgressIndicator, PreRunWarningDialog, RateLimitPausePanel, ConsolidatedMissingDataPanel, EmptyState, and all 18 `panels/*`) MUST use Tailwind `dark:` variants for every non-transparent color utility (backgrounds, text, borders, ring, shadow) so the view renders correctly under the existing `ThemeProvider` (merged to main via PR #88, #239). Cross-check by flipping `ThemeToggle` in the dev server and confirming no panel has low-contrast or hardcoded light-only styling.
- [ ] T108b [P] Add a dark-mode RTL test at `components/org-summary/OrgSummaryView.dark-mode.test.tsx` that renders `OrgSummaryView` inside `<ThemeProvider>` with `choice='dark'` and asserts at least one text element uses a `dark:text-*` utility. Acts as a gate against future regressions when new panels are added.
- [ ] T109 [P] Add Playwright happy-path E2E at `tests/e2e/org-aggregation.spec.ts`: sign in (DEV_GITHUB_PAT path), open a small public org's inventory, click "Analyze all active repos", confirm dialog (or skip if below threshold), wait for completion, assert OrgSummary panels present
- [ ] T110 [P] Update `docs/DEVELOPMENT.md` Phase 1 implementation order table — append a row for `231-org-aggregation` marked `✅ Done`; add a short note under "Adding a new scoring signal" if any new signal touchpoints were added (none expected)
- [ ] T111 [P] Update `README.md` with a short "Analyzing a whole org" subsection describing the "Analyze all active repos" flow and where to find the Org Summary
- [ ] T112 Run `npm test`, `npm run test:e2e`, `npm run lint`, `DEV_GITHUB_PAT= npm run build` from `quickstart.md` "Validation commands" — fix any failures
- [ ] T113 Manual quickstart §5 walkthrough on a CNCF-sized org (Konveyor or similar). Record the org, repo count, total duration, pause count, and any failures in the PR Test Plan section of the PR body (per constitution v1.2 §XII / §XIII — single source of truth for manual signoff)
- [ ] T114 Open PR with `## Test plan` section listing every scenario from quickstart §1–§5 as checkboxes (not yet ticked). Push branch with `git push -u origin 231-org-aggregation`. Do not merge (per CLAUDE.md PR Merge Rule).

---

## Dependencies

- **Setup (Phase 1)** blocks Foundational and all stories
- **Foundational (Phase 2)** blocks all user stories — pure types + utilities + framework-isolation gate
- **US1 (Phase 3)** is the MVP slice — independently shippable as "contributor diversity at org level" if US2/US3 slip
- **US2 (Phase 4)** depends on US1's queue, view-model, and OrgSummaryView shells (T016, T020, T024). Aggregator pairs (T032..T065) are mostly parallelizable across files
- **US3 (Phase 5)** depends on US1's hook + view (T022, T024) and US2's full panel set; rate-limit pause UI depends on queue's pause/resume events from T015/T016
- **Polish (Phase 6)** depends on all stories complete

## Parallel execution opportunities

**Within Phase 1**: T004 and T005 in parallel after directories exist (T001–T003 sequential).
**Within Phase 2**: T006, T007, T008, T010, T012 can all start in parallel (different files); each `Red` is independent. T009/T011/T013 follow their own Red.
**Within Phase 3 (US1)**: T015 and T017 in parallel; T025/T026/T027/T028 in parallel after T024. T021 in parallel with T015/T017.
**Within Phase 4 (US2)**: All 17 aggregator Red tests (T032, T034, T036, T038, T040, T042, T044, T046, T048, T050, T052, T054, T056, T058, T060, T062, T064) can be written in parallel by different implementers, each followed by its sequential Green. The 18 panel components (T068–T085) are all parallelizable.
**Within Phase 5 (US3)**: T104 and T106 in parallel.

## MVP scope

US1 alone is shippable as an MVP that delivers the contributor-diversity story. US2 broadens to the full 18-panel readout. US3 adds the live + large-org polish. Each can ship as its own PR if needed; this plan ships them together since they share substrate and the cumulative manual test is one walkthrough.

## Total task count

116 tasks · US1: 15 · US2: 59 · US3: 20 · Setup: 5 · Foundational: 9 · Polish: 8 (incl. dark-mode sweep T108a/T108b)
