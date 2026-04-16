# Tasks: `claude-worktree.sh --cleanup-merged` / `--remove` run from inside a worktree

**Feature**: Issue #278
**Branch**: `278-claude-worktree-sh-allow-cleanup-merged`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contract**: [contracts/cli-contract.md](./contracts/cli-contract.md) | **Quickstart**: [quickstart.md](./quickstart.md)

## Scope

Single shell script (`scripts/claude-worktree.sh`) + one docs update (`docs/DEVELOPMENT.md`). No application code, no new dependencies, no new files. Implementation is intentionally small (§IX rule 6 — YAGNI).

---

## Phase 1: Setup

No setup required. The feature touches two existing files. No new tooling, no new files, no dependency installs.

---

## Phase 2: Foundational

- [x] T001 Add a shared helper `resolve_worktree_context()` near the top of `scripts/claude-worktree.sh` (below `MAX_PORT=3100`, above `remove_worktree()`). It MUST set four variables in the caller's scope via `eval` or via global vars named with a `CTX_` prefix: `CTX_IS_IN_LINKED_WT` (0|1), `CTX_MAIN_REPO` (absolute path to primary worktree), `CTX_CURRENT_WT` (absolute path to `$PWD`'s worktree, or empty if not in one), `CTX_INFERRED_ISSUE` (digit string or empty). Implementation: `git rev-parse --git-common-dir` vs `git rev-parse --git-dir` for detection (R1), `git worktree list --porcelain | awk '/^worktree/ {print $2; exit}'` for primary resolution (R2), `[[ "$branch" =~ ^([0-9]+)- ]]` for inference (R3). Never writes outside these four CTX_ vars; never touches stdout on the success path (it's a helper, not a UI).

---

## Phase 3: User Story 1 — Self-cleanup `--cleanup-merged` from inside a worktree (P1)

**Story goal**: no-arg `scripts/claude-worktree.sh --cleanup-merged` invoked inside a linked worktree completes the full cleanup flow against the inferred issue.

**Independent test**: Scenario SC-001 in [quickstart.md](./quickstart.md) — single-command cleanup from inside the worktree.

- [x] T002 [US1] In `scripts/claude-worktree.sh`, modify the top-level dispatcher block for `--cleanup-merged` (currently `if [[ "${1:-}" == "--cleanup-merged" ]]; then [[ -n "${2:-}" ]] || { echo "Usage: $0 --cleanup-merged <issue>" >&2; exit 1; }`) to: (a) call `resolve_worktree_context` first, (b) if `$2` is present use it unchanged (FR-015), (c) if `$2` is absent AND `CTX_IS_IN_LINKED_WT==1` AND `CTX_INFERRED_ISSUE` is non-empty, pass `CTX_INFERRED_ISSUE` to `cleanup_merged`, (d) if `$2` is absent AND `CTX_IS_IN_LINKED_WT==1` AND `CTX_INFERRED_ISSUE` is empty, exit 1 with the FR-004 error message shape from the CLI contract, (e) if `$2` is absent AND `CTX_IS_IN_LINKED_WT==0`, keep today's `Usage:` error exactly as-is (FR-005).

- [x] T003 [US1] In `scripts/claude-worktree.sh`, modify `cleanup_merged()` to: (a) capture `caller_cwd="$PWD"` as the very first line, (b) replace today's primary-branch check (which errors out when the main repo is not on `main`) with the auto-checkout flow from R5 — attempt `git -C "$REPO_ROOT" checkout main`, refuse with a clear error on failure, never force-discard. Change line 102 path accordingly. (c) Leave the existing merge-status guard, pid kills, worktree remove, and branch delete intact — they are correct as-is.

- [x] T004 [US1] In `scripts/claude-worktree.sh` `cleanup_merged()`, after the existing `git -C "$REPO_ROOT" branch -D "$branch"` line, add the stranded-shell warning: if `caller_cwd == wt` OR `caller_cwd == wt/*`, print exactly `note: your shell's previous CWD ($wt) no longer exists — run \`cd $REPO_ROOT\` to continue` to stdout as the final line before implicit exit 0 (FR-007, FR-008).

---

## Phase 4: User Story 2 — `--remove` parity (P2)

**Story goal**: `--remove` gains the same no-arg-inside-worktree treatment as `--cleanup-merged`.

**Independent test**: Scenario EC-4 in [quickstart.md](./quickstart.md) — `--remove` with no arg from inside a worktree force-removes it.

- [x] T005 [US2] In `scripts/claude-worktree.sh`, modify the top-level dispatcher block for `--remove` the same way as T002, mirroring steps (a)–(e) but with `remove_worktree` as the target and `--remove` in the error messages.

- [x] T006 [US2] In `scripts/claude-worktree.sh`, modify `remove_worktree()` to: (a) capture `caller_cwd="$PWD"` as the first line, (b) after the existing `git -C "$REPO_ROOT" worktree remove --force "$wt"` / `echo "Removed $wt"` lines, emit the stranded-shell warning using the same condition and format as T004. Do NOT add a PR-state check (preserves today's `--remove` semantics, FR-009 intentionally excludes `--remove` from the guard).

---

## Phase 5: Polish & cross-cutting

- [x] T007 In `scripts/claude-worktree.sh`, update the `print_usage()` heredoc: (a) change the `--cleanup-merged` and `--remove` lines in the `Usage:` block to show the issue-number as optional (`[<issue-number>]`), (b) add a new section titled "Cleanup from inside a worktree" that documents the inference rule, the `^[0-9]+-` branch-name requirement, and the stranded-shell notice (FR-011).

- [x] T008 In `docs/DEVELOPMENT.md`, update the "Cleanup" subsection (currently around lines 184–203): add a second code block showing the from-inside-a-worktree flow alongside the existing from-main-repo flow; add one sentence noting the stranded-shell `cd <main-repo-path>` notice that appears on self-removal (FR-012).

- [x] T009 Run the six quickstart scenarios from [quickstart.md](./quickstart.md) (SC-001 through SC-006) plus the four edge-case spot checks (EC-1 through EC-4). Each must pass as documented. This is the manual verification required by constitution §XI — there is no bash-test harness to add (adding one would violate §IX rule 6).

---

## Dependencies

```
T001 (helper)
  ├→ T002 (cleanup-merged dispatcher wiring)
  │     ├→ T003 (cleanup_merged caller_cwd + auto-checkout main)
  │     │     └→ T004 (cleanup_merged stranded-shell warning)
  │     │           └→ T007 (help text)
  │     │                 └→ T008 (docs)
  │     │                       └→ T009 (manual verification)
  │     └─────── T005 (remove dispatcher wiring) ──┐
  │                                                │
  └──────────────── T006 (remove_worktree caller_cwd + warning)
                        └→ T007 (help text, shared with above)
```

- T001 blocks everything.
- T002 → T003 → T004 is the US1 chain; tasks are sequential because they edit adjacent regions of `cleanup_merged()`.
- T005 → T006 is the US2 chain.
- T007 and T008 can start after both T004 and T006 are in place.
- T009 is the final gate before PR.

## Parallel opportunities

- T003 and T006 edit different functions (`cleanup_merged` vs `remove_worktree`) — can be done in parallel after T002 and T005 both land.
- T004 and T006's warning line share logic; preferably implemented as one helper (the warning message itself) to avoid duplication.

## MVP scope

US1 alone (T001 + T002 + T003 + T004 + T007 + T008 + T009) delivers the headline command-reduction value of SC-001 and SC-002. US2 (`--remove` parity) is P2 and necessary for ergonomic consistency but does not block shipping US1.

## Validation

- [x] Every task starts with `- [ ]`, has a T### ID, is labeled `[US1]` / `[US2]` where appropriate (Setup/Foundational/Polish tasks are unlabeled), and names at least one file path.
- [x] Every FR in [spec.md](./spec.md) is covered: FR-001/FR-002 → T002+T005; FR-003 → T001; FR-004 → T002+T005; FR-005 → T002+T005; FR-006 → T001+T003+T006; FR-007/FR-008 → T004+T006; FR-009 → unchanged code, verified in T009; FR-010 → T003; FR-011 → T007; FR-012 → T008; FR-013 → no task needed (out of scope); FR-014 → enforced by "no new files" constraint; FR-015/FR-016 → T002+T005 step (b); FR-017 → T003+T004+T006 (preserves existing sequence).
- [x] Every SC in [spec.md](./spec.md) maps to a quickstart scenario verified in T009.
