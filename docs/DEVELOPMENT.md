# ForkPrint — Development Workflow

This document describes how to develop ForkPrint using the SpecKit / Specification-Driven Development (SDD) workflow.

---

## Prerequisites

- `arun-gupta/forkprint` repo is cloned locally
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

### Step 5 — PR

Before opening a PR, verify the Definition of Done (constitution Section XII):

- [ ] All acceptance criteria in the feature spec are satisfied
- [ ] Tests pass and linting is clean
- [ ] No TODOs, dead code, `console.log`, or untyped values remain
- [ ] All spec documents for the feature are current
- [ ] Manual testing checklist completed and signed off
- [ ] README updated for any user-facing or setup changes
- [ ] Constitution compliance verified — no rule violated

Once done, open a PR and merge before starting the next feature.

---

## Phase 1 feature order

| # | Feature ID | Feature | Status |
|---|---|---|---|
| 1 | P1-F01 | Repo Input | ✅ Done |
| 2 | P1-F02 | Authentication | — |
| 3 | P1-F03 | Deployment | — |
| 4 | P1-F04 | Data Fetching | — |
| 5 | P1-F05 | Ecosystem Map | — |
| 6 | P1-F06 | Repo Comparison | — |
| 7 | P1-F07 | Metric Cards | — |
| 8 | P1-F08 | Evolution | — |
| 9 | P1-F09 | Contribution Dynamics | — |
| 10 | P1-F10 | Responsiveness | — |
| 11 | P1-F11 | Health Ratios | — |
| 12 | P1-F12 | Missing Data & Accuracy | — |
| 13 | P1-F13 | Export | — |

---

## Phase 2 and Phase 3

When Phase 1 is complete and deployed, run the same loop for each Phase 2 feature (`P2-F01`, `P2-F02`), then Phase 3 (`P3-F01`, `P3-F02`). The analyzer module must not be modified to accommodate Phase 2 or 3 — only wrapped.

---

## Notes

- `.specify/` is managed by SpecKit. Do not manually edit files inside it outside of the workflows above.
- Feature specs live in `specs/NNN-feature-name/`.
- Constitution: `.specify/memory/constitution.md`
- Product definition: `docs/PRODUCT.md`
