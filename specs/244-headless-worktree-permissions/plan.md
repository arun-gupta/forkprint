# Implementation Plan: Headless Worktree Spawns Run Without Permission Prompts, with Truly-Headless Stage 2 Release

**Branch**: `244-headless-worktree-permissions` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/244-headless-worktree-permissions/spec.md`

## Summary

Fix `scripts/claude-worktree.sh --headless` so it no longer freezes on the first tool-permission prompt, and extend the script with `--approve-spec` and `--revise-spec` subcommands so Stage 2 runs unattended after spec review.

Approach:

1. **Permission model**: commit a project-scoped `.claude/settings.json` at the repo root with a tightly-scoped `permissions.allow` list covering the SpecKit helpers, `git`, `npm`, `gh`, and the Claude Code built-in tools the lifecycle uses. Claude auto-discovers this file at project root, so git worktrees inherit it without further wiring. This is issue #238's option 3 (project-scoped settings), the most surgical and reviewable of the three.
2. **Session addressability**: generate a UUID at spawn time, pass it to the headless `claude -p` via `--session-id <uuid>`, and record it in the worktree at `.claude.session-id` for later resume.
3. **Release commands**: add `--approve-spec <issue>` and `--revise-spec <issue> "<feedback>"` subcommands that look up the recorded session ID and invoke `claude -p "<prompt>" --resume <session-id>` as a detached background process (`nohup … &`), appending to the same `claude.log`.
4. **Documentation**: update `docs/DEVELOPMENT.md` with the permission-model section and the `--approve-spec` / `--revise-spec` vocabulary.

## Technical Context

**Language/Version**: Bash (script), JSON (settings), Markdown (docs). No application-code change in this feature.
**Primary Dependencies**: Claude Code CLI (version installed on the maintainer's machine), `git`, `npm`, `gh`, `uuidgen` (macOS/Linux standard).
**Storage**: N/A — settings file committed to git; session ID recorded as a plain file inside the worktree (not persisted beyond worktree lifetime).
**Testing**: Manual acceptance run recorded in the PR test plan (the repository has no bash-unit-test harness, consistent with the existing `scripts/` directory convention — e.g., `scripts/claude-worktree.sh` has no accompanying `.test.sh`). See Complexity Tracking for the TDD deviation rationale.
**Target Platform**: macOS (zsh/bash) and Linux (bash) developer machines. No CI-only or server runtime.
**Project Type**: Dev-tooling change — shell script + settings file + docs. Not a Phase 1/2/3 product feature and does not touch `lib/analyzer/`, `app/`, or any UI surface.
**Performance Goals**: `--approve-spec` returns control to the shell in under 5 seconds (SC-006). No other perf targets.
**Constraints**:
- `.claude/settings.json` must not contain secrets (constitution §X).
- Allowlist must stay scoped — no blanket `Bash(*)` or `bypassPermissions` (FR-002, FR-004).
- Must not regress interactive spawns (FR-006).
- Must not auto-merge the PR at end of Stage 2 (FR-014, CLAUDE.md PR Merge Rule).

**Scale/Scope**:
- One `.claude/settings.json` file at repo root (committed).
- `scripts/claude-worktree.sh` gains two subcommands and changes the spawn invocation to include `--session-id` + record it.
- `docs/DEVELOPMENT.md`: one new subsection plus edits to the existing "Releasing a paused headless session" block.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The RepoPulse constitution (`.specify/memory/constitution.md`) targets product code (analyzer, UI, API) and deployment. This feature touches only dev tooling (shell script), dev-time settings (`.claude/settings.json`), and docs. Mapping the applicable rules:

| Rule | Applicability | Status |
|---|---|---|
| I. Technology Stack | N/A — no product code changed | Pass |
| II. Accuracy Policy | N/A — no metrics surface touched | Pass |
| III. Data Source Rules | N/A | Pass |
| IV. Analyzer Module Boundary | N/A | Pass |
| V. CHAOSS Alignment | N/A | Pass |
| VI. Scoring Thresholds | N/A | Pass |
| VII. Ecosystem Spectrum | N/A | Pass |
| VIII. Contribution Dynamics | N/A | Pass |
| IX. Feature Scope Rules §6 YAGNI / §7 KISS | Applies to script design | Pass — no speculative flags beyond `--approve-spec`/`--revise-spec` which are directly spec'd. |
| X. Security & Hygiene §1–4 (no secrets, `.env*` gitignored, token never transmitted elsewhere) | Applies — the settings file is version-controlled | Pass — `.claude/settings.json` contains no secrets; allowlist is structural only. |
| X. Security & Hygiene §5 (per-repo error isolation) | N/A (applies to analysis) | Pass |
| XI. Testing — TDD (NON-NEGOTIABLE) | See Complexity Tracking | Deviation — justified below |
| XII. Definition of Done | Applies at PR time | Plan item |
| XIII. Development Workflow | Applies at PR time | Plan item |

**TDD gate** — the constitution says "NON-NEGOTIABLE" but also scopes tests to "analyzer logic and UI components" (Vitest + RTL) and "full user flows" (Playwright). There is no test harness for shell scripts or dev-tooling settings in this repo. Enforcing Vitest on a bash script would be ceremony, not coverage. See Complexity Tracking.

Initial gate: **PASS with one documented deviation** (TDD harness for shell scripts).

## Project Structure

### Documentation (this feature)

```text
specs/244-headless-worktree-permissions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output (maintainer-facing acceptance walkthrough)
├── contracts/
│   └── claude-settings.schema.md   # Shape of .claude/settings.json permissions.allow
└── tasks.md             # Phase 2 output (/speckit.tasks, not /speckit.plan)
```

No `data-model.md` — this feature has no data entities beyond a single settings file and a single session-ID file, both fully described in `contracts/`.

### Source Code (repository root)

```text
.claude/
└── settings.json                 # NEW — permissions.allow for headless + interactive spawns

scripts/
└── claude-worktree.sh            # MODIFIED — add --session-id on spawn;
                                  #             add --approve-spec and --revise-spec subcommands;
                                  #             write .claude.session-id inside worktree;
                                  #             extend --help and usage.

docs/
└── DEVELOPMENT.md                # MODIFIED — "Permission model for headless spawns" section;
                                  #             document --approve-spec / --revise-spec.
```

**Structure Decision**: A strictly dev-tooling change. No new directories under `lib/`, `app/`, or `tests/`. The three files above are the full surface area.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| No TDD test harness for `scripts/claude-worktree.sh` | Repo has no existing shell-unit-test infrastructure (no `bats`, no `shunit2`, no `*.test.sh`). Adding one for a single script would be significant ceremony and a separate decision that should not be bundled into this bug fix. The constitution's TDD rule is scoped to Vitest/RTL for analyzer/UI and Playwright for user flows; those don't apply to a shell script. | Introducing `bats` or an equivalent harness would: (a) expand scope well beyond issue #238, (b) require a constitution amendment discussion about the test stack, (c) delay the fix for a blocking tooling bug. Instead: acceptance is verified via the manual steps in `quickstart.md` and recorded in the PR `## Test plan` section (constitution §XII requirement), which is the same mechanism used for every other script-only change in this repo (e.g., PR #241 for `--help`). |
