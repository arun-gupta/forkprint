# Handoff — Issue #212 org-level aggregation

**Branch**: `231-org-aggregation`
**Last commit**: `b111ffd` (see `git log --oneline main..HEAD`)
**Unpushed**: yes; branch exists only locally

## TL;DR for the next agent

- **Spec / plan / tasks are frozen and committed** under `specs/231-org-aggregation/`. Don't regenerate — read.
- **US1 MVP is green**: queue + contributor-diversity aggregator (+ composition + 5-window selector) + minimal Org Summary UI. 733/734 tests pass (1 skipped — documented below).
- **A dev preview page exists at `/dev/org-summary`** with 5 canned scenarios (empty / in-progress / with-failure / paused / complete). Used for visual verification. It is NOT wired to real analysis.
- **US1 is not yet integrated into the real Org Inventory flow** — task T029 was intentionally deferred so it lands alongside US2's flagship endpoint and archived/forks pre-filters in one coherent commit. Do not try to force T029 in isolation.
- **Constitution is strict**: `/Users/arungupta/workspaces/forkprint-212-org-level-aggregation-async-background-a/.specify/memory/constitution.md`. Phase 1 is stateless — no server-side jobs, no DB, no email. The spec's Option B scope was chosen specifically to respect that.
- **Dev server** already running on port 3011 in this worktree (managed by `scripts/claude-worktree.sh`). `dev.log` + `.dev.pid` at repo root.

## Spec is the source of truth

Read in this order before touching code:

1. `specs/231-org-aggregation/spec.md` — 4 user stories, ~40 functional requirements, 6 success criteria. Every design decision justified.
2. `specs/231-org-aggregation/plan.md` — the implementation plan; constitution gate passes with zero violations.
3. `specs/231-org-aggregation/tasks.md` — the canonical 116-task, TDD-ordered list. Every remaining task still references US1/US2/US3/Polish phases and specific file paths. **Use the existing IDs (T030, T031, …) — don't renumber.**
4. `specs/231-org-aggregation/research.md` — 8 Decision/Rationale/Alternatives records. Important ones: queue strategy (in-house, not p-limit), rate-limit header parsing, empty-state placeholder, weighted-median algorithm with worked example.
5. `specs/231-org-aggregation/data-model.md` — entity shapes and 7 invariants. Invariant 7 (framework isolation) is enforced by a test gate (see below).
6. `specs/231-org-aggregation/contracts/` — TypeScript contract files used as source of truth for `lib/org-aggregation/types.ts` + `aggregators/types.ts`.
7. `specs/231-org-aggregation/quickstart.md` — local validation steps; step 5 is the CNCF-scale PR Test Plan signoff.

## What's built (commits, in order)

| Commit | Scope |
|---|---|
| `18f56e5` | Spec |
| `a2164e8` | Plan + research + data-model + contracts + quickstart |
| `298415f` | 114 TDD-ordered tasks in `tasks.md` |
| `5cf1f5d` | Tasks: added T108a/T108b dark-mode sweep after rebase onto main (main had merged #88/#239 dark mode) |
| `6106fc7` | **Phase 1 + 2**: `lib/config/org-aggregation.ts`, `lib/org-aggregation/{types,rate-limit,missing-data,flagship,__no-framework-imports}.ts` + tests |
| `66dadd5` | **US1 core** (T015–T020): queue, contributor-diversity aggregator, view-model |
| `46fac97` | **US1 React** (T021–T028): `useOrgAggregation` hook, `OrgSummaryView`, `RunStatusHeader`, `PerRepoStatusList`, `EmptyState`, `ContributorDiversityPanel` (all dark-mode-ready) |
| `b111ffd` | **US1 polish**: 5-window selector, reconciled composition (see "Gotchas"), Pause/Resume queue methods + icon buttons (media-player style: ∥ ▶ ■), HelpLabel tooltips, dev preview page, "in progress" redundancy removed |

## What's next (order of operations)

### Immediate (pick up here)

Read `specs/231-org-aggregation/tasks.md`. You're about to start **Phase 4: User Story 2**. It's 59 tasks but most are independent — the 17 additional aggregators plus their 17 panel components parallelize freely across files. Order that minimizes rework:

1. **T030 + T031**: `app/api/org/pinned/route.ts` (GET `/api/org/pinned`) per `contracts/pinned-repos-api.md`. Small and unlocks `useOrgAggregation`'s default `fetchPinned` implementation end-to-end.
2. **T088**: Archived/forks pre-filters in `OrgInventoryView.tsx` (config defaults are already in `ORG_AGGREGATION_CONFIG.preFilters`).
3. **T029 from Phase 3**: add the "Analyze all active repos" button to `OrgInventoryView.tsx`. It was deferred from US1 on purpose — now is when it lands. Wire it to `useOrgAggregation.start()`, and render `OrgSummaryView` inside the results shell.
4. **T032–T065**: 17 more aggregators as Red→Green pairs. Every aggregator's tests must cover the four mandatory cases listed in `contracts/aggregator-contracts.ts`: typical / all-unavailable / mixed / empty. **Follow the pattern already set by `lib/org-aggregation/aggregators/contributor-diversity.ts`** — one test file per aggregator, pure functions, no I/O, no framework imports.
5. **T066 + T067**: extend `lib/org-aggregation/view-model.ts` (`buildOrgSummaryViewModel`) to call every aggregator and compose `missingData` from each panel's `unavailable` records. Use `composeMissingData` from `lib/org-aggregation/missing-data.ts` (already implemented).
6. **T068–T086**: 17 panel components that render each `AggregatePanel<T>`. Same pattern as `ContributorDiversityPanel.tsx`. All must use Tailwind `dark:` variants (T108a sweep).
7. **T087**: flagship integration into the hook — already wired in `useOrgAggregation.ts` via `fetchPinned` + `selectFlagshipRepos`, but double-check it's called once at run start and `run.flagshipRepos` is propagated.

### After US2

**Phase 5 (US3)**: live updates + pre-run warning dialog + cancel + rate-limit pause UI + retry + completion notification + export. 20 tasks. User explicitly deferred the concurrency slider (FR-003c / T089–T091) with "lets keep it for later" — the pre-run dialog IS the slider's home, so building T089–T091 is the pay-back for the deferral.

**Phase 6 (Polish)**: T108a (dark-mode sweep across all new components — do this AS you build each panel, not at the end), T108b (dark-mode RTL test), T109 (Playwright E2E), T110/T111 (docs/README), T112 (`npm test && npm run test:e2e && npm run lint && DEV_GITHUB_PAT= npm run build`), T113 (manual large-org walkthrough in PR Test Plan), T114 (open PR, do NOT merge).

## Architectural invariants — read before coding

1. **Framework isolation** — nothing in `lib/org-aggregation/*` may import from `react`, `next/*`, or `components/*`. Enforced by `lib/org-aggregation/__no-framework-imports.test.ts`. Constitution §IV + data-model invariant 7. If your test fails with a "framework import" violation, move the code to `components/` instead.
2. **`unavailable` is a first-class output** — constitution §II.3. Never zero, never estimate, never interpolate. Every aggregator's 4th mandatory test case is the all-unavailable case; it must return `status: 'unavailable', value: null`.
3. **Stateless Phase 1** — constitution §I. No server-side job store. No DB. No email. The `GET /api/org/pinned` route is a pass-through GraphQL query; it is NOT a job store. Email / server-side job persistence / cross-session resumability were deliberately deferred and documented in the spec's Assumptions section — DO NOT add them under this issue.
4. **TDD is mandatory** — constitution §XI. Red test → Green implementation → Refactor. Every aggregator MUST have tests written first (pattern: 4 mandatory cases + panel-specific specifics).
5. **Config-driven thresholds** — constitution §VI. All numeric knobs live in `lib/config/org-aggregation.ts` (already created). Don't inline new constants in components.

## Gotchas from this session

### 1. Composition bar reconciliation

The first attempt at the composition bar summed per-repo `totalContributors` across repos and displayed `repeat + one-time + inactive`. Two bugs:

- `totalContributors` is an **all-time, per-repo GitHub API field**. Summing it across repos double-counts anyone contributing to multiple repos. Not a true org denominator.
- `repeat / new / inactive` as defined per-repo don't aggregate meaningfully.

**Current fix**: composition is derived from the *same windowed `commitCountsByAuthor` union* used for `uniqueAuthorsAcrossOrg`. `repeat = authors with ≥ 2 commits` in the union, `oneTime = authors with exactly 1 commit`, `total = repeat + oneTime = uniqueAuthorsAcrossOrg` by construction. No "inactive" category (no meaningful denominator).

**Implication for US2 aggregators that use per-repo total-ish fields**: before summing any `total*` field across repos, ask whether that field is windowed and dedupable. If it isn't, either find a windowed-union equivalent or don't aggregate.

### 2. "In progress (X of N)" redundancy

The panel used to show both its own "in progress (X of N)" label AND the run-status header said the same thing. User flagged this as noise. Current behavior: panels show `{X} of {N} repos` when `contributingReposCount < totalReposInRun`. The run-status header owns the overall "in progress" state. Apply the same pattern to US2 panels.

### 3. The skipped hook test

`components/shared/hooks/useOrgAggregation.test.tsx` has one `.skip` test — "per-repo status list updates live as repos complete". It uses deferred-promise resolution and flakes due to cross-test timer leakage. The behavior is covered at the queue + view-model layers; the skip is intentional. Don't try to un-skip without fixing the timer cleanup in the queue's `setTimeout` for rate-limit pauses.

### 4. Cancel/Pause icons

After a user round-trip, icons settled on media-player conventions: **∥** pause, **▶** resume, **■** stop (rose tint on hover). Bare "X" for cancel reads as "close dialog" — don't regress to that. See `RunStatusHeader.tsx` lines ~140–180.

### 5. Window selector gating

First version gated the window selector on `panel.status === 'final'`, which hid it mid-run when users most want it. Current: show whenever `panel.value` is non-null (covers `in-progress` with partial data). Apply the same loose gating to any US2 panel that also has a window selector.

### 6. The 4-repo Comparison cap is unrelated

`COMPARISON_MAX_REPOS = 4` in `lib/comparison/sections.ts:596` is a **display cap** for the Comparison table ONLY. FR-006/006a/006b make this explicit. The org-aggregation path MUST NOT route through `limitComparedResults()`. Don't re-export the constant into `lib/org-aggregation/`; don't use any `4` or `5` integer constant on the aggregation path without a comment explaining what it bounds.

### 7. Dev preview fixtures

`app/dev/org-summary/page.tsx` has canned data for 5 scenarios. When you add US2 panels, extend each scenario's `panels: {...}` map with a fixture for the new panel. The helper `buildContributorDiversityValue` at the top of the file is the pattern to copy — build each panel's value via a small helper that produces realistic data for all 5 windows (where applicable).

## Where things live

| Concern | Path |
|---|---|
| Constitution | `.specify/memory/constitution.md` |
| Product definition | `docs/PRODUCT.md` (Phase 1 specs frozen here) |
| Development workflow | `docs/DEVELOPMENT.md` (Phase 2 feature order table, multi-worktree guidance) |
| Spec artifacts | `specs/231-org-aggregation/` |
| Framework-agnostic core | `lib/org-aggregation/` |
| Aggregators | `lib/org-aggregation/aggregators/` |
| Config | `lib/config/org-aggregation.ts` |
| Org Summary components | `components/org-summary/` |
| Panel components | `components/org-summary/panels/` |
| Hook | `components/shared/hooks/useOrgAggregation.ts` |
| Dev preview page | `app/dev/org-summary/page.tsx` |
| Flagship API (to build) | `app/api/org/pinned/route.ts` |

## Commands

```bash
# Run tests (fast)
npx vitest run

# Run tests for a specific area
npx vitest run lib/org-aggregation/
npx vitest run components/org-summary/

# Full validation (required before PR)
npm test
npm run test:e2e
npm run lint
DEV_GITHUB_PAT= npm run build    # DEV_GITHUB_PAT must be unset for production builds

# Git state
git log --oneline main..HEAD
git status

# Dev server (already running in this worktree; port 3011)
# Log: ./dev.log, PID: ./.dev.pid
# Dev preview URL: http://localhost:3011/dev/org-summary
```

## PR rules (don't forget)

Per `CLAUDE.md`:

- Feature branches only; no direct commits to `main`.
- PR body MUST include a `## Test plan` section with checkboxes for every quickstart.md §5 scenario. That section is the SINGLE source of truth for manual signoff (constitution v1.2 amendment). Do NOT add an in-repo checklist file.
- **Never run `gh pr merge`.** Check off the test plan boxes via `gh pr edit`, then ask the user to merge manually. This is non-negotiable.
- When filling checklist signoff metadata: use the authenticated GitHub username from `gh api user -q .login`. Don't infer from filesystem path.

## Loose ends flagged by the user, deferred

- **Concurrency slider** (FR-003c, T089–T091): not built. Lives in the Pre-Run Warning Dialog. User explicitly deferred. Pick it up as part of US3.
- **T029 full integration** (Analyze-all button in `OrgInventoryView`): deferred from US1 for clean-commit reasons. Land it with T088/T030/T031 at the start of US2.
- **Async / server-side jobs / email** (original #212 asks): out of scope under constitution §I. See spec Assumptions. Filed as implicit follow-up work if the constitution is amended.

## Final word

The spec, plan, and tasks were negotiated across ~30 rounds with the user. Treat them as frozen. If you find yourself wanting to change the spec scope, stop and ask — don't silently expand. If you find yourself wanting to regenerate artifacts, stop — read what's there.

Good luck.
