# Contract: Agent frontmatter (`.claude/agents/pr-test-plan-runner.md` — top of file)

The YAML frontmatter below is the contract. The implementation must produce these exact fields in this order. Deviations violate FR-019, FR-022, and SC-007.

```yaml
---
name: pr-test-plan-runner
description: Use this agent when a PR is ready to have its Test plan validated — executes automatable commands from `## Test plan` checkboxes (unit tests, lint, typecheck, build, focused vitest/eslint/tsc runs), ticks the matching `[ ]` → `[x]` via `gh pr edit`, posts a fresh PR comment with a machine-generated audit report, and returns a per-item AUTO-PASS / AUTO-FAIL / MANUAL / ALREADY-CHECKED breakdown plus an overall READY / BLOCKED verdict. Encodes the CLAUDE.md PR merge rule — this agent NEVER runs `gh pr merge`.
tools: Bash(gh pr view:*), Bash(gh pr edit:*), Bash(gh pr comment:*), Bash(npm test:*), Bash(npm run lint:*), Bash(npm run typecheck:*), Bash(npm run build:*), Bash(npm run test:unit:*), Bash(npm run test:integration:*), Bash(npx vitest:*), Bash(npx eslint:*), Bash(npx tsc:*)
model: haiku
color: red
---
```

## Field-by-field contract

### `name`
- **Value**: `pr-test-plan-runner` (exactly this string).
- **Rationale**: FR-022 rename. Old value `pr-test-plan-checker` is retired.
- **Invariant**: File path basename matches (`.claude/agents/pr-test-plan-runner.md`).

### `description`
- **Shape**: one paragraph, ≤ 500 chars recommended.
- **Must include**: (a) when to invoke, (b) what the agent does (run + tick + comment + report), (c) the CLAUDE.md PR merge rule reaffirmation ("NEVER runs `gh pr merge`").
- **Must NOT include**: "verify" / "check" / "read-only" framing — those words describe the pre-rename agent and would be misleading.

### `tools` — allowlist (FR-019, SC-007)

Exactly **12 entries** (3 mutating `gh` + 9 automatable command prefixes). Each must appear verbatim:

| # | Pattern                               | Purpose                                                      |
|---|---------------------------------------|--------------------------------------------------------------|
| 1 | `Bash(gh pr view:*)`                  | Fetch PR body (reads only `--json body -q .body`)            |
| 2 | `Bash(gh pr edit:*)`                  | Write updated body after toggling checkboxes                 |
| 3 | `Bash(gh pr comment:*)`               | Post the audit-comment per run                               |
| 4 | `Bash(npm test:*)`                    | Run default test target                                      |
| 5 | `Bash(npm run lint:*)`                | Run the `lint` script                                        |
| 6 | `Bash(npm run typecheck:*)`           | Run the `typecheck` script                                   |
| 7 | `Bash(npm run build:*)`               | Run the `build` script                                       |
| 8 | `Bash(npm run test:unit:*)`           | Run the `test:unit` script (literal colon — no escape)       |
| 9 | `Bash(npm run test:integration:*)`    | Run the `test:integration` script (literal colon — no escape) |
| 10 | `Bash(npx vitest:*)`                 | Direct vitest invocation for focused runs                    |
| 11 | `Bash(npx eslint:*)`                 | Direct eslint invocation for focused runs                    |
| 12 | `Bash(npx tsc:*)`                    | Direct TypeScript compile checks                             |

**Correction to the spec's count**: the spec's SC-007 says "no more than 11 patterns (9 automatable + `gh pr edit` + `gh pr comment`)". The actual count is **12** because `gh pr view` is also required (and was already present in the pre-rename agent). The intent of SC-007 — "no blanket wildcards, growth bounded" — is preserved. This contract treats `gh pr view` as a pre-existing entry that does not count against the growth budget; the net growth from pre-rename (1 entry) to post-rename (12 entries) is 11 new entries, which matches SC-007's budget.

**Forbidden from the allowlist (FR-019, FR-008)**:
- `Bash(*)` — blanket wildcard
- `Bash(gh:*)` — would cover `gh pr merge`, `gh pr close`, etc.
- `Bash(npm:*)` — would cover unbounded `npm run *` and `npm install` etc.
- `Bash(npx:*)` — would cover `npx playwright` and unbounded tools.
- `Bash(gh pr merge:*)`, `Bash(gh pr close:*)`, `Bash(gh pr ready:*)`, `Bash(gh pr review:*)` — CLAUDE.md PR merge rule.
- `Bash(npm run test:*)` — would widen `test:unit` / `test:integration` to include `test:e2e`, which the spec forbids.
- `Bash(rm:*)`, `Bash(sudo:*)`, `Bash(curl:*)`, `Bash(wget:*)`, `Bash(ssh:*)` — destructive/network.

### `model`
- **Value**: `haiku`.
- **Rationale**: The agent performs mechanical text manipulation and exit-code reading. No semantic judgment of test output is needed (FR-010 uses exit code alone as pass/fail signal). Escalating the model is unnecessary and more expensive.

### `color`
- **Value**: `red`.
- **Rationale**: Consistency with pre-rename file. No functional effect; UI-only.

## YAML serialization rules

- Keep the order: `name`, `description`, `tools`, `model`, `color`. This matches existing sibling agents (`spec-reviewer`, `dod-verifier`, pre-rename `pr-test-plan-checker`) and makes diffing easier.
- `tools:` is a single line, comma-and-space separated. Do NOT use YAML block-sequence form (`-` bullets) unless a future Claude Code docs change requires it.
- No trailing whitespace on any line.
- Close with `---` on its own line, followed by a blank line before the prose begins.
