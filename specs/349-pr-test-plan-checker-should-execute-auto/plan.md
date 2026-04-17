# Implementation Plan: Rename `pr-test-plan-checker` to `pr-test-plan-runner` and make it execute automatable Test plan items

**Branch**: `349-pr-test-plan-checker-should-execute-auto` | **Date**: 2026-04-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/349-pr-test-plan-checker-should-execute-auto/spec.md`

## Summary

This is a **tooling / meta-workflow change**, not a RepoPulse product feature. It edits the Claude Code sub-agent definition at `.claude/agents/pr-test-plan-checker.md` (renamed to `.claude/agents/pr-test-plan-runner.md` via `git mv`) so the agent actually executes the automatable commands in a PR's `## Test plan` section — running allowlisted `npm test` / `npm run lint` / `npx vitest` / etc., toggling the corresponding `[ ]` checkbox to `[x]` via `gh pr edit --body`, posting a fresh PR comment per run with an agent-generated disclaimer for audit, and returning a structured per-item report. No application source code is touched. No runtime code path changes. The entire implementation surface is: one agent definition file (moved + rewritten), one paragraph and one table row in `docs/DEVELOPMENT.md`, and validation fixtures/docs for the rules the agent enforces.

## Technical Context

**Language/Version**: N/A — this feature's artifact is a Claude Code sub-agent definition (Markdown + YAML frontmatter). The agent itself runs under Claude Code at invocation time; there is no compiled artifact.
**Primary Dependencies**: Claude Code sub-agent runtime (existing), `gh` CLI (existing, inherited from session), `npm` / `npx` toolchain (existing, inherited from worktree).
**Storage**: None. The agent is stateless — it reads the PR body at start of run and writes the updated body + one comment at end of run.
**Testing**: Manual validation via a fixture PR in this repo. Automated-parsing behaviors (checkbox extraction, allowlist matching, forbidden-command refusal) are exercisable by running the agent against purpose-built Test plan fixtures in the PR body. No unit-test harness exists for Claude Code sub-agents; per-behavior validation is performed via the PR test plan for *this* feature, which will itself be a live demo of the new agent.
**Target Platform**: Claude Code in any environment (macOS / Linux). No platform-specific assumptions.
**Project Type**: Sub-agent definition (Markdown + YAML frontmatter) + workflow documentation. Not "library / cli / web-service" — meta-tooling.
**Performance Goals**: None quantified in the spec. The agent's runtime is dominated by the allowlisted commands it invokes (`npm test`, etc.), which is the existing test-suite cost. The agent's own overhead (body parse + extract + tick + `gh pr edit` + `gh pr comment`) is expected to be <5s on a typical PR.
**Constraints**:
- Tool allowlist MUST be exactly 11 patterns (FR-019, SC-007).
- No broader patterns like `Bash(*)`, `Bash(gh:*)`, or `Bash(npm:*)`.
- `gh pr merge` / `gh pr close` / `gh pr ready` / `gh pr review` remain absent from allowlist.
- Body edit is scoped to `## Test plan` section only (FR-013) — byte-identical outside.
- First-match strict extraction (FR-004); shell metacharacters → MANUAL (FR-007).
- No backwards-compatible alias for old agent name (Assumptions section of spec).
**Scale/Scope**: Single sub-agent file (~8 kB), one row + one paragraph in one `.md` file. ~200 lines of Markdown change in total.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution at `.specify/memory/constitution.md` is RepoPulse's product/engineering constitution. It governs product features that ship to users. This feature is Claude Code tooling (a sub-agent definition file), not a RepoPulse product feature. Most sections therefore do not apply. The sections that *do* apply:

- **§I (Technology Stack)** — Not applicable. No Next.js / Vercel / Tailwind / Chart.js code changes. No analyzer module changes.
- **§II (Accuracy Policy, NON-NEGOTIABLE)** — Not applicable. No GraphQL / no metric computation.
- **§III (Data Source Rules)** — Not applicable. Agent reads from `gh`, which talks to the GitHub REST API, but only to fetch its own PR body and post its own comment — not to fetch repo analysis data.
- **§IV (Analyzer Module Boundary)** — Not applicable. Agent does not import `analyze()`.
- **§V–§VIII (CHAOSS, Scoring Thresholds, Ecosystem Spectrum, Contribution Dynamics)** — Not applicable. No scoring.
- **§IX (Feature Scope Rules, YAGNI / KISS)** — **Applies. PASS.**
  - The spec resolves the one-agent-vs-two design question in favor of expanding the existing agent (one entry point, one maintenance surface), and the Assumptions section explicitly documents the rejected two-agent split. FR-022's rename happens in-place via `git mv` — no sibling file, no alias.
  - Strict first-match extraction (FR-004) was chosen over lenient regex-substring and mandatory-suffix alternatives — smallest workable rule.
  - Closed 9-entry automatable allowlist (FR-005). No plugin/extensibility hook.
  - No configuration layer: the allowlist is hardcoded in the agent frontmatter and prompt. Extending it later is a PR change — consistent with how the session-level `.claude/settings.json` allowlist is managed.
- **§X (Security & Hygiene)** — **Applies. PASS.**
  - FR-008 forbidden-for-extraction list covers `gh pr merge`, `rm`, `git push --force`, `sudo`, `curl`, `wget`, `ssh`, etc.
  - FR-019 narrows the agent's `tools:` allowlist to exactly 11 patterns; no wildcards; no `Bash(*)`.
  - FR-007 rejects shell metacharacters in extracted commands so the allowlist cannot be tunneled around via `&&` / `$(...)`.
  - `CLAUDE.md`'s PR merge rule is preserved — the agent's `tools:` allowlist does not contain `Bash(gh pr merge:*)` under any circumstance.
  - No secrets are read or written. The agent does not touch `.env*` files.
- **§XI (Testing)** — **Applies, with caveat.** The TDD rule (§XI.1) is for RepoPulse product code (Vitest + React Testing Library + Playwright). Claude Code sub-agent definitions are not code under test — they are prompts. The validation strategy for this feature is behavioral, not unit-test: the PR for this feature contains a Test plan that exercises the new agent end-to-end (AUTO-PASS, AUTO-FAIL, MANUAL, ALREADY-CHECKED, forbidden-command refusal). This is the same validation pattern used for the original `pr-test-plan-checker` in issue #297. The Quickstart document (Phase 1) will enumerate the validation steps explicitly.
- **§XII (Definition of Done)** — Will be checked at PR time via the `dod-verifier` sub-agent.
- **§XIII (Development Workflow)** — **Applies. PASS.**
  - §XIII.3 (PR Test plan is the single source of truth for manual signoff) is reinforced, not weakened — the agent now automates the mechanical portion of that signoff while preserving human ticks (FR-011).
  - FR-021 updates `docs/DEVELOPMENT.md`'s "Workflow sub-agents" table and "PR merge discipline" paragraph so the new agent name and behavior are documented.

**Gate decision: PASS.** No violations. No `Complexity Tracking` entries required.

## Project Structure

### Documentation (this feature)

```text
specs/349-pr-test-plan-checker-should-execute-auto/
├── plan.md                    # This file
├── spec.md                    # Approved spec (frozen at approval time)
├── research.md                # Phase 0 output — allowlist-pattern syntax research, extraction regex choice
├── data-model.md              # Phase 1 output — checkbox/item/report/audit-comment as in-memory data structures
├── quickstart.md              # Phase 1 output — manual validation walkthrough for the PR Test plan
├── contracts/
│   ├── agent-frontmatter.md   # The exact frontmatter that must appear in the renamed agent file
│   ├── agent-prompt.md        # The exact step-by-step instructions the prompt must encode
│   └── report-format.md       # The exact return-value format + audit-comment format (incl. disclaimer)
├── checklists/
│   └── requirements.md        # Spec quality checklist (already created by /speckit.specify)
└── tasks.md                   # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
.claude/
└── agents/
    ├── pr-test-plan-checker.md   # DELETED via `git mv` in this feature
    └── pr-test-plan-runner.md    # NEW (moved-from-above, rewritten content)

docs/
└── DEVELOPMENT.md                # One table row + one paragraph updated (FR-021)
```

**Structure Decision**: **Option 0 — Meta-tooling / workflow configuration.** No `src/` changes. No `tests/` additions. The entire implementation surface is two file edits:

1. `git mv .claude/agents/pr-test-plan-checker.md .claude/agents/pr-test-plan-runner.md`, then a complete rewrite of the moved file's contents per FR-019 (frontmatter), FR-018 / FR-004 / FR-005 / FR-008 / FR-011 / FR-020 (prompt body), and FR-022 (name + description + self-references).
2. Update `docs/DEVELOPMENT.md` "Workflow sub-agents" table row (agent name + invocation + description) and the "PR merge discipline" paragraph (expanded tool surface while re-stating `gh pr merge` remains forbidden).

No new directories. No new test files. No npm script additions. No `package.json` edits. No `.claude/settings.json` edits — the agent-level `tools:` allowlist is declared inside the agent's frontmatter and the session-level permissions in `settings.json` (`Bash(npm:*)`, `Bash(gh:*)`) already cover the narrower patterns the agent will request.

## Complexity Tracking

> Constitution Check passed with no violations. No complexity-tracking entries required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)*  | —          | —                                     |
