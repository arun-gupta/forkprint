# Quickstart: Manual verification for `--cleanup-merged` / `--remove` from inside a worktree

**Feature**: Issue #278
**Purpose**: Step-by-step manual scenarios mapped 1:1 to the six Success Criteria in the spec.

Run these from the main repo clone (`/Users/arungupta/workspaces/forkprint`) unless a scenario specifies otherwise.

---

## SC-001 — 4 commands → 1 command reduction

**Setup**: spawn and merge a throwaway PR.
1. `scripts/claude-worktree.sh 999` (use a real issue number that has a PR; for local dry-run, use any digit-prefixed branch you control and mark its PR `MERGED` manually).
2. Wait for `cd ../forkprint-999-...` shell.
3. Merge the PR via the GitHub UI.

**Test**:
```
cd ../forkprint-999-<slug>
scripts/claude-worktree.sh --cleanup-merged
```

**Pass criteria**:
- The single command completes cleanup.
- The worktree directory no longer exists.
- The feature branch no longer exists in `git branch -l` in the main repo.
- The final output line is the `note: your shell's previous CWD ...` notice.
- Exit code 0.

---

## SC-002 — No terminal-switching required

**Test**: In the same terminal window where the Claude session ran, immediately run `scripts/claude-worktree.sh --cleanup-merged` (from inside the worktree, no arg).

**Pass criteria**:
- Cleanup succeeds in the same shell. No new terminal opened.
- After cleanup, running `cd <main-repo-path>` (copied from the stranded-shell notice) lands in a valid working directory.

---

## SC-003 — From main repo, no-arg still fails with today's error

**Test**:
```
cd /Users/arungupta/workspaces/forkprint
scripts/claude-worktree.sh --cleanup-merged
```

**Pass criteria**:
- Exit code 1.
- stderr contains `Usage: ... --cleanup-merged <issue>` (the existing usage error).
- No destructive action is taken (run `git worktree list` before and after — output identical).
- `scripts/claude-worktree.sh --remove` (no arg) from the main repo → same usage-error shape.

---

## SC-004 — Merge-status guard still fires for `OPEN` / `CLOSED` PRs

**Setup**: Spawn a worktree for an issue whose PR is `OPEN` (not merged).

**Test**:
```
cd ../forkprint-<issue>-<slug>
scripts/claude-worktree.sh --cleanup-merged
```

**Pass criteria**:
- Exit code 1.
- stderr: `PR for <branch> is OPEN, not MERGED.`
- The worktree still exists after the command.
- `git branch -l <branch>` still lists the branch.
- Running `scripts/claude-worktree.sh --remove` (no arg) then successfully removes it (proves `--remove` skips the PR state check).

---

## SC-005 — Stranded-shell warning trigger is accurate

**Case A — caller's CWD is the removed worktree**:
```
cd ../forkprint-278-<slug>        # inside the worktree
scripts/claude-worktree.sh --cleanup-merged
# final line MUST be: note: your shell's previous CWD (...) no longer exists — run `cd ...` to continue
```

**Case B — caller's CWD is elsewhere, explicit arg used**:
```
cd /tmp                           # outside any worktree
scripts/claude-worktree.sh --cleanup-merged 278
# output MUST NOT contain the stranded-shell notice
```

**Pass criteria**:
- Case A prints the notice as the final line.
- Case B does not print the notice.

---

## SC-006 — `--help` and `docs/DEVELOPMENT.md` both describe both flows

**Test**:
```
scripts/claude-worktree.sh --help | grep -A2 -- '--cleanup-merged'
grep -A5 -- 'cleanup-merged' docs/DEVELOPMENT.md
```

**Pass criteria**:
- Both sources mention the optional issue-number arg.
- Both sources mention the from-inside-a-worktree flow.
- Both sources mention the stranded-shell notice (in prose is fine).

---

## Edge-case spot checks (not tied to SCs but required for correctness)

### EC-1 — Non-digit branch name

```
cd ../forkprint-<issue>-<slug>
git checkout -b hand-rolled-branch
scripts/claude-worktree.sh --cleanup-merged
```
**Pass**: exit 1, stderr names the branch and the `<issue>` fix; no destructive action.

### EC-2 — Primary worktree is not on `main`

```
# in main repo
git checkout -b temp-branch
# now switch to linked worktree
cd ../forkprint-<issue>-<slug>
scripts/claude-worktree.sh --cleanup-merged
```
**Pass**: the script auto-checks out `main` in the main repo when its state is clean (verified by `cd /Users/arungupta/workspaces/forkprint && git rev-parse --abbrev-ref HEAD` afterwards → `main`). If the main repo is dirty, the script refuses without force-discarding.

### EC-3 — Explicit arg from inside a worktree still works

```
cd ../forkprint-278-<slug>
scripts/claude-worktree.sh --cleanup-merged 278
```
**Pass**: identical behavior to invocation #1 in the CLI contract. Explicit wins; inference is silent.

### EC-4 — `--remove` parity

Repeat SC-001 using `--remove` in place of `--cleanup-merged` on a branch whose PR is `OPEN` (or has no PR).
**Pass**: worktree removed, no PR-state call made (observable by the absence of `gh pr view` in the terminal output).

---

## Rollback plan

If any scenario fails on a real merged PR, and the cleanup partially ran:
- Check `git worktree list` and `git worktree prune` if stale entries remain.
- Check `git branch -l` for the feature branch; `git branch -D` manually if needed.
- The feature adds no persistent state beyond the transient script run, so there is nothing else to roll back.
