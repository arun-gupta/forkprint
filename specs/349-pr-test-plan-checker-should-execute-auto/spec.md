# Feature Specification: Rename `pr-test-plan-checker` to `pr-test-plan-runner` and make it execute automatable Test plan items

**Feature Branch**: `349-pr-test-plan-checker-should-execute-auto`
**Created**: 2026-04-17
**Status**: Draft
**Input**: GitHub issue #349 — "pr-test-plan-checker should execute automatable checkboxes, not just verify they're ticked"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Agent executes automatable checkboxes and ticks them (Priority: P1)

A developer finishes work on a feature branch, opens a PR whose `## Test plan` section has a mix of items — some reference a runnable command in backticks (e.g. `` `npm test` ``, `` `npx vitest run path/to/spec` ``, `` `npm run lint` ``), others are manual sanity checks (in-browser verification, visual review). The developer invokes the sub-agent (`@pr-test-plan-runner <PR>`), walks away, and returns to find every automatable checkbox ticked in the PR body — with the remaining unticked items clearly surfaced as things only a human can do.

**Why this priority**: This is the whole feature. Today the agent is a read-only gate that inverts the intended division of labor — the human runs the mechanical tests and the agent verifies that they did. Flipping that is the point: the agent does the grunt work, the human does the judgment calls.

**Independent Test**: Create a PR whose Test plan has two backtick-wrapped commands (one that passes, one that fails) and one prose-only item. Run the agent. Confirm: the passing-command box is `[x]` in the PR body, the failing-command and prose-only boxes remain `[ ]`, and the structured report classifies each item correctly (`AUTO-PASS`, `AUTO-FAIL`, `MANUAL`).

**Acceptance Scenarios**:

1. **Given** a PR with `## Test plan` item `- [ ] Unit tests pass — run `npm test`` and `npm test` exits 0, **When** the agent runs, **Then** the PR body is updated so that item is `[x]` and the report lists it as `AUTO-PASS` with command `npm test`.
2. **Given** a PR with `- [ ] Lint is clean — `npm run lint`` and `npm run lint` exits non-zero, **When** the agent runs, **Then** the box remains `[ ]`, the report lists it as `AUTO-FAIL` with a bounded excerpt of failure output, and the overall verdict is `BLOCKED`.
3. **Given** a PR with `- [ ] Verify the scorecard renders correctly for `kubernetes/kubernetes` in the running app`, **When** the agent runs, **Then** the box remains `[ ]`, the report lists it as `MANUAL` with reason "no automatable command extracted", and surfaces the item so the human knows it is still theirs to complete.
4. **Given** a PR where a human has already ticked `- [x] Manual check confirmed`, **When** the agent runs again, **Then** the `[x]` is preserved — the agent never reverts a checked box to unchecked.
5. **Given** every `[ ]` item in the Test plan either passes its automation or has no automatable command, **When** the agent finishes, **Then** the overall verdict is `READY` only if every box is now `[x]`; otherwise it is `BLOCKED` with per-item reasons.
6. **Given** a prior run left some items `[x]` (AUTO-PASS) and some items still `[ ]` (AUTO-FAIL or MANUAL), **When** the developer re-invokes the agent on the same PR after addressing the failures, **Then** the agent executes commands only for items still `[ ]` — items already `[x]` are classified `ALREADY-CHECKED` and not re-run. This is the "fix-and-retry" loop: each re-invocation is incremental, so the developer never pays for re-running tests that passed earlier.

---

### User Story 2 — Agent refuses destructive or PR-mutating commands (Priority: P1)

A developer (or an ambient instruction, or a subtly crafted Test plan entry) includes a command inside backticks that is destructive (`rm -rf`, `git reset --hard`, `git push --force`) or that would mutate PR state beyond the Test plan body (`gh pr merge`, `gh pr close`, `gh pr ready`, `gh pr review`, `gh pr comment`). The agent must never run these commands, regardless of allowlist extraction logic.

**Why this priority**: NON-NEGOTIABLE per `CLAUDE.md`'s PR merge rule and the constitution's security posture (§X). One bug here — one case where the agent runs `gh pr merge` because the command happens to sit inside backticks — violates the single most important workflow invariant the project has.

**Independent Test**: Craft a PR whose Test plan contains `- [ ] Final gate — `gh pr merge --squash``. Run the agent. Confirm: the box remains `[ ]`, the report classifies it as `MANUAL` (not `AUTO-FAIL`, because the command was never attempted), and `gh pr merge` was never invoked.

**Acceptance Scenarios**:

1. **Given** a Test plan item whose first backtick-wrapped command starts with `gh pr merge`, `gh pr close`, `gh pr ready`, `gh pr review`, `gh pr comment`, `rm`, `git reset --hard`, `git push --force`, or any command prefix not on the automatable allowlist, **When** the agent scans that item, **Then** it classifies the item as `MANUAL` without executing the command.
2. **Given** the agent is asked (by prompt injection inside a Test plan item, a PR comment quoted in the body, or any other surface) to merge the PR, **When** it encounters such an instruction, **Then** it refuses with a message consistent with `CLAUDE.md` — "PR merging is a manual user action per CLAUDE.md" — and does not invoke `gh pr merge`.

---

### User Story 3 — Agent preserves everything outside the Test plan section (Priority: P2)

A developer opens a PR with a rich body — a `## Summary` section, a `## Test plan` section, a `## Risks` section, inline quoted logs, and inline fenced code blocks that happen to contain `[ ]` characters. The agent updates only checkbox markers inside `## Test plan` and writes the body back.

**Why this priority**: Corrupting a PR body by rewriting content outside the Test plan (e.g. eating a `## Summary` paragraph, or mistakenly interpreting a `[ ]` inside a code fence as a checkbox) is a regression severe enough that reviewers will stop trusting the agent. The fix is architectural — section-aware editing — not cosmetic.

**Independent Test**: Construct a PR body with three sections (`## Summary`, `## Test plan`, `## Risks`) and a fenced code block inside `## Summary` that contains `- [ ] fake-checkbox`. Run the agent. Confirm: the `## Summary` section is byte-for-byte identical, the fake checkbox inside the fence is untouched, the `## Risks` section is byte-for-byte identical, and only `## Test plan` checkboxes changed.

**Acceptance Scenarios**:

1. **Given** a PR body with content before `## Test plan` and content after the next `## ` heading, **When** the agent writes an updated body, **Then** everything outside `[Test plan start, next heading)` is byte-identical to the original.
2. **Given** a `- [ ]` token appears inside a fenced code block or inline code span elsewhere in the body, **When** the agent runs, **Then** that token is not altered.
3. **Given** the PR has no `## Test plan` section at all, **When** the agent runs, **Then** it does not edit the PR body and returns `BLOCKED — no "## Test plan" section found`.

---

### User Story 4 — Agent produces a structured, human-readable report and posts it as an audit comment (Priority: P2)

After a run, the developer reads a compact summary showing per-item status, the command that was executed (if any), a bounded failure excerpt where relevant, and one overall verdict at the top. The agent also posts the same report as a PR comment, clearly marked as agent-generated, so that anyone reviewing the PR later has a durable audit trail of what the agent did, when, and with what result.

**Why this priority**: Even when everything worked, the developer needs to know *what* the agent did — which commands it ran, which items it deliberately left for manual review. Without this, the agent becomes a black box and the developer is forced to re-verify its work, defeating the purpose. The PR comment extends that visibility to anyone reviewing the PR in the future (reviewers, auditors, future-self) without requiring them to re-invoke the agent.

**Independent Test**: Run the agent on a PR whose Test plan has four items (one already `[x]`, one AUTO-PASS, one AUTO-FAIL, one MANUAL). Confirm: (a) the structured return value shows overall verdict line (`READY` or `BLOCKED`), four per-item entries with correct classifications, the executed command for AUTO-PASS / AUTO-FAIL, and a bounded failure excerpt for AUTO-FAIL; (b) a new PR comment is present, leading with an agent-generated disclaimer (e.g. `> Automated report from pr-test-plan-runner — do not edit; re-run the agent to refresh.`), containing the same overall verdict and per-item breakdown.

**Acceptance Scenarios**:

1. **Given** a run with at least one AUTO-FAIL item, **When** the agent produces its report, **Then** a bounded excerpt (not unbounded dump) of the failing command's stdout/stderr tail is included under that item in both the return value and the PR comment.
2. **Given** an item already had `[x]` at start of run, **When** the report is produced, **Then** it is listed under `ALREADY-CHECKED` and no command is re-run for it.
3. **Given** a run where every box is now `[x]`, **When** the agent finishes, **Then** the overall verdict is `READY` and both the return value and the PR comment invite the user to proceed with the manual merge per `CLAUDE.md`.
4. **Given** any successful run (including re-runs), **When** the agent finishes processing items, **Then** exactly one new PR comment is posted whose first line is a fixed agent-generated disclaimer and which carries the full structured report body. Prior comments from earlier runs are left in place — the agent never edits or deletes its own previous comments, preserving the run-by-run audit trail.
5. **Given** the comment-posting step fails (`gh pr comment` returns non-zero — e.g. network error, auth error), **When** the agent finishes, **Then** the structured return value still contains the full report, includes a `BLOCKED — failed to post audit comment: <error>` note, and the checkbox state written via `gh pr edit` is preserved (the comment failure does not roll back the body edit).

---

### Edge Cases

- **Zero `[ ]` items, non-zero `[x]` items**: overall verdict is `READY`; report lists the `ALREADY-CHECKED` items and notes no automation was needed.
- **Zero checkboxes inside `## Test plan`**: verdict is `BLOCKED — Test plan section exists but contains no checkboxes`. No PR body edit.
- **Multiple `## Test plan` headings**: evaluate only the first occurrence (preserves current agent behavior); the second is treated as opaque content and not parsed.
- **Non-standard checkbox markers (`- [-]`, `- [~]`)**: neither checked nor unchecked; classify item as `BLOCKED — non-standard checkbox marker`. No edit, no command run.
- **Multiple backtick-wrapped commands in one item**: extract only the *first* backtick-wrapped chunk whose first token is on the allowlist. If the first chunk is not on the allowlist (e.g. it's a file path), skip that chunk and try subsequent chunks; if none match, classify `MANUAL`.
- **Backtick-wrapped text that is not a command**: if the first token is not on the allowlist, the chunk is not considered a command — the agent does not attempt to run it.
- **Command on allowlist but with shell metacharacters (`;`, `&&`, `|`, `>`, `$(…)`, backticks)**: treated as untrustworthy and classified `MANUAL`. The agent runs only clean commands matching the allowlist prefix with simple arguments (letters, digits, `-`, `_`, `.`, `/`, `:`, `=`, `@`).
- **Concurrent agent invocations on the same PR**: out of scope. The agent reads the body once at start and writes it once at end; a human editing the body mid-run risks a race that manifests as the last writer winning. This is acceptable — the agent is invoked by a single developer per PR, not in a pipeline.
- **Command times out**: if a runnable command does not exit within a reasonable bound (the agent's Bash timeout), it is treated as `AUTO-FAIL` with a timeout-specific failure excerpt. The box stays `[ ]`.
- **`gh pr edit --body` fails** (network, auth, stale PR): agent reports `BLOCKED — failed to write updated body: <error>`, and per-item results are still reported so the developer knows which items would have been ticked. No automatic retry. The agent still attempts the audit comment (`gh pr comment`) so the run produces an audit trail even when the body write fails.
- **`gh pr comment` fails** (network, auth, permissions): agent continues and reports `BLOCKED — failed to post audit comment: <error>` in its return value. The `gh pr edit` checkbox write (if any) is not rolled back.
- **Test plan item references a command whose first token is an allowlisted prefix but the `npm run` target does not exist** (e.g. `` `npm run typecheck` `` when no `typecheck` script is defined): the command exits non-zero and is classified `AUTO-FAIL`. This is correct behavior — the Test plan is asserting a script that does not exist, which is a real failure.

## Requirements *(mandatory)*

### Functional Requirements

**Parsing and extraction**

- **FR-001**: The agent MUST fetch the PR body via `gh pr view [N] --json body -q .body` (or `--json body -q .body` for the current branch when the input is `"current"`).
- **FR-002**: The agent MUST locate the first `^##\s+test\s+plan\s*$` heading (case-insensitive) and treat its body as everything between that heading and the next `^##\s` heading (or end-of-body).
- **FR-003**: The agent MUST enumerate checkboxes inside the Test plan section by matching lines against `^\s*-\s+\[(\s|x|X)\]\s+(.+)$`, preserving the verbatim line content for later edit.
- **FR-004**: For each unchecked (`[ ]`) checkbox, the agent MUST scan its line left-to-right for backtick-wrapped chunks, examine the first token (whitespace-delimited) of each chunk, and select the **first chunk whose first token matches a prefix on the automatable allowlist**.

**Allowlist**

- **FR-005**: The automatable command allowlist MUST consist exactly of these prefix patterns (first-token match, exact string or space-prefix match — not regex substring):
  - `npm test` (base command, with or without extra args)
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:unit`
  - `npm run test:integration`
  - `npx vitest`
  - `npx eslint`
  - `npx tsc`
- **FR-006**: The agent MUST explicitly exclude `npm run test:e2e` and `npx playwright` from the automatable allowlist. Items whose first allowlist-candidate command starts with either prefix MUST be classified `MANUAL` with the specific reason "E2E tests require a running dev server and manual verification".
- **FR-007**: The agent MUST refuse to run any command that contains shell metacharacters (`;`, `&&`, `||`, `|`, `>`, `<`, `$(`, backtick-escaped subshells, `&` for background). Such items MUST be classified `MANUAL` with the reason "shell metacharacters not supported".
- **FR-008**: The agent MUST never execute any of the following commands *when extracted from a Test plan item*: `gh pr merge`, `gh pr close`, `gh pr ready`, `gh pr review`, `gh pr comment`, `gh pr edit`, `rm`, `git reset`, `git push --force`, `git push -f`, `sudo`, `curl`, `wget`, `ssh`. Items whose extracted command matches any of these MUST be classified `MANUAL` with the reason "command is on the forbidden list". Note: this forbids *extracted* commands only. The agent's own internal use of `gh pr edit --body` (for checkbox toggling, FR-012) and `gh pr comment` (for audit-comment posting, FR-018) is permitted because those invocations are fully controlled by the agent and never carry Test-plan-sourced arguments.

**Execution and toggling**

- **FR-009**: When the agent runs an allowlisted command and it exits 0, the agent MUST toggle that checkbox's marker from `[ ]` to `[x]` in an in-memory copy of the PR body. Exit code is the sole pass/fail signal; stdout/stderr content is not used to judge correctness.
- **FR-010**: When the agent runs an allowlisted command and it exits non-zero (or times out), the checkbox MUST remain `[ ]`. The agent MUST capture a bounded tail of combined stdout/stderr (target: final ~2000 characters) for the report.
- **FR-011**: The agent MUST never change an existing `[x]` to `[ ]`. Human ticks (and previous agent ticks) are preserved across re-runs.
- **FR-012**: After processing all items, if any checkbox state changed, the agent MUST write the updated body back to the PR via `gh pr edit [N] --body <new-body>` (or `gh pr edit --body <new-body>` for the current branch). If no checkbox state changed, the agent MUST NOT call `gh pr edit`.
- **FR-013**: The edited body MUST be byte-identical to the original outside the Test plan section. Inside the Test plan section, only the `[ ]` / `[x]` marker on toggled lines may change — item text and line structure are preserved verbatim.

**Reporting**

- **FR-014**: The agent MUST emit a structured report with an overall verdict (`READY` or `BLOCKED`), a per-item list classified as one of `AUTO-PASS`, `AUTO-FAIL`, `MANUAL`, `ALREADY-CHECKED`, or `BLOCKED-MARKER` (for non-standard checkbox characters), and for `AUTO-PASS` / `AUTO-FAIL` items, the exact command executed.
- **FR-015**: For `AUTO-FAIL` items the report MUST include a bounded failure excerpt (up to ~2000 characters, tail-biased) of the command's combined stdout/stderr.
- **FR-016**: For `MANUAL` items the report MUST state the specific reason ("no backtick-wrapped command found", "command not on automatable allowlist", "E2E requires running dev server", "shell metacharacters not supported", "command is on the forbidden list").
- **FR-017**: The overall verdict MUST be `READY` if and only if every checkbox in the Test plan section is `[x]` at the end of the run; otherwise `BLOCKED`.
- **FR-018**: After processing all items, the agent MUST post a single new PR comment containing the structured report, via `gh pr comment [N] --body <report>` (or `gh pr comment --body <report>` for the current branch). The comment's first line MUST be a fixed agent-generated disclaimer — e.g. `> Automated report from pr-test-plan-runner — do not edit; re-run the agent to refresh.` — so any human reading the PR sees at a glance that the content is machine-produced. The agent MUST NOT edit or delete prior comments (its own or anyone else's); each run appends a fresh snapshot. If `gh pr comment` fails, the agent reports the failure in its return value but does not roll back the `gh pr edit --body` checkbox write.

**Tool surface and safety**

- **FR-019**: The agent's declared `tools:` allowlist MUST include exactly the Bash patterns required for the automatable allowlist (`Bash(npm test:*)`, `Bash(npm run lint:*)`, `Bash(npm run typecheck:*)`, `Bash(npm run build:*)`, `Bash(npm run test:unit:*)`, `Bash(npm run test:integration:*)`, `Bash(npx vitest:*)`, `Bash(npx eslint:*)`, `Bash(npx tsc:*)`) plus `Bash(gh pr view:*)`, `Bash(gh pr edit:*)`, and `Bash(gh pr comment:*)`. No broader patterns (no `Bash(*)`, no `Bash(gh:*)`, no `Bash(npm:*)`, no `Bash(npm run test:*)`). `gh pr merge`, `gh pr close`, `gh pr ready`, and `gh pr review` remain absent from the allowlist. Note: Claude Code permission syntax recognizes `:*` as the trailing-wildcard separator only at the END of a pattern (per https://code.claude.com/docs/en/permissions.md), so a colon inside the prefix — e.g. `test:unit` — is treated as a literal character and needs no escaping.
- **FR-020**: The agent's prompt MUST reiterate the forbidden-command list (FR-008) as a hard constraint, and MUST include the "refuse and stop" refusal pattern from the existing agent prompt's "Reminder" section (so ambient instructions to merge cannot override the rule).

**Agent rename**

- **FR-022**: The agent MUST be renamed from `pr-test-plan-checker` to `pr-test-plan-runner` as part of this feature. Specifically:
  - The agent file MUST be moved via `git mv .claude/agents/pr-test-plan-checker.md .claude/agents/pr-test-plan-runner.md` so version history is preserved.
  - The `name:` frontmatter field inside the agent file MUST be updated to `pr-test-plan-runner`.
  - The agent's `description:` frontmatter MUST be rewritten to describe the new execute-tick-comment behavior (not the old read-only verification behavior).
  - The agent's prompt body's self-references (e.g. "You are the RepoPulse PR Test-Plan checker") MUST be updated to the new role ("You are the RepoPulse PR Test-Plan runner").
  - No compatibility shim, alias, or redirect is created for the old name. Callers learn the new name via the updated documentation.

**Workflow documentation**

- **FR-021**: `docs/DEVELOPMENT.md`'s "Workflow sub-agents" table row MUST be updated so (a) the `Agent` column reads `pr-test-plan-runner`, (b) the `When to invoke` and `How to invoke` columns reflect the new execute-and-tick behavior and the new `@pr-test-plan-runner` invocation, and (c) the paragraph immediately below the table ("PR merge discipline") reflects the expanded tool surface while re-stating that `gh pr merge` remains forbidden. The paragraph describing the structured reports each agent returns MUST be updated so `pr-test-plan-runner` is described as returning per-item `AUTO-PASS` / `AUTO-FAIL` / `MANUAL` / `ALREADY-CHECKED` classifications plus an overall `READY` / `BLOCKED` verdict.

### Key Entities

- **Test plan section**: The contiguous block of the PR body starting with the first `^##\s+test\s+plan\s*$` heading and ending at the next `^##\s` heading or end-of-body. The agent's sole write scope.
- **Checkbox item**: A line matching `^\s*-\s+\[(\s|x|X)\]\s+(.+)$` inside the Test plan section. Has a marker state (`[ ]` or `[x]`) and a text payload.
- **Automatable command**: The first backtick-wrapped chunk within a checkbox item's text whose first whitespace-delimited token matches an entry on the automatable allowlist and contains no shell metacharacters.
- **Per-item report entry**: One structured record with fields `{item_text, marker_before, marker_after, classification, command?, failure_excerpt?, reason?}`.
- **Overall verdict**: `READY` (every checkbox ended `[x]`) or `BLOCKED` (at least one remained `[ ]`, or a structural error prevented the run).
- **Audit comment**: A PR comment posted by the agent at the end of each run. First line is a fixed agent-generated disclaimer; body is the human-readable rendering of the structured report (overall verdict + per-item list). Posted fresh on each run; never edited or deleted by the agent.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a PR whose Test plan contains *only* automatable items that all pass, running the agent once moves the verdict from `BLOCKED` to `READY` without any human intervention — the developer can immediately merge.
- **SC-002**: On a PR whose Test plan mixes automatable and manual items, the agent ticks every automatable item and the developer finishes the remaining items with zero duplicate work — the developer never runs a command the agent has already run successfully.
- **SC-003**: The agent never toggles a previously `[x]` item to `[ ]` across a hundred re-runs on the same PR (idempotence of human ticks).
- **SC-004**: On a Test plan that includes a backtick-wrapped `gh pr merge`, `rm -rf`, or `git push --force`, the agent executes zero of those commands (observed by the developer seeing the PR still open, no files deleted, no branches force-pushed).
- **SC-005**: On a PR body with sections outside `## Test plan`, re-running the agent leaves those sections byte-identical — verified by diffing PR body before/after the run.
- **SC-006**: On a Test plan item that references a failing command, the agent leaves the box unchecked and surfaces a bounded failure excerpt in the report — the developer can read the report alone to understand what failed without re-running the command.
- **SC-007**: The total added Bash allowlist in the agent frontmatter grows by no more than 11 patterns (9 automatable + `gh pr edit` + `gh pr comment`). No blanket wildcards.
- **SC-008**: Re-invoking the agent on a PR where previous AUTO-PASS items are now `[x]` executes zero commands for those items — verified by the report classifying them as `ALREADY-CHECKED` and by the absence of their commands in the Bash call log for the re-run. The re-run's wall-clock time is bounded by the cost of the items still `[ ]`, not the cost of the full Test plan.

## Assumptions

- The agent runs in the same git worktree as the PR under test — so `npm test`, `npm run lint`, etc. resolve to the scripts defined in that worktree's `package.json`. Cross-worktree or cross-repo analysis is out of scope.
- `gh` is authenticated in the session's environment (inherited from the parent Claude Code session). The agent does not handle auth setup.
- The caller passes either a PR number or the literal string `"current"` — matching the existing agent's input contract. No change to the invocation surface.
- The sub-agent executes commands in the worktree's working directory; Node/npm dependencies have already been installed (`npm install` is not part of the agent's contract). If dependencies are missing, the first automatable command will exit non-zero and be reported as `AUTO-FAIL` — acceptable behavior.
- The existing Claude Code session-level `.claude/settings.json` allowlist is a ceiling; this feature's agent-level `tools:` list narrows within that ceiling and does not widen it. If a required pattern is not in `settings.json`, that is a separate problem (tracked by the existing extend-the-allowlist-via-PR workflow in `docs/DEVELOPMENT.md`).
- The existing `pr-test-plan-checker` behavior (read-only, returns `READY`/`BLOCKED`) is *replaced*, not supplemented, by the new `pr-test-plan-runner` behavior. The rejected alternative — adding a sibling `pr-test-plan-runner` while keeping the existing `pr-test-plan-checker` read-only — is noted and declined in favor of a single entry point. The name `pr-test-plan-runner` is adopted because "checker" read-only connotation misrepresents the new behavior; keeping the old name would leave a misleading label for every future reader of `docs/DEVELOPMENT.md`.
- **No backwards-compatible alias for the old agent name.** Claude Code sub-agents are invoked by exact name (`@pr-test-plan-runner`); there is no alias mechanism. Existing muscle memory around `@pr-test-plan-checker` is acknowledged as a one-time migration cost — the `CLAUDE.md`, `docs/DEVELOPMENT.md`, and agent-definition updates in this feature are the single source of truth and callers learn the new name from there.
- The agent model remains `haiku`. Running commands and interpreting exit codes is a mechanical task; no semantic judgment of test output is required. If future work reveals that failure excerpts need summarization, the model choice can be revisited in a separate change.
- Command extraction uses a strict first-match heuristic (FR-004): the first backtick-wrapped chunk whose first token is on the allowlist. The rejected alternatives — lenient chunk-by-chunk search with regex substring matching, or opinionated mandatory suffix format (`— command: <cmd>`) — are noted and declined as too permissive and too intrusive respectively.
- The Test plan's checkbox-marker grammar is the existing one already enforced by the pre-rename read-only agent: `^\s*-\s+\[(\s|x|X)\]\s+(.+)$`. No new syntax is introduced.
- The agent's failure mode on `gh pr edit` errors is report-and-stop (no retry). The reasoning is that a failed write is a signal — stale PR, auth issue, network glitch — the developer should see and handle rather than have the agent paper over.
- **Audit comment posting is additive, not idempotent.** Each run posts a fresh PR comment. The rejected alternatives — editing the agent's previous comment in place, or suppressing the comment when status is unchanged — were declined in favor of "every run leaves a snapshot", which matches the PR body's checkbox audit trail and gives reviewers a readable history of how the agent's verdict evolved. Clutter is manageable via GitHub's "Hide" control on individual comments.
- **Re-invoking the agent is the supported fix-and-retry loop.** The agent's guarantee that it never un-ticks `[x]` items (FR-011), combined with its short-circuit of `[x]` items to `ALREADY-CHECKED` (US4 Acceptance 2), means re-runs are naturally incremental: only the items still `[ ]` are re-attempted. No separate "rerun-failures-only" mode is needed.
