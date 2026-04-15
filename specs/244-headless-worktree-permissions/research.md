# Phase 0 Research — Headless Worktree Permissions + Release Commands

## R1. Claude CLI permission-scoping mechanism

**Decision**: Use a project-scoped `.claude/settings.json` committed to the repo root, with a tightly-scoped `permissions.allow` list. The file is auto-discovered by the Claude CLI for any session (interactive or `-p`) launched inside the repo (or any git worktree of it).

**Rationale**:
- `claude --help` (installed CLI) confirms three supported mechanisms for scoping permissions: `--allowedTools`, `--permission-mode`, and `--settings <file-or-json>`. Project-scoped settings are auto-discovered without the `--settings` flag.
- Issue #238 ranks option 3 (project-scoped settings file) as preferred alongside option 2. Settings-file wins over `--allowedTools` on three axes: (a) reviewable as a tracked file on PRs, (b) shared between interactive and headless runs so behavior is consistent, (c) not re-specified on every `claude` invocation (less drift risk).
- `permissions.allow` entries support pattern matching, e.g., `Bash(git *)`, `Bash(.specify/scripts/bash/*)` — exactly the granularity the spec demands (FR-003, FR-004).

**Alternatives considered**:
- `--dangerously-skip-permissions` / `--permission-mode bypassPermissions`: rejected on security grounds (FR-002, spec US2). Constitution §X requires bounded behavior.
- `--allowedTools` as a CLI arg on every invocation: rejected — duplicates the policy surface and makes the interactive/headless policies drift; also lives in a shell string literal rather than structured JSON.
- `--permission-mode acceptEdits` or `auto`: rejected — "accept edits" only auto-approves file edits, not `Bash(...)` calls; the SpecKit helper scripts are bash invocations, so this wouldn't unblock the original failure. `auto` is not narrowly scoped.

## R2. Scope of the allowlist

**Decision**: Allow exactly the tool patterns the documented SpecKit lifecycle needs on this repo.

| Pattern | Why |
|---|---|
| `Bash(.specify/scripts/bash/*)` | SpecKit helpers — the exact call that blocks today per issue #238. |
| `Bash(git:*)` | Branch creation, commits, push, status, diff — used throughout the lifecycle. |
| `Bash(gh:*)` | Issue fetch, PR open — used at spawn and at end of Stage 2. |
| `Bash(npm:*)` | `npm install`, `npm test`, `npm run lint`, `npm run build`, `npm run dev` — DoD checklist (`docs/DEVELOPMENT.md`). |
| `Bash(ls:*)`, `Bash(cat:*)`, `Bash(mkdir:*)`, `Bash(grep:*)`, `Bash(find:*)`, `Bash(awk:*)`, `Bash(sed:*)`, `Bash(echo:*)`, `Bash(printf:*)`, `Bash(lsof:*)` | Routine shell operations that SpecKit scripts and the Claude Code Bash tool invoke. Scoped by command name — no `Bash(*)` wildcard. |
| `Read`, `Edit`, `Write`, `Grep`, `Glob` | Claude Code built-in tools used continuously by the lifecycle. |
| `WebFetch(domain:github.com)`, `WebFetch(domain:api.github.com)` | Occasional reading of GitHub URLs from the kickoff context. Domain-scoped. |

**Explicitly not allowed** (not listed):
- `Bash(rm:*)` — destructive; fall-through to prompt on the rare legitimate case.
- `Bash(curl:*)` / `Bash(wget:*)` — arbitrary network egress.
- `Bash(ssh:*)`, `Bash(scp:*)` — network.
- `Bash(sudo:*)` — privilege escalation.
- Any MCP tools — orthogonal to SpecKit and not required by the lifecycle.

**Rationale**: FR-003 requires the allowlist covers SpecKit lifecycle needs; FR-004 requires it does not grant arbitrary shell. The list above was derived by tracing the commands the SpecKit lifecycle actually invokes in `.specify/scripts/bash/` and in the DoD checklist, not by aspirational coverage.

**Alternatives considered**: A single `Bash(*)` entry — rejected (FR-004, US2 independent test).

## R3. Session addressability for `--approve-spec` / `--revise-spec`

**Decision**: Generate a UUID at spawn time (`uuidgen`) and pass it to the initial `claude -p` via `--session-id <uuid>`. Record the UUID in the worktree at `.claude.session-id`. Release commands read this file and pass the UUID to `claude -p "<prompt>" --resume <uuid>` in a background `nohup … &` process.

**Rationale**:
- `claude --help` documents `--session-id <uuid>` ("Use a specific session ID for the conversation"). This removes all ambiguity about which session to resume — we pick the UUID, not the CLI's session store.
- `.claude.session-id` lives alongside the existing `.dev.pid` and `.claude.pid` files — same mental model, same cleanup path.
- `nohup claude -p "..." --resume <uuid> >> claude.log 2>&1 &` is structurally identical to the existing headless spawn line (single-line background detach), so there is one pattern to maintain.

**Alternatives considered**:
- `claude --continue` (current DEVELOPMENT.md guidance): requires the caller's `cwd` to match the worktree and still opens an interactive session by default — neither fits fire-and-forget. Rejected.
- Parsing the CLI session store to discover the session ID: rejected — opaque file layout, version-sensitive, hostile to batch use.
- `--fork-session`: spec requires accumulating revisions on the same session (FR-013a). Forking breaks that. Rejected.

## R4. Fire-and-forget semantics for release commands

**Decision**: Both `--approve-spec` and `--revise-spec` detach with `nohup … &`, append to `claude.log`, and return control in under 5 seconds (SC-006). They do NOT write to `.claude.pid` (that PID already belongs to the original spawn; overwriting it would confuse `--remove` / `--cleanup-merged`).

**Rationale**: Matches the existing headless-spawn idiom in `scripts/claude-worktree.sh:201`. Reusing the same `claude.log` gives a single durable trace across Stage 1 + pause + Stage 2.

**Alternatives considered**:
- A new log file per Stage-2 resume: rejected — splinters the maintainer's mental model for "what did this worktree do?".
- A disown/setsid variant: rejected — `nohup &` already survives terminal close on macOS and Linux.

## R5. Preventing double-release and wrong-state releases

**Decision**:
- Before spawning the release process, check `.claude.session-id` exists — exit with a clear error if not (covers "session ID lost", FR-015).
- Check `specs/*/spec.md` exists in the worktree — if not, the spawn has not reached the pause yet; print a diagnostic and exit non-zero (covers "release invoked before pause"). No blocking wait; maintainer re-runs after the pause is reached.
- To detect "already advanced past Stage 1" (FR-016): check the git log on the feature branch for a plan/tasks artifact commit. If a `plan.md` already exists *alongside* a running `.claude.pid` for a later-stage session, print "already advanced" and exit 0 (no-op). This is a best-effort check; perfect detection requires session-state introspection the CLI does not expose.

**Rationale**: The spec's edge cases (§Edge Cases) require diagnostics without hangs. Filesystem checks in the worktree are O(1) and sufficient.

**Alternatives considered**:
- Lock files on `.claude.session-id`: rejected — over-engineering for a single-maintainer tool; adds failure modes (stale locks) without catching a real concurrency risk in practice.

## R6. Interactive-mode impact

**Decision**: The same `.claude/settings.json` also applies to interactive `scripts/claude-worktree.sh <issue>` runs. This is intentional and documented.

**Rationale**: A single policy surface prevents drift. FR-006 forbids *silently* broadening interactive permissions; the settings file is an explicit, committed, reviewed broadening of the same set of tools the lifecycle already uses. Maintainers reading `docs/DEVELOPMENT.md` will see the change.

**Alternatives considered**:
- Two separate settings files (one for interactive, one for headless, the latter loaded via `--settings`): rejected — doubles the review surface for zero user-visible benefit.

## R7. TDD exemption (constitution §XI)

**Decision**: No unit tests for the shell-script changes or the settings file. Acceptance is verified by a manual scripted run documented in `quickstart.md` and recorded in the PR `## Test plan` section.

**Rationale**: See plan Complexity Tracking. Same pattern as PR #241 (`--help` flag) and all other script-only PRs in this repo's history. Introducing a bash-test harness is a separate architectural decision that should be filed independently rather than bundled into a bug fix.
