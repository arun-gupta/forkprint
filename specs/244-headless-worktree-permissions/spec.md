# Feature Specification: Headless Worktree Spawns Run Without Permission Prompts, with Truly-Headless Stage 2 Release

**Feature Branch**: `238-headless-claude-worktree-sh-spawns-block` (SpecKit spec dir numbered 244 to avoid collision with merged `243-cleanup-merged-fix/`)
**Created**: 2026-04-15
**Status**: Draft
**Input**: Issue #238 — Headless claude-worktree.sh spawns block on tool-permission prompts (scope extended during spec review to also cover truly-headless Stage 2 release: `--approve-spec` and `--revise-spec`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Headless spawn completes the spec step without human intervention (Priority: P1)

A maintainer launches a background Claude worktree for a GitHub issue using the headless mode of `scripts/claude-worktree.sh`. The spawn runs the SpecKit `/speckit.specify` step, executes the SpecKit helper script that creates the feature branch and spec file, and then reaches the mandatory spec-review pause — all without a human having to approve any tool call along the way.

**Why this priority**: This is the core bug from issue #238. Today, headless spawns deterministically freeze the first time the SpecKit lifecycle tries to run the `create-new-feature.sh` helper, because no approval can arrive in one-shot non-interactive mode. Until this is fixed, headless mode is effectively unusable for SpecKit-driven work and the documented spec-review-pause workflow (from issue #235 / PR #237) cannot be exercised against headless spawns.

**Independent Test**: Run `scripts/claude-worktree.sh --headless <issue>` against any issue whose SpecKit lifecycle will invoke the `/speckit.specify` helpers. Verify that `claude.log` progresses past `/speckit.specify`, that a `specs/NNN-*/spec.md` file is created in the worktree, and that the log ends with the documented "waiting for approval" notice — never with a "need your approval to run …" prompt for a routine SpecKit/dev tool call.

**Acceptance Scenarios**:

1. **Given** a clean checkout of `main` with no worktree for issue `X`, **When** the maintainer runs `scripts/claude-worktree.sh --headless X`, **Then** within the normal runtime of a `/speckit.specify` pass the worktree contains a generated `specs/NNN-*/spec.md` file and `claude.log` shows the spec-review pause message without any blocking permission prompt.
2. **Given** a headless spawn already produced the spec, **When** the maintainer tails `claude.log`, **Then** the tail clearly shows the spec path and the pause notice and contains no "I need your approval to run …" lines for standard SpecKit tooling (the `.specify/scripts/bash/` helpers, `git`, `npm`, `gh`, or routine file reads and edits).

---

### User Story 2 - Headless spawns remain safe and auditable (Priority: P1)

The permission-model change for headless spawns does not silently opt the entire project (including interactive sessions and unrelated Claude Code invocations) into an unrestricted tool policy. A maintainer inspecting the repository can see, in one place, which tools a headless spawn is allowed to run, and that allowlist stays scoped to the tooling the SpecKit lifecycle actually needs.

**Why this priority**: Issue #238 explicitly calls out that the simplest fix — `--dangerously-skip-permissions` — has the widest blast radius and is the least preferred option on security grounds. Constitution section X (Security & Hygiene) requires that tokens and credentials are never leaked and that risky behavior is bounded. Any fix that trades "headless works" for "any spawned Claude can run any shell command anywhere" fails this story.

**Independent Test**: Inspect the repository after the fix. The allowlist (or equivalent permission configuration) used by headless spawns is visible in a single, named, version-controlled location. Launch a headless spawn for an issue and confirm via `claude.log` that the spawn does not execute tools that are outside the documented allowlist (i.e., nothing that would be blocked under a normal interactive session with the documented permission scope).

**Acceptance Scenarios**:

1. **Given** the repository after this change, **When** a maintainer opens the permission-model documentation referenced from `docs/DEVELOPMENT.md`, **Then** they can identify exactly which tools headless SpecKit spawns are permitted to run and where that list lives.
2. **Given** a headless spawn is running, **When** it attempts a tool that is outside the documented allowlist, **Then** the spawn does not silently execute the tool; the behavior is the same as an interactive session would see under the documented policy.

---

### User Story 3 - Stage 2 runs unattended after spec approval (Priority: P1)

A maintainer, after reviewing a spec produced by a headless spawn, releases the spec-review pause without taking over a terminal. They invoke a single one-shot command against the worktree that sends the approval phrase to the paused session and continues the SpecKit lifecycle (`/speckit.plan → /speckit.tasks → /speckit.implement → push → open PR`) in the background, appending to the same `claude.log`. The maintainer's terminal is never attached to the running session; the release is fire-and-forget.

**Why this priority**: Headless Stage 1 alone only solves half the problem. Today's documented release path (`claude --resume` in the worktree and typing `"proceed"`) drops the maintainer into an interactive session, which means Stage 2 inherits their terminal — the moment they close it, the lifecycle stops. That makes the "unattended from fan-out through PR" batch workflow impossible in practice: a maintainer who spawns N headless worktrees must then keep N terminals open to complete them. Truly-headless release at a single approval gate (the spec) is what makes the batch pattern real.

**Independent Test**: After a headless spawn has produced a spec and reached the pause, run `scripts/claude-worktree.sh --approve-spec <issue>`. Confirm that the command returns control to the shell immediately (does not block for the duration of Stage 2), that `claude.log` continues to grow after the command returns, that `/speckit.plan`, `/speckit.tasks`, and `/speckit.implement` complete, that a PR is opened against the branch, and that no merge is performed.

**Acceptance Scenarios**:

1. **Given** a headless spawn for issue `X` has reached the spec-review pause and written `specs/NNN-*/spec.md`, **When** the maintainer runs `scripts/claude-worktree.sh --approve-spec X`, **Then** the command returns control to the shell immediately, Stage 2 continues in the background, `claude.log` records the lifecycle through PR creation, and the PR is opened without being merged.
2. **Given** the spec needs revisions before approval, **When** the maintainer runs `scripts/claude-worktree.sh --revise-spec X "<feedback text>"`, **Then** the paused session interprets the feedback text as revision instructions, edits `specs/NNN-*/spec.md` in place to reflect that feedback (adding, removing, or rewording stories, requirements, edge cases, success criteria, or assumptions as the feedback directs), re-enters the pause, and appends the updated spec path and pause notice to `claude.log` — without requiring an interactive terminal.
3. **Given** a maintainer runs `--approve-spec` or `--revise-spec` against an issue with no matching worktree, **Then** the command exits non-zero with a clear error in stderr and no background process is spawned.
4. **Given** the paused session cannot be located (e.g., session ID was lost), **When** the maintainer runs `--approve-spec`, **Then** the command exits non-zero with a clear error rather than starting a new unrelated session.

---

### User Story 4 - Documentation reflects the permission model (Priority: P2)

`docs/DEVELOPMENT.md` explains — at the same level of detail as the existing "Spawning worktrees" and "Releasing a paused headless session" sections — the permission model for headless spawns: what is allowed, what is not, where the allowlist lives, and how to update it.

**Why this priority**: The issue's acceptance list includes "`docs/DEVELOPMENT.md` documents the permission model for headless spawns." Without this, a future maintainer who needs to extend SpecKit tooling, add a script, or diagnose a newly blocked tool cannot reason about the system. Stage 2 release (`--approve-spec`, `--revise-spec`) must also be documented alongside the existing `--headless`, `--remove`, and `--cleanup-merged` vocabulary so the full batch workflow is discoverable.

**Independent Test**: Read the "Spawning worktrees with `scripts/claude-worktree.sh`" section of `docs/DEVELOPMENT.md`. Confirm that it describes the permission model for headless spawns, names the file(s) where the allowlist is maintained, explains how to add a new allowed tool, and documents the `--approve-spec` and `--revise-spec` release commands.

**Acceptance Scenarios**:

1. **Given** a maintainer who has never seen this change, **When** they read `docs/DEVELOPMENT.md` looking for how headless mode handles tool permissions, **Then** they find a clear explanation without needing to read the shell script.
2. **Given** a maintainer who has just reviewed a spec produced by a headless spawn, **When** they read `docs/DEVELOPMENT.md` for how to release the pause without taking over a terminal, **Then** they find `--approve-spec` and `--revise-spec` documented with example invocations.

---

### Edge Cases

- **Spawn attempts a tool outside the allowlist**: The spawn must not hang indefinitely waiting for a human approval that can never arrive. It should either fail fast with a clear log line (so the maintainer can update the allowlist) or refuse the call and continue — whichever the underlying CLI already supports. The "silent freeze until manually killed" outcome from today's behavior is not acceptable.
- **Spawn needs a newly added SpecKit helper**: When SpecKit ships a new helper script under `.specify/scripts/`, the allowlist must cover it by pattern (e.g., directory-scoped) rather than requiring a per-script edit for every new helper, so ordinary SpecKit upgrades do not regress headless mode.
- **Interactive spawns**: An interactive (non-`--headless`) spawn must continue to behave as it does today — the change must not silently broaden permissions for interactive sessions beyond what they already have.
- **`.env.local` and secrets**: The permission model must not require committing any secret or token to the repository. Credentials continue to flow through `.env.local` (copied into the worktree by the existing script) and are never embedded in the allowlist or in any committed configuration.
- **Batch spawns (`for i in 210 211 212; do …`)**: The fix must apply identically to each spawn in a batch. One permission prompt hanging one worktree in a batch is the same problem at a larger scale.
- **Claude CLI does not support the chosen mechanism**: If the selected approach (e.g., a settings file at a specific path) is not supported by the installed Claude CLI version, the script must surface this to the maintainer at spawn time rather than silently falling back to the blocking default.
- **Release command invoked before pause is reached**: If a maintainer runs `--approve-spec` or `--revise-spec` before the headless spawn has reached the spec-review pause (e.g., `/speckit.specify` is still running), the release command must either wait for the pause to be reached and then release it, or exit with a clear diagnostic — never silently drop the approval on the floor.
- **Release command invoked twice**: Running `--approve-spec` against a worktree that has already advanced into Stage 2 must be a no-op with a clear message, not a spawn of a second competing session.
- **`--revise-spec` called with empty feedback**: The command must require non-empty feedback text; otherwise it is indistinguishable from `--approve-spec` and confuses the paused session.
- **Session ID is lost**: If the session identifier needed to resume the paused spawn cannot be located (worktree moved, session store cleared, Claude CLI upgraded in an incompatible way), the release commands must fail fast with a maintainer-actionable error — not start a new unrelated session.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Headless invocations of `scripts/claude-worktree.sh` MUST launch the Claude CLI in a mode where routine SpecKit lifecycle operations (running `.specify/scripts/bash/` helpers, reading and writing files under the worktree, running `git`, `npm`, and `gh` for the documented lifecycle, and invoking the standard Claude Code tools the lifecycle needs) proceed without prompting for human approval.
- **FR-002**: The permission scope granted to a headless spawn MUST be expressed as an allowlist (either a `--allowedTools` argument, a project-scoped `.claude/settings.json`, or an equivalent named configuration) — not as a blanket "skip all permission checks" flag. The chosen mechanism MUST be the one recommended in issue #238 (option 2 or option 3).
- **FR-003**: The allowlist MUST cover, at minimum, the tools the SpecKit lifecycle uses today: execution of scripts under `.specify/scripts/bash/`, `git`, `npm`, `gh`, filesystem reads and writes within the worktree, and the Claude Code built-in tools the lifecycle invokes (Read, Edit, Write, Grep, Glob, Bash for the above commands).
- **FR-004**: The allowlist MUST NOT grant permission to run arbitrary shell commands outside the documented scope, and MUST NOT grant permission to read or write files outside the worktree or the repository it is hosted in.
- **FR-005**: The allowlist configuration MUST live in a single, version-controlled location in the repository so that it can be reviewed, diffed, and amended via pull request.
- **FR-006**: Interactive invocations of `scripts/claude-worktree.sh` (no `--headless` flag) MUST continue to work as they do today; the permission-model change MUST NOT regress the interactive flow or silently broaden its permissions.
- **FR-007**: `docs/DEVELOPMENT.md` MUST document the permission model for headless spawns: what the allowlist contains, where it is maintained, and how to extend it when the SpecKit lifecycle legitimately needs a new tool.
- **FR-008**: A headless spawn that encounters a tool outside the allowlist MUST NOT hang indefinitely; the outcome MUST be an entry in `claude.log` that the maintainer can diagnose without attaching a debugger or killing the process.
- **FR-009**: The fix MUST NOT require committing any secret, token, OAuth credential, or personal access token into the allowlist or any other version-controlled file.
- **FR-010**: A headless spawn launched against an issue that triggers the `/speckit.specify` pathway MUST reach the mandatory spec-review pause (introduced by issue #235) within the normal runtime of a single `/speckit.specify` pass, producing a `specs/NNN-*/spec.md` file in the worktree.
- **FR-011**: The fix MUST apply identically to each spawn in a batch invocation (`for i in …; do scripts/claude-worktree.sh --headless "$i"; done`); no per-spawn manual permission step is required.
- **FR-012**: `scripts/claude-worktree.sh` MUST expose a `--approve-spec <issue>` subcommand that, for a worktree matching `<issue>` whose headless spawn has reached the spec-review pause, releases the pause by sending the approval phrase to the paused session and continues Stage 2 (`/speckit.plan → /speckit.tasks → /speckit.implement → push branch → open PR`) in the background. The command MUST be fire-and-forget: it returns control to the caller's terminal without occupying it for the duration of Stage 2, and Stage 2 output MUST continue to append to the same `claude.log` used by the original spawn.
- **FR-013**: `scripts/claude-worktree.sh` MUST expose a `--revise-spec <issue> "<feedback>"` subcommand that, for a worktree matching `<issue>` whose headless spawn has reached the spec-review pause, sends the feedback text to the paused session as revision instructions. The paused session MUST interpret that feedback, apply the corresponding edits directly to the existing `specs/NNN-*/spec.md` file (not append to a log, not defer to a human), and re-enter the paused state (awaiting a subsequent `--approve-spec` or further `--revise-spec`). The command MUST be fire-and-forget in the same sense as `--approve-spec`, and MUST reject empty feedback with a clear error.
- **FR-013a**: The revision behavior MUST preserve the spec file path, frontmatter metadata (Feature Branch, Created, Input), and overall section ordering — revisions modify content within the template structure rather than regenerating the file from scratch. Repeated `--revise-spec` invocations against the same worktree MUST accumulate (each round edits the spec as it stands after the previous round), not reset to the original generated spec.
- **FR-014**: Stage 2 launched via `--approve-spec` MUST NOT merge the opened PR. Merge remains a manual maintainer step, consistent with CLAUDE.md's PR Merge Rule.
- **FR-015**: `--approve-spec` and `--revise-spec` MUST NOT silently spawn a new unrelated Claude session when the original paused session cannot be located; they MUST exit non-zero with a maintainer-actionable error identifying what was not found.
- **FR-016**: Running `--approve-spec` against a worktree that has already advanced past Stage 1 MUST be a no-op with a clear message, not a second competing spawn.

### Key Entities

- **Headless spawn**: A background Claude CLI process launched by `scripts/claude-worktree.sh --headless`, whose stdout and stderr are appended to `claude.log` inside its worktree and which has no interactive channel for approving tool calls.
- **Allowlist / permission configuration**: The named, version-controlled set of tools and command patterns that a headless spawn is permitted to run without human approval. Whether this lives in a CLI argument, a settings file, or both is an implementation detail; the contract is that it is explicit, scoped, and reviewable.
- **Permission model documentation**: The section of `docs/DEVELOPMENT.md` that describes the allowlist for maintainers.
- **Paused session**: A headless spawn that has completed `/speckit.specify`, written a spec file, reported the spec path, and is awaiting one of the approval phrases before continuing. Releasing the paused session requires a mechanism for resuming the same Claude session non-interactively (not starting a new one).
- **Release command**: `--approve-spec <issue>` or `--revise-spec <issue> "<feedback>"` — the script-level surface that sends input to a paused session without requiring the maintainer's terminal to be attached for the duration of Stage 2.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A headless spawn launched via `scripts/claude-worktree.sh --headless <issue>` against an issue that exercises the full SpecKit lifecycle reaches the mandatory spec-review pause in 100% of runs, without producing a "need your approval to run …" line in `claude.log` for any standard SpecKit, `git`, `npm`, `gh`, or Claude Code built-in tool call.
- **SC-002**: Zero secrets, tokens, OAuth credentials, or PATs appear in any file that this change adds or modifies in the repository.
- **SC-003**: A maintainer reading `docs/DEVELOPMENT.md` can identify, in under one minute, the file that holds the headless-spawn allowlist and the procedure for extending it.
- **SC-004**: Interactive spawns (no `--headless`) continue to pass their existing manual acceptance steps with no regression.
- **SC-005**: The allowlist as committed grants no tool permission beyond what the documented SpecKit lifecycle, `git`, `npm`, `gh`, and the Claude Code built-in tools require — verifiable by a maintainer reviewing the committed allowlist against this spec.
- **SC-006**: `scripts/claude-worktree.sh --approve-spec <issue>` returns control to the shell in under 5 seconds (it does not block for the duration of Stage 2), and the lifecycle subsequently completes through PR creation with no further manual intervention, in 100% of test runs.
- **SC-007**: `scripts/claude-worktree.sh --revise-spec <issue> "<feedback>"` produces a `specs/NNN-*/spec.md` whose content visibly reflects the feedback (additions, removals, or rewordings that a reviewer can identify by reading the diff), and re-enters the paused state, in 100% of test runs, without the maintainer's terminal being attached for the revision pass. Two consecutive `--revise-spec` rounds against the same worktree produce cumulative edits (the second round's diff is against the first round's output, not against the original spec).
- **SC-008**: A maintainer can spawn N headless worktrees (N ≥ 3), review all N specs, approve them via `--approve-spec`, and walk away — arriving later to find N opened (unmerged) PRs — using only the documented commands, with no background-terminal juggling.

## Assumptions

- The Claude CLI currently installed in maintainer environments supports at least one of the issue's recommended mechanisms for scoped tool permissions in headless mode (an `--allowedTools`-style argument or a project-scoped settings file). If neither is supported by the installed CLI, that is a blocker to be surfaced during `/speckit.plan`, not a reason to fall back to a blanket skip-all-permissions flag.
- The set of tools the SpecKit lifecycle needs is bounded and can be enumerated from the current `.specify/scripts/` directory plus the standard Claude Code built-in tool names — no dynamic discovery mechanism is required for Phase 1 of the fix.
- `scripts/claude-worktree.sh` remains the single entry point for spawning worktrees; no other entry point needs to be updated in parallel.
- `DEV_GITHUB_PAT` and OAuth credentials continue to flow through `.env.local` as they do today; no change to the credentials pathway is required or permitted by this spec.
- The fix targets the current repository layout (worktrees under `../forkprint-<issue>-<slug>/`) and does not need to work across unrelated repositories or arbitrary external paths.
- The Claude CLI supports resuming an existing session non-interactively (e.g., `claude -p "<prompt>" --resume <session-id>`) so that `--approve-spec` and `--revise-spec` can send input to a paused session without starting a new one. If this is not available in the installed CLI, the implementation must surface the gap rather than regressing to a blocking default.
- Resolving the paused session's identifier from a worktree is tractable — either by recording it at spawn time (e.g., writing it alongside `.claude.pid`) or by querying the CLI's session store. The exact mechanism is a `/speckit.plan` decision.
- The spec-review pause is an intentional policy gate (CLAUDE.md, issue #235 / PR #237). This spec does not propose bypassing it; `--approve-spec` sends the same approval phrase a human would type, preserving the gate while removing the terminal-attachment requirement.
