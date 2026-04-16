# Feature Specification: Claude Code Sub-Agents for SpecKit Workflow and PR Discipline

**Feature Branch**: `297-create-claude-code-sub-agents-for-specki`
**Created**: 2026-04-16
**Status**: Draft
**Input**: GitHub issue #297 — Create Claude Code sub-agents that encode repeated workflow rules from `CLAUDE.md`, `docs/DEVELOPMENT.md`, and `.specify/memory/constitution.md` so they can be enforced deterministically and run in parallel without consuming the main context.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Deterministic spec review before the approval gate (Priority: P1)

When a developer runs `/speckit.specify`, the SpecKit lifecycle mandates a human-in-the-loop pause before `/speckit.plan`. Today that pause relies on the developer personally re-reading the spec against the constitution and `docs/PRODUCT.md`. A purpose-built `spec-reviewer` sub-agent runs that review mechanically and returns a pass/fail summary with a punch list of concrete issues so the developer's review is faster and more consistent.

**Why this priority**: The spec is the highest-leverage artifact in the SpecKit lifecycle — revisions caught here avoid compounding work downstream. Constitution violations, untestable acceptance criteria, and out-of-scope drift are the three failure modes that cost the most later. Making this review mechanical directly addresses the rationale baked into the mandatory pause.

**Independent Test**: Spawn `spec-reviewer` against an existing spec file in `specs/297-.../spec.md`, confirm it returns a structured pass/fail report that cites constitution sections and flags at least one concrete issue (or confirms none exist). The agent must run without modifying any file.

**Acceptance Scenarios**:

1. **Given** a freshly generated `spec.md` that conflicts with a constitution rule (e.g. introduces a disallowed technology), **When** the developer invokes `spec-reviewer`, **Then** the agent's report identifies the violating requirement, quotes the constitution clause, and marks overall status as `FAIL`.
2. **Given** a `spec.md` whose acceptance criteria include a non-testable phrase (e.g. "the system feels fast"), **When** the developer invokes `spec-reviewer`, **Then** the agent flags that requirement as non-testable and proposes a measurable restatement.
3. **Given** a `spec.md` that includes capability listed in the out-of-scope section of `docs/PRODUCT.md`, **When** the developer invokes `spec-reviewer`, **Then** the agent flags the scope drift with a pointer to the PRODUCT.md line.
4. **Given** a `spec.md` that satisfies every rule, **When** the developer invokes `spec-reviewer`, **Then** the agent returns status `PASS` with an empty issue list.

---

### User Story 2 — Definition-of-Done punch list before PR open (Priority: P1)

Before opening a PR, the developer must satisfy eight DoD items from constitution Section XII (acceptance criteria met, tests pass, linting clean, no TODOs/dead code, spec docs current, `docs/DEVELOPMENT.md` implementation-order status updated, PR body has a `## Test plan`, README updated for user-facing changes, constitution compliance verified). A `dod-verifier` sub-agent runs every item it can verify mechanically and returns a single report listing what's missing.

**Why this priority**: The DoD is the last line of defense. Any item skipped here surfaces as post-merge rework or, worse, a constitution violation in `main`. The checklist is mechanical enough that running it as an agent is strictly more reliable than relying on the developer's memory under cognitive load.

**Independent Test**: Spawn `dod-verifier` on the current branch before opening the PR for this very issue. Confirm the agent's punch list matches a manual walk of the same checklist.

**Acceptance Scenarios**:

1. **Given** a branch with passing tests, clean lint, updated spec, updated `docs/DEVELOPMENT.md` (if applicable), and a PR body with a complete `## Test plan`, **When** the developer invokes `dod-verifier`, **Then** the agent returns a report with every DoD item marked satisfied.
2. **Given** a branch with a failing test, **When** the developer invokes `dod-verifier`, **Then** the agent reports the test failure as a blocker and does not mark DoD satisfied.
3. **Given** a branch that changes user-facing behavior but leaves the README unchanged, **When** the developer invokes `dod-verifier`, **Then** the agent flags the README as needing an update.
4. **Given** a branch whose source contains `console.log`, a TODO, or untyped `any`, **When** the developer invokes `dod-verifier`, **Then** the agent flags each occurrence by file and line.
5. **Given** a feature whose implementation-order row in `docs/DEVELOPMENT.md` is still blank, **When** the developer invokes `dod-verifier` against a completed implementation, **Then** the agent flags that the table row needs to be set to `✅ Done`.

---

### User Story 3 — PR test-plan checkbox verification before merge (Priority: P1)

`CLAUDE.md` forbids running `gh pr merge` automatically — the PR merge rule requires every `## Test plan` checkbox to be checked before the developer is asked to merge manually. A `pr-test-plan-checker` sub-agent, given a PR number, fetches the PR body, parses the `## Test plan` section, and reports whether every checkbox is checked or which remain open. The agent must never invoke `gh pr merge` under any circumstance.

**Why this priority**: The PR merge rule is easy to skip under cognitive load, and a skipped checkbox is exactly the kind of drift that the rule exists to prevent. Encoding this check as a dedicated agent makes the rule mechanical and auditable.

**Independent Test**: Run `pr-test-plan-checker` against the PR opened for this very issue. Confirm it correctly enumerates checkbox state. Confirm via tool allowlist that `gh pr merge` is not reachable from the agent.

**Acceptance Scenarios**:

1. **Given** a PR whose body contains a `## Test plan` section with every checkbox checked, **When** the developer invokes `pr-test-plan-checker` with the PR number, **Then** the agent reports status `READY` and lists the checked items.
2. **Given** a PR whose body contains a `## Test plan` with one unchecked checkbox, **When** the developer invokes `pr-test-plan-checker`, **Then** the agent reports status `BLOCKED` and names the unchecked item(s) verbatim.
3. **Given** a PR whose body has no `## Test plan` section at all, **When** the developer invokes `pr-test-plan-checker`, **Then** the agent reports status `BLOCKED` with the reason "no Test plan section found".
4. **Given** any PR state, **When** `pr-test-plan-checker` finishes its check, **Then** it does not invoke `gh pr merge` — the command is absent from its tool allowlist.

---

### User Story 4 — Documented invocation guidance in `docs/DEVELOPMENT.md` (Priority: P2)

For the agents to actually get used, the developer workflow documentation must tell future developers when to invoke them. `docs/DEVELOPMENT.md` gains a short section that names each agent, the workflow step it attaches to, and how to invoke it.

**Why this priority**: An agent that exists but isn't documented won't be used. This is the thin layer that closes the loop between the agent definition and the workflow it serves.

**Independent Test**: Read `docs/DEVELOPMENT.md` after the change and confirm that each of the three shipped agents is named with its trigger point (post-`/speckit.specify`, pre-PR-open, post-PR-open) and a one-line invocation instruction.

**Acceptance Scenarios**:

1. **Given** a developer unfamiliar with the agents, **When** they read `docs/DEVELOPMENT.md`, **Then** they can identify which agent to run at each workflow checkpoint and how to invoke it.
2. **Given** the three shipped agents, **When** a reader scans `docs/DEVELOPMENT.md`, **Then** each is referenced by name with its role.

---

### Edge Cases

- **Spec with no constitution-relevant content (e.g. pure UI polish)**: `spec-reviewer` still completes and returns `PASS` with an explicit note that no constitution rules applied rather than silently skipping.
- **`dod-verifier` run mid-implementation (tests not yet written)**: Agent surfaces the incomplete state as blockers — it does not guess at intent.
- **`pr-test-plan-checker` run against a PR on a repo the agent cannot access**: Agent reports the access failure explicitly rather than returning a misleading `READY`.
- **PR body with a `## Test plan` section that uses non-standard checkbox syntax (e.g. `- [X]` vs `- [x]`, or a different heading like `## Test Plan`)**: Agent normalizes case for both the heading and the checkbox mark and treats them as equivalent.
- **Multiple `## Test plan` sections (e.g. one in the body and one quoted inside a comment)**: Agent evaluates only the top-level `## Test plan` section in the PR body; it does not scan comments.
- **An agent is invoked but its required tool (e.g. `gh`) is not available in the environment**: Agent fails loudly with a clear error naming the missing tool, not a silent `PASS`.
- **`spec-reviewer` run against a spec that is still a draft with `[NEEDS CLARIFICATION]` markers**: Agent flags each unresolved marker as a blocker to the approval gate.

## Requirements *(mandatory)*

### Functional Requirements

**Agent definitions & allowlists**

- **FR-001**: The repository MUST contain a file at `.claude/agents/spec-reviewer.md` that defines the `spec-reviewer` sub-agent with a prompt and a tool allowlist.
- **FR-002**: The repository MUST contain a file at `.claude/agents/dod-verifier.md` that defines the `dod-verifier` sub-agent with a prompt and a tool allowlist.
- **FR-003**: The repository MUST contain a file at `.claude/agents/pr-test-plan-checker.md` that defines the `pr-test-plan-checker` sub-agent with a prompt and a tool allowlist.
- **FR-004**: Every agent definition file MUST declare an explicit tool allowlist; no agent may rely on an implicit or wildcard tool set.
- **FR-005**: The `pr-test-plan-checker` tool allowlist MUST exclude any command or capability that could invoke `gh pr merge` (no blanket `Bash(gh:*)` — the allowed `gh` surface is the narrowest subset needed to read PR body content).

**`spec-reviewer` behavior**

- **FR-006**: `spec-reviewer` MUST read `.specify/memory/constitution.md`, `docs/PRODUCT.md`, and the target `spec.md` before producing its report.
- **FR-007**: `spec-reviewer` MUST return a structured report with an overall status (`PASS` or `FAIL`) and a list of issues; each issue MUST name the spec section affected, quote the offending text, and cite the authoritative document (constitution clause or PRODUCT.md section) it violates.
- **FR-008**: `spec-reviewer` MUST treat any unresolved `[NEEDS CLARIFICATION]` marker in the spec as a blocker to the approval gate.
- **FR-009**: `spec-reviewer` MUST flag acceptance criteria that are not testable (e.g. vague adjectives like "fast" or "intuitive" without measurable thresholds).
- **FR-010**: `spec-reviewer` MUST NOT modify any file it reads.

**`dod-verifier` behavior**

- **FR-011**: `dod-verifier` MUST evaluate each Definition-of-Done item from constitution Section XII that can be checked mechanically — specifically: test suite pass, lint pass, absence of `TODO` / `FIXME` markers in new code, absence of `console.log` in shipped source, absence of `any`-typed values in TypeScript source, presence of a `## Test plan` section in the PR body (if a PR exists for the branch), README update if any user-facing source file changed, and implementation-order-table update in `docs/DEVELOPMENT.md` for Phase-tracked features.
- **FR-012**: `dod-verifier` MUST return a single consolidated report: each DoD item marked satisfied/blocked with specific evidence (file paths, line numbers, command output) for each blocker.
- **FR-013**: `dod-verifier` MUST mark any item it cannot mechanically verify (e.g. "constitution compliance verified" for subjective rules) as "requires human sign-off" rather than marking it satisfied.
- **FR-014**: `dod-verifier` MUST NOT modify source files — it is a verifier, not a fixer.

**`pr-test-plan-checker` behavior**

- **FR-015**: `pr-test-plan-checker` MUST accept a PR number as input and fetch the PR body through a read-only command.
- **FR-016**: `pr-test-plan-checker` MUST parse the top-level `## Test plan` section (case-insensitive heading match) and enumerate every checkbox using GitHub-flavored-markdown checkbox syntax, treating `[x]` and `[X]` as checked and `[ ]` as unchecked.
- **FR-017**: `pr-test-plan-checker` MUST return status `READY` when every checkbox is checked, `BLOCKED` when any is unchecked, and `BLOCKED` with a named reason when no `## Test plan` section is found.
- **FR-018**: `pr-test-plan-checker` MUST NOT invoke `gh pr merge` or any command that would merge, close, or otherwise modify the PR.

**Documentation**

- **FR-019**: `docs/DEVELOPMENT.md` MUST be updated to name each shipped agent, state the workflow step it attaches to, and provide a minimal invocation example.
- **FR-020**: The PR for this feature MUST document an end-to-end trial of each shipped agent (screenshot, transcript excerpt, or summary of the agent's report) sufficient to prove it ran against real repository state.

**Constraint — PR merge discipline**

- **FR-021**: No agent introduced by this feature — nor any documentation added by this feature — may instruct a Claude session to run `gh pr merge`. The existing `CLAUDE.md` rule that PR merging is a manual user action remains intact.

### Key Entities *(include if feature involves data)*

- **Agent definition file**: A markdown file in `.claude/agents/` whose frontmatter and body together define one sub-agent — name, description, tool allowlist, and system prompt. Each file is self-contained; there is no shared-state file.
- **Agent report**: The structured output a sub-agent returns to the invoking session. Each agent in this feature returns a report with an overall status and an issue list; the issue-list item shape is consistent across the three agents so a future orchestrator can consume them uniformly.
- **Definition-of-Done checklist**: The eight-item list in constitution Section XII. `dod-verifier` is its mechanical counterpart; the constitution remains authoritative if the two drift.
- **Test plan section**: The `## Test plan` block in a PR body, canonicalized by constitution Section XIII as the single source of truth for manual-testing signoff. `pr-test-plan-checker` operates only on this section.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer using `spec-reviewer` at the post-`/speckit.specify` pause receives a complete review report (status + issue list) in a single agent invocation, without needing to re-prompt for missing dimensions (constitution / testability / scope all covered in one pass).
- **SC-002**: `dod-verifier` surfaces 100% of mechanically checkable DoD failures on a branch deliberately seeded with one violation per checkable item — no silent passes, no false positives against a clean branch.
- **SC-003**: `pr-test-plan-checker` correctly reports `READY` vs `BLOCKED` on three test PRs (all checked, one unchecked, no Test plan section) with zero misclassifications.
- **SC-004**: The `pr-test-plan-checker` tool allowlist, when audited, contains no command that can merge, close, or modify a PR. This is verified by reading the allowlist directly against the list of disallowed commands.
- **SC-005**: A developer new to the project can, after reading only the updated `docs/DEVELOPMENT.md` section, correctly identify which agent to invoke at each of the three workflow checkpoints without consulting source or spec files.
- **SC-006**: The PR for this feature contains a named trial of each shipped agent — verifiable by reading the PR body.
- **SC-007**: Zero new entries are introduced into `.claude/settings.json` unless they are strictly required by one of the shipped agents; any new entry is justified in the PR description per the existing allowlist-extension rule.

## Assumptions

- The `.claude/agents/` directory is the correct location for per-project sub-agent definitions recognized by the Claude Code CLI; if Claude Code uses a different convention, the implementation uses that convention and this assumption is updated.
- Agent definition files follow the markdown-with-frontmatter format used elsewhere in the project for Claude-recognized files (e.g. `.claude/commands/`). Exact frontmatter keys are discovered at implementation time; the spec's contract is on behavior, not on frontmatter schema.
- Agent invocation happens from a Claude Code session inside the repo (interactive or headless) — out-of-editor invocation is out of scope.
- The `gh` CLI is installed and authenticated in the environment where `pr-test-plan-checker` runs, consistent with the existing `.claude/settings.json` allowlist.
- `dod-verifier` mechanical checks run against the currently checked-out branch. Cross-branch or pre-push hook wiring is out of scope for this feature.
- "User-facing changes" for README-update detection are inferred from diff scope (changes under `app/`, `components/`, `pages/`, or top-level config files visible in setup instructions); subjective UX polish without a diff signal is not automatically flagged.
- The implementation-order-table-update check in `dod-verifier` applies only to features tracked in the `docs/DEVELOPMENT.md` Phase tables; tooling/process issues like this one, which have no feature-ID row, are exempt.

## Out of Scope

- **`calibration-sampler` and `constitution-guard`** — both are out of scope for this feature. No build-vs-defer decision record is required in the PR; the two agents may be revisited in a separate issue if and when the need arises.
- **Automating `gh pr merge`** — forbidden by `CLAUDE.md` and reaffirmed in FR-022.
- **Replacing or modifying SpecKit slash commands** (`/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`). The agents wrap around the existing lifecycle; they do not replace it.
- **Auto-fixing DoD violations**. `dod-verifier` reports blockers; the developer (or a future fixer agent) resolves them.
- **Cross-repository orchestration**. Each agent operates within the current repo checkout.
- **Persisted agent state**. No database, no shared cache — each invocation is stateless.
