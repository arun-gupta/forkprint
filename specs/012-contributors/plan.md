# Implementation Plan: Contributors

**Branch**: `012-contribution-dynamics` | **Date**: 2026-04-01 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/012-contributors/spec.md`

## Summary

Introduce the `Contributors` tab as the first detailed contributor-health workspace after `Overview`. The current `P1-F09` slice delivers a `Core` pane with a contributor-composition summary plus a person-level contribution heatmap, a `Sustainability` pane with the first real Sustainability score and supporting explanation surfaces, an `Experimental` subsection for heuristic org-based signals, and a local recent-activity window control (`30d`, `60d`, `90d`, `180d`, `365d`) that does not trigger new analysis requests.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16.2 (App Router)  
**Primary Dependencies**: Next.js 16.2, Tailwind CSS 4, Vitest 4, React Testing Library 16, Playwright 1.58  
**Storage**: Stateless; no database or persistent server storage  
**Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E), manual verification  
**Target Platform**: Vercel-hosted Next.js web app, modern desktop/mobile browsers  
**Project Type**: Web application with server-side API routes and client-side analysis UI  
**Performance Goals**: Switching into `Contributors` and between `Core` / `Sustainability` panes must be local UI only and must not trigger additional analysis requests  
**Constraints**: Reuse the shared `AnalysisResult[]` contract; keep unavailable values explicit; scoring thresholds must remain config-driven; preserve the current Overview-card badge contract; use a supported public GitHub contributor-count surface for total contributors if GraphQL alone is insufficient; precompute contributor windows in the analyzer so switching windows stays local  
**Scale/Scope**: Contributors-tab shell content, recent-activity window presets, contributor-composition metrics, person-level heatmap, Sustainability score contract, experimental org metrics, tests/manual checklist/docs

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| I / Phase 1 stack | PASS | Remains within the existing Next.js / React / Tailwind stack |
| II / Honest data only | PASS | Contributors content, heatmap cells, and counts must show exact values or explicit unavailable states only |
| III / Shared analyzer outputs | PASS | Reuses and extends `AnalysisResult` rather than introducing a second contributor data path |
| V / CHAOSS alignment | PASS | Core contributor metrics and later sustainability signals stay aligned with CHAOSS contributor/community health concepts |
| VIII / Config-driven thresholds | PASS | Sustainability scoring remains centralized in shared config rather than embedded in components |
| IX / Feature scope rules | PASS | First implementation slice is intentionally limited to `Core` plus the initial Sustainability score surfaces |
| XI — TDD mandatory | PASS | Contributor view-model and tab rendering behavior will get focused unit/integration coverage before completion |
| XII / XIII — DoD and workflow | PASS | Manual checklist and tasks will be created before implementation begins |

**Gate result**: PASS — no constitution violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/012-contributors/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── contributors-view-props.ts
│   └── contributors-ui.md
├── checklists/
│   ├── requirements.md
│   └── manual-testing.md
└── tasks.md
```

### Source Code

```text
components/
├── app-shell/
│   ├── ResultsShell.tsx                     ← MODIFIED: host `Contributors` as second top-level tab
│   ├── ResultsShell.test.tsx                ← MODIFIED: tab-order coverage
│   ├── ResultsTabs.test.tsx                 ← MODIFIED: top-level tab contract coverage
│   └── contributors/
│       ├── ContributorsView.tsx             ← NEW: top-level `Contributors` tab content
│       ├── ContributorsView.test.tsx        ← NEW: `Core` / `Sustainability` pane behavior
│       ├── CoreContributorsPane.tsx         ← NEW: first-slice contributor metrics and person-level heatmap
│       ├── SustainabilityPane.tsx           ← NEW: score, help, missing-data panel, placeholder signals
│       └── *.test.tsx                       ← NEW: focused pane-level tests
├── metric-cards/
│   └── MetricCard.tsx                       ← MODIFIED: existing Sustainability badge consumes real score
└── repo-input/
    ├── RepoInputClient.tsx                  ← MODIFIED: routes analysis results into `Contributors`
    └── RepoInputClient.test.tsx             ← MODIFIED: integration coverage for new tab/panes

lib/
├── analyzer/
│   ├── analysis-result.ts                   ← MODIFIED: add verified contributor-health inputs as needed
│   └── analyze.ts                           ← MODIFIED: populate first-slice contributor inputs without forking feature logic
├── metric-cards/
│   └── score-config.ts                      ← MODIFIED: Sustainability badge semantics move from placeholder to real score input
└── contributors/
    ├── score-config.ts                      ← NEW: shared Sustainability thresholds and help text
    └── view-model.ts                        ← NEW: formatting and availability helpers for `Core` / `Sustainability`

e2e/
└── contributors.spec.ts                     ← NEW: tab navigation and placeholder-state scenarios
```

## Implementation Sequence

### Phase 0 — Research

1. Confirm which contributor-health inputs already exist in `AnalysisResult` and which first-slice fields still need analyzer support
2. Decide the minimum score inputs required for the initial Sustainability score without pulling in later organization-risk signals
3. Decide how the `Contributors` tab will separate `Core` and `Sustainability` panes while staying readable for one-repo and multi-repo results

### Phase 1 — Design

4. Define the contributor data model for the first slice: total contributors, active contributors, contribution concentration, repeat contributors, person-level heatmap inputs, score inputs, and missing-data callout fields
5. Define the `Contributors` tab UI contract, including pane switching, per-repo sections, person-level heatmap rendering, score help, and placeholder behavior for later sustainability signals
6. Define config-driven Sustainability scoring thresholds and the exact explanation copy exposed by the help surface
7. Create the manual testing checklist for one-repo, multi-repo, unavailable-data, insufficient-score-data, and pane-switching scenarios

### Phase 2 — Implementation Preview

8. Extend the analyzer contract only for the first-slice contributor inputs needed by `Core`, the person-level heatmap, total contributor count, and the initial Sustainability score
9. Add shared contributor view-model and score-config helpers so UI logic stays thin and reusable
10. Implement the `Contributors` top-level tab with `Core` and `Sustainability` panes using the existing `AnalysisResult[]`
11. Replace the current Sustainability placeholder badge state on overview cards with the first real score output
12. Add unit/integration/E2E coverage for tab order, pane rendering, unavailable values, and no-extra-fetch behavior

## Complexity Tracking

No constitution violations. No complexity justification required.
