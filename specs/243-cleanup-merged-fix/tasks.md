# Tasks: Fix --cleanup-merged branch deletion after squash/rebase merge

**Feature**: 243-cleanup-merged-fix
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

## Phase 1: Setup

No setup tasks. This feature edits one existing shell script and one existing doc; no new files, dependencies, or scaffolding.

## Phase 2: Foundational

No foundational tasks. `gh` is already a prerequisite of the surrounding script.

## Phase 3: User Story 1 — Cleanup deletes branch after squash-merged PR (P1)

**Goal**: `--cleanup-merged <issue>` deletes the local branch after the associated PR has been merged on GitHub, regardless of squash/rebase/merge-commit strategy.

**Independent Test**: Run the quickstart Scenario A and Scenario D. `git branch | grep <issue>` returns nothing after each.

- [X] T001 [US1] Replace ancestry-based merge check in `cleanup_merged()` at `scripts/claude-worktree.sh:65-108`: before worktree removal, call `gh -C "$REPO_ROOT" pr view "$branch" --json state -q .state` (run `gh` from `$REPO_ROOT`); capture into a local variable. On any `gh` failure, exit non-zero with a message including the branch name and pointing to `--remove`.
- [X] T002 [US1] In `scripts/claude-worktree.sh` `cleanup_merged()`: reorder so the PR-state check runs before `git pull` and worktree removal. Only when state is exactly `MERGED` proceed with: `git pull --ff-only origin main` → kill `.dev.pid` / `.claude.pid` → `git worktree remove --force` → `git branch -D "$branch"`.

## Phase 4: User Story 2 — Refuse cleanup when PR is not merged (P1)

**Goal**: When the PR is `OPEN`, `CLOSED`-without-merge, or does not exist, the script refuses, preserves the worktree and branch, and directs the user to `--remove`.

**Independent Test**: Run quickstart Scenarios B and C. In each: exit non-zero, `git branch` still shows the branch, worktree still present.

- [X] T003 [US2] In `cleanup_merged()` in `scripts/claude-worktree.sh`: when PR state is not `MERGED`, print `PR for <branch> is <state>, not MERGED. Use: scripts/claude-worktree.sh --remove <issue>` to stderr and exit 1 without touching the worktree or branch.
- [X] T004 [US2] In `cleanup_merged()` in `scripts/claude-worktree.sh`: when `gh pr view` fails (no PR, auth error, offline), print `Could not determine PR state for <branch>. Is gh installed and authenticated? If this branch has no PR, use --remove.` to stderr and exit 1 without touching the worktree or branch.

## Phase 5: User Story 3 — Behavior documented in DEVELOPMENT.md (P2)

**Goal**: `docs/DEVELOPMENT.md` explains that `--cleanup-merged` verifies merge via GitHub PR state and force-deletes the branch when merged; `--remove` remains the escape hatch for unmerged work.

**Independent Test**: `grep -A 5 -- '--cleanup-merged' docs/DEVELOPMENT.md` shows the new description.

- [X] T005 [US3] Update the `--cleanup-merged` description in `docs/DEVELOPMENT.md` to state: (a) merge is verified via the PR state on GitHub (`gh pr view`), not local ancestry, so squash/rebase merges are handled correctly; (b) when the PR is `MERGED`, the local branch is force-deleted; (c) when the PR is not merged or cannot be verified, the command refuses and directs the user to `--remove`.

## Phase 6: Polish

- [X] T006 Run `shellcheck scripts/claude-worktree.sh` and address any warnings introduced by the change in `scripts/claude-worktree.sh`. (shellcheck not installed locally; `bash -n` syntax check passed and `--help` runs clean.)
- [ ] T007 Manually execute quickstart Scenarios A, B, C, D from `specs/243-cleanup-merged-fix/quickstart.md` against the modified `scripts/claude-worktree.sh`; record results in the PR body's `## Test plan`.

## Dependencies

- T001 → T002 (T002 depends on `$pr_state` captured by T001)
- T003, T004 extend the same `cleanup_merged()` function edited by T001/T002 — sequential in one file.
- T005 (docs) independent of T001–T004; can be done in parallel.
- T006, T007 follow all implementation tasks.

## Parallel Opportunities

- T005 [P] can be edited in parallel with T001–T004 (different file).

## MVP Scope

US1 + US2 together constitute the functional MVP (bug fix + safety). US3 (docs) is required for Definition of Done per the constitution but can land in the same PR.
