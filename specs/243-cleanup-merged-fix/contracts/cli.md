# CLI Contract: `scripts/claude-worktree.sh --cleanup-merged <issue>`

## Inputs
- `<issue>`: integer issue number. Used to locate the worktree at `../forkprint-<issue>-<slug>` and its associated local branch.

## Preconditions
- Current working directory is inside `$REPO_ROOT` (the primary worktree), which is checked out on `main`.
- `gh` is installed and authenticated for the repository's remote.
- A worktree matching `-<issue>-` exists and has an associated local branch.

## Behavior (happy path)
1. Locate worktree for `<issue>`; abort non-zero if not found.
2. Read the branch name from the worktree's HEAD; abort non-zero if detached/empty.
3. Verify the primary worktree is on `main`; abort non-zero if not.
4. Query PR state: `gh pr view "$branch" --json state -q .state`.
5. If state is exactly `MERGED`:
   a. `git -C "$REPO_ROOT" pull --ff-only origin main`
   b. Kill any `.dev.pid` / `.claude.pid` processes in the worktree.
   c. `git -C "$REPO_ROOT" worktree remove --force "$wt"`
   d. `git -C "$REPO_ROOT" branch -D "$branch"`
   e. Print success messages; exit 0.
6. Otherwise (any non-`MERGED` state, including `OPEN`, `CLOSED`, or no PR found):
   - Print a message naming the observed state and directing the user to `scripts/claude-worktree.sh --remove <issue>`.
   - Leave worktree and branch intact.
   - Exit non-zero.

## Failure modes
| Condition | Exit | User-visible message |
|-----------|-----:|----------------------|
| No worktree matching `<issue>` | 1 | `No worktree found for issue <issue>` |
| Worktree HEAD detached/empty | 1 | `Could not determine branch for <wt>` |
| Primary worktree not on main | 1 | `Primary worktree at <repo> is on '<branch>', not main.` |
| `gh pr view` fails (missing gh / unauth / network / no PR) | 1 | `Could not determine PR state for <branch>. Is gh installed and authenticated? If this branch has no PR, use --remove.` |
| PR state ≠ `MERGED` | 1 | `PR for <branch> is <state>, not MERGED. Use: scripts/claude-worktree.sh --remove <issue>` |
| `git branch -D` fails (e.g., branch checked out elsewhere) | non-zero (propagated) | Underlying git error surfaced |

## Invariants
- No destructive operation runs before the PR-state check succeeds with `MERGED`.
- On any pre-deletion failure, both the worktree and the branch are left intact.
- Exit code is 0 only when the branch was deleted.
