# Implementation Plan: Fix --cleanup-merged branch deletion after squash/rebase merge

**Branch**: `243-cleanup-merged-fix` | **Date**: 2026-04-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/243-cleanup-merged-fix/spec.md`

## Summary

`scripts/claude-worktree.sh --cleanup-merged` currently uses `git branch -d` to verify merge status. After a GitHub squash-merge or rebase-merge, the squashed commit is not an ancestor of the local feature branch, so `git branch -d` refuses and the branch is left behind. Fix: replace the ancestry-based check with an explicit PR-state query via `gh pr view "$branch" --json state -q .state`. If `MERGED`, force-delete with `git branch -D`. Otherwise exit non-zero with a message pointing to `--remove`. Update `docs/DEVELOPMENT.md` to describe the new behavior.

## Technical Context

**Language/Version**: Bash (POSIX-compatible portions + bash-specific features already used: `[[ ... ]]`, `set -euo pipefail`)
**Primary Dependencies**: `git`, `gh` (GitHub CLI, already required by the surrounding script for `gh issue view`)
**Storage**: N/A (script operates on local git state and queries GitHub via `gh`)
**Testing**: Manual reproduction per quickstart.md — shellcheck for static checks; no unit-test harness exists for this script and introducing one is out of scope
**Target Platform**: macOS (developer machines running this repo's workflow); Linux compatible (no macOS-specific commands added)
**Project Type**: CLI tool (repo-local developer script)
**Performance Goals**: N/A — one `gh pr view` call per invocation; latency dominated by network RTT to GitHub (<2s typical)
**Constraints**: Must not silently fall back to old behavior on any error path; must exit non-zero on any precondition failure
**Scale/Scope**: Single function (~20 lines of Bash) modified in one file; one doc section updated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Applies? | Check |
|------|----------|-------|
| I. Technology Stack (Next.js / analyzer module) | No — script change, not product code | Pass (no new tech introduced) |
| II. Accuracy Policy | No — no metrics involved | Pass |
| III. Data Source Rules | No — no GraphQL calls | Pass |
| IV. Analyzer Module Boundary | No — not analyzer code | Pass |
| V–VIII. CHAOSS / scoring | No | Pass |
| IX. Feature Scope / YAGNI / KISS | Yes | Pass — minimal change: swap one `git branch -d` for a PR-state check + `git branch -D`. No new flags, no abstraction, no refactor. The spec proposed `--force` as an alternative; we are deliberately *not* adding it (YAGNI). |
| X. Security & Hygiene | Yes | Pass — `gh` auth is inherited from the developer's existing session; no secrets added. |
| XI. Testing | Yes | Pass — TDD mandate applies to analyzer/UI code; this is a developer tooling script with no existing test harness. Manual quickstart reproduction is the validation mechanism, consistent with recent PRs in `scripts/` (e.g., #241). |
| XII. Definition of Done | Yes | Pass — doc update (`docs/DEVELOPMENT.md`) included; PR Test Plan will cover both merged and unmerged scenarios. |
| XIII. Development Workflow | Yes | Pass — feature branch, PR, Test Plan. |

**Result**: No violations. Proceed.

## Project Structure

### Documentation (this feature)

```text
specs/243-cleanup-merged-fix/
├── spec.md              # Feature spec (done)
├── plan.md              # This file
├── research.md          # Phase 0 — git behavior research
├── quickstart.md        # Manual repro + validation steps
├── contracts/
│   └── cli.md           # CLI contract: --cleanup-merged behavior
└── checklists/
    └── requirements.md  # Spec quality checklist (done)
```

No `data-model.md` — no entities. No `tasks.md` yet (`/speckit.tasks` will create it).

### Source Code (repository root)

```text
scripts/
└── claude-worktree.sh   # Modify cleanup_merged() function (lines 65-108)

docs/
└── DEVELOPMENT.md       # Update --cleanup-merged description
```

**Structure Decision**: Single-file script change plus one doc update. No new files, no new directories.

## Complexity Tracking

No constitutional violations; table intentionally empty.
