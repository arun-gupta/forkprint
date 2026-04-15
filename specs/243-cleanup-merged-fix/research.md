# Phase 0 — Research

## Decision 1: How to detect "merged on GitHub" when the local branch is not an ancestor of main

**Decision**: Query PR state via `gh pr view "$branch" --json state -q .state`. Treat `MERGED` as success.

**Rationale**:
- The root cause (per issue #242) is that after squash- or rebase-merge, the PR's merge commit does not contain the feature branch's commits as ancestors, so `git branch -d` refuses even though GitHub considers the PR merged.
- `gh pr view <branch>` resolves the PR by head branch name on the default remote, which matches how `claude-worktree.sh` creates branches.
- `gh` is already a hard prerequisite of the script (used for `gh issue view` at line 136), so no new tooling dependency is introduced.
- JSON output is stable and scriptable; `-q .state` extracts the exact value.

**Alternatives considered**:
- `git log --oneline main..branch` heuristics — unreliable across squash/rebase because the squashed commit has a different SHA and message-matching is brittle.
- `gh pr list --head "$branch" --state merged` — returns a list; extra parsing. `gh pr view` is more direct.
- Fetching the PR's merge commit SHA and comparing trees — far more complex, and `gh pr view --json state` is the canonical GitHub-sanctioned check.

## Decision 2: Force-delete with `git branch -D` rather than adding a `--force` flag

**Decision**: When PR state is `MERGED`, use `git branch -D <branch>` directly inside `cleanup_merged`. Do not introduce a `--force` opt-in.

**Rationale**:
- The semantic contract of `--cleanup-merged` is "the PR is merged, clean it up." Once we've verified merge via GitHub, force-delete is the correct and safe action — it's only unsafe when we haven't verified.
- Adding `--force` would duplicate `--remove`'s existing role (the spec already says `--remove` is the escape hatch).
- YAGNI: the acceptance criteria in issue #242 do not require a new flag.

**Alternatives considered**:
- Add `--force` — rejected; redundant with `--remove`.
- Try `git branch -d` first, fall back to `-D` on failure — rejected; ambiguous error path and re-introduces the silent-failure mode that the bug reports.

## Decision 3: Error handling when `gh` is missing, unauthenticated, or offline

**Decision**: If `gh pr view` fails for any reason, `cleanup_merged` exits non-zero with the underlying error surfaced. No fallback to ancestry-based deletion.

**Rationale**:
- FR-004 explicitly requires no silent fall-through to the old behavior.
- `set -euo pipefail` already propagates non-zero exits; we add a clear error message wrapping the failure.
- Developers running this script already have `gh` authenticated (prerequisite). A missing/broken `gh` is a environment problem the developer should fix, not something the script should paper over.

**Alternatives considered**:
- Fall back to `git branch -d` — rejected; reintroduces the original bug.
- Prompt for authentication — rejected; interactive prompts in a cleanup command are out of scope.

## Decision 4: Where `gh pr view` runs (which working directory)

**Decision**: Run `gh pr view` with `-R` implied by the repository discovered via `git -C "$REPO_ROOT"` — concretely, `gh` resolves the repo from the current working directory's git remote. We invoke it from `$REPO_ROOT` so it resolves to the primary repo, not the (about-to-be-removed) worktree.

**Rationale**:
- The worktree is removed before branch deletion; invoking `gh` after removal means the cwd could be gone. Safer to run `gh` from `$REPO_ROOT` before worktree removal.
- Sequencing: (1) verify PR state → (2) if merged, pull main → (3) remove worktree → (4) force-delete branch. If step 1 fails, nothing else happens and no state is disturbed.

**Alternatives considered**:
- Keep existing order (remove worktree first, then check) — rejected; if the PR-state check fails we'd have already destroyed the worktree.
