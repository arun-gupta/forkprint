# Implementation Plan: Ecosystem Map

**Branch**: `005-ecosystem-map` | **Date**: 2026-03-31 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/005-ecosystem-map/spec.md`

## Summary

Add the first visual analysis layer to ForkPrint by turning successful `AnalysisResult[]` data into an ecosystem-map section on the home page. The feature will show visible ecosystem metrics for each successful repository, derive a config-driven ecosystem profile across Reach / Builder Engagement / Attention, and keep the feature useful for both single-repo and multi-repo analysis.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16.2 (App Router)  
**Primary Dependencies**: Tailwind CSS 4, Vitest 4, React Testing Library 16, Playwright 1.58  
**Storage**: Stateless; no database or persistent server storage  
**Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E)  
**Target Platform**: Vercel-hosted Next.js web app, modern desktop/mobile browsers  
**Project Type**: Web application with a shared framework-agnostic analyzer module and client-side visualization  
**Performance Goals**: Render usable ecosystem visualization for 1–6 successful repos without extra API calls and keep the spectrum/profile view easy to scan on desktop and mobile  
**Constraints**: Verified GitHub GraphQL data only; missing ecosystem metrics must stay explicit; spectrum thresholds must live in shared config; single-repo input remains fully valid; no dashboard-level architecture that blocks later phases  
**Scale/Scope**: Home-page ecosystem-map section, spectrum/profile helpers, and supporting tests/manual checklist for 1–6 analyzed repos

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| I / Phase 1 stack | PASS | Uses the existing Phase 1 Next.js/React/Tailwind stack without adding architecture that blocks later phases |
| II — Verified data only | PASS | Spectrum view uses already-fetched `AnalysisResult[]`; no guessed derived rates for unavailable metrics |
| IV — Shared analyzer boundary | PASS | No analyzer changes required beyond consuming existing flat results |
| V / VII — CHAOSS alignment and ecosystem spectrum rules | PASS | Treat the ecosystem output as a ForkPrint profile aligned to CHAOSS; use config-driven spectrum thresholds |
| VII.5 — Single-repo behavior | PASS | Single successful repo renders profile and exact metrics without requiring a comparison set |
| IX.5 — Flat `AnalysisResult` schema | PASS | Visualization consumes existing flat schema without transformation requirements leaking upstream |
| XI — TDD mandatory | PASS | Classification/profile tests are written before implementation in tasks phase |
| XII / XIII — Manual checklist required | PASS | `checklists/manual-testing.md` will be created and maintained for this feature |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-ecosystem-map/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ecosystem-map-props.ts
│   └── ecosystem-map-ui.md
├── checklists/
│   ├── requirements.md
│   └── manual-testing.md
└── tasks.md
```

### Source Code

```text
app/
└── page.tsx                                  ← MAY REMAIN UNCHANGED; feature stays on current home page

components/
├── ecosystem-map/
│   ├── EcosystemMap.tsx                      ← NEW: spectrum legend + visible metric/profile display
│   ├── EcosystemMap.test.tsx                ← NEW: rendering and interaction coverage
│   └── ecosystem-map-utils.test.ts          ← NEW: classification helper tests
└── repo-input/
    ├── RepoInputClient.tsx                  ← MODIFIED: render ecosystem map from successful results
    └── RepoInputClient.test.tsx             ← MODIFIED: end-to-end client-state coverage with map

lib/
├── analyzer/
│   └── analysis-result.ts                   ← UNCHANGED: consumed as input contract
└── ecosystem-map/
    ├── classification.ts                    ← NEW: ecosystem profile helpers
    ├── chart-data.ts                        ← NEW: convert successful results into profile/metric view models
    └── spectrum-config.ts                   ← NEW: shared reach / engagement / attention thresholds

e2e/
└── ecosystem-map.spec.ts                    ← NEW: visible metrics, spectrum profile rendering, single-repo behavior
```

## Implementation Sequence

### Phase 0 — Research

1. Confirm the profile presentation that best supports 1–6 repos and responsive layouts with the approved stack
2. Decide how unavailable ecosystem metrics are represented without inventing derived rates
3. Decide how the spectrum profile and legends appear in UI without implying official CHAOSS terminology

### Phase 1 — Design

4. Define the spectrum profile, visible metric strip, and rate-summary models
5. Define component props and spectrum/legend UI contract
6. Create the manual testing checklist for single-repo, multi-repo, derived-rate, and unavailable-metric scenarios
7. Confirm source-code structure for spectrum config, profile utilities, and UI rendering

### Phase 2 — Implementation Preview

8. Create reusable ecosystem-map utilities/components
9. Render visible stars/forks/watchers for successful repos in the ecosystem-map section
10. Render the config-driven ecosystem profile and legend for Reach / Builder Engagement / Attention
11. Add exact-value and derived-rate behavior to the repository cards
12. Add unit, component, and E2E coverage for visible metrics, spectrum logic, and single-repo handling

## Complexity Tracking

No constitution violations. No complexity justification required.
