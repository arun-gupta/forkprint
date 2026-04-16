# RepoPulse — Development Workflow

This document describes how to develop RepoPulse using the SpecKit / Specification-Driven Development (SDD) workflow.

---

## Prerequisites

- `arun-gupta/repo-pulse` repo is cloned locally
- `CLAUDE.md` exists — it points Claude Code to `.specify/memory/constitution.md`
- Claude Code is running in the repo root

---

## Feature loop (spec → plan → tasks → implement)

One feature at a time, fully through implementation before starting the next. Do not batch specs across features.

### Step 1 — Specify

> `/speckit.specify` `[P1-F01]` Repo Input

Review the generated spec. It is a contract — approve it before proceeding.

### Step 2 — Plan

> `/speckit.plan` `[P1-F01]`

Review the plan. Verify it does not introduce any dependency that would block Phase 2 or Phase 3.

### Step 3 — Tasks

> `/speckit.tasks` `[P1-F01]`

Review the task list before implementation begins.

### Step 4 — Implement

> `/speckit.implement` `[P1-F01]`

Implement the feature per the generated tasks.

### Step 5 — PR

Before opening a PR, verify the Definition of Done (constitution Section XII):

- [ ] All acceptance criteria in the feature spec are satisfied
- [ ] Tests pass and linting is clean
- [ ] No TODOs, dead code, `console.log`, or untyped values remain
- [ ] All spec documents for the feature are current
- [ ] `docs/DEVELOPMENT.md` reflects the feature's completed status in the implementation order table (`✅ Done`)
- [ ] PR body includes a `## Test plan` section; all checkboxes are checked before merge
- [ ] README updated for any user-facing or setup changes
- [ ] Constitution compliance verified — no rule violated

Once done, open a PR and merge before starting the next feature.

---

## Phase 1 feature order

This is the planned implementation order for Phase 1. It may differ from the feature listing order in `docs/PRODUCT.md`, which remains the canonical product definition.

| # | Feature ID | Feature | Status |
|---|---|---|---|
| 1 | P1-F01 | Repo Input | ✅ Done |
| 2 | P1-F02 | Authentication | ✅ Done |
| 3 | P1-F04 | Data Fetching | ✅ Done |
| 4 | P1-F15 | Results Shell | ✅ Done |
| 5 | P1-F05 | Ecosystem Map | ✅ Done |
| 6 | P1-F03 | Deployment | ✅ Done |
| 7 | P1-F07 | Metric Cards | ✅ Done |
| 8 | P1-F09 | Contributors | ✅ Done |
| 9 | P1-F08 | Activity | ✅ Done |
| 10 | P1-F10 | Responsiveness | ✅ Done |
| 11 | P1-F11 | Health Ratios | ❌ Deprecated (tab removed, ratios live in domain tabs + Comparison) |
| 12 | P1-F16 | Org-Level Repo Inventory | ✅ Done |
| 13 | P1-F06 | Repo Comparison | ✅ Done |
| 14 | P1-F14 | GitHub OAuth Authentication | ✅ Done |
| 15 | P1-F13 | Export | ✅ Done |
| 16 | P1-F12 | Missing Data & Accuracy | ✅ Done |

---

## Testing

Run these checks before opening a PR:

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```

> **Note**: If you have `DEV_GITHUB_PAT` in `.env.local` (see multi-worktree section below), run `DEV_GITHUB_PAT= npm run build` — the build asserts this variable is not present in `NODE_ENV=production` contexts, and `next build` forces production.

---

## Multi-worktree local development (`DEV_GITHUB_PAT`)

The GitHub OAuth App registers a single callback URL (`http://localhost:3000/api/auth/callback`). Running multiple worktrees concurrently means only the worktree on port 3000 can complete OAuth.

To work around this in `next dev` (only — never production), set a GitHub PAT in `.env.local`:

```bash
# .env.local
DEV_GITHUB_PAT=ghp_your_personal_access_token
```

Required scope: `public_repo` (read only).

When set, clicking "Sign in with GitHub" short-circuits the OAuth round-trip and grants a session using the PAT directly. Unset the variable (or leave it blank) to restore the normal OAuth flow.

Safety layers:

- Gated by `NODE_ENV === 'development'` — ignored under `next build` / `next start` / deployed contexts.
- Boot assertion: if `NODE_ENV=production` and `DEV_GITHUB_PAT` is set, the app throws at startup. Vercel deploys with this var set will fail to boot.
- `.env.local` is gitignored; no secret enters the repo.

See issue #207 for the full rationale and constitution discussion.

### Spawning worktrees with `scripts/claude-worktree.sh`

`scripts/claude-worktree.sh` automates the parallel-worktree workflow: it provisions an isolated git worktree per issue, picks a free dev-server port, copies `.env.local` (so `DEV_GITHUB_PAT` flows through), starts `next dev`, and launches Claude with a kickoff prompt pointing at the issue.

Run `scripts/claude-worktree.sh --help` for the canonical usage reference.

**Spawn:**

```bash
# interactive — slug auto-derived from the GitHub issue title
scripts/claude-worktree.sh 207

# headless — claude -p in background, log -> claude.log
scripts/claude-worktree.sh --headless 207

# batch
for i in 210 211 212; do scripts/claude-worktree.sh --headless "$i"; done
```

The script creates `../forkprint-<issue>-<slug>/` on a new branch named `<issue>-<slug>`, picks the next free port in `3010–3100`, runs `npm install`, starts `next dev` in the background (log: `dev.log`, PID: `.dev.pid`), and launches `claude` with a prompt that runs the SpecKit lifecycle and opens a PR (never merges — see CLAUDE.md).

### Numbering rule

The branch, worktree, and spec directory for a feature always share the same numeric prefix. Two paths, one convention:

| Flow | Worktree path | Branch | Spec directory |
|---|---|---|---|
| Worktree-driven (issue) | `../forkprint-249-align-numbering` | `249-align-numbering` | `specs/249-align-numbering/` |
| Manual sequential | *(none)* | `230-some-refactor` | `specs/230-some-refactor/` |
| Timestamp (opt-in) | *(none)* | `20260416-143022-refactor` | `specs/20260416-143022-refactor/` |

When `scripts/claude-worktree.sh <N>` pre-creates the branch `<N>-<slug>`, `/speckit.specify` inside the worktree detects the `^[0-9]+-` prefix on the current HEAD and reuses it verbatim — it does not scan `specs/` for the next free sequential number. Outside the worktree flow (a manual `/speckit.specify` on `main`), the sequential-scan fallback applies unchanged.

The rare collision — manual sequential claims slot N just before issue #N is filed and worktree-spawned — surfaces as a loud error naming the conflicting branch or spec directory. Resolution: rename/remove the colliding entity, or pick a different issue number. `/speckit.specify` never silently renumbers.

**Mandatory pause after `/speckit.specify`.** Both interactive and `--headless` spawns halt after `/speckit.specify` and wait for your explicit approval before continuing to `/speckit.plan`. The kickoff prompt tells Claude to report the generated spec path and wait for one of the phrases `"proceed"`, `"approved"`, or `"go to plan"`. Spec revisions re-enter the paused state; only an approval phrase releases it. This exists because the spec is the highest-leverage artifact — revisions applied after plan/tasks are generated force Claude to re-derive everything downstream.

**Permission model for headless spawns.** The repo commits a project-scoped Claude Code permission policy at `.claude/settings.json`. Every session launched inside this repo or any git worktree of it — interactive or `claude -p` — inherits that allowlist. This is what unblocks headless spawns from freezing on the first tool-approval prompt (issue #238).

The allowlist is intentionally narrow:

- `Bash(.specify/scripts/bash/*)` — SpecKit helpers (the original block point).
- `Bash(git:*)`, `Bash(gh:*)`, `Bash(npm:*)`, `Bash(node:*)` — lifecycle commands.
- Common read-only shell utilities (`ls`, `cat`, `mkdir`, `grep`, `find`, `awk`, `sed`, `echo`, `printf`, `lsof`, `uuidgen`) — scoped by command name, never as `Bash(*)`.
- Claude Code built-ins: `Read`, `Edit`, `Write`, `Grep`, `Glob`.
- `WebFetch(domain:github.com)` and `WebFetch(domain:api.github.com)` — read-only GitHub lookups.

Explicitly not allowed: `Bash(rm:*)`, `Bash(curl:*)`, `Bash(wget:*)`, `Bash(sudo:*)`, `Bash(ssh:*)`, any MCP tools, any blanket wildcard, and `bypassPermissions`. A tool outside the allowlist falls through to the normal prompt path; in a headless session, that still blocks — which is the signal to extend the allowlist by PR, not to bypass it.

**Extending the allowlist**: edit `.claude/settings.json` in a PR. The PR description must name the SpecKit helper, `git` subcommand, `npm` script, or `gh` subcommand that needs the new entry. No secrets, no blanket wildcards, no destructive shell commands.

**Releasing a paused headless session.** For `--headless` spawns, use the fire-and-forget release commands:

```bash
# Approve the generated spec and run Stage 2 (plan → tasks → implement → PR) in the background:
scripts/claude-worktree.sh --approve-spec <issue>

# Or send revision feedback to the paused session; it edits the spec in place and re-enters the pause:
scripts/claude-worktree.sh --revise-spec <issue> "Add an acceptance scenario for empty input."
```

Both commands resolve the worktree for `<issue>`, read the session UUID recorded by the spawn at `<worktree>/.claude.session-id`, and run `claude -p "<prompt>" --resume <uuid>` as a detached `nohup` process appending to the same `claude.log`. They return control to your shell in under 5 seconds — you do not need to keep the invoking terminal open.

Preconditions (both commands exit non-zero with a clear error if unmet):

- A worktree for `<issue>` exists.
- `<worktree>/.claude.session-id` exists and is non-empty.
- At least one `<worktree>/specs/*/spec.md` exists (the paused state has been reached).

Additional rule for `--revise-spec`: empty feedback is rejected. Repeated `--revise-spec` rounds accumulate — each round edits the spec as it stands after the previous round.

Manual fallback (still supported): `cd ../forkprint-<issue>-<slug> && claude --resume` opens an interactive session if you want to review and revise the spec conversationally. This attaches your terminal; `--approve-spec` / `--revise-spec` do not.

The pause is per-worktree: in a batch spawn (`for i in 210 211 212; do scripts/claude-worktree.sh --headless "$i"; done`) you review and release each worktree independently, but the release itself is fire-and-forget, so `for i in 210 211 212; do scripts/claude-worktree.sh --approve-spec "$i"; done` walks away with three PRs on the way.

**Cleanup:**

```bash
# Post-merge, from the main repo: pull main, kill processes, remove the
# worktree, delete the local+remote branch (refuses if unmerged).
scripts/claude-worktree.sh --cleanup-merged 207

# Discard unmerged work (kills processes + force-removes worktree, keeps branch).
scripts/claude-worktree.sh --remove 207
```

```bash
# From inside the worktree (e.g. the same shell the Claude session ran in),
# the issue number is inferred from the current branch's `^[0-9]+-` prefix:
cd ../forkprint-207-<slug>
scripts/claude-worktree.sh --cleanup-merged    # no arg needed
```

When invoked with no argument from a linked worktree, the script chdirs to the main repo, auto-checks out `main` if the primary worktree is on another branch (refuses on dirty state — never force-discards), then runs the standard cleanup flow. On success, if the caller's current working directory was the removed worktree, the script prints a final-line notice of the form `note: your shell's previous CWD (...) no longer exists — run \`cd <main-repo-path>\` to continue` so the stranded shell knows where to go. Inference only fires from inside a linked worktree — the no-argument form from the main repo clone still prints the existing usage error and takes no destructive action.

`--cleanup-merged` verifies merge status by querying the associated PR's state via `gh pr view <branch> --json state` — **not** by local ancestry. This matters because squash-merges and rebase-merges on GitHub produce a merge commit that is not an ancestor of the local feature branch, so the older ancestry check (`git branch -d`) would silently refuse even after a real merge. When the PR state is `MERGED`, the local branch is force-deleted, then `git push origin --delete <branch>` removes the remote ref. If the remote was already removed (e.g. GitHub's "Automatically delete head branches" setting fired at merge time), the step prints `Remote branch <branch> already removed` and exits 0. Any other remote-delete failure (network, auth, protected branch) surfaces a warning and exits non-zero — the worktree and local branch are already gone, so only a manual `git push origin --delete <branch>` remains. When the PR is `OPEN`, `CLOSED` without merge, missing, or `gh` cannot reach GitHub, the command refuses and points to `--remove`. Use `--remove` as the escape hatch for unmerged branches; it does not touch the remote.

If something gets stuck:

```bash
git worktree list                 # what's still registered
git worktree prune                # drop stale entries for deleted paths
lsof -iTCP:3010-3100 -sTCP:LISTEN # any dev servers still bound?
```

---

## Phase 2 feature order

Phase 2 adds new scoring buckets to the health score. Requirements specs live in the linked GitHub issues — not in PRODUCT.md. See [Spec Ownership](PRODUCT.md#spec-ownership) for the rationale.

| # | Feature ID | Feature | Issues | Status |
|---|---|---|---|---|
| 1 | P2-F01a | Documentation scoring (basic) | #66 | ✅ Done |
| 2 | P2-F02 | Licensing & Compliance | #115 | ✅ Done |
| 3 | P2-F03 | Inclusive naming | #107 | ✅ Done |
| 4 | P2-F07 | Security scoring | #68 | ✅ Done |
| 5 | P2-F04 | Governance & Transparency | #116 | ✅ Done |
| 6 | P2-F05 | Community scoring | #70 | ✅ Done |
| 7 | P2-F06 | Foundation-aware recommendations | #119 | |
| 8 | P2-F08 | Accessibility & Onboarding | #117 | |
| 9 | P2-F09 | Release health scoring | #69 | |
| 10 | P2-F10 | Development cadence | #73 | |
| 11 | P2-F11 | Project maturity | #74 | |
| 12 | P2-F12 | Ecosystem Reach | #118 | |
| 13 | P2-F01b | Documentation scoring (advanced) | #110, #67 | |
| 14 | P2-F13 | Org governance audit — stale admin detection | #287 (child of #285) | ✅ Done |

## Phase 3 feature order

Phase 3 delivers the OSS Health Score through additional channels, wrapping the shared analyzer module without duplicating logic.

| # | Feature ID | Feature | Issues | Status |
|---|---|---|---|---|
| 1 | P3-F01 | Public REST API | #120 | |
| 2 | P3-F02 | GitHub Action | — | |
| 3 | P3-F03 | MCP Server | — | |
| 4 | P3-F04 | Embeddable badge | #72 | |
| 5 | P3-F05 | CLI tool | #82 | |
| 6 | P3-F06 | PR comment bot | #83 | |
| 7 | P3-F07 | VS Code extension | #84 | |
| 8 | P3-F08 | Webhook receiver | #85 | |

## Phase 4

Phase 4 ports the application to support GitLab in addition to GitHub. It introduces a provider abstraction layer (GitHub and GitLab implement the same interface) so the analyzer, delivery phases, and UI remain unchanged. Phase 4 begins only after Phase 3 is complete.

## Feature development flow (Phase 2+)

For Phase 2 and beyond, the requirements spec for each feature lives in its GitHub issue. The SpecKit workflow reads the issue as input:

```
GitHub Issue (requirements spec)
  │  Acceptance criteria, signals, scoring approach, open questions
  │
  ▼
/speckit.specify (reads issue as input)
  │  Generates specs/NNN-feature-name/ with TypeScript contracts
  │
  ▼
/speckit.plan → /speckit.tasks → /speckit.implement
  │  Plan, break down, build
  │
  ▼
PR with test plan → merge
  │  Mark feature as ✅ Done in the table above
```

**Key distinction:** The GitHub issue defines *what and why* (requirements). SpecKit generates *how* (TypeScript interfaces, view props, data flow contracts). They are not duplicates — the issue is the input, the spec file is the output.

This replaces the Phase 1 pattern where PRODUCT.md contained inline acceptance criteria for every feature. Phase 1 specs are frozen in PRODUCT.md as a historical record.

---

## Adding a new scoring signal — integration checklist

There is no central signal registry. When adding a new signal to an existing lens (e.g. community, licensing, docs), update every touchpoint below or the signal will be invisible on one of the surfaces:

- [ ] **GraphQL query alias** — `lib/analyzer/queries.ts` + `RepoOverviewResponse` type
- [ ] **Signal extraction** — `extract<Lens>Signals()` in `lib/analyzer/analyze.ts`
- [ ] **Analysis result type** — `lib/analyzer/analysis-result.ts` (the `*SignalSet` interface)
- [ ] **Completeness / signal key union** — `lib/<lens>/completeness.ts` (`*SignalKey`, `extractSignalPresence()`)
- [ ] **Tag registry** — `lib/tags/<lens>.ts` (the `*_DOC_FILES` / `*_METRICS` / `*_ACTIVITY_ITEMS` Sets)
- [ ] **Tab count logic** — `lib/tags/tab-counts.ts`
- [ ] **Metric card / lens readout** — `buildLensReadouts()` in `lib/metric-cards/view-model.ts`
- [ ] **Tooltip copy** — `lib/metric-cards/view-model.ts`
- [ ] **Rendering components** — whichever views surface the signal (`components/activity/*`, `components/documentation/*`, etc.)
- [ ] **Comparison** — `lib/comparison/sections.ts`
- [ ] **Export** — `lib/export/json-export.ts` and `lib/export/markdown-export.ts`
- [ ] **Recommendations catalog** — `lib/recommendations/catalog.ts` (if the signal's absence should trigger advice)

---

## Notes

- `.specify/` is managed by SpecKit. Do not manually edit files inside it outside of the workflows above.
- Feature specs live in `specs/NNN-feature-name/`.
- Manual testing signoff lives in the PR body's `## Test plan` section — not in an in-repo checklist file.
- Constitution: `.specify/memory/constitution.md`
- Product definition: `docs/PRODUCT.md`
- Deployment guide: `docs/DEPLOYMENT.md`
