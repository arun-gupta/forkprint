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
| 11 | P1-F11 | Health Ratios | ❌ Deprecated (tab removed, ratios live in domain tabs + Comparison) |
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

## Phase 2 feature order

Phase 2 adds new scoring buckets to the health score. Requirements specs live in the linked GitHub issues — not in PRODUCT.md. See [Spec Ownership](PRODUCT.md#spec-ownership) for the rationale.

| # | Feature ID | Feature | Issues | Status |
|---|---|---|---|---|
| 1 | P2-F01a | Documentation scoring (basic) | #66 | ✅ Done |
| 2 | P2-F02 | Licensing & Compliance | #115 | ✅ Done |
| 3 | P2-F03 | Inclusive naming | #107 | ✅ Done |
| 4 | P2-F07 | Security scoring | #68 | |
| 5 | P2-F04 | Governance & Transparency | #116 | |
| 6 | P2-F05 | Community scoring | #70 | |
| 7 | P2-F06 | Foundation-aware recommendations | #119 | |
| 8 | P2-F08 | Accessibility & Onboarding | #117 | |
| 9 | P2-F09 | Release health scoring | #69 | |
| 10 | P2-F10 | Development cadence | #73 | |
| 11 | P2-F11 | Project maturity | #74 | |
| 12 | P2-F12 | Ecosystem Reach | #118 | |
| 13 | P2-F01b | Documentation scoring (advanced) | #110, #67 | |

## Phase 3 feature order

Phase 3 delivers the OSS Health Score through additional channels, wrapping the shared analyzer module without duplicating logic.

| # | Feature ID | Feature | Issues | Status |
|---|---|---|---|---|
| 1 | P3-F01 | Public REST API | #120 | |
| 2 | P3-F02 | GitHub Action | — | |
| 3 | P3-F03 | MCP Server | — | |
| 4 | P3-F04 | Embeddable badge | #72 | |
| 5 | P3-F05 | CLI tool | #82 | |
| 6 | P3-F06 | PR comment bot | #83 | |
| 7 | P3-F07 | VS Code extension | #84 | |
| 8 | P3-F08 | Webhook receiver | #85 | |

## Phase 4

Phase 4 ports the application to support GitLab in addition to GitHub. It introduces a provider abstraction layer (GitHub and GitLab implement the same interface) so the analyzer, delivery phases, and UI remain unchanged. Phase 4 begins only after Phase 3 is complete.

## Feature development flow (Phase 2+)

For Phase 2 and beyond, the requirements spec for each feature lives in its GitHub issue. The SpecKit workflow reads the issue as input:

```
GitHub Issue (requirements spec)
  │  Acceptance criteria, signals, scoring approach, open questions
  │
  ▼
/speckit.specify (reads issue as input)
  │  Generates specs/NNN-feature-name/ with TypeScript contracts
  │
  ▼
/speckit.plan → /speckit.tasks → /speckit.implement
  │  Plan, break down, build
  │
  ▼
PR with test plan → merge
  │  Mark feature as ✅ Done in the table above
```

**Key distinction:** The GitHub issue defines *what and why* (requirements). SpecKit generates *how* (TypeScript interfaces, view props, data flow contracts). They are not duplicates — the issue is the input, the spec file is the output.

This replaces the Phase 1 pattern where PRODUCT.md contained inline acceptance criteria for every feature. Phase 1 specs are frozen in PRODUCT.md as a historical record.

---

## Notes

- `.specify/` is managed by SpecKit. Do not manually edit files inside it outside of the workflows above.
- Feature specs live in `specs/NNN-feature-name/`.
- Every feature must have `specs/NNN-feature-name/checklists/manual-testing.md`.
- Constitution: `.specify/memory/constitution.md`
- Product definition: `docs/PRODUCT.md`
- Deployment guide: `docs/DEPLOYMENT.md`
