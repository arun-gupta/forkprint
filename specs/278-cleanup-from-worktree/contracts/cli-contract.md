# CLI contract: `scripts/claude-worktree.sh` cleanup commands

**Feature**: Issue #278

This contract documents the observable behavior (invocation shapes, exit codes, error messages, final-line notices) of `--cleanup-merged` and `--remove` after this feature lands. It is the acceptance surface for `/speckit.tasks`.

## Invocations

### 1. `--cleanup-merged` with explicit issue (existing — unchanged)

```
$ scripts/claude-worktree.sh --cleanup-merged 278
```

- Works from anywhere (main repo, linked worktree, random subdirectory of the repo).
- Behavior: exactly as today.
- Exit code: 0 on success.

### 2. `--cleanup-merged` with no argument, from inside a linked worktree (NEW)

```
# $PWD is /Users/.../forkprint-278-... (a linked worktree on branch 278-...)
$ scripts/claude-worktree.sh --cleanup-merged
```

- Precondition: `git rev-parse --git-common-dir` ≠ `git rev-parse --git-dir` AND current branch matches `^[0-9]+-`.
- Behavior: infers `278` from branch, resolves primary worktree, runs the full cleanup flow, emits the stranded-shell notice if `$PWD` was the removed worktree.
- Exit code: 0 on success.

### 3. `--cleanup-merged` with no argument, from inside a linked worktree on a non-digit branch (NEW, error path)

```
# $PWD is a linked worktree on branch `hotfix-retry`
$ scripts/claude-worktree.sh --cleanup-merged
```

- Behavior: exit non-zero. No destructive action.
- stderr (FR-004 error shape):
  ```
  Cannot infer issue number from branch 'hotfix-retry' (expected prefix matching ^[0-9]+-).
  Re-run with an explicit issue number:
    scripts/claude-worktree.sh --cleanup-merged <issue>
  ```

### 4. `--cleanup-merged` with no argument, from main repo (NEW, error path — preserves today's behavior)

```
# $PWD is the main repo clone
$ scripts/claude-worktree.sh --cleanup-merged
```

- Precondition: `git rev-parse --git-common-dir` == `git rev-parse --git-dir` (primary worktree).
- Behavior: exit non-zero with today's usage error. Branch-name inference MUST NOT fire.
- stderr (unchanged from today):
  ```
  Usage: scripts/claude-worktree.sh --cleanup-merged <issue>
  ```

### 5. `--cleanup-merged` with no argument, from inside a linked worktree, PR not merged (NEW, error path)

```
# $PWD is a linked worktree on branch 264-..., PR is OPEN
$ scripts/claude-worktree.sh --cleanup-merged
```

- Behavior: infer `264`, reach the existing `gh pr view` guard, refuse. Today's message.
- Exit code: non-zero.
- stderr (unchanged from today):
  ```
  PR for 264-... is OPEN, not MERGED.
  Use: scripts/claude-worktree.sh --remove 264
  ```

### 6. `--remove` with explicit issue (existing — unchanged)

```
$ scripts/claude-worktree.sh --remove 278
```

- Same semantics as today.

### 7. `--remove` with no argument, from inside a linked worktree (NEW)

```
# $PWD is /Users/.../forkprint-999-...
$ scripts/claude-worktree.sh --remove
```

- Same inference rule as invocation 2. No merge-status guard (matches today's `--remove`).

### 8. `--remove` with no argument, from inside a linked worktree on a non-digit branch (NEW, error path)

Same error shape as invocation 3, with `--remove` in the fix instruction instead of `--cleanup-merged`.

### 9. `--remove` with no argument, from main repo (NEW, error path)

Same shape as invocation 4, with `--remove` in the usage error.

## Stranded-shell notice (FR-007)

Emitted only when the worktree actually removed equals `$PWD` at function entry (FR-008). Final line printed before `exit 0`:

```
note: your shell's previous CWD (<removed-wt-path>) no longer exists — run `cd <main-repo-path>` to continue
```

Formatting notes:
- literal prefix `note: ` (lowercase) so it reads as an informational notice, not an error
- absolute paths for both values (no shell variables left unexpanded)
- backticks around the `cd ...` command so a terminal reader can visually distinguish the command from prose
- single line — no wrapping inside the notice itself

## Exit codes

| Condition | Exit code |
|---|---|
| Cleanup succeeded | 0 |
| No-arg invocation from main repo | 1 (same as today's usage error) |
| No-arg invocation from linked worktree, branch has no numeric prefix | 1 |
| Main-repo resolution failed | 1 |
| Primary worktree not on `main` and `checkout main` failed (dirty state) | 1 |
| PR state not `MERGED` (for `--cleanup-merged`) | 1 |
| `gh pr view` failed (not authenticated, no PR, etc.) | 1 |
| `git worktree remove` or `git branch -D` failed | propagates from git (set -e) |

## Help text (FR-011)

`scripts/claude-worktree.sh --help` MUST gain an entry for the no-arg forms:

```
  scripts/claude-worktree.sh --cleanup-merged [<issue-number>]
  scripts/claude-worktree.sh --remove         [<issue-number>]

    When run from inside a linked worktree whose branch begins `<issue>-`,
    the issue number may be omitted and will be inferred from the branch.
    On success, if the caller's CWD was the removed worktree, a final-line
    notice instructs the caller to `cd` to the main repo.
```

The exact wording may differ, but these three facts MUST be communicated: (a) argument is optional, (b) inference only fires from inside a linked worktree with a digit-prefixed branch, (c) the stranded-shell warning will appear on self-removal.

## `docs/DEVELOPMENT.md` (FR-012)

The "Cleanup" subsection MUST show both flows as code blocks. The from-inside-a-worktree flow MUST mention the stranded-shell warning inline so maintainers reading the docs are not surprised.

## What does NOT change (contract preservation)

- `--approve-spec` — unchanged (FR-013).
- `--revise-spec` — unchanged (FR-013).
- The merge-status check in `--cleanup-merged` — unchanged (FR-009, also an out-of-scope guard in issue #278).
- Interactive prompts — still none. The script remains fully non-interactive.
- Existing explicit-arg invocations — behaviorally identical (FR-015, FR-016).
- Kill logic for `.dev.pid` / `.claude.pid` — unchanged.
