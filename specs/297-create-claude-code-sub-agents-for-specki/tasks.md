---
description: "Tasks for issue #297 — Claude Code sub-agents for SpecKit workflow and PR discipline"
---

# Tasks: Claude Code Sub-Agents for SpecKit Workflow and PR Discipline

**Input**: Design documents from `specs/297-create-claude-code-sub-agents-for-specki/`
**Prerequisites**: `plan.md` (present), `spec.md` (present). No `research.md`, `data-model.md`, `contracts/`, or `quickstart.md` — decisions captured inline in `plan.md`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Every task lists the exact file it creates or edits.

## Path Conventions

Repository root `/Users/arungupta/workspaces/forkprint-297-create-claude-code-sub-agents-for-specki/`. All paths below are repo-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the directory that will hold sub-agent files.

- [X] T001 Create directory `.claude/agents/` at repo root (`mkdir -p .claude/agents`) and verify it is tracked by `git status`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Verify the project's permission model can support the planned agents before writing any agent file. A mismatch here (e.g. an unsupported `Bash(gh:pr:view)` narrowing syntax) would force a design change mid-implementation.

**⚠️ CRITICAL**: No user story work begins until this phase completes.

- [X] T002 Read `.claude/settings.json` and confirm the current allowlist already covers every tool the three planned agents need: `Read`, `Grep`, `Glob`, `Bash(git:*)`, `Bash(npm:*)`, `Bash(gh:*)`, `Bash(grep:*)`. Do not edit the file — record the confirmation in the PR description per SC-007. If any tool is missing, STOP and escalate; do not widen the allowlist without a separate decision. **Confirmed**: all required tools present; no edits made.

**Checkpoint**: Permission model validated — agent authoring can begin. (Narrowing syntax `Bash(gh pr view:*)` verified against the official Claude Code `code-review` plugin; no probe required — plan.md Decision 3 updated accordingly.)

---

## Phase 3: User Story 1 — `spec-reviewer` (Priority: P1) 🎯 MVP

**Goal**: Ship `.claude/agents/spec-reviewer.md` with a prompt that checks a target `spec.md` against the constitution and `docs/PRODUCT.md`, flags untestable criteria and `[NEEDS CLARIFICATION]` markers, and returns a structured PASS/FAIL report without modifying any file.

**Independent Test**: Invoke `spec-reviewer` against `specs/297-create-claude-code-sub-agents-for-specki/spec.md`. Confirm it returns a structured report with `Status:` line and that it did not edit any file (verified by `git status`).

### Implementation for User Story 1

- [X] T004 [US1] Create `.claude/agents/spec-reviewer.md` with YAML frontmatter keys `name: spec-reviewer`, `description:` (imperative one-liner starting with "Use this agent when...", describing post-`/speckit.specify` pre-approval-gate review), `tools: Read, Grep, Glob`, and `color: purple`. Model inherits (Sonnet) — semantic reasoning warranted. Body is the system prompt.
- [X] T005 [US1] In the `spec-reviewer.md` body, restate the exact constitution clauses that apply to spec review (Sections II, III, IV, V, VI, VII, VIII, IX, XI from `.specify/memory/constitution.md`) and reference reading order: target spec first, then constitution, then `docs/PRODUCT.md`. Rules are restated verbatim so the agent does not rely on CLAUDE.md auto-loading (see plan Decision 4).
- [X] T006 [US1] In the `spec-reviewer.md` body, encode the required output format exactly as specified in `plan.md` Phase 1 "`spec-reviewer.md` — contract":

  ```text
  Status: PASS | FAIL
  Issues:
    - [section of spec]  [quoted offending text]  [constitution clause or PRODUCT.md section]
  Unresolved clarifications:
    - [marker text verbatim]
  Non-testable criteria:
    - [FR/AC id]  [suggested measurable restatement]
  ```

  Include an example PASS output and an example FAIL output inline for determinism.
- [X] T007 [US1] In the `spec-reviewer.md` body, add explicit prohibitions: "Do not modify any file. Do not run any Bash command. Your tools are `Read`, `Grep`, `Glob`." Enforces FR-010 at prompt level in addition to allowlist level.
- [X] T008 [US1] Trial `spec-reviewer` against `specs/297-create-claude-code-sub-agents-for-specki/spec.md`. Capture the resulting report. Save a trimmed excerpt (status line + any issues) to `specs/297-create-claude-code-sub-agents-for-specki/trials/spec-reviewer.md` for later inclusion in the PR body (FR-020).

**Checkpoint**: `spec-reviewer` is shippable.

---

## Phase 4: User Story 2 — `dod-verifier` (Priority: P1)

**Goal**: Ship `.claude/agents/dod-verifier.md` that runs the mechanical DoD checks from constitution Section XII and returns a single consolidated report with evidence for every blocker.

**Independent Test**: Invoke `dod-verifier` on the current branch. Confirm it correctly identifies the branch's state (e.g. any failing test, lint, or build) and that it does not modify any source file (verified by `git status`).

### Implementation for User Story 2

- [X] T009 [US2] Create `.claude/agents/dod-verifier.md` with YAML frontmatter: `name: dod-verifier`, imperative `description:` for pre-PR-open checklist, `tools: Read, Grep, Glob, Bash(git:*), Bash(npm:*), Bash(gh pr view:*), Bash(grep:*)`, `model: haiku` (checks are mechanical), and `color: orange`.
- [X] T010 [US2] In the `dod-verifier.md` body, restate constitution Section XII verbatim and map each item to one of three outcomes: "satisfied (with evidence)", "blocked (with file/line/command output)", or "requires human sign-off".
- [X] T011 [US2] In the `dod-verifier.md` body, specify the nine mechanical checks enumerated in `plan.md` Phase 1 "`dod-verifier.md` — contract". For each check, specify the exact command or file operation the agent should use (e.g. `npm test`, `git diff main...HEAD --name-only`, `grep -rn "console\\.log" <changed-files>`). Include the `DEV_GITHUB_PAT=` build-time caveat from `docs/DEVELOPMENT.md`.
- [X] T012 [US2] In the `dod-verifier.md` body, restate the rule that it is a verifier, not a fixer: "You must not edit any source file. Report blockers; do not resolve them." Enforces FR-014.
- [X] T013 [US2] In the `dod-verifier.md` body, encode the consolidated output format: one line per DoD item, with evidence under each blocker, and a final overall summary line ("DoD: SATISFIED / BLOCKED / PARTIAL (N items require human sign-off)").
- [X] T014 [US2] Trial `dod-verifier` against the current branch immediately before running Phase 6. Capture the report to `specs/297-create-claude-code-sub-agents-for-specki/trials/dod-verifier.md` for the PR body (FR-020). Resolve any legitimate blockers the agent surfaces before proceeding.

**Checkpoint**: `dod-verifier` is shippable and has a clean-pass trial record against this branch.

---

## Phase 5: User Story 3 — `pr-test-plan-checker` (Priority: P1)

**Goal**: Ship `.claude/agents/pr-test-plan-checker.md` that, given a PR number, fetches the PR body, parses the `## Test plan` section, and reports READY/BLOCKED — with an allowlist that cannot reach `gh pr merge`.

**Independent Test**: Invoke `pr-test-plan-checker` with a known-merged reference PR number (see T019 for selection). Confirm the status it returns matches manual inspection. Separately, audit the allowlist line in the file and confirm no command permitted by it can merge, close, or modify a PR.

### Implementation for User Story 3

- [X] T015 [US3] Create `.claude/agents/pr-test-plan-checker.md` with YAML frontmatter: `name: pr-test-plan-checker`, imperative `description:` for pre-merge PR checkbox verification, `tools: Bash(gh pr view:*)` only, `model: haiku` (simple parse/count), and `color: red`.
- [X] T016 [US3] In the `pr-test-plan-checker.md` body, encode the workflow: call `gh pr view <N> --json body -q .body`, locate the first heading matching `^##\s+test\s+plan\s*$` case-insensitively, enumerate checkbox lines matching `- \[( |x|X)\]\s+(.*)$`, classify each as checked or unchecked, and report.
- [X] T017 [US3] In the `pr-test-plan-checker.md` body, encode the output format:

  ```text
  Status: READY | BLOCKED
  Reason: <one line; "all checked" or "N unchecked" or "no Test plan section found">
  Checked items:
    - <verbatim>
  Unchecked items:
    - <verbatim>
  ```

  Handle the no-section edge case explicitly.
- [X] T018 [US3] In the `pr-test-plan-checker.md` body, add explicit prohibitions (FR-018): "Do not run `gh pr merge`, `gh pr close`, `gh pr edit`, `gh pr ready`, `gh pr review`, or any command that would modify, merge, or close the PR. Your only permitted command is `gh pr view`. PR merging is a manual user action per CLAUDE.md."
- [X] T019 [US3] Trial `pr-test-plan-checker` against reference PRs. Recent merged PRs have verified state — select one merged PR with a populated Test plan (e.g. #292 or #296 from recent `git log`). Save transcript + a note on whether the status matches manual inspection to `specs/297-create-claude-code-sub-agents-for-specki/trials/pr-test-plan-checker.md` for the PR body (FR-020).

**Checkpoint**: `pr-test-plan-checker` is shippable with a verified trial.

---

## Phase 6: User Story 4 — Documented invocation guidance in `docs/DEVELOPMENT.md` (Priority: P2)

**Goal**: Update `docs/DEVELOPMENT.md` with a new subsection that names each shipped agent, states its trigger point, and shows a minimal invocation example.

**Independent Test**: Read the updated `docs/DEVELOPMENT.md` section and confirm a developer unfamiliar with the agents can identify which to run at each of the three workflow checkpoints (SC-005).

### Implementation for User Story 4

- [X] T020 [US4] Edit `docs/DEVELOPMENT.md`: insert a new `### Workflow sub-agents` subsection under the "Multi-worktree local development" block (or, if flow reads better, directly under the Step 5 PR block — pick whichever places the guidance closest to the developer's point-of-use). Include one introductory paragraph, a 3-row table (agent / trigger point / invocation), and the one-line PR-merge-discipline reminder from `plan.md` Phase 1 "docs/DEVELOPMENT.md edit".
- [X] T021 [US4] Self-verify `docs/DEVELOPMENT.md` change: re-read the new subsection as if seeing the project for the first time. If any of the three agents is missing, renamed, or the table row is unclear, iterate once. No automated test harness applies.

**Checkpoint**: All four user stories are complete. Docs make the agents discoverable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification and PR hygiene before pushing.

- [X] T022 [P] Confirm `.claude/settings.json` is unchanged since the start of the branch (`git diff main -- .claude/settings.json` returns empty). Upholds SC-007.
- [X] T023 [P] Confirm no `.claude/agents/_probe.md` or other throwaway file remains (cleanup from T003).
- [X] T024 Re-run `dod-verifier` via the agent itself one final time to act as the pre-PR DoD gate. If it reports any blocker, resolve or document.
- [ ] T025 Stage and commit all changes with a message that references issue #297.
- [ ] T026 Push the branch and open a PR against `main`. The PR body MUST include: (a) summary, (b) `## Test plan` section with one checkbox per shipped agent trial and one for "read the updated `docs/DEVELOPMENT.md` section and confirm guidance is clear", (c) inline references or linked snippets from the three `specs/297-.../trials/*.md` files (FR-020), (d) NO `gh pr merge` instruction (FR-021), (e) explicit statement that the PR does not modify `.claude/settings.json`. Do NOT run `gh pr merge` — per CLAUDE.md, PR merging is manual.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: T001 is trivial; no upstream dependency.
- **Phase 2 (Foundational)**: T002 + T003 depend on T001 (directory must exist for T003's probe). T003 must complete before any Phase 3/4/5 agent file is written because its outcome may change the `tools:` line syntax.
- **Phases 3, 4, 5 (US1, US2, US3)**: Each phase gates on Phase 2 completion. The three agent phases are largely independent of each other and CAN run in parallel (different files, no inter-agent dependency), but T008, T014, and T019 each run a trial that consumes real-environment state, so in practice they are sequenced during implementation.
- **Phase 6 (US4)**: Depends on Phases 3/4/5 — the docs reference agent names and trigger points, so agents must exist first.
- **Phase 7 (Polish)**: Depends on all prior phases.

### User Story Dependencies

- **US1, US2, US3**: Independent — each produces a separate file.
- **US4**: Depends on US1, US2, and US3 (the docs section references all three agents).

### Within Each User Story

- Frontmatter task (create file) runs first, body-content tasks follow, trial task last.

### Parallel Opportunities

- T002 and T003 in Phase 2 can run concurrently (T002 is read-only, T003 is a probe + delete) — they do not touch the same state; however, T003 depends on T001.
- Agent creation tasks T004/T009/T015 are parallelizable [P-capable] across US1/US2/US3 since they touch separate files, but the sequential work-queue model inside a single Claude session makes serial execution safer and just as fast at this scale.
- T022 and T023 in Phase 7 are parallel.

---

## Parallel Example: Phase 2 Foundational

```bash
# After T001:
Task: "T002 Read .claude/settings.json and confirm the required tool allowlist covers spec-reviewer, dod-verifier, and pr-test-plan-checker"
Task: "T003 Probe Bash(gh:pr:view) narrowing syntax with a throwaway agent"
```

## Parallel Example: After Phase 2 completes, agent phases in parallel

```bash
Task: "T004-T008 Implement and trial spec-reviewer"
Task: "T009-T014 Implement and trial dod-verifier"
Task: "T015-T019 Implement and trial pr-test-plan-checker"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

`spec-reviewer` alone is a viable MVP increment: it directly accelerates the highest-leverage pause in the workflow (post-`/speckit.specify`). A developer who ships only US1 already captures the most value. US2 and US3 are equal-priority but operate later in the lifecycle.

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: US1 (`spec-reviewer`)
4. STOP and VALIDATE: trial + manual read
5. If deadline-pressed, demo US1 and defer US2/US3 — though the issue asks for all three, so this is a true MVP only if external pressure intervenes.

### Incremental Delivery (default for this feature)

All three agents are complementary, not sequential. The plan ships them together so the `docs/DEVELOPMENT.md` section in US4 can reference a complete set. Expected order: Phase 1 → 2 → 3 → 4 → 5 → 6 → 7 → PR.

### Parallel Team Strategy

Not applicable here — single-developer implementation in a single worktree.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps task to its user story for traceability.
- Trial artifacts under `specs/297-.../trials/` are transient — they feed the PR body and are committed for durable reference.
- Commit after each user-story phase; the PR is opened once Phase 7 runs T026.
- Never run `gh pr merge` — it is explicitly out of scope and forbidden by `CLAUDE.md` (FR-021).
