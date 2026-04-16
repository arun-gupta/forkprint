# Implementation Plan: Claude Code Sub-Agents for SpecKit Workflow and PR Discipline

**Branch**: `297-create-claude-code-sub-agents-for-specki` | **Date**: 2026-04-16 | **Spec**: `specs/297-create-claude-code-sub-agents-for-specki/spec.md`
**Input**: Feature specification from `/specs/297-create-claude-code-sub-agents-for-specki/spec.md`

## Summary

Ship three Claude Code sub-agents — `spec-reviewer`, `dod-verifier`, and `pr-test-plan-checker` — as markdown files under `.claude/agents/`. Each encodes a workflow rule from `CLAUDE.md` / `docs/DEVELOPMENT.md` / `.specify/memory/constitution.md` so it can be enforced mechanically instead of relying on operator memory. Update `docs/DEVELOPMENT.md` with a short invocation-guidance section that names each agent and its trigger point. No product code, no analyzer changes, no UI surface.

## Technical Context

**Language/Version**: N/A — markdown + YAML frontmatter files recognized by the Claude Code CLI.
**Primary Dependencies**: Claude Code CLI (locally installed), `gh` CLI (already allowed by `.claude/settings.json`), standard shell utilities for mechanical DoD checks.
**Storage**: N/A. Sub-agents are stateless per invocation.
**Testing**: Manual end-to-end trials per agent, documented in the PR body per FR-020. No automated test layer applies — prompt-authored agents have no harness analogue for Vitest / Playwright.
**Target Platform**: Developer workstation running Claude Code inside this repo (interactive or headless).
**Project Type**: Repository-level tooling / workflow change; not a Phase 1/2/3 product feature.
**Performance Goals**: N/A. Agent response time is bounded by the model and the files they read, not by our design.
**Constraints**:
- Every agent MUST declare an explicit `tools` allowlist — no omission, no wildcard-only configuration (FR-004).
- `pr-test-plan-checker` MUST be narrowed to a `gh` surface that cannot reach `gh pr merge` (FR-005, FR-018). Parent `.claude/settings.json` still allows `Bash(gh:*)`; the sub-agent's `tools` line narrows further.
- Sub-agents do not auto-load `CLAUDE.md`; rules enforced by each agent MUST be restated in the agent's system prompt body.
- No addition to `.claude/settings.json` unless strictly required by a shipped agent (SC-007). Current allowlist already covers what the three agents need (`Bash(gh:*)`, `Bash(grep:*)`, `Bash(git:*)`, `Bash(npm:*)`, `Read`, `Grep`, `Glob`).
**Scale/Scope**: Three new files in `.claude/agents/`. Two docs edits (`docs/DEVELOPMENT.md` new subsection, optional README cross-link). Zero changes to `lib/`, `app/`, `components/`, analyzer, or `.claude/settings.json`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reviewed `.specify/memory/constitution.md` v1.2. This feature touches no product surface. Gates:

- **I. Technology Stack**: No new runtime tech. Markdown-with-frontmatter files for the Claude Code CLI are tooling, not the product stack. Pass.
- **II. Accuracy Policy**: No metrics or data surfaces affected. Pass.
- **III. Data Source Rules**: No GraphQL / REST API calls. `pr-test-plan-checker` reads PRs via `gh`, which is already-sanctioned tooling, not a product API surface. Pass.
- **IV. Analyzer Module Boundary**: No analyzer code touched. Pass.
- **V. CHAOSS Alignment**: No scoring surface touched. Pass.
- **VI / VII / VIII**: Unaffected.
- **IX. Feature Scope Rules (YAGNI / Keep It Simple)**: Three agents, no orchestrator, no config file, no shared prompt fragment, no deferred-agent decision record (dropped during spec review). `calibration-sampler` and `constitution-guard` are explicitly out of scope — no speculative scaffolding. Pass.
- **X. Security & Hygiene**: No secrets added; no token flow touched. Pass.
- **XI. Testing**: No runtime code, so no TDD obligation. Manual trials per agent are the Test-Plan equivalent per §XIII.3. Pass.
- **XII. Definition of Done**: PR Test Plan signoff required. README unchanged unless a user-facing surface is affected (none expected). This feature is NOT in the `docs/DEVELOPMENT.md` Phase 1/2/3 implementation tables — it's a tooling issue — so the table-row-update step is N/A, as called out in the spec's Assumptions. Pass.
- **XIII. Development Workflow**: Feature branch, PR with `## Test plan`, `docs/DEVELOPMENT.md` updated in-PR. Pass.
- **FR-022 / FR-021 constraint** (self-imposed, carried from spec): No agent or doc instructs a session to run `gh pr merge`. The existing `CLAUDE.md` rule remains intact and is reinforced, not challenged.

**Result**: All gates pass. No complexity deviations to track.

## Project Structure

### Documentation (this feature)

```text
specs/297-create-claude-code-sub-agents-for-specki/
├── spec.md       # /speckit.specify output (done, approved)
├── plan.md       # This file (/speckit.plan output)
├── checklists/
│   └── requirements.md   # Spec quality checklist (done)
└── tasks.md      # /speckit.tasks output (next)
```

No `research.md`, `data-model.md`, `contracts/`, or `quickstart.md`. Decisions that would normally land there are captured inline in this plan — see "Phase 0 — Research" below. Rationale: this feature has no unknown dependencies, no product entities, and no external interface contracts; three separate skeleton files would be ceremony without content.

### Source (repository root)

Files created (3):

```text
.claude/agents/spec-reviewer.md
.claude/agents/dod-verifier.md
.claude/agents/pr-test-plan-checker.md
```

Files edited (1):

```text
docs/DEVELOPMENT.md           # new "Workflow sub-agents" subsection + references
```

Not touched:

```text
.claude/settings.json         # no new permission entries (SC-007)
README.md                     # unless a shipped-agent trial surfaces a user-facing change
lib/, app/, components/, scripts/
```

**Structure Decision**: Repository-level tooling files. Zero application-layer surface area.

## Phase 0 — Research

No `[NEEDS CLARIFICATION]` markers in the spec. One external convention was verified during planning and is recorded inline:

### Decision 1 — Sub-agent file format

- **Decision**: Markdown file under `.claude/agents/` with YAML frontmatter. Required keys: `name` (lowercase + hyphens), `description` (used by Claude Code to decide when to delegate — write it imperatively, from the agent's perspective). Optional keys used here: `tools` (comma-separated allowlist), `color` (cosmetic).
- **Rationale**: Matches the documented Claude Code sub-agent convention (https://code.claude.com/docs/en/sub-agents.md). Already how the project handles `.claude/commands/`-style assets.
- **Alternatives considered**: (a) a single combined file with multiple frontmatter blocks — rejected, not a supported format; (b) JSON definitions — rejected, not the documented convention.

### Decision 2 — Permission model

- **Decision**: Each agent's `tools` line narrows the parent's `.claude/settings.json` allowlist to the minimum surface the agent needs. The parent allowlist is the ceiling; a sub-agent cannot widen it. No additions to `.claude/settings.json` are needed — the current allowlist already covers every tool the three agents require.
- **Rationale**: Defense-in-depth. Even though the parent can technically reach `gh pr merge`, the sub-agent's `tools` line prevents *it* from doing so, directly satisfying FR-018 and FR-005.
- **Alternatives considered**: (a) rely solely on the parent allowlist — rejected, weaker enforcement, and FR-005 requires the per-agent narrowing be explicit; (b) add a repo-wide `gh pr merge` deny entry — rejected, Claude Code's permission model for this project is allowlist-only, and adding a deny would change the project-wide permission posture for a narrow need.

### Decision 3 — Per-agent tool allowlists

The Claude Code permission syntax for Bash narrowing is `Bash(<space-separated command prefix>:<arg pattern>)` — verified against the official `code-review` plugin (`Bash(gh pr view:*)`, `Bash(gh issue list:*)`, etc.). No probe run required.

- `spec-reviewer`: `Read, Grep, Glob`. Read-only; touches `spec.md`, constitution, `docs/PRODUCT.md`. No shell, no network.
- `dod-verifier`: `Read, Grep, Glob, Bash(git:*), Bash(npm:*), Bash(gh pr view:*), Bash(grep:*)`. Needs to diff the branch, run `npm test` / `npm run lint` / `npm run build`, and (optionally) inspect the PR body if a PR exists. `Bash(gh pr view:*)` is the narrowest `gh` surface that returns PR body content.
- `pr-test-plan-checker`: `Bash(gh pr view:*)` only. No `Read`/`Grep`/`Glob` — the agent operates on PR body text only, not on local files. This narrow allowlist is the primary enforcement of FR-005 and FR-018; the prompt reinforces it.

### Decision 6 — Per-agent model selection

- `spec-reviewer`: inherit (Sonnet). The review involves semantic reasoning about constitution compliance, testability of acceptance criteria, and scope drift against `docs/PRODUCT.md` — nuance where a Haiku miscall would erode trust in the approval gate.
- `dod-verifier`: **Haiku**. Almost entirely mechanical — run a command, read its exit code, grep for patterns, report evidence. Pure rule application, not judgement.
- `pr-test-plan-checker`: **Haiku**. The simplest agent — parse a markdown section, count `[ ]` vs `[x]`, return a two-line status. No reasoning.

### Decision 4 — Prompts restate rules rather than link them

- **Decision**: Each agent's system prompt includes a verbatim copy of the exact constitution clauses / `CLAUDE.md` rules it enforces. Prompts do NOT rely on sub-agents auto-loading `CLAUDE.md`.
- **Rationale**: Claude Code sub-agents do not automatically load `CLAUDE.md`. Restating rules ensures enforcement is self-contained and does not silently drift if the parent's `CLAUDE.md` is edited — a drift would at worst make the agent's enforcement slightly stale, not absent.
- **Alternatives considered**: Using the `skills` field to inject shared files — rejected, adds a shared dependency between agents and couples them; inline quoting is ~30 lines per agent and more robust.

### Decision 5 — Trial evidence for FR-020

- **Decision**: The PR body captures a concise transcript or summary per agent.
  - `spec-reviewer` trial: run against `specs/297-create-claude-code-sub-agents-for-specki/spec.md` itself. Meta but sufficient — exercises every code path.
  - `dod-verifier` trial: run against the current branch just before opening the PR. Captures a clean-pass run after lint/test/build pass.
  - `pr-test-plan-checker` trial: run against an already-merged reference PR (e.g. #292 from `git log`) whose state is known and immutable. Avoids the chicken-and-egg of "this very PR" while still proving end-to-end.
- **Rationale**: The alternative — running each agent against PR #297 itself — creates a bootstrap cycle and ties trial output to a PR that keeps changing.

## Phase 1 — Design & Contracts

### Agent shapes

Each agent file is structured identically:

```markdown
---
name: <agent-name>
description: <when-to-use, imperatively>
tools: <comma-separated allowlist>
---

<system prompt body — 1–2 paragraph role + bulleted behavioral contract + output format>
```

### `spec-reviewer.md` — contract

- **Inputs**: (a) the target `spec.md` path; (b) `.specify/memory/constitution.md`; (c) `docs/PRODUCT.md`.
- **Output**: report in this exact shape:

  ```text
  Status: PASS | FAIL
  Issues:
    - [section of spec]  [quoted offending text]  [constitution clause or PRODUCT.md section]
  Unresolved clarifications:
    - [marker text verbatim]
  Non-testable criteria:
    - [FR/AC id]  [suggested measurable restatement]
  ```
- **Behavioral rules enforced via prompt**: must not modify any file (FR-010); must flag every `[NEEDS CLARIFICATION]` marker (FR-008); must cite the authoritative document for each issue (FR-007).

### `dod-verifier.md` — contract

- **Inputs**: the currently checked-out branch state; optionally a PR number if one exists for the branch.
- **Mechanical checks** (each returns satisfied / blocked / requires-human-signoff):
  1. Test suite pass — `npm test` exits 0
  2. Lint pass — `npm run lint` exits 0
  3. Build pass — `npm run build` exits 0 (note the `DEV_GITHUB_PAT=` caveat from `docs/DEVELOPMENT.md`)
  4. No `TODO` / `FIXME` in changed source files — scoped to `git diff main...HEAD --name-only`, source files only
  5. No `console.log` in non-test shipped source
  6. No `any`-typed values in TypeScript source changed in this branch
  7. `## Test plan` section present in PR body (only if PR exists — else "requires human signoff, PR not yet open")
  8. README updated if any of `app/`, `components/`, `pages/`, or top-level config files changed
  9. `docs/DEVELOPMENT.md` implementation-order row set to `✅ Done` — only if the feature has such a row; otherwise "N/A for tooling issues"
- **Output**: consolidated report with one line per check, evidence for every blocker (file/line/command output).
- **Must not**: modify any source file (FR-014).

### `pr-test-plan-checker.md` — contract

- **Input**: a PR number (integer).
- **Steps**:
  1. `gh pr view <N> --json body -q .body` to retrieve the PR body.
  2. Parse the first top-level heading matching `^##\s+test\s+plan\s*$` (case-insensitive).
  3. Enumerate checkbox lines in that section matching `- \[( |x|X)\]\s+(.*)$`.
  4. Report `READY` if every checkbox is `[x]` / `[X]`; otherwise `BLOCKED` with the verbatim unchecked-item list.
  5. If no Test plan section is found: `BLOCKED — no "## Test plan" section found`.
- **Must not**: `gh pr merge`, `gh pr close`, `gh pr review`, `gh pr edit`, `gh pr ready` — none appear in the allowlist, and the prompt explicitly forbids attempting them (FR-018).

### `docs/DEVELOPMENT.md` edit

Add a new subsection titled **"Workflow sub-agents"** after the existing "Multi-worktree local development" block (or alternatively in the "Step 1–5 Feature loop" area — to be decided at task time based on flow). Content:

- One paragraph stating what project-scoped sub-agents are and that they live in `.claude/agents/`.
- A 3-row table: agent name / workflow step it attaches to / how to invoke it.
  - `spec-reviewer` — after `/speckit.specify`, before the mandatory approval gate — "mention `spec-reviewer` or use `@spec-reviewer (agent)`"
  - `dod-verifier` — before `git push` / PR open — same invocation pattern
  - `pr-test-plan-checker` — after PR is opened, before asking user to merge — same invocation pattern
- One-line note: these agents never run `gh pr merge`; PR merge remains a manual user action per `CLAUDE.md`.

### Entities (per spec's Key Entities section)

No code-level entities introduced. The `Agent report` shape described in the spec is realized as plain-text output format inside each prompt — it is a contract between the agent and the human reader, not a typed struct.

## Re-evaluation After Phase 1

Constitution gates re-checked — still pass. No violations introduced by the design. No new external APIs, no persisted state, no scope expansion. Spec's Out-of-Scope section (`calibration-sampler`, `constitution-guard`, auto-merge, SpecKit command replacement, auto-fix, cross-repo orchestration, persisted state) remains fully respected.

## Complexity Tracking

None. No deviations.
