# Implementation Plan: `claude-worktree.sh --cleanup-merged` / `--remove` run from inside a worktree

**Branch**: `278-claude-worktree-sh-allow-cleanup-merged` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification at `specs/278-cleanup-from-worktree/spec.md`
**Related issue**: #278

## Summary

Extend `scripts/claude-worktree.sh` so that `--cleanup-merged` and `--remove` can be invoked with no issue-number argument from inside a linked git worktree. When invoked that way, the script infers the issue number from the current branch name (`^[0-9]+-`), resolves the primary worktree (main repo) via `git worktree list --porcelain`, checks out `main` there if needed (refusing on dirty state), runs the existing cleanup flow, and — when the removed worktree was the caller's CWD — prints a clear final-line `cd <main-repo-path>` notice so the stranded shell knows where to go. No new dependencies. Every existing invocation form keeps working unchanged.

**Approach**: All changes live in `scripts/claude-worktree.sh`. Introduce one shared helper — `resolve_worktree_context()` — that returns `MAIN_REPO`, `CURRENT_WT`, `IS_IN_LINKED_WT`, and (when applicable) `INFERRED_ISSUE`. Call it from both `cleanup_merged()` and `remove_worktree()` before any destructive operation. Docs updates land in `scripts/claude-worktree.sh`'s `print_usage()` heredoc and the "Cleanup" subsection of `docs/DEVELOPMENT.md`.

## Technical Context

**Language/Version**: Bash (POSIX-compatible portions + bash-specific features already used by the script: `[[ ... ]]`, `set -euo pipefail`, `${var:-}` parameter expansion, `local` variables). No new bash features required beyond what the script already uses.
**Primary Dependencies**: `git` (plumbing commands: `rev-parse --git-common-dir`, `rev-parse --git-dir`, `rev-parse --abbrev-ref HEAD`, `worktree list --porcelain`, `worktree remove`, `branch -D`, `checkout`, `pull`). `gh` (existing `gh pr view <branch> --json state`). No new binaries.
**Storage**: N/A (script operates on local git state and queries GitHub via `gh`).
**Testing**: Bash-level manual verification via the quickstart scenarios in `quickstart.md`. No unit test harness exists for this script today; introducing one is out of scope for this feature (YAGNI per constitution §IX rule 6).
**Target Platform**: macOS + Linux developer machines. The script already carries `set -euo pipefail`, uses `git -C <path>`, and shells out to `lsof` / `uuidgen` / `awk` / `sed` — all present on both platforms.
**Project Type**: CLI / shell tooling. Not part of the Phase 1 Next.js web app surface. Affects only the developer workflow.
**Performance Goals**: The cleanup operation takes <5 seconds end-to-end on a maintainer's machine today; this feature adds one `git rev-parse` and one `git worktree list --porcelain` pass to that budget, so the target remains <5 seconds.
**Constraints**: Must never force-discard uncommitted state (no `git checkout -f`, no `git reset --hard`, no `git stash`). Must never prompt interactively (the existing script is designed to run in headless Claude sessions; adding a prompt would break `claude -p`). Must preserve exact behavior of every existing invocation form — this adds a form, it does not replace one.
**Scale/Scope**: ~60 lines added to `scripts/claude-worktree.sh` (one helper function + wiring in two existing functions + usage-block updates). ~15 lines added to `docs/DEVELOPMENT.md` Cleanup subsection. No application code changes.

## Constitution Check

The RepoPulse constitution governs the Next.js web application (Phase 1) and its shared analyzer module. This feature changes only `scripts/claude-worktree.sh` and `docs/DEVELOPMENT.md` — neither is application code, neither ships in the Next.js bundle, and neither affects the analyzer module's framework-agnostic boundary (§IV).

Relevant rules checked:

- **§I Technology Stack**: No new technology introduced. The script already uses bash + git + gh; this feature adds no new tool. PASS.
- **§II Accuracy Policy**: N/A — this feature does not display or derive any metric. PASS.
- **§III Data Source Rules**: N/A — no GitHub GraphQL or REST traffic added. The existing `gh pr view` call is unchanged. PASS.
- **§IV Analyzer Module Boundary**: Unaffected — script is not part of the analyzer module. PASS.
- **§V–VIII (CHAOSS / Scoring / Ecosystem / Contribution Dynamics)**: N/A. PASS.
- **§IX Feature Scope Rules — rules 6, 7, 8 (YAGNI / Keep It Simple / no over-engineering)**: The spec asks for one helper function and wiring in two existing functions. The plan reflects that minimum. No unit-test harness introduced (there isn't one for this script today), no configuration file introduced, no new flag beyond re-using the existing `--cleanup-merged` / `--remove` flags without arguments. PASS.
- **§X Security & Hygiene**: No secrets touched. No token handling added. `.env*` rules unchanged. PASS.
- **§XI Testing**: Manual verification via quickstart scenarios. The project has no bash-test harness (Vitest is JavaScript-only). Adding one for this one script would violate §IX rule 6 (YAGNI). PASS.
- **§XII Definition of Done / §XIII Development Workflow**: Standard PR flow, Test plan in PR body, README / DEVELOPMENT.md updated, no direct commits to main. PASS — plan commits to these.

Constitution Check: **PASS**. No gates violated, no Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/278-cleanup-from-worktree/
├── spec.md                    # Feature spec (already written)
├── plan.md                    # This file
├── research.md                # Phase 0 output — detection + resolution choices
├── data-model.md              # Phase 1 output — shell-level entities (minimal; this is a shell feature)
├── contracts/
│   └── cli-contract.md        # Phase 1 output — the new no-arg invocations + error shapes
├── quickstart.md              # Phase 1 output — manual verification scenarios
├── checklists/
│   └── requirements.md        # Already written in /speckit.specify step
└── tasks.md                   # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
scripts/
└── claude-worktree.sh         # THE only code file touched by this feature

docs/
└── DEVELOPMENT.md             # "Cleanup" subsection updated to document both flows
```

**Structure Decision**: This is a shell-script tooling change — no new source files, no new module, no new package. All behavior lands in the one existing script. Documentation lands in `docs/DEVELOPMENT.md`. Spec artifacts live under `specs/278-cleanup-from-worktree/`.

## Phase 0: Research

See [research.md](./research.md). Key decisions resolved before implementation:

1. **Linked-worktree detection**: `git rev-parse --git-common-dir` vs `git rev-parse --git-dir`. Inside a linked worktree they diverge; inside the primary worktree they resolve to the same path. This is the git-documented way and requires no path-string heuristics.
2. **Primary worktree resolution**: First `worktree` entry from `git worktree list --porcelain` is the primary (git documents this ordering). Fallback: the entry whose `.git` is a real directory (not a gitdir pointer file). Picking the first entry is preferred because it is what `git worktree list` contractually guarantees.
3. **Issue-number extraction from branch**: bash regex `[[ "$branch" =~ ^([0-9]+)- ]]` → `${BASH_REMATCH[1]}`. Clean, no external tool, already-used pattern style in the script.
4. **Stranded-shell warning triggering**: compare the worktree path being removed (returned by the existing `git worktree list` lookup) with `$PWD` at the moment of cleanup start. Emit the warning only when they match.
5. **Primary-worktree branch handling**: when the primary is not on `main`, attempt `git -C <main> checkout main`. If it fails (dirty state, merge in progress), surface the error and refuse — never force-discard. This is also what today's from-main-repo form implies (it refuses with a message), so the semantic is preserved; the feature only automates the success path.

## Phase 1: Design

### Data model
See [data-model.md](./data-model.md) — minimal, since this is a shell-level feature with no persisted data.

### Contracts
See [contracts/cli-contract.md](./contracts/cli-contract.md) — the new no-arg invocations, the error shapes for each fallback path, and the stranded-shell warning format.

### Quickstart
See [quickstart.md](./quickstart.md) — six manual verification scenarios mapped to the six Success Criteria in the spec.

### Agent context
`.specify/scripts/bash/update-agent-context.sh claude` is run at the end of Phase 1 to refresh CLAUDE.md's Active Technologies entry with this feature.

## Complexity Tracking

No violations to track — Constitution Check PASSED with no justifications required.
