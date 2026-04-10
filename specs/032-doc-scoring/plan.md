# Implementation Plan: Documentation Scoring

**Branch**: `032-doc-scoring` | **Date**: 2026-04-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/032-doc-scoring/spec.md`

## Summary

Add a Documentation scoring bucket to the OSS Health Score. Checks 6 key documentation files via GitHub Community Profile API (1 REST call) and README content API (1 REST call), plus CHANGELOG via GraphQL. Produces a percentile score calibrated against repos in the same star bracket. Missing items generate actionable recommendations surfaced in a new Documentation tab and a unified Recommendations tab.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16+)
**Primary Dependencies**: Next.js (App Router), Tailwind CSS, Vitest, React Testing Library
**Storage**: N/A (stateless)
**Testing**: Vitest + React Testing Library (unit/component), Playwright (E2E)
**Target Platform**: Vercel (web)
**Project Type**: Web application
**Performance Goals**: Documentation checks add no more than 2 seconds to analysis time
**Constraints**: 2 additional REST calls per repo; must work within existing rate limit budget
**Scale/Scope**: 1604 calibration repos, per-request analysis of 1-4 repos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| I. Technology Stack | PASS | Uses existing Next.js/Tailwind/Vitest stack. No new dependencies. |
| II. Accuracy Policy | PASS | File presence is binary (exists/not). README sections detected from actual content. No estimation. |
| III. Data Source Rules | PASS | Uses GitHub REST API (community/profile, readme) as supplement where GraphQL cannot reach. OAuth token used. |
| IV. Analyzer Module Boundary | PASS | Documentation logic lives in `lib/documentation/` and `lib/analyzer/` — framework-agnostic. |
| V. CHAOSS Alignment | NOTE | Documentation is a new scoring dimension not in the original 4 CHAOSS categories. Constitution Section V says "No new CHAOSS categories... without amending." Documentation scoring is an OSS Health Score bucket, not a new CHAOSS category — it extends the composite health score. Constitution amendment may be needed if this is considered a new CHAOSS category. |
| VI. Scoring Thresholds | PASS | Weights defined in config (`score-config.ts`), not hardcoded. |
| IX. Feature Scope Rules | PASS | YAGNI applies — no speculative features. |
| XI. Testing | PASS | TDD: tests first, then implementation. |
| XII. Definition of Done | PASS | All criteria will be satisfied. |

**Constitution concern — Section V**: The 4 CHAOSS categories are fixed by constitution. Documentation scoring is framed as an additional OSS Health Score bucket, not a CHAOSS category replacement. The existing 4 CHAOSS scores (Ecosystem, Activity, Sustainability, Responsiveness) remain unchanged. The Documentation bucket extends the composite health score without modifying the CHAOSS mapping. If this interpretation is disputed, a constitution amendment adding Documentation as a recognized scoring dimension is required before implementation.

## Project Structure

### Documentation (this feature)

```text
specs/032-doc-scoring/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: data source research
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: implementation guide
├── contracts/
│   └── documentation-view-props.ts  # Phase 1: UI contracts
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
lib/
├── documentation/
│   ├── score-config.ts          # Scoring logic (weights, composite, recommendations)
│   ├── score-config.test.ts     # Tests
│   ├── view-model.ts            # View model for Documentation tab
│   └── view-model.test.ts       # Tests
├── analyzer/
│   ├── analyze.ts               # MODIFIED: add documentation fetch calls
│   ├── analysis-result.ts       # MODIFIED: add documentationResult field
│   ├── queries.ts               # MODIFIED: add CHANGELOG object() aliases
│   └── github-rest.ts           # MODIFIED: add fetchCommunityProfile, fetchReadmeContent
├── scoring/
│   ├── health-score.ts          # MODIFIED: rebalance weights, remove percentile gate
│   └── config-loader.ts         # MODIFIED: add documentation calibration data
├── comparison/
│   └── sections.ts              # MODIFIED: add documentation comparison section
└── export/
    ├── json-export.ts           # MODIFIED: include documentation data
    └── markdown-export.ts       # MODIFIED: include documentation data

components/
├── documentation/
│   ├── DocumentationView.tsx       # Documentation tab
│   └── DocumentationView.test.tsx  # Tests
├── recommendations/
│   ├── RecommendationsView.tsx       # Unified recommendations tab
│   └── RecommendationsView.test.tsx  # Tests
├── metric-cards/
│   └── MetricCard.tsx              # MODIFIED: add Documentation score badge
├── repo-input/
│   └── RepoInputClient.tsx         # MODIFIED: add Documentation + Recommendations tabs
└── baseline/
    └── BaselineView.tsx            # MODIFIED: add documentation metrics
```

**Structure Decision**: Follows existing pattern — each scoring dimension has its own `lib/{dimension}/` directory with `score-config.ts` and `view-model.ts`, plus a `components/{dimension}/` directory for the tab.
