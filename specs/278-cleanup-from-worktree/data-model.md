# Data Model: `claude-worktree.sh` cleanup from inside a worktree

**Feature**: Issue #278

This feature has no persisted data model — it is a shell-script behavioral change. The "entities" below are shell-level values computed and passed between helper functions within a single script run.

## Shell-level values

| Name | Source | Shape | Lifetime | Purpose |
|---|---|---|---|---|
| `caller_cwd` | `$PWD` at function entry | absolute path string | one function call | Snapshot of the user's starting directory; compared against `wt` to decide whether to emit the stranded-shell warning. |
| `is_in_linked_wt` | `[[ "$(git rev-parse --git-common-dir)" != "$(git rev-parse --git-dir)" ]]` | 0 or 1 | one function call | Gates the no-arg inference path (FR-001, FR-002, FR-003, FR-005). |
| `main_repo` | `git worktree list --porcelain \| awk '/^worktree/ {print $2; exit}'` | absolute path string | one function call | Target for `cd`, `git pull`, `git checkout main`, `git worktree remove`, `git branch -D` (FR-006). |
| `inferred_issue` | `[[ "$branch" =~ ^([0-9]+)- ]]` → `${BASH_REMATCH[1]}` | digit string, or empty | one function call | Fills in for the missing positional arg when `is_in_linked_wt == 1` and the branch matches (FR-001). Empty → FR-004 error path. |
| `wt` | existing `git worktree list --porcelain \| awk ...` keyed by `-${issue}-` | absolute path string | one function call | The worktree to `kill`, `worktree remove`, and warn about if `== caller_cwd`. Unchanged from today. |
| `branch` | `git -C "$wt" rev-parse --abbrev-ref HEAD` | ref string | one function call | The branch to `git branch -D` and to pass to `gh pr view`. Unchanged from today. |
| `pr_state` | `gh pr view "$branch" --json state -q .state` | `MERGED` / `OPEN` / `CLOSED` / empty | one function call | `--cleanup-merged` only. Unchanged from today. |

## State transitions (control flow)

There are no persisted state machines. The control flow per cleanup invocation is:

```
entry
  │
  ├─ read $PWD → caller_cwd
  │
  ├─ compute is_in_linked_wt
  │   ├─ inside linked wt → go on
  │   └─ not inside linked wt → require explicit $1; on missing → today's usage error (FR-005)
  │
  ├─ resolve issue
  │   ├─ explicit $1 given → use it (FR-015, FR-016)
  │   └─ no $1, is_in_linked_wt == 1 → compute inferred_issue
  │       ├─ branch matches ^[0-9]+- → use inferred_issue
  │       └─ branch does not match → FR-004 error (no destruction)
  │
  ├─ resolve main_repo (FR-006)
  │   └─ resolution fails → error exit (no destruction)
  │
  ├─ if --cleanup-merged:
  │   ├─ ensure primary on main (FR-010) — auto-checkout or refuse on dirty
  │   ├─ gh pr view state → must be MERGED (FR-009)
  │   └─ git pull --ff-only origin main
  │
  ├─ cd "$main_repo"
  ├─ kill any .dev.pid / .claude.pid under $wt
  ├─ git worktree remove --force "$wt"
  ├─ (cleanup-merged only) git branch -D "$branch"
  │
  └─ if caller_cwd == $wt or starts with $wt/ → print stranded-shell warning
```

## Invariants

- The script MUST NOT attempt `cd "$wt"` at any point before the `git worktree remove` — the calling shell may already be inside `$wt`, and cd-ing deeper into a directory that is about to disappear accomplishes nothing useful and risks accidental re-entry.
- `caller_cwd` MUST be read before any `cd` in the function. Bash does not restore `$PWD` on function return, so a later `cd` would overwrite the snapshot.
- The stranded-shell warning MUST be the last line printed before `exit 0`. Any `echo` after it in the function would bury the warning beneath less-important output.
