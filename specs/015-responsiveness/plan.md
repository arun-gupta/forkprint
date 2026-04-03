# Implementation Plan: Responsiveness

**Branch**: `015-responsiveness` | **Date**: 2026-04-02 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/015-responsiveness/spec.md`

## Summary

Turn the current `Responsiveness` placeholder into a real responsiveness workspace. This slice introduces a dedicated `Responsiveness` top-level tab with five panes (`Issue & PR response time`, `Resolution metrics`, `Maintainer activity signals`, `Volume & backlog health`, and `Engagement quality signals`), extends `AnalysisResult` with the verified public issue/PR/review/comment/event inputs needed for `P1-F10`, and replaces the overview card's placeholder Responsiveness badge with a real config-driven score plus a clear "how is this scored?" help surface.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16.2 (App Router)  
**Primary Dependencies**: Next.js 16.2, Tailwind CSS 4, Vitest 4, React Testing Library 16, Playwright 1.58  
**Storage**: Stateless; no database or persistent server storage  
**Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E), manual verification  
**Target Platform**: Vercel-hosted Next.js web app, modern desktop/mobile browsers  
**Project Type**: Web application with server-side API routes and client-side analysis UI  
**Performance Goals**: Switching into `Responsiveness`, opening pane content, and expanding score help must remain local UI work with no additional analysis request or extra API calls  
**Constraints**: Reuse and extend the shared `AnalysisResult[]` contract; keep unavailable values explicit; keep Responsiveness thresholds config-driven; use GitHub GraphQL as the primary source and REST only if GraphQL cannot reach a required field; preserve the overview-card badge contract; defer trend charts, reviewer-by-reviewer analytics, and other out-of-scope workflow-governance signals  
**Scale/Scope**: `Responsiveness` tab implementation, analyzer contract extension for response/review/resolution inputs, config-driven Responsiveness scoring, pane/help UI, tests/manual checklist/docs

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| I / Phase 1 stack | PASS | Remains within the existing Next.js / React / Tailwind stack |
| II / Honest data only | PASS | Responsiveness metrics and scores must render exact values or explicit unavailable states only |
| III / Shared analyzer outputs | PASS | Reuses and extends `AnalysisResult` rather than introducing a second responsiveness data path |
| V / CHAOSS alignment | PASS | Keeps the Responsiveness dimension and score label aligned across the tab, badge, and product framing |
| VI / Config-driven thresholds | PASS | Responsiveness scoring thresholds and help text remain centralized in shared config |
| IX / Feature scope rules | PASS | Scope is limited to the Responsiveness workspace, score contract, and required analyzer inputs |
| XI — TDD mandatory | PASS | Analyzer mapping, scoring helpers, and tab behavior will require focused unit/integration coverage before implementation completes |
| XII / XIII — DoD and workflow | PASS | Manual checklist and follow-on tasks will be created before implementation begins |

**Gate result**: PASS — no constitution violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/015-responsiveness/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── responsiveness-ui.md
│   └── responsiveness-view-props.ts
├── checklists/
│   ├── requirements.md
│   └── manual-testing.md
└── tasks.md
```

### Source Code

```text
components/
├── responsiveness/
│   ├── ResponsivenessView.tsx              ← NEW: top-level `Responsiveness` tab content
│   ├── ResponsivenessView.test.tsx         ← NEW: pane rendering, score help, and unavailable behavior
│   └── ResponsivenessScoreHelp.tsx         ← NEW: lightweight help surface for score thresholds and category weighting
├── metric-cards/
│   └── MetricCard.tsx                      ← MODIFIED: existing Responsiveness badge consumes real score
└── repo-input/
    ├── RepoInputClient.tsx                 ← MODIFIED: routes analysis results into `Responsiveness`
    └── RepoInputClient.test.tsx            ← MODIFIED: integration coverage for new tab content

lib/
├── analyzer/
│   ├── analysis-result.ts                  ← MODIFIED: add verified responsiveness inputs and derived timing/rate fields
│   ├── analyze.ts                          ← MODIFIED: populate first-slice responsiveness inputs without forking feature logic
│   └── queries.ts                          ← MODIFIED: extend GraphQL queries for issue/PR/review/comment/event timing inputs
├── metric-cards/
│   └── score-config.ts                     ← MODIFIED: Responsiveness badge semantics move from placeholder to real score input
└── responsiveness/
    ├── score-config.ts                     ← NEW: shared Responsiveness thresholds, weighting, and help text
    └── view-model.ts                       ← NEW: formatting and availability helpers for `Responsiveness`

e2e/
└── responsiveness.spec.ts                  ← NEW: tab navigation, pane rendering, and score behavior scenarios
```

## Implementation Sequence

### Phase 0 — Research

1. Confirm which response/review/resolution inputs already exist in `AnalysisResult` and which first-slice fields still need analyzer support
2. Confirm the minimum verified public GitHub issue, PR, review, comment, and event fields required for first-response and first-review metrics
3. Decide how to distinguish bot responses from human responses using only verified public GitHub data
4. Confirm the first-slice boundary for `PR review depth` and `issues closed without comment` so the implementation stays tractable

### Phase 1 — Design

5. Define the responsiveness data model for pane metrics, score inputs, category weighting, and missing-data callout fields
6. Define the `Responsiveness` tab UI contract, including pane layout, per-repo sections, score help, and missing-data behavior
7. Define config-driven Responsiveness scoring thresholds, weighted categories, and explanation copy exposed by the help surface
8. Create the manual testing checklist for one-repo, multi-repo, unavailable-data, insufficient-score-data, and no-extra-fetch scenarios

### Phase 2 — Implementation Preview

9. Extend the analyzer contract only for the first-slice responsiveness inputs needed by `Responsiveness`, the overview badge, and score explanation
10. Replace the current placeholder `Responsiveness` tab content with a real workspace while preserving stable results-shell behavior
11. Add shared responsiveness view-model and score-config helpers so UI logic stays thin and reusable across the tab and overview badge
12. Implement the `Responsiveness` tab content using the existing `AnalysisResult[]`, with pane grouping, explicit help surfaces, and missing-data callouts
13. Replace the current placeholder Responsiveness badge state on overview cards with the first real Responsiveness score output
14. Add unit/integration/E2E coverage for pane rendering, unavailable values, scoring help, and no-extra-fetch behavior

## Complexity Tracking

No constitution violations. No complexity justification required.
