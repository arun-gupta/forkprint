---
description: "Task list for 244-headless-worktree-permissions"
---

# Tasks: Headless Worktree Spawns Run Without Permission Prompts, with Truly-Headless Stage 2 Release

**Input**: Design documents from `/specs/244-headless-worktree-permissions/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: No automated tests (shell-script change; repo has no bash-test harness — see plan.md Complexity Tracking). Acceptance verified via `quickstart.md` and PR `## Test plan`.

**Organization**: Tasks grouped by user story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: None — this feature touches existing files only. No new tooling, directories, or dependencies.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Commit the permission-policy file that every subsequent story depends on.

- [X] T001 Create `.claude/settings.json` at the repo root with the `permissions.allow` list from `specs/244-headless-worktree-permissions/contracts/claude-settings.schema.md`. Contents must match the schema exactly: no secrets, no wildcards, no `bypassPermissions`. File path: `/Users/arungupta/workspaces/forkprint-238-headless-claude-worktree-sh-spawns-block/.claude/settings.json`.
- [X] T002 Verify `.claude/settings.json` is not excluded by `.gitignore`. File path: `/Users/arungupta/workspaces/forkprint-238-headless-claude-worktree-sh-spawns-block/.gitignore` (read-only verification; add an explicit `!.claude/settings.json` only if the existing rules would otherwise ignore it).

**Checkpoint**: Allowlist is committed. Any new worktree created from this branch now inherits the policy, so the permission-prompt block from issue #238 is eliminated for covered tools.

---

## Phase 3: User Story 1 - Headless spawn completes the spec step without human intervention (Priority: P1) 🎯 MVP

**Goal**: A headless spawn runs `/speckit.specify` and reaches the spec-review pause without a single "need your approval" prompt.

**Independent Test**: `scripts/claude-worktree.sh --headless <TEST_ISSUE>` against a docs-only test issue; `claude.log` contains the spec path and pause notice, zero approval prompts.

- [X] T003 [US1] Modify `scripts/claude-worktree.sh` spawn path to generate a UUID via `uuidgen` before launching Claude, store it in the local variable `SESSION_ID`, and write it to `<worktree>/.claude.session-id` before the `claude` invocation. File path: `/Users/arungupta/workspaces/forkprint-238-headless-claude-worktree-sh-spawns-block/scripts/claude-worktree.sh` (insert between the dev-server start and the `claude` launch, around line 190).
- [X] T004 [US1] Modify both branches of the `claude` launch (interactive `exec claude "$KICKOFF"` and headless `nohup claude -p "$KICKOFF" …`) to pass `--session-id "$SESSION_ID"`. File path: `/Users/arungupta/workspaces/forkprint-238-headless-claude-worktree-sh-spawns-block/scripts/claude-worktree.sh` lines ~200–206.

**Checkpoint**: A headless spawn now (a) inherits the allowlist from T001, and (b) is addressable by UUID for later resume. US1 is satisfied.

---

## Phase 4: User Story 2 - Headless spawns remain safe and auditable (Priority: P1)

**Goal**: The allowlist is visible, scoped, and reviewable — no blanket permission grant is introduced.

**Independent Test**: Read `.claude/settings.json` and confirm it contains only the entries listed in the contract; `grep` for forbidden patterns returns nothing.

- [X] T005 [US2] Verify the committed `.claude/settings.json` against the contract in `specs/244-headless-worktree-permissions/contracts/claude-settings.schema.md`: no `Bash(*)`, no `bypassPermissions`, no secrets, no MCP tools, no destructive commands. File path: `/Users/arungupta/workspaces/forkprint-238-headless-claude-worktree-sh-spawns-block/.claude/settings.json` (review task, no edit unless a violation is found).

**Checkpoint**: US2 is satisfied. The policy exists in one named file, reviewable on PRs, with contract-level guardrails.

---

## Phase 5: User Story 3 - Stage 2 runs unattended after spec approval (Priority: P1)

**Goal**: `--approve-spec <issue>` and `--revise-spec <issue> "<feedback>"` release the paused session fire-and-forget, without the maintainer attaching a terminal.

**Independent Test**: After a headless spawn reaches the pause, `time scripts/claude-worktree.sh --approve-spec <TEST_ISSUE>` returns in under 5 seconds and `claude.log` resumes growing; Stage 2 ends with an opened (unmerged) PR.

- [X] T006 [US3] Add a `release_paused_session()` helper function to `scripts/claude-worktree.sh` that takes `(issue, prompt)`, resolves the worktree path using the same `worktree list --porcelain | awk` lookup already used by `remove_worktree()`, reads `<worktree>/.claude.session-id`, validates preconditions (worktree exists, session-id file exists, at least one `specs/*/spec.md` exists in the worktree), and spawns `nohup claude -p "$prompt" --resume "$session_id" >> claude.log 2>&1 &` from the worktree directory. File path: `/Users/arungupta/workspaces/forkprint-238-headless-claude-worktree-sh-spawns-block/scripts/claude-worktree.sh` (add before the main dispatch block, after `cleanup_merged()`).
- [X] T007 [US3] Wire up `--approve-spec <issue>` in the main dispatch block: route to `release_paused_session "$2" "proceed"`, print `"Released pause for issue <issue>; Stage 2 running in background. Tail: <worktree>/claude.log"` on success, exit 0. File path: `/Users/arungupta/workspaces/forkprint-238-headless-claude-worktree-sh-spawns-block/scripts/claude-worktree.sh` (add alongside the existing `--remove` / `--cleanup-merged` dispatch branches, around lines 110–120).
- [X] T008 [US3] Wire up `--revise-spec <issue> "<feedback>"` in the main dispatch block: reject empty `$3` with exit 1 + stderr `"--revise-spec requires non-empty feedback"`; otherwise route to `release_paused_session "$2" "$3"`. File path: `/Users/arungupta/workspaces/forkprint-238-headless-claude-worktree-sh-spawns-block/scripts/claude-worktree.sh` (same dispatch block as T007).
- [X] T009 [US3] Implement the error paths from `contracts/claude-worktree-cli.md` inside `release_paused_session()`: (a) no worktree → stderr `"No worktree found for issue <issue>"`, exit 1; (b) no `.claude.session-id` → stderr `"No session ID recorded for issue <issue>; cannot resume non-interactively. Use 'claude --resume' from the worktree instead."`, exit 1; (c) no `spec.md` yet → stderr `"Spec not yet generated for issue <issue>; paused state not reached. Tail <worktree>/claude.log to confirm."`, exit 1. File path: same as T006.

**Checkpoint**: US3 is satisfied. A maintainer can run `--approve-spec` or `--revise-spec` and walk away.

---

## Phase 6: User Story 4 - Documentation reflects the permission model (Priority: P2)

**Goal**: `docs/DEVELOPMENT.md` documents the permission model and the new release subcommands.

**Independent Test**: A maintainer reading `docs/DEVELOPMENT.md` can find the allowlist location and the `--approve-spec` / `--revise-spec` usage without opening the shell script.

- [X] T010 [US4] Add a "Permission model for headless spawns" subsection to the "Spawning worktrees with `scripts/claude-worktree.sh`" section of `docs/DEVELOPMENT.md`. Covers: what `.claude/settings.json` contains, where it lives, the rule that additions require a PR referencing the specific tool needed, and the list of explicitly-denied patterns. File path: `/Users/arungupta/workspaces/forkprint-238-headless-claude-worktree-sh-spawns-block/docs/DEVELOPMENT.md`.
- [X] T011 [US4] Replace the existing "Releasing a paused headless session" subsection with the new `--approve-spec` / `--revise-spec` vocabulary. Keep a short note that `claude --resume` still works for ad-hoc interactive revisions. Document both subcommands at the same level of detail as `--remove` and `--cleanup-merged`. File path: `/Users/arungupta/workspaces/forkprint-238-headless-claude-worktree-sh-spawns-block/docs/DEVELOPMENT.md` (section around lines 146–152).
- [X] T012 [US4] Update `scripts/claude-worktree.sh --help` output to list `--approve-spec <issue>` and `--revise-spec <issue> "<feedback>"` in the Usage block and Options block, matching the style of the existing entries. File path: `/Users/arungupta/workspaces/forkprint-238-headless-claude-worktree-sh-spawns-block/scripts/claude-worktree.sh` (the `print_usage()` heredoc around lines 7–34).

**Checkpoint**: US4 is satisfied. Documentation is discoverable from a single section.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T013 [P] Run `npm run lint` and `npm run build` in the worktree and confirm both remain clean (DoD — constitution §XII). No file path; commands only.
- [X] T014 [P] Execute `quickstart.md` acceptance paths 1, 2, 4, 5 against a live test issue; record results in the PR `## Test plan` section as checked boxes. File path: `/Users/arungupta/workspaces/forkprint-238-headless-claude-worktree-sh-spawns-block/specs/244-headless-worktree-permissions/quickstart.md` (reference; actual run is manual).
- [X] T015 Commit all changes on the `244-headless-worktree-permissions` branch with messages that reference issue #238, push the branch, and open a PR whose body includes the `## Test plan` checklist derived from `quickstart.md`. Do NOT merge (CLAUDE.md PR Merge Rule). No file path; git commands only.

---

## Dependencies

```
T001 (commit settings.json)                ← blocking
 └─ T002 (gitignore check)
     └─ T005 (US2 verify)
     └─ T003 → T004 (US1 spawn path changes)
                 └─ T006 (US3 release helper)
                     ├─ T007 (--approve-spec)
                     └─ T008 (--revise-spec)
                         └─ T009 (error paths)
                             └─ T010 → T011 → T012 (US4 docs + --help)
                                 └─ T013 [P] T014 [P]
                                     └─ T015 (commit + PR)
```

US1 blocks US3 (release commands need `--session-id` on spawn path). US4 (docs) blocks final PR. US2 is a verification story with no implementation.

## Parallel Execution Opportunities

- T013 and T014 can run in parallel (different files, no shared state).
- Within US3, T007 and T008 touch the same dispatch block and are NOT parallelizable.
- Within US4, T010 and T011 both edit `docs/DEVELOPMENT.md` and are NOT parallelizable.

## Implementation Strategy

**MVP slice**: T001 → T002 → T003 → T004. That alone closes issue #238's primary acceptance criterion (headless spawn reaches the pause without approval prompts). US3 (`--approve-spec`, `--revise-spec`) and US4 (docs) are scope additions agreed during spec review and ship in the same PR.

**Incremental delivery**: all stories are implemented in one PR because they share a single file (`scripts/claude-worktree.sh`) and a single doc (`docs/DEVELOPMENT.md`). Splitting into two PRs would force a merge-conflict dance for zero delivery benefit.
