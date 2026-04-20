# Implementation Plan: Recommendations tab on the org-summary view

**Branch**: `359-add-recommendations-tab-to-organization` | **Date**: 2026-04-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/359-add-recommendations-tab-to-organization/spec.md`

## Summary

Activate the already-reserved `recommendations` bucket on the org-summary view. A new pure-function `orgRecommendationsAggregator` consumes the completed `AnalysisResult[]`, pipes each through the existing per-repo recommendation sources (`getHealthScore(result).recommendations` + `getSecurityScore(...).recommendations`), resolves each recommendation key to the unified catalog (`lib/recommendations/catalog.ts`), dedupes by catalog entry, counts distinct affected repos, sorts by count desc / catalog ID asc, and groups by CHAOSS bucket (Activity / Responsiveness / Contributors / Documentation / Security). A new `OrgRecommendationsPanel` component renders the result with a drill-down that expands each aggregated entry to the alphabetical list of affected repo slugs. The org-summary view's bucket visibility filter is updated so `recommendations` is no longer excluded. Zero new data fetches, zero new scoring, zero new catalog entries — purely additive on the UI side, reusing every per-repo contract already in the codebase.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18, Next.js 14 (App Router)
**Primary Dependencies**: Tailwind CSS (existing), Chart.js (not used here), Vitest + React Testing Library (tests), Playwright (E2E). All already present — no new dependency introduced.
**Storage**: N/A — stateless Phase 1. Input is the in-memory `AnalysisResult[]` already materialized by the existing org-aggregation run.
**Testing**: Vitest for aggregator + component unit tests; existing Playwright `/demo/organization` smoke test extended to reach the new tab.
**Target Platform**: Next.js app deployed on Vercel (Phase 1, unchanged).
**Project Type**: Single-app Next.js repo with shared analyzer module — no new projects added.
**Performance Goals**: Aggregator is O(R · K) where R = analyzed repos (typically ≤50 in practice) and K = recommendations per repo (≤30). Total ≤1500 items to walk — trivially under the 16ms-per-frame budget; rendering is the dominant cost and is bounded by the total number of recommendations across the org, which is already rendered per-repo on demand today.
**Constraints**: No new GraphQL fields, no new REST calls, no new analyzer code path, no new scoring contribution (FR-016). Aggregator MUST live under `lib/org-aggregation/aggregators/` as a pure function with the existing `Aggregator<T>` signature — no framework coupling (constitution §IV).
**Scale/Scope**: One new aggregator file, one new panel component, one registry edit, one view-model edit, one filter edit in `OrgSummaryView.tsx`, one PRODUCT.md paragraph, test files to match. Estimated diff ≤600 LOC.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **§I (Tech stack)**: No new technology introduced. Stack stays Next.js 14 App Router + Tailwind + Chart.js + Vitest/Playwright. ✅
- **§II (Accuracy, NON-NEGOTIABLE)**: Aggregator consumes already-verified per-repo recommendation streams. It performs no estimation, interpolation, or inference — it is a pure dedup-and-count over verified inputs. Unknown catalog keys are surfaced (FR-019), not hidden. ✅
- **§III (Data Source)**: No new GraphQL or REST calls. No token surface touched. ✅
- **§IV (Analyzer Module Boundary)**: The aggregator lives in `lib/org-aggregation/aggregators/` and imports only from `lib/analyzer/analysis-result` (types), `lib/scoring/health-score` (pure function over `AnalysisResult`), `lib/security/score-config` (pure function over `AnalysisResult`), and `lib/recommendations/catalog`. It has zero imports from `next/*`, `react`, or `components/*`. The per-repo score modules are already framework-agnostic, so the boundary holds. ✅
- **§V (CHAOSS Alignment)**: No new CHAOSS category introduced. The five-bucket grouping (Activity / Responsiveness / Contributors / Documentation / Security) reuses the existing per-repo recommendation taxonomy, which is already constitution-aligned. ✅
- **§VI (Scoring Thresholds)**: No thresholds added. No scoring contribution. ✅
- **§VII (Ecosystem Spectrum)**: Not touched. ✅
- **§VIII (Contribution Dynamics Honesty)**: Not touched. ✅
- **§IX (Feature Scope / YAGNI / KISS)**: Scope is narrow — one aggregator, one panel, one filter edit. The three alternative framings (weighted-by-stars, flat inventory, un-grouped top-N) are explicitly deferred per the spec. No extensibility points speculatively added. ✅
- **§X (Security & Hygiene)**: No secrets, no new transmission surface. ✅
- **§XI (Testing, NON-NEGOTIABLE — TDD)**: Tests for the aggregator and the panel are written first, tasks ordered to match red-green-refactor. ✅
- **§XII (Definition of Done)** and **§XIII (Workflow)**: Enforced at `/speckit.tasks` / `/speckit.implement` and PR time. ✅

**Result**: PASS. No complexity-tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/359-add-recommendations-tab-to-organization/
├── plan.md              # This file
├── spec.md              # Approved spec
├── research.md          # Phase 0 — deduping keys, unknown-key handling, sort order
├── data-model.md        # Phase 1 — aggregator value shape + panel prop shape
├── quickstart.md        # Phase 1 — manual test walkthrough
├── contracts/
│   └── org-recommendations-aggregator.ts   # TypeScript interface contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (already written)
└── tasks.md             # Phase 2 — generated by /speckit.tasks
```

### Source Code (repository root)

```text
lib/
├── org-aggregation/
│   ├── aggregators/
│   │   ├── types.ts                                     # EDIT: add OrgRecommendationsValue type
│   │   ├── org-recommendations.ts                       # NEW: orgRecommendationsAggregator
│   │   ├── org-recommendations.test.ts                  # NEW: Vitest unit tests
│   │   └── index.ts                                     # unchanged (re-exports types only)
│   ├── types.ts                                         # EDIT: add 'org-recommendations' to PanelId union
│   └── view-model.ts                                    # EDIT: wire orgRecommendationsAggregator into buildOrgSummaryViewModel
├── recommendations/
│   └── catalog.ts                                       # unchanged — the aggregator reads from this
├── scoring/
│   └── health-score.ts                                  # unchanged — getHealthScore() used as-is
└── security/
    └── score-config.ts                                  # unchanged — getSecurityScore() used as-is

components/
├── org-summary/
│   ├── OrgSummaryView.tsx                               # EDIT: drop 'recommendations' from the filter-out list
│   └── panels/
│       ├── registry.tsx                                 # EDIT: register 'org-recommendations' panel in bucket + REAL_PANELS + PANEL_LABELS; update comment
│       ├── OrgRecommendationsPanel.tsx                  # NEW: renders the aggregated output
│       └── OrgRecommendationsPanel.test.tsx             # NEW: RTL tests
└── recommendations/
    └── RecommendationsView.tsx                          # unchanged per FR-018

docs/
└── PRODUCT.md                                           # EDIT: brief note under the org-summary section about the Recommendations tab
```

**Structure Decision**: Single-app layout (existing). The feature is additive — it does not move or rename any existing file. The aggregator file pairs with the existing `lib/org-aggregation/aggregators/<panel>.ts` convention. The panel file pairs with the existing `components/org-summary/panels/<Panel>.tsx` convention. The one naming choice: `PanelId = 'org-recommendations'` (not just `'recommendations'`) to avoid collision with the per-repo recommendations surface and to be self-documenting when the id appears in logs / missing-data records. The *bucket* id stays `'recommendations'` (already reserved in `PanelBucketId`), so the tab label the user sees is unchanged.

## Complexity Tracking

> No constitution violations. Table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)*  | —          | —                                    |
