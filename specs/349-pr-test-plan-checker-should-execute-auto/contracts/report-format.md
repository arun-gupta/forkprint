# Contract: Return value + audit-comment format

The agent emits two surfaces per run, both derived from the same in-memory `RunReport` (see data-model.md). This contract fixes the exact shape of each.

---

## 1. Return value (surfaced to the parent Claude session)

Markdown. Shown to the developer who invoked `@pr-test-plan-runner`.

```markdown
PR: #<N> (or "current branch")

**Verdict**: READY | BLOCKED
**Reason**: <one sentence>

Body edit: WRITTEN | SKIPPED | FAILED<if FAILED: `: <error>`>
Audit comment: POSTED | FAILED<if FAILED: `: <error>`>

**Per-item results** (<M> items):

- [AUTO-PASS] `<command>` — "<item_text>"
- [AUTO-FAIL] `<command>` — "<item_text>"
  <details>
  <summary>Failure excerpt</summary>

  ```
  <up to ~2000 chars, tail of combined stdout/stderr>
  ```
  </details>
- [MANUAL] "<item_text>" — reason: <manual_reason>
- [ALREADY-CHECKED] "<item_text>"
- [BLOCKED-MARKER] "<item_text>" — marker: "<char>"
```

### Rules

- If no checkboxes exist: emit exactly `**Verdict**: BLOCKED` / `**Reason**: "'## Test plan' section exists but contains no checkboxes"` and omit the per-item block.
- If the section isn't found: emit `**Verdict**: BLOCKED` / `**Reason**: no '## Test plan' section found` and omit everything after `**Reason**:`.
- `<command>` is the verbatim extracted command — no normalization.
- `<item_text>` is the checkbox's text payload (everything after `- [x] ` / `- [ ] `), verbatim.
- `<manual_reason>` is one of the five fixed strings in data-model.md.
- The `**Reason**:` line states the overall verdict reason:
  - READY: `"N of N checkboxes checked"`.
  - BLOCKED (unchecked items exist): `"K of N items still need attention"`.
  - BLOCKED (structural failure): `"<specific failure>"`.

---

## 2. Audit comment (posted to the PR via `gh pr comment`)

Same structure as the return value, but line 1 is the fixed disclaimer and the inviting closing line differs:

```markdown
> Automated report from pr-test-plan-runner — do not edit; re-run the agent to refresh.

**Verdict**: READY | BLOCKED — <one-line reason>

**Per-item results** (<M> items):

- **AUTO-PASS** — `<command>` — "<item_text>"
- **AUTO-FAIL** — `<command>` — "<item_text>"
  <details>
  <summary>Failure excerpt</summary>

  ```
  <up to ~2000 chars>
  ```
  </details>
- **MANUAL** — "<item_text>" — reason: <manual_reason>
- **ALREADY-CHECKED** — "<item_text>"
- **BLOCKED-MARKER** — "<item_text>" — marker: "<char>"

<if verdict == READY>
All automatable items passed. Remaining manual items are already ticked. A human may now merge per `CLAUDE.md`.
</if>

<if verdict == BLOCKED>
Items still need attention — see above. After addressing them, re-invoke `@pr-test-plan-runner` to refresh this comment.
</if>
```

### Rules

- **Line 1 is byte-identical across every run**: `> Automated report from pr-test-plan-runner — do not edit; re-run the agent to refresh.` This is the machine-readable marker for any future tooling that wants to identify the agent's comments.
- Blockquote (`>`) prefix on line 1 renders the disclaimer in a visual "meta" style on GitHub.
- The `<details>` collapsed section for AUTO-FAIL keeps long failure excerpts scannable.
- The per-item bullet uses bold classification labels (`**AUTO-PASS**` etc.) because GitHub's default Markdown rendering de-emphasizes `[AUTO-PASS]` bracketed prefix styling.
- The closing invitation line (READY or BLOCKED) is rendered based on the verdict.

---

## 3. Failure-excerpt bounding rule

For `AUTO-FAIL` items, the failure excerpt:

- Is the **tail** of the combined stdout/stderr — if the output is ≤ 2000 chars, include all of it; if longer, include the last 2000 chars only.
- Is enclosed in a fenced code block (` ``` ... ``` `) without language tag.
- Preserves the original output's newlines; does not HTML-escape.
- If output contains a literal ` ``` `, the agent uses a longer fence (e.g. ` ```` `) to avoid breaking the code block.

The ~2000 char cap is a rule of thumb — the agent may trim to a natural line boundary near that length. The bound exists to keep the audit comment readable; extremely long failures aren't useful pasted verbatim.

---

## 4. Idempotence note

Each run posts a **new** audit comment. Prior agent comments are never edited or deleted. Consequences the agent and the reader should understand:

- On a re-run where AUTO-FAIL items have been fixed, the PR accumulates two comments: the earlier BLOCKED snapshot and the new READY snapshot. Both are accurate historical records.
- If a reviewer finds clutter, they can use GitHub's "Hide → Outdated" UI to collapse stale comments. The agent does NOT automate this.
- The fixed line-1 disclaimer means future tooling could implement "hide previous runs on new run" without changing the agent.
