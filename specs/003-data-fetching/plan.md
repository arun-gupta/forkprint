# Implementation Plan: Data Fetching

**Branch**: `003-data-fetching` | **Date**: 2026-03-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-data-fetching/spec.md`

## Summary

Implement the first real analysis pipeline for RepoPulse: submit validated repos plus an available token source, fetch verified public GitHub data through a Next.js API route, and return flat per-repo analysis results with isolated failures, loading state, and rate-limit metadata. The core analyzer stays framework-agnostic so later GitHub Action and MCP phases can reuse it without duplication.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16.2 (App Router)  
**Primary Dependencies**: Tailwind CSS 4, Vitest 4, React Testing Library 16, Playwright 1.58  
**Storage**: Stateless; no database or persistent server storage  
**Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E)  
**Target Platform**: Vercel-hosted Next.js web app, modern browsers  
**Project Type**: Web application with a shared framework-agnostic analyzer module  
**Performance Goals**: 1–3 GraphQL requests per repo, per-repo loading visibility, usable multi-repo analysis without blocking on one failure  
**Constraints**: Verified GitHub GraphQL data only; missing data must be `"unavailable"`; server-side token takes precedence; analyzer module cannot depend on Next.js  
**Scale/Scope**: Phase 1 API route, analyzer module, client submission wiring, and supporting UI state for 1–6 repos per analysis

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| I / IV — Shared framework-agnostic analyzer | PASS | Introduce analyzer logic under `lib/analyzer/` with no Next.js imports |
| II — Verified GitHub data only | PASS | All metrics originate from GraphQL responses; missing fields remain `"unavailable"` |
| III.1 / III.2 — GraphQL primary, 1–3 requests per repo | PASS | Design query groups around metadata/ecosystem, activity, and responsiveness |
| III.6 / III.7 — Server token precedence and secrecy | PASS | API route resolves env token first and never returns or logs token values |
| IX.5 — Flat `AnalysisResult` schema | PASS | Define result shape once for repo-to-repo diffability |
| X.5 — Per-repo error isolation | PASS | Return successes and failures independently within one analysis response |
| XI — TDD mandatory | PASS | Tests written before implementation in tasks phase |
| XII / XIII — Manual checklist required | PASS | `checklists/manual-testing.md` will be maintained for this feature |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-data-fetching/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── analyze-api.md
│   └── analysis-result.ts
├── checklists/
│   ├── requirements.md
│   └── manual-testing.md
└── tasks.md
```

### Source Code

```text
app/
├── api/
│   └── analyze/
│       └── route.ts              ← NEW: server-side POST wrapper for analysis requests
└── page.tsx                      ← MODIFIED: wire client submit flow into analysis request handling

components/
└── repo-input/
    ├── RepoInputClient.tsx       ← MODIFIED: submit repos + token to API, show loading/fetch state
    └── RepoInputClient.test.tsx  ← MODIFIED: client fetch-state tests

lib/
├── analyzer/
│   ├── analyze.ts                ← NEW: framework-agnostic analysis entry point
│   ├── github-graphql.ts         ← NEW: GitHub GraphQL request helper
│   ├── queries.ts                ← NEW: precise GraphQL query definitions
│   ├── analysis-result.ts        ← NEW: shared flat result types
│   └── analyzer.test.ts          ← NEW: mocked analyzer tests
├── parse-repos.ts                ← UNCHANGED
└── token-storage.ts              ← UNCHANGED

e2e/
├── repo-input.spec.ts            ← MODIFIED: repo submission now flows into analysis state
└── data-fetching.spec.ts         ← NEW: end-to-end data-fetching scenarios
```

## Implementation Sequence

### Phase 0 — Research

1. Decide the analyzer module boundary and how the API route delegates to it
2. Decide the initial `AnalysisResult` shape and how failures/rate-limit state are represented
3. Decide the GraphQL query grouping so each repo stays within the constitution’s 1–3 request limit

### Phase 1 — Design

4. Define the flat `AnalysisResult`, failure, and rate-limit entities
5. Define the `POST /api/analyze` contract and shared result type contract
6. Create a manual testing checklist for real API flow verification
7. Update agent context with any new analyzer-module structure

### Phase 2 — Implementation Preview

8. Add the analyzer module and GitHub GraphQL helper
9. Add the Next.js API route wrapper with token precedence
10. Connect `RepoInputClient` to the API route with per-repo loading and error state
11. Add unit and E2E coverage for successful fetches, partial failures, and rate-limit visibility

## Complexity Tracking

No constitution violations. No complexity justification required.
