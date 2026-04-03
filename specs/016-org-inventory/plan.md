# Implementation Plan: Org-Level Repo Inventory

**Branch**: `016-org-inventory` | **Date**: 2026-04-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/016-org-inventory/spec.md`

## Summary

Implement `P1-F16 Org-Level Repo Inventory` as a lightweight organization workspace that accepts a GitHub org slug or URL, fetches verified public repository metadata, and renders a sortable/filterable inventory table plus org-level rollups. This slice also adds row-level and bulk drill-in to the existing repo-analysis flow, with a slider-controlled bulk-selection limit that is capped by shared config and defaults to `5`.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16.2 (App Router)  
**Primary Dependencies**: Next.js 16.2, Tailwind CSS 4, Vitest 4, React Testing Library 16, Playwright 1.58  
**Storage**: Stateless; no database or persistent server storage  
**Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E), manual verification  
**Target Platform**: Vercel-hosted Next.js web app, modern desktop/mobile browsers  
**Project Type**: Web application with server-side API routes and client-side analysis UI  
**Performance Goals**: Opening an org inventory, filtering rows, sorting columns, adjusting the bulk-selection slider, and selecting repositories for analysis must remain local UI work after the inventory response returns; no extra org fetches for local table interactions  
**Constraints**: Use verified public GitHub metadata only; do not run full CHAOSS analysis for every repo in the org inventory view; reuse existing repo-analysis flows for single-repo and multi-repo drill-in; keep the bulk-selection cap config-driven with a default max of `5`; support ascending/descending sort on every visible column; keep mobile table scanning usable via responsive layout and horizontal overflow when needed  
**Scale/Scope**: org input normalization, org inventory API route/queries, summary rollups, sortable/filterable table, slider-limited repo selection, drill-in to existing repo analysis, tests/manual checklist/docs

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| I / Phase 1 stack | PASS | Remains within the existing Next.js / React / Tailwind stack |
| II / Honest data only | PASS | Inventory rows and org rollups use verified public metadata or explicit unavailable states only |
| III / Shared analyzer outputs | PASS | Reuses the existing repo-analysis flow for drill-in instead of creating a second deep-analysis path |
| V / CHAOSS alignment | PASS | This feature is an inventory/discovery surface and does not alter the existing CHAOSS dimension contracts |
| VI / Config-driven thresholds | PASS | The bulk-selection limit is config-driven rather than hardcoded in the UI |
| IX / Feature scope rules | PASS | Scope stays within lightweight org inventory, local table behavior, and repo-analysis handoff |
| XI — TDD mandatory | PASS | Inventory parsing, sorting, filtering, selection-limit logic, and drill-in behavior will require focused tests |
| XII / XIII — DoD and workflow | PASS | Manual checklist and follow-on tasks will be created before implementation completes |

**Gate result**: PASS — no constitution violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/016-org-inventory/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── org-inventory-ui.md
│   └── org-inventory-view-props.ts
├── checklists/
│   ├── requirements.md
│   └── manual-testing.md
└── tasks.md
```

### Source Code

```text
app/
└── api/
    └── analyze-org/
        └── route.ts                         ← NEW: server-side org inventory endpoint

components/
├── org-inventory/
│   ├── OrgInventoryView.tsx                ← NEW: org summary, filters, slider, table, and drill-in actions
│   ├── OrgInventoryTable.tsx               ← NEW: sortable table UI for repo rows
│   ├── OrgInventorySummary.tsx             ← NEW: org-level rollups and key highlights
│   └── OrgInventoryView.test.tsx           ← NEW: filtering, sorting, selection-limit, and drill-in coverage
└── repo-input/
    ├── RepoInputClient.tsx                 ← MODIFIED: routes org inventory submissions and repo-analysis handoff
    ├── RepoInputForm.tsx                   ← MODIFIED: supports org input mode or org submission affordance
    └── RepoInputClient.test.tsx            ← MODIFIED: inventory integration coverage

lib/
├── analyzer/
│   └── org-inventory.ts                    ← NEW: lightweight org inventory fetch + shaping helpers
├── config/
│   └── org-inventory.ts                    ← NEW: shared config for default/max bulk-selection limit
└── org-inventory/
    ├── filters.ts                          ← NEW: local filter/sort/selection helpers
    └── summary.ts                          ← NEW: org-level rollup calculations

e2e/
└── org-inventory.spec.ts                   ← NEW: org submission, sorting, filtering, selection, and drill-in scenarios
```

## Implementation Sequence

### Phase 0 — Research

1. Confirm the best GitHub query shape for fetching public repositories, archived status, languages, stars, forks, watchers, issue counts, and pushed timestamps without deep per-repo analysis
2. Confirm how org-level pagination should work for larger organizations in Phase 1 and where to stop if virtualization/pagination is needed
3. Decide whether description should remain visibly sortable or be excluded despite the “all visible columns sortable” requirement if the UI would become noisy
4. Decide deterministic behavior when the selection-limit slider is lowered below the current selected count
5. Confirm the simplest repo-analysis handoff from org inventory into the existing multi-repo analysis flow

### Phase 1 — Design

6. Define the org inventory data model for request input, repo rows, summary rollups, filter state, sort state, selection state, and rate-limit metadata
7. Define the UI contract for org input, summary cards, table columns, per-column asc/desc sort behavior, filter controls, and selection-limit slider
8. Define the bulk-analysis handoff contract so selected repos move cleanly into the existing repo-analysis flow without duplicating submission logic
9. Create the manual testing checklist for valid orgs, invalid orgs, empty orgs, local filtering/sorting, selection-limit enforcement, mobile usability, and drill-in behavior

### Phase 2 — Implementation Preview

10. Add a lightweight server-side org inventory endpoint and shaping logic for public repository metadata
11. Introduce shared config for the default/max bulk-selection limit and shared local helpers for filtering, sorting, and summary rollups
12. Build the org inventory workspace with summary area, filters, slider, table, and row/bulk analyze actions
13. Connect row-level and multi-select analysis actions into the existing repo-analysis flow without creating a second analysis implementation path
14. Add unit/integration/E2E coverage for sorting every visible column, local filters, slider-limit enforcement, empty/error states, and repo-analysis handoff

## Complexity Tracking

No constitution violations. No complexity justification required.
