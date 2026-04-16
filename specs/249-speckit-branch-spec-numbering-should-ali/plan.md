# Implementation Plan: SpecKit branch/spec numbering aligned with GitHub issue number

**Branch**: `249-speckit-branch-spec-numbering-should-ali` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/249-speckit-branch-spec-numbering-should-ali/spec.md`

## Summary

Introduce a disjoint naming namespace for issue-driven SpecKit work: worktree directories, branches, and spec directories all use `gh<N>-<slug>` (where `<N>` is the GitHub issue number, no padding). Manual sequential fallback keeps the existing `<NNN>-<slug>` form. Because `gh` and the leading digit of a sequential prefix can never collide, the two namespaces are disjoint by construction.

**Technical approach**: The fix is scoped to the tooling layer (bash scripts, SpecKit helpers, one command template, one docs file). `scripts/claude-worktree.sh` creates worktrees/branches with `gh<N>-` up front, so Claude is already on a `gh<N>-` branch when `/speckit.specify` runs. `create-new-feature.sh` detects the current branch's prefix pattern and (a) reuses the branch verbatim when it already matches `^(gh)?[0-9]+-`, (b) derives the spec-directory name from the current branch in that case, or (c) falls through to the existing sequential logic otherwise. `common.sh` helpers that parse branch prefixes gain `gh<N>-` awareness so downstream commands (`/speckit.plan`, `/speckit.tasks`, `/speckit.implement`) keep resolving specs correctly. A transitional compatibility fallback in `--cleanup-merged` still matches legacy unprefixed worktrees.

## Technical Context

**Language/Version**: Bash (POSIX-compatible for portable bits, bash-specific features already in use: `[[ ... ]]`, `set -euo pipefail`, `${BASH_REMATCH}`)
**Primary Dependencies**: `git`, `gh` (GitHub CLI, already required by the surrounding tooling), `uuidgen` (macOS/Linux standard)
**Storage**: N/A (all state lives in git + local filesystem: spec dirs under `specs/`, worktrees as siblings of the repo)
**Testing**: Manual validation via a scripted dry-run (documented in `quickstart.md`); automated tests are out of scope because these are one-shot lifecycle scripts without a test harness in this repo. Regression coverage is provided by running the existing worktree spawn + `/speckit.specify` + cleanup on a throwaway issue number.
**Target Platform**: macOS (primary development environment) and Linux (CI-compatible, though no CI exercises these scripts today)
**Project Type**: CLI/tooling layer — no application code changes
**Performance Goals**: N/A (interactive lifecycle scripts; each invocation completes in <10s and is not in any hot path)
**Constraints**: Must not break in-flight legacy worktrees (branches like `249-…` spawned before this fix); `--cleanup-merged` keeps backward compatibility for one transition period; no new tooling dependencies; no secrets; no bypass of the existing permission allowlist.
**Scale/Scope**: Four files changed (`scripts/claude-worktree.sh`, `.specify/scripts/bash/create-new-feature.sh`, `.specify/scripts/bash/common.sh`, `.claude/commands/speckit.specify.md`) plus `docs/DEVELOPMENT.md`. Estimated diff: ~100 lines added, ~20 modified. No new files outside `specs/249-.../`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

RepoPulse's constitution (v1.2) governs the product's accuracy, data sources, analyzer boundary, CHAOSS mapping, scoring thresholds, testing, security, and development workflow. This feature is pure tooling — it does not touch the product runtime, the analyzer module, any scoring logic, any UI, any data source, or any user-facing product behaviour.

| Gate | Relevance | Result |
|---|---|---|
| I. Technology Stack | No new frameworks, no new runtime deps | ✅ Pass (no change) |
| II. Accuracy Policy (NON-NEGOTIABLE) | No metric display, no GraphQL change | ✅ Pass (not applicable) |
| III. Data Source Rules | No API calls added | ✅ Pass (not applicable) |
| IV. Analyzer Module Boundary | Analyzer untouched | ✅ Pass (not applicable) |
| V. CHAOSS Alignment | No scoring change | ✅ Pass (not applicable) |
| VI. Scoring Thresholds | No scoring change | ✅ Pass (not applicable) |
| VII. Ecosystem Spectrum | No ecosystem change | ✅ Pass (not applicable) |
| VIII. Contribution Dynamics Honesty | No contributor data surface | ✅ Pass (not applicable) |
| IX. Feature Scope Rules (YAGNI, KISS) | Minimal change, no speculative abstractions, no new flags beyond what the spec requires | ✅ Pass |
| X. Security & Hygiene | No secrets; no new shell commands beyond the existing allowlist (`git`, `gh`, standard utilities) | ✅ Pass |
| XI. Testing | No analyzer or UI under test; manual regression per `quickstart.md` | ✅ Pass (manual-validation scope acknowledged) |
| XII. Definition of Done | PR test plan will cover all acceptance scenarios from the spec | ✅ Pass (planned) |
| XIII. Development Workflow | Feature-branch commit, PR with `## Test plan`, DEVELOPMENT.md updated | ✅ Pass (planned) |

**Gate verdict**: No constitution violations. Complexity Tracking table intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/249-speckit-branch-spec-numbering-should-ali/
├── spec.md              # Already written (/speckit.specify output)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output — decisions & alternatives
├── data-model.md        # Phase 1 output — naming grammar entities
├── quickstart.md        # Phase 1 output — regression walkthrough
├── contracts/
│   └── cli-contracts.md # Phase 1 output — flag/branch-pattern contracts
├── checklists/
│   └── requirements.md  # Already written (/speckit.specify output)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
scripts/
└── claude-worktree.sh                   # MODIFIED — gh<N>- prefix for branch & worktree path; --cleanup-merged accepts both gh<N>- and legacy <N>-

.specify/
└── scripts/
    └── bash/
        ├── create-new-feature.sh        # MODIFIED — detect current branch matching ^(gh)?[0-9]+-(.+)$ and reuse it verbatim; skip `git checkout -b` when branch == current HEAD
        └── common.sh                    # MODIFIED — get_current_branch(), check_feature_branch(), find_feature_dir_by_prefix() all learn the gh<N>- pattern

.claude/
└── commands/
    └── speckit.specify.md               # MODIFIED — note that the script auto-detects gh<N>- branches; no change to Claude's invocation, just clarifying docs

docs/
└── DEVELOPMENT.md                       # MODIFIED — document the gh<N>-<slug> convention and the legacy-compat fallback
```

**Structure Decision**: This is a tooling-only change; there is no product source-code surface to structure. The layout mirrors the existing `.specify/` + `scripts/` + `.claude/commands/` + `docs/` split, with one file modified per location.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations — section intentionally left empty.*
