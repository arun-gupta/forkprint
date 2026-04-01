# Implementation Plan: Metric Cards

**Branch**: `008-metric-cards` | **Date**: 2026-04-01 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/008-metric-cards/spec.md`

## Summary

Turn the current lightweight `Overview` tab into a true repo-card summary layer. Each successful repository will render as a scannable card that reuses the existing ecosystem spectrum profile, shows exact repo metadata and key counters, and introduces consistent CHAOSS score-badge slots for Evolution, Contribution Dynamics, and Responsiveness without rerunning analysis.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16.2 (App Router)  
**Primary Dependencies**: Next.js 16.2, Tailwind CSS 4, Vitest 4, React Testing Library 16, Playwright 1.58, Chart.js 4, react-chartjs-2 5  
**Storage**: Stateless; no database or persistent server storage  
**Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E), manual verification  
**Target Platform**: Vercel-hosted Next.js web app, modern desktop/mobile browsers  
**Project Type**: Web application with server-side API routes and client-side analysis UI  
**Performance Goals**: Card expansion must be local UI state only; no additional analysis request or extra API calls  
**Constraints**: Reuse existing `AnalysisResult` and `P1-F05` spectrum logic; keep unavailable values explicit; badge thresholds/config must remain centralized; do not block later scoring features (`P1-F08` to `P1-F10`)  
**Scale/Scope**: Overview-tab refactor, reusable repo-card components, interim score-badge contract, tests/manual checklist/docs

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| I / Phase 1 stack | PASS | Stays within existing Next.js / React / Tailwind stack |
| II / Honest data only | PASS | Cards surface exact values or explicit unavailable markers only |
| III / Shared analyzer outputs | PASS | Reuses existing `AnalysisResult` output without feature-specific analyzer forking |
| V / CHAOSS alignment | PASS | Badges are framed as CHAOSS category summaries and can host real scores as later features land |
| VIII / Config-driven thresholds | PASS | Ecosystem tiers remain config-driven; score-badge semantics will use a shared config contract |
| XI — TDD mandatory | PASS | New overview card behavior gets focused component tests before implementation completion |
| XII / XIII — DoD and workflow | PASS | Manual checklist will be created during planning and completed before PR |

**Gate result**: PASS — no constitution violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/008-metric-cards/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── metric-card-props.ts
│   └── overview-ui.md
├── checklists/
│   ├── requirements.md
│   └── manual-testing.md
└── tasks.md
```

### Source Code

```text
components/
├── repo-input/
│   ├── RepoInputClient.tsx                  ← replace lightweight overview rows with metric-card view
│   └── RepoInputClient.test.tsx             ← integration coverage for overview-tab cards/expansion
├── ecosystem-map/
│   └── EcosystemMap.tsx                     ← source of reused spectrum profile semantics only
└── metric-cards/
    ├── MetricCard.tsx                       ← new summary/expandable card component
    ├── MetricCardsOverview.tsx              ← new overview-tab card collection
    ├── ScoreBadge.tsx                       ← new CHAOSS badge primitive
    └── *.test.tsx                           ← focused tests for cards and badges

lib/
├── analyzer/
│   └── analysis-result.ts                   ← existing contract reused directly
├── ecosystem-map/
│   └── spectrum-config.ts                   ← reused for profile tiers and legends
└── metric-cards/
    ├── score-config.ts                      ← new color/label config for score badges
    └── view-model.ts                        ← new card view-model helpers and expansion-safe formatting

e2e/
└── metric-cards.spec.ts                     ← new end-to-end coverage for overview cards
```

## Implementation Sequence

### Phase 0 — Research

1. Confirm which overview data already exists in `AnalysisResult` and which values must remain explicitly unavailable
2. Define how score badges should behave before `P1-F08`–`P1-F10` provide real computed scores
3. Confirm which existing spectrum-profile helpers from `P1-F05` should be reused rather than reimplemented

### Phase 1 — Design

4. Define the repo-card view model, including exact summary fields, derived ecosystem profile tiers, and expanded-detail content
5. Define the score-badge contract for Evolution, Contribution Dynamics, and Responsiveness with explicit interim semantics
6. Define the overview-tab UI contract for collapsed vs expanded cards and failure handling
7. Create the manual testing checklist for one-repo, multi-repo, unavailable-data, and card-expansion scenarios

### Phase 2 — Implementation Preview

8. Replace the current lightweight overview result list with reusable metric cards
9. Add consistent ecosystem profile badges and CHAOSS score badges to each card
10. Add in-place expansion behavior that reveals fuller repo detail without extra requests
11. Update README/docs only if the overview experience changes user-visible behavior enough to need it
12. Finish automated verification and manual signoff

## Complexity Tracking

No constitution violations. No complexity justification required.
