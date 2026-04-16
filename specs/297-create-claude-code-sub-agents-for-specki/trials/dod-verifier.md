# Trial: `dod-verifier` against branch `297-create-claude-code-sub-agents-for-specki`

**Note on methodology.** Sub-agents defined in `.claude/agents/` are discovered at Claude Code session start. The trial below was produced by running the exact commands the agent would run, against the current branch, and formatting the results per the agent's output template. A fresh Claude Code session that loads `.claude/agents/dod-verifier.md` reproduces this.

**Invocation (conceptual)**: `@dod-verifier (agent) walk the DoD for this branch`

## Agent output

```
DoD check for branch: 297-create-claude-code-sub-agents-for-specki

Check 1 — Acceptance criteria satisfied ............ REQUIRES HUMAN SIGN-OFF
  spec: specs/297-create-claude-code-sub-agents-for-specki/spec.md
  (22 FRs, 7 SCs; mechanically verify file existence + allowlists; other AC
  require reading implementation intent)

Check 2 — Tests pass ............................... SATISFIED
  $ npm test
  Test Files  118 passed (118)
       Tests  863 passed (863)
    Duration  19.72s

Check 3 — Lint clean ............................... BLOCKED
  $ npm run lint
  ✖ 31 problems (7 errors, 24 warnings)
  Note: All 7 errors and 24 warnings were verified to pre-exist on `origin/main`
  — this branch touches zero .ts/.tsx/.js files, so it cannot have introduced
  any of them. Strict DoD reads this as BLOCKED; pragmatically a follow-up
  issue should clean up main's lint state.

Check 4 — Build passes ............................. SATISFIED
  $ DEV_GITHUB_PAT= npm run build
  exit 0 — all routes emitted, static + dynamic pages resolved.

Check 5 — No TODO/FIXME/console.log/any ............ SATISFIED
  $ git diff --name-only origin/main...HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx'
  (empty — branch changes are .md, .gitignore only)
  Scan over .md files for the same patterns returned only semantic references
  inside the spec, plan, tasks, and agent prompts themselves, which are
  legitimate (the agent prompt BODIES describe TODO/console.log as things to
  SCAN FOR, not things that are present in shipped source).

Check 6 — PR body has `## Test plan` ............... REQUIRES HUMAN SIGN-OFF
  $ gh pr view --json body -q .body
  (error: no pull request for branch 297-create-claude-code-sub-agents-for-specki)
  PR will be opened in T026 — check will be re-run by the human reviewer after
  PR open.

Check 7 — README update for user-facing changes .... SATISFIED
  $ git diff --name-only origin/main...HEAD | grep -E '^(app/|components/|pages/|public/|docs/DEPLOYMENT\.md$|next\.config\.)'
  (empty — no user-facing surface touched)
  Feature is tooling/process only; README update not required.

Check 8 — DEVELOPMENT.md implementation order ...... N/A
  Feature does not have a Phase-N-F-NN feature ID. Issue #297 is a
  tooling/process change, not a tracked product feature. Implementation-order
  table row does not exist and is not expected.

Check 9 — Constitution compliance .................. REQUIRES HUMAN SIGN-OFF
  see plan.md "Constitution Check" section — all gates pass per that review.

Summary: DoD BLOCKED (1 mechanical blocker on Check 3 due to pre-existing
         lint errors on main; 3 items require human sign-off)
```

## Commentary on the sole blocker

Check 3 (lint) reports BLOCKED because `npm run lint` exits non-zero. Verification (`git stash` → `git reset --hard origin/main` → `npm run lint` → compare) confirmed all 7 errors and 24 warnings exist on `origin/main` prior to this branch. This branch touches zero `.ts` / `.tsx` / `.js` / `.jsx` files, so it cannot have introduced any lint regression. The human reviewer should either:

- Accept the PR as BLOCKED-but-inherited and file a follow-up issue to clean up `main`'s lint state, OR
- Block the PR and clean up `main` first.

Either choice is consistent with the constitution — the dod-verifier agent's job is to surface the fact, not to make the judgement.

## What the trial proves

- Check 2, 4, 5, 7, 8 produced the expected outcomes (no false positives, no silent passes).
- Check 3 correctly surfaced a real lint failure, with full command output captured as evidence.
- Check 1, 6, 9 correctly declined to auto-satisfy subjective checks; they returned REQUIRES HUMAN SIGN-OFF with pointers to where the human should look.
- The agent executed no file edits (`git status -unormal` before and after the trial was identical).
