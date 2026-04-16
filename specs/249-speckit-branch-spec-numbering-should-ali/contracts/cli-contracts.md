# CLI Contracts

The interfaces this feature exposes are CLI invocations of bash scripts. Each contract lists the invocation shape, inputs, outputs, exit codes, and side effects before/after this feature.

## C1. `scripts/claude-worktree.sh <issue-number> [slug]`

**Before**:
- Creates worktree at `<parent>/forkprint-<N>-<slug>/`.
- Creates and checks out branch `<N>-<slug>`.
- Kickoff prompt for `/speckit.specify` does not mention the issue number (helper auto-numbers).

**After**:
- Creates worktree at `<parent>/forkprint-gh<N>-<slug>/`.
- Creates and checks out branch `gh<N>-<slug>`.
- Kickoff prompt remains substantively unchanged; the helper detects the `gh<N>-` prefix from the branch.

**Inputs**: issue number (positive integer), optional slug.
**Outputs**: worktree path and dev-server port on stdout, as before.
**Exit codes**: unchanged (`0` on success, non-zero on lookup/port/worktree failures).

---

## C2. `scripts/claude-worktree.sh --cleanup-merged <issue-number>`

**Before**:
- Matches worktree whose path contains `-<N>-`.
- Errors if no match.

**After**:
- Matches worktree whose path contains `-gh<N>-` OR `-<N>-` (compat fallback for legacy worktrees spawned before this fix).
- Errors only if neither pattern matches.

**Inputs**: issue number (positive integer).
**Outputs**: removal confirmation on stdout.
**Exit codes**: `0` on success; non-zero if no worktree matches, PR is not `MERGED`, or primary checkout is not on `main`.

---

## C3. `scripts/claude-worktree.sh --remove <issue-number>`

Same before/after change as C2: `-gh<N>-` or legacy `-<N>-` match.

---

## C4. `scripts/claude-worktree.sh --approve-spec <issue-number>` / `--revise-spec`

Same before/after change as C2 on the worktree lookup pattern.

---

## C5. `.specify/scripts/bash/create-new-feature.sh` (SpecKit helper)

**Before**:
- Accepts `--number N` to override auto-detection.
- Always runs `git checkout -b "$BRANCH_NAME"` and errors if the branch already exists.
- Spec directory name derived from computed `BRANCH_NAME`.

**After**:
- Behaviour when the currently checked-out branch matches `^(gh[0-9]+|[0-9]{3,}|[0-9]{8}-[0-9]{6})-`:
  - Derive the target branch/prefix verbatim from the current branch. Do **not** call `git checkout -b` — the branch is already HEAD, reuse it.
  - Compute `FEATURE_DIR = specs/<current-branch>/`.
  - If `FEATURE_DIR` does not exist OR exists with empty/missing `spec.md`, proceed to copy the template into `spec.md`.
  - If `FEATURE_DIR` exists with a non-empty `spec.md`, exit non-zero with a clear error naming the directory.
- Behaviour when `--number N` is supplied:
  - Validate `N` is a positive integer (reject leading zeros that decode to 0, negatives, non-numeric).
  - Use `<NNN>-<slug>` form (unprefixed sequential/legacy form). This flag is explicitly for manual overrides, not the `gh<N>` issue-driven path. (The issue-driven path is triggered by the current branch matching, per the first bullet.)
  - Proceed as the existing script does: try `git checkout -b "<NNN>-<slug>"`; error loudly if branch exists and is not current HEAD.
- Behaviour otherwise (no `--number`, no recognised current branch):
  - Unchanged: compute next sequential number, `git checkout -b "<NNN>-<slug>"`.

**Inputs**: feature description (positional), optional `--number N`, `--short-name <slug>`, `--timestamp`, `--json`.
**Outputs**: JSON `{BRANCH_NAME, SPEC_FILE, FEATURE_NUM}` when `--json` is passed; human-readable otherwise.
**Exit codes**:
- `0` on success (including silent reuse of a matching current branch).
- `1` on: invalid issue number (non-numeric, zero, negative); target branch exists but is not current HEAD; target `spec.md` already exists and is non-empty; git operation failure.

---

## C6. `.specify/scripts/bash/common.sh` helpers (internal)

These are sourced by other scripts; not directly invoked as CLI. Their contracts are internal but important for the prefix propagation.

### `get_current_branch`

**Before**: Non-git fallback matches `^[0-9]{3}-` and `^[0-9]{8}-[0-9]{6}-` directory patterns.
**After**: Also matches `^gh([0-9]+)-`. Ordering preference remains: timestamp > numeric-highest.

### `check_feature_branch`

**Before**: Rejects branches not matching `^[0-9]{3}-` or `^[0-9]{8}-[0-9]{6}-`.
**After**: Also accepts `^gh[0-9]+-`. Error message updated to list all three accepted forms.

### `find_feature_dir_by_prefix`

**Before**: Extracts prefix via `^[0-9]{8}-[0-9]{6}` or `^[0-9]{3}`; falls back to exact-branch-name match.
**After**: Extracts prefix via `^gh[0-9]+` (captures e.g. `gh249`), `^[0-9]{8}-[0-9]{6}`, or `^[0-9]{3}`. Fallback unchanged.

---

## C7. `.claude/commands/speckit.specify.md` command template

**Before**: Instructs Claude to invoke `create-new-feature.sh` without `--number`.
**After**: Same instruction, plus a short note explaining that the script auto-detects `gh<N>-` branches and reuses them — so Claude does not need to do anything different in worktree vs. non-worktree flows.

**No behavioural change for Claude's invocation**; only documentation inside the command file changes.

---

## C8. `docs/DEVELOPMENT.md`

**Before**: Documents the `forkprint-<N>-<slug>` worktree naming.
**After**: Documents the `forkprint-gh<N>-<slug>` naming for new spawns, calls out the disjoint-namespace rule, notes that `--cleanup-merged` accepts both new and legacy forms during the transition.
