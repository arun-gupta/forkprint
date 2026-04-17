# Implementation Plan: Review selected repos in org-inventory table

**Branch**: `315-inventory-no-way-to-review-which-repos-a` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/315-inventory-no-way-to-review-which-repos-a/spec.md`

## Summary

Add a **Selected only** filter toggle to the org-inventory Repositories table so users can audit exactly which repos are in their session selection before clicking **Analyze selected**. When on, the table's visible row set is narrowed to the intersection of `selectedRepos` and all other active table filters (`repoQuery`, `language`, `archived`). The toggle is session-only, preserves the user's selection when toggled on or off, resets pagination to page 1 on toggle change, and coexists with the existing filter row controls (name search, language, archived dropdown, `No archived` / `No forks` checkboxes). An empty-state message inside the table area names the cause (`no repositories selected`) and offers a one-click way back to the default view.

Technical approach: extend the existing pure filter pipeline in `lib/org-inventory/filters.ts` with an optional `selectedOnly` path, add a `selectedOnly` state slice to `OrgInventoryView`, render a new checkbox alongside `No archived` / `No forks`, and rework the empty-state branch in the table area to distinguish the "nothing selected" case from the generic "no matches" case. No new state libraries, no persistence, no API surface changes, no analyzer changes.

## Technical Context

**Language/Version**: TypeScript 5.x on Next.js 14 (App Router)
**Primary Dependencies**: React 18, Tailwind CSS, Vitest, React Testing Library, Playwright
**Storage**: N/A — session-only React component state; no persistence, no new storage
**Testing**: Vitest + React Testing Library (unit / component); existing Playwright suite stays green
**Target Platform**: Modern evergreen browsers (desktop + mobile layouts)
**Project Type**: Next.js web app (Phase 1)
**Performance Goals**: Toggle change updates visible rows within a single synchronous React render pass; no new network request; filter pass remains O(N) over the org's repo list (N up to ~1000 for the largest target orgs)
**Constraints**:
- Toggle must coexist with existing filter controls without reshaping the filter row
- Turning the toggle on or off MUST NOT mutate `selectedRepos`
- Counter label continues to report full selection size (not visible-subset size)
- Must reset pagination to page 1 on toggle state change so users never land on an empty page
- Keyboard + screen-reader accessible (parity with adjacent `No archived` / `No forks` checkboxes)
**Scale/Scope**: One UI component (`OrgInventoryView`), one filter module (`lib/org-inventory/filters.ts`), and their corresponding test files. No API, analyzer, data-model, or schema changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution section | Applies? | Status |
|---|---|---|
| II Accuracy Policy (NON-NEGOTIABLE) | No | N/A — no metric changes |
| III Data Source Rules | No | N/A — no new fetch, no token surface |
| IV Analyzer Module Boundary | No | N/A — no analyzer changes |
| V CHAOSS Alignment | No | N/A — no new category or score |
| VI Scoring Thresholds | No | N/A — no scoring logic touched |
| VII Ecosystem Spectrum | No | N/A |
| VIII Contribution Dynamics Honesty | No | N/A |
| IX Feature Scope (YAGNI / KISS) | Yes | **PASS** — cheapest option from issue #315 (a filter toggle in the existing filter row); no speculative extensibility, no new abstractions |
| X Security & Hygiene | No | N/A — purely client-side UI, no credentials |
| XI Testing (TDD, NON-NEGOTIABLE) | Yes | **PASS** — unit tests for the filter pipeline extension and component-level tests for toggle behavior, empty-state, intersection with other filters, pagination reset |
| XII Definition of Done | Yes | **PASS** — all checkboxes addressed by the task list; `docs/DEVELOPMENT.md` update scoped to completed-status adjustment if applicable (the repo-inventory feature `P1-F16` is already marked `✅ Done`; this change is a UX enhancement layered onto that already-shipped feature, so DoD entry `docs/DEVELOPMENT.md reflects the feature's completed status` is a no-op — no new row to append) |
| XIII Development Workflow | Yes | **PASS** — feature branch, PR with Test Plan, README left unchanged (no user-facing setup change, only inventory-filter behavior) |

**Initial gate: PASS.** No violations, no complexity tracking required.

## Project Structure

### Documentation (this feature)

```text
specs/315-inventory-no-way-to-review-which-repos-a/
├── plan.md              # This file
├── spec.md              # Feature spec (approved 2026-04-16)
├── research.md          # Phase 0 output (this pass)
├── data-model.md        # Phase 1 output (this pass)
├── quickstart.md        # Phase 1 output (this pass)
├── contracts/
│   └── ui-contract.md   # Phase 1 output — UI behavior contract for the new toggle
├── checklists/
│   └── requirements.md  # Spec quality checklist (already generated)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
lib/
└── org-inventory/
    ├── filters.ts              # EDIT — extend filter pipeline with optional selectedOnly path
    └── filters.test.ts         # EDIT — add unit tests for the new path

components/
└── org-inventory/
    ├── OrgInventoryView.tsx        # EDIT — add selectedOnly state, checkbox UI, empty-state split, pagination reset
    ├── OrgInventoryView.test.tsx   # EDIT — add component tests for the new behavior
    ├── OrgInventoryTable.tsx       # (no change expected)
    └── OrgInventoryTable.test.tsx  # (no change expected)
```

**Structure Decision**: Single Next.js app (existing Phase 1 layout). All changes land in `components/org-inventory/` and `lib/org-inventory/`. No new top-level modules, no new routes, no new API endpoints.

## Complexity Tracking

> Not required — Constitution Check PASSED with no violations.

---

## Phase 0 — Research

See [`research.md`](./research.md).

No `[NEEDS CLARIFICATION]` markers from the spec. Research captures the two unknowns worth resolving explicitly:

1. **Where the new `selectedOnly` filter should live in the existing filter pipeline** — chosen: lift it into `filterOrgInventoryRows` as an optional parameter, keeping the function pure and testable alongside the existing tests.
2. **How the "nothing selected" empty-state should differ from the existing "no matches" empty-state** — chosen: two branches in the existing empty-state block, keyed on `selectedOnly && selectedRepos.length === 0` (nothing selected) vs. `selectedOnly && selectedRepos.length > 0 && visibleRows === 0` (filter-intersection empty) vs. the pre-existing generic no-matches case.

## Phase 1 — Design & Contracts

- [`data-model.md`](./data-model.md) — the new `selectedOnly` state slice and how it composes with existing state (`filters`, `selectedRepos`, `currentPage`).
- [`contracts/ui-contract.md`](./contracts/ui-contract.md) — the observable UI contract the new toggle must satisfy (selector / ARIA / interaction). Mirrors the acceptance scenarios in the spec.
- [`quickstart.md`](./quickstart.md) — how to exercise the feature end-to-end on localhost.

### Post-design Constitution Re-check

Still PASS. No design artifact introduces a new abstraction, new dependency, new persistence layer, or any cross-phase coupling.
