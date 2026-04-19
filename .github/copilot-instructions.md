# Copilot Instructions — RepoPulse

**Read [`CLAUDE.md`](../CLAUDE.md) first and follow it exactly.** It is the authoritative instruction file for any AI agent working in this repo. Everything below is Copilot-specific addenda — it does not override `CLAUDE.md`.

`CLAUDE.md` will, in turn, point you to:
- `.specify/memory/constitution.md` — non-negotiable project rules
- `docs/PRODUCT.md` — feature definitions, acceptance criteria, out-of-scope boundaries
- `docs/DEVELOPMENT.md` — tech stack, dev workflow, current implementation order

## Scope: bug fixes only

Copilot is used in this repo for **bug fixes and small maintenance tasks only**. New feature development goes through Claude Code with the full SpecKit lifecycle.

**You may take on:**
- Bug fixes / regressions
- Copy, styling, and accessibility tweaks
- Dependency bumps
- Refactors with no behavior change
- Test-only additions or fixes
- Documentation corrections

**You must decline (close the PR with an explanation, or comment and stop) if the issue is:**
- A new feature from `docs/PRODUCT.md` or `docs/DEVELOPMENT.md`
- An expansion of an existing feature's behavior
- Anything that would require generating a new `specs/NNN-feature/spec.md`
- Ambiguous in scope ("improve X", "make Y better") — ask for clarification first

If you're unsure whether a task counts as a bug fix or a feature, **stop and ask in a PR comment**. The constitution forbids inferring intent.

## Constraints that still apply to bug fixes

Even small changes must comply with the constitution. Pay particular attention to:

- **Accuracy (§II)**: never fabricate, estimate, or interpolate metrics. Missing data stays `"unavailable"`.
- **Auth (§III)**: never log, persist, or expose the OAuth token.
- **Analyzer boundary (§IV)**: the analyzer module stays framework-agnostic.
- **Thresholds (§VI)**: scoring values live in shared config, not inline.
- **YAGNI (§IX)**: fix only what the issue describes. Do not refactor surrounding code, add abstractions, or "improve" things beyond the bug's scope.
- **TDD (§XI)**: add or update a regression test that fails without your fix and passes with it.
- **DoD (§XII)**: every checkbox must be true before requesting review.

## Copilot-specific operational notes

- **Never run `gh pr merge`.** Open the PR, request review, and let a human merge.
- **PR Test Plan**: every PR body must include a `## Test plan` markdown checklist. This is the single source of truth for manual testing signoff (per constitution §XII/§XIII).
- **Signoff metadata**: when a checklist asks who signed off, use `github-copilot[bot]`. Do not impersonate the repo owner.
- **Link the issue**: include `Closes #N` in the PR body.

## Commands

| Task              | Command                  |
|-------------------|--------------------------|
| Install deps      | `npm install`            |
| Dev server        | `npm run dev`            |
| Build             | `npm run build`          |
| Lint              | `npm run lint`           |
| Unit/integration  | `npm test`               |
| E2E (Playwright)  | `npm run test:e2e`       |

Run `npm test` and `npm run lint` before requesting review. Run `npm run test:e2e` if your change touches a user-facing flow.
