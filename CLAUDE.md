## Claude's Role
Read `.specify/memory/constitution.md` first. It is the authoritative source of truth for this project. Everything in it is non-negotiable.

## Feature Selection Order
When starting new feature work, follow this order exactly:

1. Read `docs/DEVELOPMENT.md` first to identify the next feature to implement from the current implementation order.
2. Read `docs/PRODUCT.md` next to find the canonical product definition, acceptance criteria, and out-of-scope boundaries for that feature.
3. Then run the SpecKit lifecycle in order:
   - `/speckit.specify`
   - **Pause for spec review (mandatory).** After `/speckit.specify` completes, report the generated spec file path and stop. Do not proceed to `/speckit.plan` until the user replies with an explicit approval phrase: `"proceed"`, `"approved"`, or `"go to plan"`. If the user replies with revisions instead, apply them, re-report the spec path, and re-enter the paused state. Rationale: human-in-the-loop at the highest-leverage artifact — the spec encodes intent, scope, and acceptance, and must be validated before autonomous downstream work compounds on top of it.
   - `/speckit.plan`
   - `/speckit.tasks`
   - `/speckit.implement`

## SpecKit Commands
Command definitions are available in `.claude/commands/`.

- `/speckit.specify` — generate spec
- `/speckit.plan` — generate plan
- `/speckit.tasks` — generate task list
- `/speckit.implement` — execute plan

## Technology Stack & Development Workflow
See `docs/DEVELOPMENT.md` for the full technology stack, testing commands, and development workflow.

## PR Merge Rule
Never run `gh pr merge` automatically. PR merging is always a manual user action. When the user confirms the test plan:
1. Check off every test plan checkbox in the PR body (via `gh pr edit`).
2. Ask the user to merge the PR themselves.

Do not infer confirmation from phrases like "manual check confirmed" if any checkbox remains unchecked — ask explicitly before merging.

## On Ambiguity
If a spec is missing, incomplete, or conflicts with the constitution — 
stop and ask. Do not infer. Do not proceed.

## Signoff Metadata
When filling manual checklist signoff or similar metadata, use the authenticated GitHub username when it can be verified locally. Do not infer identity from the filesystem path alone. If no verified username is available, leave the field blank or ask the user.

## Active Technologies
- TypeScript 5.x (Next.js 16+) + Next.js (App Router), Tailwind CSS, Vitest, React Testing Library (032-doc-scoring)
- N/A (stateless) (032-doc-scoring)
- TypeScript 5.x (Next.js 16+) + Next.js (App Router), Tailwind CSS, Reac (128-licensing-compliance)
- N/A (stateless, on-demand analysis) (128-licensing-compliance)
- TypeScript 5.x (Next.js 16+) + React, Tailwind CSS (174-report-search)
- N/A (stateless, in-memory only) (174-report-search)
- TypeScript 5.x (Next.js 16+) + Next.js (App Router), React, Tailwind CSS (180-community-scoring)
- N/A (stateless, on-demand analysis per the constitution) (180-community-scoring)
- Bash (POSIX-compatible portions + bash-specific features already used: `[[ ... ]]`, `set -euo pipefail`) + `git`, `gh` (GitHub CLI, already required by the surrounding script for `gh issue view`) (243-cleanup-merged-fix)
- N/A (script operates on local git state and queries GitHub via `gh`) (243-cleanup-merged-fix)
- Bash (script), JSON (settings), Markdown (docs). No application-code change in this feature. + Claude Code CLI (version installed on the maintainer's machine), `git`, `npm`, `gh`, `uuidgen` (macOS/Linux standard). (244-headless-worktree-permissions)
- N/A — settings file committed to git; session ID recorded as a plain file inside the worktree (not persisted beyond worktree lifetime). (244-headless-worktree-permissions)
- TypeScript 5.x, Next.js 16+ (App Router) — matches existing stack + React 18, Tailwind CSS, Vitest, React Testing Library, Playwright (E2E). No new runtime dependencies. (231-org-aggregation)
- N/A (stateless — in-browser memory only for the duration of the run, per constitution §I) (231-org-aggregation)
- TypeScript 5.x on Node 20+ (Next.js 16+, App Router) + React, `@testing-library/react` (`renderHook`, `act`, `waitFor`), Vitest — all already in `package.json` (264-investigate-skipped-test-per-repo-status)
- N/A (stateless hook; test uses injected deferred promises) (264-investigate-skipped-test-per-repo-status)
- Bash (POSIX-compatible portions + bash-specific features already used by the script: `[[ ... ]]`, `set -euo pipefail`, `${var:-}` parameter expansion, `local` variables). No new bash features required beyond what the script already uses. + `git` (plumbing commands: `rev-parse --git-common-dir`, `rev-parse --git-dir`, `rev-parse --abbrev-ref HEAD`, `worktree list --porcelain`, `worktree remove`, `branch -D`, `checkout`, `pull`). `gh` (existing `gh pr view <branch> --json state`). No new binaries. (278-claude-worktree-sh-allow-cleanup-merged)

## Recent Changes
- 032-doc-scoring: Added TypeScript 5.x (Next.js 16+) + Next.js (App Router), Tailwind CSS, Vitest, React Testing Library
