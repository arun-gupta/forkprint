# Implementation Plan: Licensing & Compliance Scoring

**Branch**: `128-licensing-compliance` | **Date**: 2026-04-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/128-licensing-compliance/spec.md`

## Summary

Add Licensing & Compliance as a third sub-score within the Documentation scoring bucket. The feature enriches the existing license file presence check with OSI approval detection, permissiveness tier classification, and DCO/CLA enforcement detection. A new Licensing pane in the Documentation tab displays these signals. The Documentation bucket's internal weighting shifts from a two-part model (file presence 60%, README quality 40%) to a three-part model (file presence, README quality, licensing compliance).

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16+)
**Primary Dependencies**: Next.js (App Router), Tailwind CSS, React
**Storage**: N/A (stateless, on-demand analysis)
**Testing**: Vitest, React Testing Library
**Target Platform**: Web (Vercel deployment)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: No additional API calls for license detection (SPDX ID already fetched). DCO/CLA detection adds commit message field to existing query and a new workflow file query (1-2 additional GraphQL requests).
**Constraints**: Must comply with constitution's 1-3 GraphQL requests per repo guideline. Commit message bodies increase query payload size.
**Scale/Scope**: Scoring logic change affects all analyzed repositories.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| I. Technology Stack | PASS | No new tech — uses existing TypeScript, Next.js, Tailwind |
| II. Accuracy Policy | PASS | All data from GitHub GraphQL API. Missing data marked "unavailable". No estimation or fabrication. |
| III. Data Source Rules | PASS | Primary source is GraphQL `licenseInfo`. Commit messages and workflow files also via GraphQL. No new REST calls needed. |
| IV. Analyzer Module Boundary | PASS | New scoring logic is framework-agnostic, lives in `lib/`. No Next.js imports in analyzer. |
| V. CHAOSS Alignment | PASS | No new CHAOSS category. Licensing enriches the existing Documentation dimension. |
| VI. Scoring Thresholds | PASS | Thresholds in configuration, not hardcoded. |
| IX. Feature Scope Rules | PASS | YAGNI: only signals defined in spec. No dependency scanning or copyright parsing. |
| X. Security & Hygiene | PASS | No new secrets. Token usage unchanged. |
| XI. Testing | PASS | TDD: tests first, then implementation. Vitest + RTL. |
| XII. Definition of Done | PASS | Manual testing checklist, linting, no TODOs required. |
| XIII. Development Workflow | PASS | Feature branch, PR workflow. |

## Project Structure

### Documentation (this feature)

```text
specs/128-licensing-compliance/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
lib/
├── analyzer/
│   ├── analysis-result.ts    # MODIFY: Add LicensingResult interface
│   ├── analyze.ts            # MODIFY: Extract licensing data, DCO/CLA signals
│   └── queries.ts            # MODIFY: Add commit message field, workflow file query
├── documentation/
│   └── score-config.ts       # MODIFY: Three-part scoring model
├── licensing/
│   └── license-data.ts       # NEW: OSI license list, permissiveness tiers
└── scoring/
    ├── health-score.ts        # MODIFY: Update tooltip text
    └── calibration-data.json  # MODIFY: Re-calibrate documentation percentiles

components/
├── documentation/
│   ├── DocumentationView.tsx  # MODIFY: Add Licensing pane
│   └── DocumentationScoreHelp.tsx  # NEW: Three-part score explanation

__tests__/
├── licensing/
│   ├── license-data.test.ts          # NEW: OSI list, tier classification tests
│   └── licensing-score.test.ts       # NEW: Licensing sub-score calculation tests
├── documentation/
│   └── score-config.test.ts          # MODIFY: Update for three-part model
└── components/
    └── DocumentationView.test.tsx     # MODIFY: Test Licensing pane rendering
```

**Structure Decision**: No new top-level directories. Licensing data config lives in `lib/licensing/` (new). Scoring logic stays in `lib/documentation/score-config.ts` since licensing is a sub-score within Documentation. UI additions stay in `components/documentation/`.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
