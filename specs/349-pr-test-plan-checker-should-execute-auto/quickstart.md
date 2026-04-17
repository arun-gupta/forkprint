# Quickstart: Validating `pr-test-plan-runner` end-to-end

This is the manual-validation walkthrough used by the PR Test plan for this feature. It exercises every spec requirement on a live PR.

## Prerequisites

- Feature branch checked out: `349-pr-test-plan-checker-should-execute-auto`.
- `npm install` already run in the worktree.
- `gh` authenticated with write access to `arun-gupta/repo-pulse`.
- The feature has been implemented: `.claude/agents/pr-test-plan-runner.md` exists, `.claude/agents/pr-test-plan-checker.md` does not, `docs/DEVELOPMENT.md` reflects the rename.
- A PR exists for this feature (will be created during implementation).

## Validation items

Each item below corresponds to a spec requirement. Perform them in order on the PR for this feature. Each item becomes one checkbox in the PR's `## Test plan`.

### V-01: Agent loads under the new name

**Requirement coverage**: FR-022.

Invoke `@pr-test-plan-runner <this PR>` and confirm the agent responds. Confirm `@pr-test-plan-checker` returns "agent not found" or similar — the old name is retired.

**Expected**: New name works; old name does not.

### V-02: AUTO-PASS toggles a `[ ]` to `[x]`

**Requirement coverage**: FR-004, FR-005, FR-009, FR-012, FR-013.

Add a Test plan checkbox: `` - [ ] Unit tests pass — `npm test` ``. Invoke the agent. Confirm:
- The PR body now shows that item as `- [x] Unit tests pass — `` `npm test` ``.
- The agent's return value lists the item as `AUTO-PASS` with command `npm test`.
- The agent's audit comment has `**AUTO-PASS** — ``npm test`` — "Unit tests pass — …"`.
- Everything else in the PR body is byte-identical (use `git diff` equivalent via `gh pr view --json body`).

### V-03: AUTO-FAIL leaves the box `[ ]` and captures failure excerpt

**Requirement coverage**: FR-010, FR-015.

Add a Test plan checkbox referencing a command that will exit non-zero (e.g. `` - [ ] Synthetic fail — `npm run nonexistent-script` ``; since `nonexistent-script` isn't in `package.json`, `npm run` exits non-zero). Invoke the agent.

**Expected**:
- The box is still `- [ ]`.
- Return value classifies `AUTO-FAIL` with a bounded failure excerpt.
- Audit comment shows `<details>` block with the tail of stderr.

### V-04: MANUAL — prose-only item left unticked

**Requirement coverage**: FR-016.

Add a Test plan item: `- [ ] Verify the scorecard renders for kubernetes/kubernetes in the running app`. Invoke the agent.

**Expected**:
- Box stays `[ ]`.
- Return value classifies `MANUAL` with reason `"no backtick-wrapped command found"`.

### V-05: MANUAL — E2E excluded from allowlist

**Requirement coverage**: FR-006.

Add a Test plan item: `` - [ ] E2E check — `npm run test:e2e` ``. Invoke the agent.

**Expected**:
- Box stays `[ ]`.
- Classification `MANUAL` with reason `"E2E requires running dev server"`.
- `npm run test:e2e` is NOT executed (verified by the absence of dev-server spin-up in the logs).

### V-06: MANUAL — forbidden command (the `gh pr merge` guard)

**Requirement coverage**: FR-008, User Story 2.

Add a Test plan item: `` - [ ] Final gate — `gh pr merge --squash` ``. Invoke the agent.

**Expected**:
- Box stays `[ ]`.
- Classification `MANUAL` with reason `"command is on the forbidden list"`.
- `gh pr merge` is NOT executed — verified by the PR still being open after the run.

### V-07: MANUAL — shell metacharacters rejected

**Requirement coverage**: FR-007.

Add a Test plan item: `` - [ ] Chained — `npm test && npm run lint` ``. Invoke the agent.

**Expected**:
- Box stays `[ ]`.
- Classification `MANUAL` with reason `"shell metacharacters not supported"`.

### V-08: Existing `[x]` preserved (FR-011)

**Requirement coverage**: FR-011.

Pre-tick a Test plan item manually: `- [x] Human-confirmed — already verified`. Invoke the agent.

**Expected**:
- Item stays `[x]`.
- Classification `ALREADY-CHECKED`.
- No command executed for it.

### V-09: Fix-and-retry is incremental

**Requirement coverage**: User Story 1 Acceptance Scenario 6, SC-008.

After V-03 leaves an `AUTO-FAIL` item unticked, fix the underlying command (swap it to a passing command or add the missing npm script), then re-invoke the agent.

**Expected**:
- Previously `AUTO-PASS` items (now `[x]`) are reported as `ALREADY-CHECKED` — no commands re-run for them.
- The newly-fixed item becomes `AUTO-PASS` on this run.
- Re-run is noticeably faster than the first run (since unit tests don't re-execute).

### V-10: PR body outside Test plan is byte-identical

**Requirement coverage**: FR-013, User Story 3, SC-005.

Before invoking the agent, capture the PR body:
```bash
gh pr view --json body -q .body > /tmp/body_before.md
```

After an invocation that makes at least one toggle:
```bash
gh pr view --json body -q .body > /tmp/body_after.md
diff /tmp/body_before.md /tmp/body_after.md
```

**Expected**: the only lines that differ are inside the `## Test plan` section, and each diff is a single-character change (`[ ]` → `[x]`).

### V-11: Audit comment is posted with the fixed disclaimer

**Requirement coverage**: FR-018.

After any invocation:
```bash
gh pr view --json comments -q '.comments[-1].body' | head -1
```

**Expected**: the first line is literally `> Automated report from pr-test-plan-runner — do not edit; re-run the agent to refresh.`

### V-12: Re-runs append, don't replace, audit comments

**Requirement coverage**: FR-018.

Invoke the agent twice. Confirm the PR now has two agent-generated comments (use the GitHub UI or `gh pr view --json comments`).

**Expected**: both comments remain; neither was edited or deleted.

### V-13: Tool allowlist is exactly the contracted patterns

**Requirement coverage**: FR-019, SC-007.

Inspect `.claude/agents/pr-test-plan-runner.md` frontmatter.

**Expected**: `tools:` line lists exactly the 12 patterns in `contracts/agent-frontmatter.md` and nothing else. `Bash(gh pr merge:*)` and `Bash(*)` are absent.

### V-14: `docs/DEVELOPMENT.md` is updated

**Requirement coverage**: FR-021.

Inspect the "Workflow sub-agents" table row for the agent.

**Expected**: Agent name reads `pr-test-plan-runner`, invocation text references the new name, and the "PR merge discipline" paragraph below describes the expanded tool surface while restating the `gh pr merge` prohibition.

### V-15: Overall verdict is `READY` when all checkboxes end `[x]`

**Requirement coverage**: FR-017, SC-001.

After enough invocations / manual ticks to drive every checkbox to `[x]`, run the agent once more.

**Expected**: return value's top-line verdict is `**Verdict**: READY`, and the audit comment's verdict line matches.

---

## How this maps to the PR Test plan

Every V-xx above becomes one checkbox in the PR's `## Test plan` section. The automatable items (V-02, V-03, V-09, V-11, V-12, V-15) can be ticked by the agent itself on a re-run; the manual items (V-04, V-05, V-06, V-07, V-08, V-10, V-13, V-14) are ticked by the human reviewer after confirming observationally.

V-01 is special: it is validated once by the developer (invoking the agent and observing it loads under the new name) before any subsequent items can run.
