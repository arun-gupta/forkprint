# Research: `claude-worktree.sh` cleanup from inside a worktree

**Feature**: Issue #278
**Branch**: `278-claude-worktree-sh-allow-cleanup-merged`

## R1 — Detecting "am I inside a linked worktree?"

**Decision**: Use `git rev-parse --git-common-dir` vs `git rev-parse --git-dir`.
- Inside the primary worktree: both resolve to the same path (the real `.git/` directory).
- Inside a linked worktree: `--git-dir` resolves to `<main-repo>/.git/worktrees/<wt-name>/`, while `--git-common-dir` still resolves to `<main-repo>/.git/`. They diverge.
- Outside any git repo: both commands fail non-zero and the existing `set -euo pipefail` surfaces the error.

**Rationale**: This is the documented git mechanism for the question we are asking. It requires no filesystem-path heuristics (no `forkprint-*` regex, no path substring match), which makes the feature robust against repo renames or alternate parent-directory layouts.

**Alternatives considered**:
- *Path-substring check (`[[ "$PWD" == */forkprint-* ]]`)*: rejected — couples to a naming convention that `scripts/claude-worktree.sh` happens to produce today but is not a git invariant. A user renaming their parent directory would break detection.
- *`git rev-parse --show-superproject-working-tree`*: rejected — this flag is for git submodules, not worktrees (its output is empty for a linked worktree). The issue description itself called out this misattribution; the plan uses the `--git-common-dir` pair instead.
- *Check for a `.git` file (gitdir pointer) vs `.git` directory in `$PWD`*: possible but strictly weaker than the plumbing commands above — breaks if the shell is in a subdirectory of the worktree, which it commonly is.

## R2 — Resolving the primary worktree path from inside a linked one

**Decision**: Parse the first `worktree` entry from `git worktree list --porcelain`.

Output format (stable, git-documented):
```
worktree /Users/arungupta/workspaces/forkprint
HEAD <sha>
branch refs/heads/main

worktree /Users/arungupta/workspaces/forkprint-278-...
HEAD <sha>
branch refs/heads/278-...
```
The first `worktree` line is the primary. Extract with:
```bash
main_repo="$(git worktree list --porcelain | awk '/^worktree/ {print $2; exit}')"
```

**Rationale**: Git guarantees the ordering: the primary worktree is emitted first. This is the simplest read, requires no state, and produces exactly one value even when many linked worktrees are registered.

**Alternatives considered**:
- *`git rev-parse --git-common-dir` + `dirname`*: would yield the path to the parent of `.git/`, which equals the primary worktree path — but only when the `.git` lives in the working tree (the default), not when it's been moved via `git init --separate-git-dir`. The porcelain form handles both cases identically.
- *Scanning `$HOME` for a directory named without the `forkprint-<num>-` suffix*: rejected as fragile guesswork.

## R3 — Extracting the issue number from the branch name

**Decision**: bash regex on `git rev-parse --abbrev-ref HEAD`:
```bash
if [[ "$branch" =~ ^([0-9]+)- ]]; then
  inferred_issue="${BASH_REMATCH[1]}"
fi
```

**Rationale**: The project's branch convention for worktree-scoped work is always `<issue>-<slug>` (enforced by `scripts/claude-worktree.sh` at spawn time — see `BRANCH="${ISSUE}-${SLUG}"` at line 235). The regex anchors on the prefix so it reliably matches those spawns and reliably *fails* on hand-rolled branches like `hotfix-retry-logic`, which is the intended fallback path (FR-004 error).

**Alternatives considered**:
- *Parsing `scripts/claude-worktree.sh`'s own session-id / metadata files from the worktree*: rejected — ties inference to this specific spawner, excluding branches a user created by hand using the convention. The branch-name rule is the published convention.
- *Calling `gh pr view --json number` and using that*: rejected — that call requires a network round-trip and requires a PR to already exist. The branch name is already available locally.

## R4 — Detecting "is the worktree being removed the caller's CWD?"

**Decision**: Compare the resolved worktree path (already returned by the existing `git worktree list --porcelain | awk ...` lookup in `cleanup_merged()` and `remove_worktree()`) with `$PWD` captured at function entry.

```bash
local caller_cwd="$PWD"
# ... resolve $wt ...
local caller_in_wt=0
if [[ "$caller_cwd" == "$wt" || "$caller_cwd" == "$wt"/* ]]; then
  caller_in_wt=1
fi
```

**Rationale**: Direct path comparison is unambiguous. The `/*` glob covers the case where the user is in a subdirectory of the worktree. Using `$PWD` at function entry (not after any `cd`) captures the user's actual starting location.

**Alternatives considered**:
- *`realpath` both sides before comparing*: considered but unnecessary — `git worktree list --porcelain` emits canonical paths already, and `$PWD` is canonicalized by bash when the `cd` into the worktree was made through the shell. Adding `realpath` would pull in a tool that is not universally available as `realpath` on macOS without coreutils.
- *Setting a shell env var before removal (`WT_REMOVED=1`)*: rejected — does not help because the stranded shell is still the one printing the notice, before exit.

## R5 — Handling the primary worktree's current branch

**Decision**: If the primary worktree is not on `main` when `--cleanup-merged` fires from inside a linked worktree, run `git -C <main> checkout main`. If that fails (dirty state, merge in progress, etc.), exit non-zero with the git error surfaced and no destructive action taken.

```bash
current_main_branch="$(git -C "$main_repo" rev-parse --abbrev-ref HEAD)"
if [[ "$current_main_branch" != "main" ]]; then
  if ! git -C "$main_repo" checkout main; then
    echo "Cannot check out main in $main_repo — primary worktree has uncommitted state." >&2
    echo "Resolve it manually, then re-run." >&2
    exit 1
  fi
fi
```

**Rationale**: This is the feature's ergonomic core (FR-010). The from-main-repo form today refuses when the primary isn't on `main`; the from-inside-a-worktree form automates the safe case (clean checkout) and refuses in the unsafe case (dirty primary). No `checkout -f`, no `reset --hard`, no `stash` — the constitution's "never force-discard maintainer state" principle is enforced in plain terms.

**Alternatives considered**:
- *Mirror today's refusal (never auto-checkout)*: rejected — defeats the point of the feature. SC-001 counts command reductions; leaving the checkout to the user keeps the count higher than necessary.
- *Auto-stash before checkout, auto-pop after*: rejected — stash is persistent state the user may forget exists, and "pop" can conflict silently. Stay safe; refuse instead.

## R6 — `--remove` parity (no merge-status guard)

**Decision**: `--remove` shares all of R1–R5 except the `gh pr view` check. It skips PR state entirely (as today) and skips the `git pull` in the primary worktree (as today), but uses the same worktree-context resolution and the same stranded-shell warning.

**Rationale**: The two commands already share most of their structure. Consolidating into one helper (`resolve_worktree_context()`) that both call keeps them symmetric and makes future edits touch one place.

**Alternatives considered**:
- *Make `--remove` not emit the stranded-shell warning*: rejected — the warning's trigger is "your CWD just disappeared", which is identical for both commands.

## R7 — Help text and docs placement

**Decision**:
- `print_usage()` heredoc at the top of `scripts/claude-worktree.sh` — add the no-arg forms to the `Usage:` block and a short note under `Behavior:` describing inference + stranded-shell warning.
- `docs/DEVELOPMENT.md` "Cleanup" subsection (currently lines ~184–203) — add a second code block showing the from-inside-a-worktree flow alongside the existing from-main-repo flow, plus one sentence on the stranded-shell notice.

**Rationale**: Both surfaces are what FR-011 and FR-012 require. Users find the script via `--help` and the docs via `docs/DEVELOPMENT.md`; both must match.

**Alternatives considered**: None — this is the obvious placement.
