# Tasks: SpecKit branch/spec numbering aligned with GitHub issue number

**Input**: Design documents in `/specs/249-speckit-branch-spec-numbering-should-ali/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/cli-contracts.md`, `quickstart.md`

## Phase 1: Setup

No project-level setup required. This feature modifies existing bash scripts and one docs file; no new directories, packages, or dependencies.

## Phase 2: Foundational (blocking prerequisites)

The `gh<N>-` prefix must be understood by the SpecKit helper script before anything else can use it. `create-new-feature.sh` calls into `common.sh`, so `common.sh` is the bottom of the dependency stack. All user-story tasks depend on these two.

- [X] T001 [P] Update `.specify/scripts/bash/common.sh` — teach `find_feature_dir_by_prefix()` to extract `gh<N>` as a prefix. Add a new regex branch `^gh([0-9]+)-` before the existing `^([0-9]{3})-` branch, capturing the full `gh<N>` literal as `$prefix` (not just the digits), so it globs `specs/gh<N>-*` correctly.
- [X] T002 [P] Update `.specify/scripts/bash/common.sh` — teach `check_feature_branch()` to accept `^gh[0-9]+-` as a valid feature-branch pattern alongside `^[0-9]{3}-` and `^[0-9]{8}-[0-9]{6}-`. Update the error message to list all three accepted forms (e.g. `gh249-feature`, `001-feature`, `20260319-143022-feature`).
- [X] T003 [P] Update `.specify/scripts/bash/common.sh` — teach `get_current_branch()` non-git fallback (the directory scanner) to recognise `^gh([0-9]+)-` directories. Rank them with the sequential-numeric branch (higher number wins); timestamp branches retain priority over both.

## Phase 3: User Story 1 — Worktree-driven spec uses the issue number with a `gh` prefix (P1) 🎯 MVP

**Story goal**: `scripts/claude-worktree.sh 238` produces `forkprint-gh238-<slug>/`, branch `gh238-<slug>`, and `/speckit.specify` inside creates `specs/gh238-<slug>/` — all three prefixes agree.

**Independent test** (from quickstart T1): Spawn a throwaway worktree for any issue N, run `/speckit.specify`, verify `git branch --show-current` → `gh<N>-<slug>`, `basename $(pwd)` → `forkprint-gh<N>-<slug>`, `ls specs/` → only `gh<N>-<slug>/` was created.

- [X] T004 [US1] Update `scripts/claude-worktree.sh` — change line that computes `BRANCH="${ISSUE}-${SLUG}"` to `BRANCH="gh${ISSUE}-${SLUG}"`. Also update `WT_PATH="${PARENT_DIR}/forkprint-${ISSUE}-${SLUG}"` to `WT_PATH="${PARENT_DIR}/forkprint-gh${ISSUE}-${SLUG}"`.
- [X] T005 [US1] Update `scripts/claude-worktree.sh` — update the `print_usage()` heredoc to describe the new `forkprint-gh<issue>-<slug>` path and `gh<issue>-<slug>` branch format (currently says `forkprint-<issue>-<slug>`).
- [X] T006 [US1] Update `.specify/scripts/bash/create-new-feature.sh` — after repo-root detection and before branch/number derivation, inspect the currently checked-out branch via `git rev-parse --abbrev-ref HEAD` (only when `HAS_GIT=true`). If it matches `^(gh[0-9]+|[0-9]{3,}|[0-9]{8}-[0-9]{6})-(.+)$`, set `BRANCH_NAME=<current-branch>` verbatim and set a flag `REUSE_CURRENT_BRANCH=true`. Skip the `git checkout -b "$BRANCH_NAME"` call when this flag is true. This is the core "reuse the branch already created by claude-worktree.sh" behaviour.
- [X] T007 [US1] Update `.specify/scripts/bash/create-new-feature.sh` — when `REUSE_CURRENT_BRANCH=true`, do NOT run the sequential-number derivation logic (`check_existing_branches`, `get_highest_from_specs`, etc.). The current branch name is already the target.
- [X] T008 [US1] Update `.specify/scripts/bash/create-new-feature.sh` — set `FEATURE_NUM` in the JSON/text output to the numeric portion of the prefix (e.g. `gh249` → `249`, `001` → `001`) when reusing the current branch, so downstream tooling that reads `FEATURE_NUM` gets a useful value. For `gh<N>` prefixes, emit the unpadded integer; for `<NNN>` sequential, keep the existing 3-digit-padded form.

**Checkpoint**: At this point, `scripts/claude-worktree.sh 238 demo` creates `forkprint-gh238-demo/` with branch `gh238-demo`; running `/speckit.specify` inside creates `specs/gh238-demo/spec.md` without branch-switching. Quickstart T1 passes. MVP complete.

## Phase 4: User Story 2 — Manual `/speckit.specify` outside the worktree flow keeps the existing sequential convention (P2)

**Story goal**: On `main` or any non-`gh<N>-`/non-`<NNN>-` branch, `/speckit.specify` produces an unprefixed `<NNN>-<slug>` spec dir and branch, exactly as before. Explicit `--number <N>` keeps producing `<NNN>-<slug>` (no `gh` prefix added).

**Independent test** (from quickstart T2 and T3): Run `/speckit.specify` from `main` with no issue context → spec dir is `<NNN>-<slug>/` with no `gh`. Run `create-new-feature.sh --number 9999 ...` → produces `9999-<slug>` unprefixed.

- [X] T009 [US2] Update `.specify/scripts/bash/create-new-feature.sh` — confirm (and preserve) the existing sequential-number path: when the current branch does NOT match `^(gh[0-9]+|[0-9]{3,}|[0-9]{8}-[0-9]{6})-` AND no `--number` flag is given, run `check_existing_branches` and `git checkout -b "$BRANCH_NAME"` as before. No regression in this path. *(Preserved — the `if [ "$REUSE_CURRENT_BRANCH" = false ]` branch falls through to the unchanged sequential logic.)*
- [X] T010 [US2] Update `.specify/scripts/bash/create-new-feature.sh` — when `--number N` is explicitly supplied AND the current branch does not already match `<N>-`, preserve the existing behaviour: `BRANCH_NAME="<NNN>-<slug>"` (zero-padded 3-digit for `N < 1000`). This flag is a manual override and does NOT add `gh` prefix. *(Preserved — the `--number` path still uses `printf "%03d"`. Note: `--number` is skipped when `REUSE_CURRENT_BRANCH=true`; see T006 — if a maintainer passes `--number` while on a prefixed branch, the branch wins. This is the safer direction since the branch is already checked out.)*

**Checkpoint**: Quickstart T2 and T3 pass. Manual sequential flow is unchanged.

## Phase 5: User Story 3 — Explicit, non-silent handling of spec/branch collisions (P2)

**Story goal**: When the script is asked to reuse a branch that is already the current HEAD, it does so silently. When it's asked to create a branch that exists elsewhere, or to write a spec dir that already has a populated `spec.md`, it errors loudly with a clear message. Invalid `--number` inputs are rejected early.

**Independent test** (from quickstart T4–T6, T8): Four scenarios — branch-match reuse (silent OK), existing populated spec dir (loud fail), existing branch on different HEAD (loud fail), invalid `--number` input (loud fail).

- [X] T011 [US3] Update `.specify/scripts/bash/create-new-feature.sh` — add `--number` input validation near the top of the script (after flag parsing). Reject when `BRANCH_NUMBER` is non-empty but does not match `^[1-9][0-9]*$` (rejects non-numeric, zero, negatives, leading-zero forms that decode to 0). Exit non-zero with a message like `Error: --number must be a positive integer (got: '$BRANCH_NUMBER')`.
- [X] T012 [US3] Update `.specify/scripts/bash/create-new-feature.sh` — before creating `FEATURE_DIR`, check if `$FEATURE_DIR/spec.md` already exists with non-empty content (`[ -s "$FEATURE_DIR/spec.md" ]`). If so, exit non-zero with an error naming the existing path and suggesting the user rename/remove it or pick a different issue. Empty or missing `spec.md` → proceed (allows worktree-spawn reuse after a prior partial run).
- [X] T013 [US3] Update `.specify/scripts/bash/create-new-feature.sh` — on the non-reuse path, when `git checkout -b "$BRANCH_NAME"` fails AND the branch already exists, keep the existing error message format but expand it to mention the new accepted forms (`gh<N>-<slug>`, `<NNN>-<slug>`, timestamp) so maintainers know all the shapes.

**Checkpoint**: Quickstart T4, T5, T6, T8 all pass. No silent renumbering is possible.

## Phase 6: User Story 1 follow-through — `--cleanup-merged`, `--remove`, `--approve-spec`, `--revise-spec` worktree-lookup updates

These four `claude-worktree.sh` subcommands all use the same `awk` pattern to locate the worktree. They need the `-gh<N>-` pattern added, plus the legacy `-<N>-` fallback per Decision 5 (research.md).

- [X] T014 [US1] Update `scripts/claude-worktree.sh` — in `remove_worktree()` (around line 71), update the awk pattern from `-${issue}-` to match either `-gh${issue}-` or `-${issue}-`. Simplest form: `awk -v i1="-gh${issue}-" -v i2="-${issue}-" '/^worktree/ && ($2 ~ i1 || $2 ~ i2) {print $2; exit}'`.
- [X] T015 [US1] Update `scripts/claude-worktree.sh` — apply the same two-pattern awk change in `cleanup_merged()` (around line 90).
- [X] T016 [US1] Update `scripts/claude-worktree.sh` — apply the same two-pattern awk change in `release_paused_session()` (around line 142), which is used by both `--approve-spec` and `--revise-spec`.
- [X] T017 [US1] Add a one-line comment above each updated awk call noting that the `-<N>-` pattern is a transition-compat fallback for legacy worktrees and can be removed once all pre-fix worktrees are cleaned.

**Checkpoint**: Quickstart T7 passes. `--cleanup-merged 249` (this very feature's post-merge cleanup) still works on the legacy unprefixed worktree.

## Phase 7: Polish & Cross-cutting concerns

- [X] T018 [P] Update `.claude/commands/speckit.specify.md` — add a short note (under "IMPORTANT" or as a new bullet) explaining that when the current branch matches `^(gh)?[0-9]+-` the helper script auto-detects and reuses it. No change to the invocation pattern (`--short-name` + positional description, no `--number`); Claude does not need to parse the branch.
- [X] T019 [P] Update `docs/DEVELOPMENT.md` — in the "Spawning worktrees" section, change every example from `forkprint-<issue>-<slug>` to `forkprint-gh<issue>-<slug>`, and every `<issue>-<slug>` branch reference to `gh<issue>-<slug>`. Add a new subsection "Naming convention" documenting: (a) issue-driven work uses `gh<N>-<slug>`; (b) manual sequential fallback uses `<NNN>-<slug>`; (c) the two namespaces are disjoint; (d) `--cleanup-merged` currently accepts both new and legacy forms during transition.
- [X] T020 [P] Update `docs/DEVELOPMENT.md` — where the "Multi-worktree local development" section references the `--cleanup-merged` behaviour, note the two-pattern match so maintainers understand legacy worktrees remain cleanable.
- [X] T021 Run quickstart.md regression tests T1 through T9 manually against a throwaway GitHub issue number. Record pass/fail in the PR body's Test Plan. *(Ran T2, T3, T4, T5, T6, T8, T9 in a `/tmp/speckit-regression` sandbox — all pass with correct exit codes and error messages. T1/T7 require a real GitHub issue + running dev server; verified by syntax-check on `claude-worktree.sh` and awk-pattern test confirming both `gh99999-` and legacy `99999-` worktree paths match. Sandbox path construction verified: `WT_PATH=.../forkprint-gh99999-demo-slug`, `BRANCH=gh99999-demo-slug`.)*
- [X] T022 After T021 passes, self-review the diff for: accidental changes to product code (should be zero); accidental changes to Phase 1 spec dirs; any remaining references to the old `forkprint-<N>-<slug>` naming in any doc. Remove/revert any drift.

## Dependency Graph

```
Setup (none)
    ↓
Foundational: T001, T002, T003 [all parallel, all in common.sh but independent functions — ok to [P]]
    ↓
┌─────────────────────────────────────────────────────┐
│ User Story 1 (P1, MVP):                             │
│   T004 → T005 (both in claude-worktree.sh)          │
│   T006 → T007 → T008 (all in create-new-feature.sh) │
│   T014, T015, T016, T017 (in claude-worktree.sh)    │
│     [T014/T015/T016 are in same file but independent│
│      awk-line changes — sequential to avoid merge]  │
├─────────────────────────────────────────────────────┤
│ User Story 2 (P2) [depends on US1 T006–T008 being  │
│                    in place, as it exercises the    │
│                    same script's fall-through path]:│
│   T009, T010 (both in create-new-feature.sh)        │
├─────────────────────────────────────────────────────┤
│ User Story 3 (P2) [depends on US1 T006–T008]:      │
│   T011, T012, T013 (all in create-new-feature.sh)   │
└─────────────────────────────────────────────────────┘
    ↓
Polish: T018 [P], T019 [P], T020 [P], T021 (manual tests), T022 (self-review)
```

## Parallel Execution Opportunities

- **Phase 2** (T001, T002, T003): three `common.sh` helpers edited — different functions, single file. The Edit tool requires unique `old_string`, so these can be batched safely as long as each edit targets a different function. **[P] markers valid.**
- **Phase 7 polish** (T018, T019, T020): three different files. **[P] markers valid.**
- User-story tasks within the same file (T004/T005 in `claude-worktree.sh`; T006–T008 + T011–T013 in `create-new-feature.sh`) are NOT [P] even when logically independent — Edit tool sequential use avoids matching conflicts.

## MVP Scope

**User Story 1 alone** (T001–T008 + T014–T017) is a complete, independently testable MVP:
- Worktree spawns use the new `gh<N>-` naming.
- `/speckit.specify` inside a worktree reuses the branch and creates a matching spec dir.
- `--cleanup-merged` still finds and cleans legacy in-flight worktrees.

US2 and US3 are regression-prevention and collision-handling. They ship together with US1 in a single PR (the scope is small enough that splitting adds churn without reducing risk), but the MVP would be testable even if US2/US3 were deferred.

## Implementation Strategy

Single PR, incremental commits per phase:

1. Foundational `common.sh` changes (Phase 2) — isolated commit, runs with no behaviour change yet.
2. US1 implementation (Phase 3 + Phase 6) — the core fix. After this commit, spawning a new worktree uses `gh<N>-`.
3. US2 / US3 polish (Phases 4–5) — manual-path preservation and collision errors.
4. Docs + command template + manual regression (Phase 7).
5. Final self-review commit if needed.

Total: ~22 tasks, 5 files modified, no new files outside `specs/249-.../`.
