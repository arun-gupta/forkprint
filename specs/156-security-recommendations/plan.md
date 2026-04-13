# Implementation Plan: Richer Security Recommendations

**Branch**: `156-security-recommendations` | **Date**: 2026-04-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/156-security-recommendations/spec.md`

## Summary

Replace the generic one-line security recommendation text with structured, OpenSSF Scorecard-sourced guidance. Build a static recommendation catalog keyed by check name, extend the `SecurityRecommendation` interface with enriched fields (title, risk level, evidence, explanation, remediation, docs link, category), add deduplication for overlapping Scorecard/direct checks, and render grouped recommendations in the Security tab.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16+)
**Primary Dependencies**: Next.js (App Router), Tailwind CSS, React
**Storage**: N/A (stateless)
**Testing**: Vitest, React Testing Library
**Target Platform**: Web (Vercel deployment)
**Project Type**: Web application
**Performance Goals**: No additional API calls — catalog is static, recommendations are computed from existing analysis data
**Constraints**: Backward compatible with `HealthScoreRecommendation` pipeline (rec.text → message)
**Scale/Scope**: 17+ Scorecard check catalog entries + 4 direct check entries

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| I. Technology Stack | PASS | No new technologies — TypeScript, Next.js, Tailwind only |
| II. Accuracy Policy | PASS | Recommendations derived from verified Scorecard scores and direct check results; no fabrication |
| III. Data Source Rules | PASS | No new API calls; catalog is static, evidence comes from existing SecurityResult |
| IV. Analyzer Module Boundary | PASS | Catalog and recommendation logic live in `lib/security/` — framework-agnostic |
| VI. Scoring Thresholds | PASS | Recommendation threshold (score 0-4) preserved from existing config |
| IX.6 YAGNI | PASS | Catalog covers only checks that exist in the current Scorecard API; no speculative entries |
| IX.7 Keep It Simple | PASS | Static catalog object, no dynamic fetching, no external dependencies |
| X. Security & Hygiene | PASS | No secrets involved; docs URLs are public |
| XI. Testing (TDD) | PASS | Tests written first for catalog, score-config changes, and SecurityView rendering |

**Post-Phase 1 re-check**: All gates still pass. The design adds a static catalog module and extends an existing interface with optional fields. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/156-security-recommendations/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── security-recommendation-props.ts  # Enriched recommendation types
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
lib/security/
├── recommendation-catalog.ts    # NEW — Static catalog of check → recommendation metadata
├── analysis-result.ts           # MODIFY — Extend SecurityRecommendation with optional enriched fields
└── score-config.ts              # MODIFY — Replace inline rec generation with catalog lookups + deduplication

components/security/
└── SecurityView.tsx             # MODIFY — Add categorized recommendations rendering section

components/recommendations/
└── RecommendationsView.tsx      # MODIFY — Add 'Security' to BUCKET_COLORS

specs/130-security-scoring/contracts/
└── security-view-props.ts       # MODIFY — Update SecurityRecommendationDisplay

lib/security/__tests__/
├── recommendation-catalog.test.ts  # NEW — Catalog completeness and validity tests
├── score-config.test.ts            # MODIFY — Add tests for enriched recs, deduplication, categorization
└── ...

components/security/
└── SecurityView.test.tsx        # MODIFY — Add tests for grouped recommendation rendering
```

**Structure Decision**: All changes are within the existing `lib/security/` and `components/security/` directories. One new file (`recommendation-catalog.ts`) is added to house the static catalog, keeping it separate from scoring logic per FR-014.

## Complexity Tracking

No constitution violations to justify. The feature is additive — extends an existing interface and adds a static catalog module.
