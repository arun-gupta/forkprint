# Implementation Plan: Health Ratios

**Branch**: `014-health-ratios` | **Date**: 2026-04-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/014-health-ratios/spec.md`

## Summary

Implement `P1-F11 Health Ratios` as a cross-repo comparison surface that reuses verified ratios already present across the app, while introducing the missing contributor-composition ratios in the `Contributors` tab. This slice adds a dedicated `Health Ratios` top-level tab with a sortable comparison table grouped by CHAOSS-aligned category, keeps ratio explanations discoverable with consistent help affordances, and ensures all ratio values come from shared definitions rather than duplicated per-tab logic.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16.2 (App Router)  
**Primary Dependencies**: Next.js 16.2, Tailwind CSS 4, Vitest 4, React Testing Library 16, Playwright 1.58  
**Storage**: Stateless; no database or persistent server storage  
**Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E), manual verification  
**Target Platform**: Vercel-hosted Next.js web app, modern desktop/mobile browsers  
**Project Type**: Web application with server-side API routes and client-side analysis UI  
**Performance Goals**: Opening `Health Ratios`, sorting rows, and switching between the ratio rollup and home tabs must remain local UI work with no additional analysis request or extra API calls  
**Constraints**: Reuse the shared `AnalysisResult[]` contract; keep unavailable values explicit as `—`; avoid introducing a second fetch path; preserve ratio values and wording across `Contributors`, `Activity`, overview/ecosystem surfaces, and the new `Health Ratios` tab; keep home views as the first place users encounter their ratios  
**Scale/Scope**: contributor-composition ratio derivation, `Contributors` tab enhancement, `Health Ratios` tab implementation, shared ratio definitions/view-models, sortable comparison UI, tests/manual checklist/docs

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| I / Phase 1 stack | PASS | Remains within the existing Next.js / React / Tailwind stack |
| II / Honest data only | PASS | Ratios must come from verified inputs or render as explicit unavailable states |
| III / Shared analyzer outputs | PASS | Reuses and extends `AnalysisResult` rather than introducing another data path |
| V / CHAOSS alignment | PASS | Ratios stay grouped by CHAOSS-aligned category and remain in their home views as well as the rollup |
| VI / Config-driven thresholds | PASS | This feature does not add a new score threshold model, but shared ratio definitions stay centralized |
| IX / Feature scope rules | PASS | Scope is limited to ratio derivation, ratio home views, and one rollup tab |
| XI — TDD mandatory | PASS | Shared ratio helpers, table sorting, and no-extra-fetch behavior will require focused tests |
| XII / XIII — DoD and workflow | PASS | Manual checklist and follow-on tasks will be created before implementation begins |

**Gate result**: PASS — no constitution violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/014-health-ratios/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── health-ratios-ui.md
│   └── health-ratios-view-props.ts
├── checklists/
│   ├── requirements.md
│   └── manual-testing.md
└── tasks.md
```

### Source Code

```text
components/
├── health-ratios/
│   ├── HealthRatiosView.tsx               ← NEW: top-level `Health Ratios` tab content
│   └── HealthRatiosView.test.tsx          ← NEW: sorting, unavailable values, and grouping coverage
├── contributors/
│   ├── ContributorsView.tsx               ← MODIFIED: surface contributor-composition ratios in the home workspace
│   ├── CoreContributorsPane.tsx           ← MODIFIED: add repeat/new contributor ratio presentation
│   └── ContributorsView.test.tsx          ← MODIFIED: contributor-ratio home-view coverage
└── repo-input/
    ├── RepoInputClient.tsx                ← MODIFIED: routes analysis results into `Health Ratios`
    └── RepoInputClient.test.tsx           ← MODIFIED: integration coverage for the new tab

lib/
├── analyzer/
│   ├── analysis-result.ts                 ← MODIFIED: add contributor ratio inputs if they are not already explicit
│   └── analyze.ts                         ← MODIFIED: derive repeat/new contributor counts from verified contributor inputs
├── contributors/
│   └── view-model.ts                      ← MODIFIED: reuse shared contributor-composition ratio definitions in the home tab
├── results-shell/
│   └── tabs.ts                            ← MODIFIED: add `Health Ratios` to the top-level result tabs
└── health-ratios/
    ├── ratio-definitions.ts               ← NEW: shared ratio metadata, formulas, grouping, and help text
    └── view-model.ts                      ← NEW: table row shaping, sorting, and unavailable-value helpers

e2e/
└── health-ratios.spec.ts                  ← NEW: tab navigation, sorting, and consistency scenarios
```

## Implementation Sequence

### Phase 0 — Research

1. Confirm which ecosystem and activity ratios are already rendered in existing tabs and how to reuse their exact underlying values
2. Confirm the minimum verified contributor inputs required to derive `repeat contributors / total contributors` and `new contributors / total contributors`
3. Decide whether contributor-composition ratios should be computed directly in the analyzer or derived in shared view-model logic from existing verified counts
4. Confirm the simplest sortable-table model that works for single-repo and multi-repo analyses without introducing a new comparison fetch path

### Phase 1 — Design

5. Define the ratio data model for shared ratio definitions, contributor-composition ratio inputs, and `Health Ratios` table rows
6. Define the `Health Ratios` UI contract, including category grouping, sort behavior, unavailable-value rendering, and tooltip/help affordances
7. Define how contributor-composition ratios appear in the `Contributors` home view so they stay interpretable before the cross-repo rollup
8. Create the manual testing checklist for one-repo, multi-repo, unavailable-ratio, sort-order, and consistency-across-tabs scenarios

### Phase 2 — Implementation Preview

9. Extend analyzer outputs only for the contributor ratio inputs that are not already present in `AnalysisResult`
10. Add shared ratio definitions so ecosystem, activity, contributor, and rollup surfaces use the same formulas and help text
11. Implement contributor-composition ratios in the `Contributors` tab using the shared definitions
12. Add the `Health Ratios` top-level tab and build the grouped sortable table from the existing analysis payload
13. Add explicit `—` unavailable rendering and short formula/help affordances for derived ratios
14. Add unit/integration/E2E coverage for ratio consistency, table sorting, unavailable values, and no-extra-fetch behavior

## Complexity Tracking

No constitution violations. No complexity justification required.
