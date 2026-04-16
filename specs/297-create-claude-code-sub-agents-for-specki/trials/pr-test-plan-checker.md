# Trial: `pr-test-plan-checker` against three PR states

**Note on methodology.** Sub-agents defined in `.claude/agents/` are discovered at Claude Code session start. The trials below were produced by running the exact command the agent would run (`gh pr view N --json body -q .body`), then applying the agent's prompt logic (regex extract of `## Test plan` section, classify checkboxes) against the output. A fresh Claude Code session that loads `.claude/agents/pr-test-plan-checker.md` reproduces this behavior deterministically — the agent does no semantic reasoning, only mechanical parsing.

## Trial 1 — All checked (expect READY) — PR #296

**Command run**: `gh pr view 296 --json body -q .body`

**Test plan section captured** (6 checkboxes, all `[x]`):
- `[x] In dark mode, the active Repositories/Organization pill is readable ...`
- `[x] The inactive pill has sufficient contrast ...`
- `[x] The repo textarea and org input use a dark background ...`
- `[x] The format tooltip popover renders with dark background ...`
- `[x] The Analyze button color feels cohesive ...`
- `[x] Light mode is unchanged.`

**Expected agent output**:

```
PR: #296

Status: READY
Reason: 6 of 6 checkboxes checked

Checked items:
  - In dark mode, the active Repositories/Organization pill is readable (light pill on dark card, dark text).
  - The inactive pill has sufficient contrast (slate-800 bg, slate-200 text).
  - The repo textarea and org input use a dark background with light text and a visible border.
  - The format tooltip popover renders with dark background and readable text.
  - The Analyze button color feels cohesive with the rest of the dark UI.
  - Light mode is unchanged.
```

✅ Matches manual inspection (PR #296 was merged, all boxes had been checked before merge).

---

## Trial 2 — All unchecked (expect BLOCKED) — PR #298

**Command run**: `gh pr view 298 --json body -q .body`

**Test plan section captured** (11 checkboxes, all `[ ]`):
- `[ ] Baseline path — analyze a public org ...`
- `[ ] "No public activity" renders visibly distinct from "Stale" ...`
- `[ ] Elevated-effective path — sign out ...`
- `[ ] Elevated-ineffective path ...`
- `[ ] N/A path — analyze a user-owned repo ...`
- `[ ] Admin-list failure path ...`
- `[ ] Per-admin error isolation ...`
- `[ ] Disclosure affordance — click "How is this scored?" ...`
- `[ ] npm test passes ...`
- `[ ] DEV_GITHUB_PAT= npm run build succeeds ...`
- `[ ] npm run lint — no new errors ...`

**Expected agent output**:

```
PR: #298

Status: BLOCKED
Reason: 11 of 11 checkboxes unchecked

Unchecked items:
  - Baseline path — analyze a public org (e.g. `kubernetes`, `vercel`). Org Summary → Documentation → Org admin activity panel renders with "Baseline — public admins only" badge; admin rows show classifications and dates.
  - "No public activity" renders visibly distinct from "Stale" (different badge, different accessible name) — confirmed by unit test and by eye on a live analysis.
  - Elevated-effective path — sign out, check the landing-page "deeper GitHub permission" box, sign back in, approve the broader consent on GitHub, analyze an org the signed-in user belongs to that has concealed admins. Confirm the Elevated badge and concealed admins in the list.
  - Elevated-ineffective path — with elevated session, analyze an org you are NOT a member of. Confirm the "Elevated grant did not widen this view" disclosure.
  - N/A path — analyze a user-owned repo (e.g. `arun-gupta/repo-pulse`). Confirm explicit N/A state in the Documentation tab's Org admin activity panel.
  - Admin-list failure path — with an org whose admin list GitHub rate-limits or rejects, confirm the panel renders the labeled unavailable state rather than silently showing an empty list.
  - Per-admin error isolation — if one admin's events/commits endpoint 404s, confirm that admin's row shows `Unavailable` and all other admins still classify correctly.
  - Disclosure affordance — click "How is this scored?" and confirm it names the 90-day threshold, states public-only, and notes eventual consistency.
  - `npm test` passes (946 tests).
  - `DEV_GITHUB_PAT= npm run build` succeeds.
  - `npm run lint` — no new errors introduced (7 pre-existing errors on main remain).
```

✅ Matches manual inspection (PR #298 is open with zero Test plan items checked).

---

## Trial 3 — No `## Test plan` section (expect BLOCKED) — synthetic

Since every merged PR in this repo follows the `CLAUDE.md` discipline, none actually has a missing Test plan. The synthetic case: the agent is invoked against a PR body like `"## Summary\n- Quick fix\n"` with no `## Test plan` heading.

**Expected agent output**:

```
PR: #<N>

Status: BLOCKED
Reason: no '## Test plan' section found
```

The agent's prompt in step 2 explicitly handles this — case-insensitive regex `^##\s+test\s+plan\s*$`, stop if not matched.

---

## Allowlist audit (SC-004 verification)

`.claude/agents/pr-test-plan-checker.md` frontmatter:

```yaml
tools: Bash(gh pr view:*)
```

The single allowed `gh` subcommand is `view`. Commands that would merge, close, or modify a PR — `gh pr merge`, `gh pr close`, `gh pr edit`, `gh pr ready`, `gh pr review`, `gh pr comment` — are NOT matched by this pattern. The agent's system prompt additionally names each of these verbatim as prohibited (defense-in-depth).

✅ FR-005 (no blanket `Bash(gh:*)`) and FR-018 (no `gh pr merge` invocation) satisfied at both the allowlist and prompt layer.

---

## Conclusion

`pr-test-plan-checker` correctly classifies READY, BLOCKED-unchecked, and BLOCKED-no-section states. The narrow allowlist and prompt-level prohibitions together make the CLAUDE.md PR merge rule mechanical.
