# RepoPulse — Development Workflow

This document describes how to develop RepoPulse using the SpecKit / Specification-Driven Development (SDD) workflow.

---

## Prerequisites

- `arun-gupta/repo-pulse` repo is cloned locally
- `CLAUDE.md` exists — it points Claude Code to `.specify/memory/constitution.md`
- Claude Code is running in the repo root

---

## Feature loop (spec → plan → tasks → implement)

One feature at a time, fully through implementation before starting the next. Do not batch specs across features.

### Step 1 — Specify

> `/speckit.specify` `[P1-F01]` Repo Input

Review the generated spec. It is a contract — approve it before proceeding.

### Step 2 — Plan

> `/speckit.plan` `[P1-F01]`

Review the plan. Verify it does not introduce any dependency that would block Phase 2 or Phase 3.

### Step 3 — Tasks

> `/speckit.tasks` `[P1-F01]`

Review the task list before implementation begins.

### Step 4 — Implement

> `/speckit.implement` `[P1-F01]`

Each feature must include a manual testing checklist at `specs/NNN-feature-name/checklists/manual-testing.md`. Create it during the feature workflow if it does not already exist, and complete/sign it off before opening the PR.

### Step 5 — PR

Before opening a PR, verify the Definition of Done (constitution Section XII):

- [ ] All acceptance criteria in the feature spec are satisfied
- [ ] Tests pass and linting is clean
- [ ] No TODOs, dead code, `console.log`, or untyped values remain
- [ ] All spec documents for the feature are current
- [ ] `docs/DEVELOPMENT.md` reflects the feature's completed status in the implementation order table (`✅ Done`)
- [ ] Manual testing checklist completed and signed off
- [ ] README updated for any user-facing or setup changes
- [ ] Constitution compliance verified — no rule violated

Once done, open a PR and merge before starting the next feature.

---

## Phase 1 feature order

This is the planned implementation order for Phase 1. It may differ from the feature listing order in `docs/PRODUCT.md`, which remains the canonical product definition.

| # | Feature ID | Feature | Status |
|---|---|---|---|
| 1 | P1-F01 | Repo Input | ✅ Done |
| 2 | P1-F02 | Authentication | ✅ Done |
| 3 | P1-F04 | Data Fetching | ✅ Done |
| 4 | P1-F15 | Results Shell | ✅ Done |
| 5 | P1-F05 | Ecosystem Map | ✅ Done |
| 6 | P1-F03 | Deployment | ✅ Done |
| 7 | P1-F07 | Metric Cards | ✅ Done |
| 8 | P1-F09 | Contributors | ✅ Done |
| 9 | P1-F08 | Activity | ✅ Done |
| 10 | P1-F10 | Responsiveness | ✅ Done |
| 11 | P1-F11 | Health Ratios | ✅ Done |
| 12 | P1-F16 | Org-Level Repo Inventory | ✅ Done |
| 13 | P1-F06 | Repo Comparison | ✅ Done |
| 14 | P1-F14 | GitHub OAuth Authentication | ✅ Done |
| 15 | P1-F13 | Export | ✅ Done |
| 16 | P1-F12 | Missing Data & Accuracy | ✅ Done |

---

## Testing

Run these checks before opening a PR:

```bash
npm test
npm run test:e2e
npm run lint
npm run build
```

---

## Phase 2, Phase 3, and Phase 4

When Phase 1 is complete and deployed, run the same loop for each Phase 2 feature (`P2-F01`, `P2-F02`), then Phase 3 (`P3-F01`, `P3-F02`). The analyzer module must not be modified to accommodate Phase 2 or 3 — only wrapped.

Phase 4 ports the application to support GitLab in addition to GitHub. It introduces a provider abstraction layer (GitHub and GitLab implement the same interface) so the analyzer, delivery phases, and UI remain unchanged. Phase 4 begins only after Phase 3 is complete.

---

## Notes

- `.specify/` is managed by SpecKit. Do not manually edit files inside it outside of the workflows above.
- Feature specs live in `specs/NNN-feature-name/`.
- Every feature must have `specs/NNN-feature-name/checklists/manual-testing.md`.
- Constitution: `.specify/memory/constitution.md`
- Product definition: `docs/PRODUCT.md`
- Deployment guide: `docs/DEPLOYMENT.md`
