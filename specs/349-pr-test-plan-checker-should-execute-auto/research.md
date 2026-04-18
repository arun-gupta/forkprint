# Phase 0 Research: Rename `pr-test-plan-checker` to `pr-test-plan-runner` and make it execute

## Summary

Two open implementation questions from the spec needed resolution before Phase 1 design. Both resolved below.

---

## R-001: Claude Code Bash permission syntax for patterns containing a colon in the prefix

**Context**: FR-019 demands narrow allowlist patterns that include `npm run test:unit` and `npm run test:integration` but explicitly NOT `npm run test:e2e`. The spec originally used backslash-escape syntax (`Bash(npm run test\:unit:*)`), which was flagged by the spec-reviewer as needing empirical confirmation.

**Decision**: Use unescaped literal colons: `Bash(npm run test:unit:*)`, `Bash(npm run test:integration:*)`.

**Rationale**: Per the official Claude Code permissions docs (https://code.claude.com/docs/en/permissions.md):

> The `:*` suffix is an equivalent way to write a trailing wildcard, so `Bash(ls:*)` matches the same commands as `Bash(ls *)`. The `:*` form is only recognized at the end of a pattern. In a pattern like `Bash(git:* push)`, the colon is treated as a literal character and won't match git commands.

Because `:*` is recognized only at the end of the pattern, intra-prefix colons are literal and need no escaping. The same syntax applies to both session-level `.claude/settings.json` (JSON string array) and sub-agent `tools:` YAML frontmatter (space-and-comma-separated).

**Alternatives considered**:
- `Bash(npm run test\:unit:*)` with backslash escape — rejected: not recognized by the parser, would fail silently or match nothing.
- Broader `Bash(npm run test:*)` — rejected: widens to `npm run test:e2e`, violating FR-006 (E2E must be MANUAL) and SC-007 (allowlist cap).
- Split into per-script lookup (e.g. read `package.json` and generate patterns dynamically) — rejected: YAGNI. The two scripts are enumerated in the spec; a dynamic layer is future work.

**Spec reconciliation**: FR-019 text updated (2026-04-17) to remove the incorrect backslash escape and add a docs citation. No change to the set of 11 patterns; no change to SC-007's cap.

---

## R-002: Strategy for toggling `[ ]` → `[x]` inside the Test plan section without mutating anything else

**Context**: FR-013 requires the edited PR body to be byte-identical outside `## Test plan`. Inside the section, only the `[ ]` / `[x]` marker on toggled lines may change. Two implementation strategies exist.

**Decision**: **Line-oriented, section-scoped replacement.** Split the PR body into three byte-exact regions: `[prefix, Test plan heading)`, `[Test plan heading, next H2 or EOF)`, and `[next H2 or EOF, EOF)`. Apply per-line `[ ]` → `[x]` replacements only to the middle region, for lines whose checkbox text corresponds to AUTO-PASS items. Rejoin the three regions verbatim.

**Rationale**:
- Byte-exact slicing guarantees the outer regions are untouched — FR-013's strongest invariant.
- Line-level replacement inside the section is simple and deterministic: the agent knows the verbatim line content (captured in Phase 1 data-model under `Checkbox item`) and can do an exact string match + single-character substitution.
- The `- [ ]` → `- [x]` transformation changes exactly one character per toggled line, preserving indentation, leading hyphen spacing, trailing text, and everything else.
- No Markdown parser is needed. Markdown parsing + re-rendering would risk reflow artifacts (e.g. re-wrapping long lines, normalizing list markers), violating FR-013.

**Alternatives considered**:
- **Full Markdown AST round-trip**: parse the body with a library (e.g. `remark`), modify the AST, re-serialize. Rejected — adds a dependency, risks formatting drift, and solves a problem we don't have (we only change one character per line).
- **Regex substitution on the whole body**: `s/^- \[ \] Unit tests pass — .../- [x] .../`. Rejected — bug-prone when the same text appears outside the Test plan section (e.g. quoted in a `## Summary` paragraph). Section-scoping is the safer contract.
- **Find-by-line-number**: capture the absolute line number of each checkbox during parsing, then splice. Rejected — more fragile than text match; if the PR body is fetched once and edited once (no intervening writes), exact-text match is sufficient and more readable.

**Implementation note for the agent prompt**: the prompt will instruct the agent to:
1. Fetch body → `body_before` (single `gh pr view` call).
2. Split into `prefix`, `section`, `suffix` using the Test plan heading regex.
3. Parse checkboxes in `section`, capturing each line's verbatim content.
4. For each AUTO-PASS, replace the literal `- [ ]` with `- [x]` in a NEW section string, preserving all other bytes.
5. Reassemble `body_after = prefix + section_new + suffix` and write via `gh pr edit --body "$body_after"`.

---

## R-003: Audit-comment formatting — exact disclaimer line and body structure

**Context**: FR-018 requires the audit comment's first line to be a fixed disclaimer. The spec's illustrative example is `> Automated report from pr-test-plan-runner — do not edit; re-run the agent to refresh.` Needed to confirm whether this exact string is the contract or a sample.

**Decision**: Treat the disclaimer as a **fixed string** — the exact line is contract, not sample. The agent posts this line verbatim as line 1 of every audit comment.

**Rationale**:
- Fixed text lets a future automated tool (CI, another sub-agent) recognize the agent's comments via an exact-match first line.
- Markdown blockquote (`>`) prefix signals "this is meta/disclaimer" visually.
- The "do not edit; re-run the agent to refresh" phrasing matches the spec's Assumption entry that the agent never edits its previous comments — if a human edits the comment, they get stale content and are told explicitly what to do instead.

**Comment body structure** (lines 2+):
```
> Automated report from pr-test-plan-runner — do not edit; re-run the agent to refresh.

**Verdict**: READY | BLOCKED — <one-line reason>

**Per-item results**:

- **AUTO-PASS** — `npm test` — item: "Unit tests pass — `npm test`"
- **AUTO-FAIL** — `npm run lint` — item: "Lint is clean — `npm run lint`"
  <details><summary>Failure excerpt</summary>

  ```
  <up to ~2000 chars of stdout/stderr tail>
  ```
  </details>
- **MANUAL** — item: "Verify scorecard renders for `kubernetes/kubernetes`" — reason: no automatable command extracted
- **ALREADY-CHECKED** — item: "Human-confirmed item already ticked before run"
```

**Alternatives considered**:
- Plain-text report without Markdown affordances — rejected: failure excerpts benefit from `<details>` collapsibility on GitHub, which keeps the comment scannable when several tests fail.
- JSON payload inside a fenced block — rejected: humans are the primary reader; JSON is awkward. The return-value of the sub-agent already serves the machine-readable role.

---

## R-004: Forbidden-command enforcement layering

**Context**: FR-008 lists commands that MUST NOT run when extracted from a Test plan item. FR-019 separately narrows the `tools:` allowlist. These are different enforcement layers.

**Decision**: **Enforce at both layers.** The `tools:` allowlist (FR-019) is the primary defense — the agent's environment simply will not execute anything outside the 11 patterns. The FR-008 forbidden list is a secondary defense implemented in the agent's prompt as an explicit reject step during extraction.

**Rationale**: Defense in depth.
- The `tools:` layer catches the case where the agent tries to execute a command the spec did not anticipate. Anything not in the allowlist fails with a permission error. This alone is enough to prevent `gh pr merge`, `rm`, `sudo`, etc. from running, because they don't match any of the 11 patterns.
- The FR-008 prompt-level check ensures the agent produces a **clear, early classification** (`MANUAL — command is on the forbidden list`) instead of attempting execution and reporting a permission error. Better UX.
- The FR-008 check also covers commands that *would* be on the `npm` / `npx` allowlist but are categorically forbidden regardless — future additions to the allowlist don't accidentally enable risky subcommands.

**Alternatives considered**:
- Rely on `tools:` allowlist alone — rejected: per-item classification loses fidelity (forbidden extracted commands show up as "permission error" rather than "forbidden"), and future allowlist changes risk accidental exposure.
- Enforce only in the prompt — rejected: prompt-level rules can be circumvented by prompt injection; `tools:` is a hard environmental ceiling.

---

## R-005: Naming — should `pr-test-plan-runner` be called something else?

**Context**: User raised this question before spec approval. Considered `runner`, `executor`, `auditor`, drop-the-suffix `pr-test-plan`.

**Decision**: `pr-test-plan-runner`. Settled in the spec; this is the reference record.

**Rationale**: "Runner" maps cleanly to the primary verb ("runs the Test plan"). Ticking and audit-comment posting are how the runner records what it did — downstream of the core action. "Auditor" emphasizes recording but obscures execution. "Executor" is a synonym for runner that carries execution-context baggage (task runner, thread executor). Dropping the suffix (`pr-test-plan`) is too terse.

---

## R-006: Should the agent try to delete its previous comments on re-run?

**Context**: Spec decided "post fresh each run, never edit or delete." Research validates the decision has no hidden cost.

**Decision**: Fresh comment per run. Confirmed.

**Rationale**:
- `gh pr comment` can only create comments; there's no `gh pr comment --edit` subcommand. Editing would require `gh api` with PATCH on the issue-comment REST endpoint — adds a new tool-allowlist pattern and non-trivial complexity.
- GitHub UI already lets reviewers hide obsolete comments ("Hide → Outdated"), so the clutter problem is solvable by humans with zero agent complexity.
- Audit-trail semantics are clearer: each comment is an immutable snapshot of a specific run.

**Alternatives considered**: all rejected per spec.

---

## Open questions

None. All spec `[NEEDS CLARIFICATION]` markers were resolved before spec approval; all Phase 0 research items above are resolved.
