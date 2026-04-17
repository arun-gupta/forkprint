# Phase 1 Data Model: Rename `pr-test-plan-checker` to `pr-test-plan-runner` and make it execute

## Context

This feature introduces no persistent data, no database schema, and no cross-process contracts. The agent is stateless — it reads the PR body once, processes checkbox items in memory, writes the updated body once, and returns. The "data model" here is the shape of the in-memory objects the agent manipulates during a single run, plus the rules that govern them.

All entities listed are conceptual — how the agent's prompt narrates its work. No TypeScript types ship with this feature (Claude Code sub-agents are prompts, not code).

---

## Entities

### `PRBody` (input & output)

The entire PR description, as returned by `gh pr view N --json body -q .body`.

| Field  | Type   | Notes                                                            |
|--------|--------|------------------------------------------------------------------|
| `text` | string | UTF-8 encoded Markdown. May contain zero or more `## ` headings. |

**Invariants**:
- The agent reads this string once at start of run.
- The agent writes an updated string once, at end of run, via `gh pr edit --body "$text"`.
- Bytes outside the `## Test plan` section (see `TestPlanSection.range` below) are byte-identical across the read/write boundary.

---

### `TestPlanSection`

The contiguous substring of `PRBody.text` that the agent is permitted to modify.

| Field          | Type    | Notes                                                                                                               |
|----------------|---------|---------------------------------------------------------------------------------------------------------------------|
| `heading_line` | string  | The raw line matching `^##\s+test\s+plan\s*$` (case-insensitive). First occurrence wins — duplicates are ignored.   |
| `start_offset` | integer | Byte offset in `PRBody.text` at which `heading_line` begins. Inclusive.                                             |
| `end_offset`   | integer | Byte offset at which the next `^##\s` heading begins, or `len(PRBody.text)` if no subsequent heading exists. Exclusive. |
| `body`         | string  | `PRBody.text[start_offset:end_offset]` — the section text including its heading line.                                 |

**Invariants**:
- If no heading matches the regex, the agent emits `BLOCKED — no "## Test plan" section found` and makes no edits.
- Only this slice is subject to modification. `PRBody.text[:start_offset]` and `PRBody.text[end_offset:]` must be returned byte-identical.

---

### `CheckboxItem`

A single line inside `TestPlanSection.body` that matches `^\s*-\s+\[(\s|x|X)\]\s+(.+)$`.

| Field            | Type                                   | Notes                                                                                                |
|------------------|----------------------------------------|------------------------------------------------------------------------------------------------------|
| `line_text`      | string                                 | Verbatim line (no trailing newline) — enables exact-match replacement later.                         |
| `marker_before`  | `" "` \| `"x"` \| `"X"` \| *other*     | Whichever character sits between `[` and `]`.                                                       |
| `text_payload`   | string                                 | Everything after `- [x] ` / `- [ ] ` on the line. Contains the human description and any backticks. |
| `is_checked`     | boolean                                | `true` if `marker_before` is `"x"` or `"X"`; `false` if `" "`; undefined if *other*.                |
| `is_nonstandard` | boolean                                | `true` if `marker_before` is not `" "`, `"x"`, `"X"` (e.g. `-`, `~`). Item becomes `BLOCKED-MARKER`. |

**Invariants**:
- The line must begin (after any leading whitespace) with `-`, a space, and `[`. Lines in the section that don't match are prose, not checkbox items, and are left untouched.
- An already-checked item (`is_checked == true`) is classified `ALREADY-CHECKED` immediately. No command is extracted. No command is run.
- A non-standard marker (`is_nonstandard == true`) is classified `BLOCKED-MARKER`. No command is extracted. No command is run.

---

### `ExtractedCommand`

The candidate command pulled from a `CheckboxItem.text_payload` for execution — or absent if no candidate matches the allowlist.

| Field                | Type    | Notes                                                                                                                                        |
|----------------------|---------|----------------------------------------------------------------------------------------------------------------------------------------------|
| `raw_chunk`          | string  | The first backtick-wrapped chunk whose first whitespace-delimited token matches an entry on the automatable allowlist. `null` if none.        |
| `first_token`        | string  | The first whitespace-delimited token of `raw_chunk`.                                                                                          |
| `full_command`       | string  | The entire `raw_chunk` string (agent executes this verbatim with `bash -c`, or equivalent).                                                  |
| `classification_hint`| enum    | `AUTOMATABLE` \| `E2E_EXCLUDED` \| `FORBIDDEN` \| `METACHAR_REJECTED` \| `NOT_ON_ALLOWLIST` — see decision rules below.                       |

**Decision rules** (applied in order; first match wins):

1. If `raw_chunk` contains any of `;`, `&&`, `||`, `|`, `>`, `<`, `$(`, backtick, `&` (as a standalone token) → `METACHAR_REJECTED` (FR-007).
2. If `first_token` + second token starts with one of: `gh pr merge`, `gh pr close`, `gh pr ready`, `gh pr review`, `gh pr comment`, `gh pr edit`, `rm`, `git reset`, `git push --force`, `git push -f`, `sudo`, `curl`, `wget`, `ssh` → `FORBIDDEN` (FR-008).
3. If `raw_chunk` starts with `npm run test:e2e` or `npx playwright` → `E2E_EXCLUDED` (FR-006).
4. If `raw_chunk` starts with any of the 9 automatable allowlist prefixes (`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:unit`, `npm run test:integration`, `npx vitest`, `npx eslint`, `npx tsc`) → `AUTOMATABLE`.
5. Otherwise → `NOT_ON_ALLOWLIST`.

If no backtick-wrapped chunk produces an `AUTOMATABLE` candidate, `raw_chunk` is `null` and classification hint reflects the first non-`AUTOMATABLE` hint encountered — so the MANUAL reason is specific ("E2E requires running dev server" beats generic "no automatable command extracted").

---

### `ItemResult`

One record per `CheckboxItem`, after processing.

| Field              | Type                                                                                    | Notes                                                           |
|--------------------|-----------------------------------------------------------------------------------------|-----------------------------------------------------------------|
| `item_text`        | string                                                                                  | From `CheckboxItem.text_payload`. Echoed in the report.         |
| `marker_before`    | `" "` \| `"x"` \| *non-standard*                                                         | Captured at start of run.                                       |
| `marker_after`     | `" "` \| `"x"`                                                                           | After the agent decides whether to toggle.                      |
| `classification`   | `AUTO-PASS` \| `AUTO-FAIL` \| `MANUAL` \| `ALREADY-CHECKED` \| `BLOCKED-MARKER`          | FR-014.                                                         |
| `command`          | string \| `null`                                                                        | The command that was (or would have been) executed.             |
| `exit_code`        | integer \| `null`                                                                        | `null` for non-AUTO classifications.                            |
| `failure_excerpt`  | string \| `null`                                                                        | For AUTO-FAIL only. Tail-biased, capped ~2000 chars. FR-015.     |
| `manual_reason`    | enum string \| `null`                                                                   | For MANUAL only. See below.                                      |

**MANUAL reason values** (fixed strings; FR-016):
- `"no backtick-wrapped command found"`
- `"command not on automatable allowlist"`
- `"E2E requires running dev server"`
- `"shell metacharacters not supported"`
- `"command is on the forbidden list"`

**Invariants**:
- `marker_before == "x"` → `classification == ALREADY-CHECKED`, `marker_after == "x"`, no command, no exit code.
- `classification == AUTO-PASS` → `marker_after == "x"` AND `exit_code == 0` AND `command != null`.
- `classification == AUTO-FAIL` → `marker_after == " "` AND `exit_code != 0` AND `command != null` AND `failure_excerpt != null`.
- `classification == MANUAL` → `marker_after == " "` AND `command == null` AND `manual_reason != null`.
- `classification == BLOCKED-MARKER` → `marker_after == marker_before` (non-standard marker preserved) AND no edit is made to the line.
- FR-011: `marker_after` is never `" "` when `marker_before` was `"x"`. Human ticks survive.

---

### `RunReport`

The aggregate returned by the agent to its caller AND posted (in human-readable form) as the audit comment.

| Field            | Type                             | Notes                                                                                             |
|------------------|----------------------------------|---------------------------------------------------------------------------------------------------|
| `pr_number`      | integer \| `"current branch"`    | Echoed back for logs.                                                                             |
| `verdict`        | `READY` \| `BLOCKED`             | `READY` iff every `CheckboxItem.marker_after == "x"`.                                              |
| `verdict_reason` | string                           | One-line summary — counts or structural error.                                                    |
| `items`          | `ItemResult[]`                   | One per checkbox, in source order.                                                                |
| `body_edit`      | `WRITTEN` \| `SKIPPED` \| `FAILED` | `WRITTEN` if any `[ ]` toggled to `[x]` and `gh pr edit` succeeded; `SKIPPED` if nothing changed; `FAILED` if `gh pr edit` returned non-zero. |
| `comment_post`   | `POSTED` \| `FAILED`             | Whether the audit comment was successfully created via `gh pr comment`.                            |

**Invariants**:
- If `body_edit == FAILED`, verdict MUST be `BLOCKED` and `verdict_reason` includes `"failed to write updated body: <error>"`.
- If `comment_post == FAILED`, verdict MUST be `BLOCKED` and `verdict_reason` includes `"failed to post audit comment: <error>"`.
- `body_edit == FAILED` does NOT roll back already-computed `ItemResult`s. Per-item results are still reported. The audit comment is still attempted (per spec edge case).

---

### `AuditComment`

The Markdown document the agent posts via `gh pr comment`.

| Field        | Type    | Notes                                                                                     |
|--------------|---------|-------------------------------------------------------------------------------------------|
| `disclaimer` | string  | Literal: `> Automated report from pr-test-plan-runner — do not edit; re-run the agent to refresh.` |
| `verdict`    | string  | `**Verdict**: READY — N of N checkboxes checked` or similar, one line.                      |
| `items_block`| string  | Markdown bullet list, one bullet per `ItemResult`. See research.md §R-003 for format.      |

**Invariants**:
- `disclaimer` is byte-identical across every run. Future tooling can exact-match on line 1 to recognize the agent's comments.
- The comment is posted via `gh pr comment [N] --body "$rendered"`. If that call fails, the `RunReport.comment_post` is `FAILED` and the error is surfaced to the caller.

---

## State transitions

Per-item state machine:

```
(start)
  │
  ▼
[CheckboxItem parsed]
  │
  ├── marker_before == "x"  ──► ALREADY-CHECKED  (marker_after = "x")
  │
  ├── marker_before is non-standard  ──► BLOCKED-MARKER  (marker_after = marker_before)
  │
  ├── marker_before == " ":
  │     │
  │     ▼
  │   [ExtractedCommand scanned]
  │     │
  │     ├── raw_chunk == null  ──► MANUAL  (reason = "no backtick-wrapped command found")
  │     ├── METACHAR_REJECTED  ──► MANUAL  (reason = "shell metacharacters not supported")
  │     ├── FORBIDDEN           ──► MANUAL  (reason = "command is on the forbidden list")
  │     ├── E2E_EXCLUDED        ──► MANUAL  (reason = "E2E requires running dev server")
  │     ├── NOT_ON_ALLOWLIST    ──► MANUAL  (reason = "command not on automatable allowlist")
  │     └── AUTOMATABLE:
  │           │
  │           ▼
  │         [Run command]
  │           │
  │           ├── exit_code == 0  ──► AUTO-PASS  (marker_after = "x")
  │           └── exit_code != 0  ──► AUTO-FAIL  (marker_after = " ", failure_excerpt captured)
  │
  ▼
(classified; emit ItemResult)
```

Aggregate state machine (after all items processed):

```
[All ItemResults collected]
  │
  ▼
[Assemble body_after]
  │
  ▼
[Any toggles?]
  ├── Yes → `gh pr edit --body "$body_after"`
  │         ├── success → body_edit = WRITTEN
  │         └── fail    → body_edit = FAILED  (verdict forced to BLOCKED; items still reported)
  └── No  → body_edit = SKIPPED
  │
  ▼
[Render AuditComment]
  │
  ▼
`gh pr comment [N] --body "$rendered"`
  ├── success → comment_post = POSTED
  └── fail    → comment_post = FAILED  (verdict forced to BLOCKED)
  │
  ▼
[Return RunReport to caller]
```

---

## Notes

- No persistent storage. No migration. No fixtures to seed.
- The `ItemResult` and `RunReport` shapes shown here are conceptual — the agent emits them as a structured Markdown report, not a JSON payload. The shape is the contract the prompt enforces.
- No schema validation is performed by the agent; correctness is guaranteed by the prompt's explicit step-by-step instructions (see `contracts/agent-prompt.md`).
