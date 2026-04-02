# Implementation Plan: Activity

**Branch**: `013-activity-scoring` | **Date**: 2026-04-02 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/013-activity-scoring/spec.md`

## Summary

Turn the current `Metrics` placeholder into a real `Activity` workspace. This slice introduces an `Activity` top-level tab with a local recent-activity window control (`30d`, `60d`, `90d`, `180d`, `12 months`), extends `AnalysisResult` with the verified public activity inputs and derived values needed for `P1-F08`, surfaces selected-window throughput ratios alongside raw counts, and replaces the overview card's placeholder Activity badge with a real config-driven score plus a clear "how is this scored?" help surface.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16.2 (App Router)  
**Primary Dependencies**: Next.js 16.2, Tailwind CSS 4, Vitest 4, React Testing Library 16, Playwright 1.58  
**Storage**: Stateless; no database or persistent server storage  
**Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E), manual verification  
**Target Platform**: Vercel-hosted Next.js web app, modern desktop/mobile browsers  
**Project Type**: Web application with server-side API routes and client-side analysis UI  
**Performance Goals**: Switching into `Activity`, changing the recent activity window, and opening scoring help must remain local UI work with no additional analysis request or extra API calls  
**Constraints**: Reuse and extend the shared `AnalysisResult[]` contract; keep unavailable values explicit; keep Activity thresholds config-driven; use GitHub GraphQL as the primary source and REST only if GraphQL cannot reach a required field; preserve the overview-card badge contract while aligning the score label with the `Activity` workspace name; keep primary values visible outside tooltips; defer full trend charts until bucketed series are part of the shared payload  
**Scale/Scope**: `Activity` tab rename and implementation, recent-activity window presets, analyzer contract extension for activity inputs, config-driven Activity scoring, score/help UI, tests/manual checklist/docs

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| I / Phase 1 stack | PASS | Remains within the existing Next.js / React / Tailwind stack |
| II / Honest data only | PASS | Activity metrics and scores must render exact values or explicit unavailable states only |
| III / Shared analyzer outputs | PASS | Reuses and extends `AnalysisResult` rather than introducing a second activity data path |
| V / CHAOSS alignment | PASS | Keeps the Activity dimension and score label aligned across the tab, badge, and product framing |
| VI / Config-driven thresholds | PASS | Activity scoring thresholds and help text remain centralized in shared config |
| IX / Feature scope rules | PASS | Scope is limited to the Activity workspace, score contract, and required analyzer inputs |
| XI — TDD mandatory | PASS | Analyzer mapping, scoring helpers, and tab behavior will require focused unit/integration coverage before implementation completes |
| XII / XIII — DoD and workflow | PASS | Manual checklist and follow-on tasks will be created before implementation begins |

**Gate result**: PASS — no constitution violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/013-activity-scoring/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── activity-ui.md
│   └── activity-view-props.ts
├── checklists/
│   ├── requirements.md
│   └── manual-testing.md
└── tasks.md
```

### Source Code

```text
components/
├── app-shell/
│   ├── ResultsShell.tsx                     ← MODIFIED: host `Activity` as a top-level tab label
│   ├── ResultsShell.test.tsx                ← MODIFIED: tab-order and label coverage
│   └── ResultsTabs.test.tsx                 ← MODIFIED: top-level tab contract coverage
├── activity/
│   ├── ActivityView.tsx                     ← NEW: top-level `Activity` tab content
│   ├── ActivityView.test.tsx                ← NEW: window switching, score help, and missing-data behavior
│   └── ActivityScoreHelp.tsx                ← NEW: lightweight help surface for score thresholds and derived metrics
├── metric-cards/
│   ├── MetricCard.tsx                       ← MODIFIED: existing Activity badge consumes real Activity score
│   └── ScoreBadge.tsx                       ← MODIFIED: optional help affordance if needed by score surfaces
└── repo-input/
    ├── RepoInputClient.tsx                  ← MODIFIED: routes analysis results into `Activity`
    └── RepoInputClient.test.tsx             ← MODIFIED: integration coverage for new tab content

lib/
├── analyzer/
│   ├── analysis-result.ts                   ← MODIFIED: add verified activity inputs and derived timing/rate fields
│   ├── analyze.ts                           ← MODIFIED: populate first-slice activity inputs without forking feature logic
│   └── queries.ts                           ← MODIFIED: extend GraphQL queries for activity windows, releases, and timing inputs
├── metric-cards/
│   └── score-config.ts                      ← MODIFIED: Activity badge semantics move from placeholder to real score input
├── results-shell/
│   └── tabs.ts                              ← MODIFIED: rename `Metrics` tab label/description to `Activity`
└── activity/
    ├── score-config.ts                      ← NEW: shared Activity thresholds, weighting, and help text
    └── view-model.ts                        ← NEW: formatting and availability helpers for `Activity`

e2e/
└── activity.spec.ts                         ← NEW: tab navigation, window control, and score rendering scenarios
```

## Implementation Sequence

### Phase 0 — Research

1. Confirm which activity inputs already exist in `AnalysisResult` and which first-slice fields still need analyzer support
2. Confirm the Activity naming contract stays consistent across the workspace, score badge, and product framing
3. Decide the minimum verified public GitHub fields required for release cadence, stale issue ratio, PR merge medians, and issue close medians
4. Confirm the tooltip/help-surface strategy so primary values stay visible while derived metrics remain explainable

### Phase 1 — Design

5. Define the activity data model for selected-window metrics, fixed commit comparison windows, derived rates/medians, score inputs, and missing-data callout fields
6. Define the `Activity` tab UI contract, including top-level window controls, per-repo sections, score help, and missing-data behavior
7. Define config-driven Activity scoring thresholds, weighted factor groups, and explanation copy exposed by the help surface
8. Create the manual testing checklist for one-repo, multi-repo, unavailable-data, insufficient-score-data, and local window-switching scenarios

### Phase 2 — Implementation Preview

9. Extend the analyzer contract only for the first-slice activity inputs needed by `Activity`, the overview badge, and score explanation
10. Rename the current `Metrics` top-level tab contract to `Activity` while preserving stable results-shell behavior
11. Add shared activity view-model and score-config helpers so UI logic stays thin and reusable, including selected-window throughput-ratio formatting
12. Implement the `Activity` tab content using the existing `AnalysisResult[]`, with local recent-activity window switching and explicit help/missing-data surfaces
13. Replace the current placeholder Activity badge state on overview cards with the first real Activity score output
14. Add unit/integration/E2E coverage for tab label behavior, window switching, unavailable values, scoring help, and no-extra-fetch behavior

## Complexity Tracking

No constitution violations. No complexity justification required.
