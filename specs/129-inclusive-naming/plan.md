# Implementation Plan: Inclusive Naming Analysis

**Branch**: `129-inclusive-naming` | **Date**: 2026-04-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/129-inclusive-naming/spec.md`

## Summary

Add Inclusive Naming as a fourth sub-score within the Documentation scoring bucket. The feature checks the default branch name and scans repository description and topics for non-inclusive terms from the Inclusive Naming Initiative word list (Tiers 1–3). Each flagged term carries a tier-weighted penalty and generates an actionable recommendation. A new Inclusive Naming pane in the Documentation tab displays results. The Documentation bucket's internal weighting shifts from a three-part model (file presence 40%, README quality 30%, licensing 30%) to a four-part model (file presence 35%, README quality 30%, licensing 25%, inclusive naming 10%).

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16+)
**Primary Dependencies**: Next.js (App Router), Tailwind CSS, React
**Storage**: N/A (stateless, on-demand analysis)
**Testing**: Vitest, React Testing Library
**Target Platform**: Web (Vercel deployment)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Near-zero additional cost. Default branch name requires adding `name` to existing `defaultBranchRef` selection. Topics require adding `repositoryTopics` to the overview query. Both are small additions to the existing GraphQL request — no additional API calls.
**Constraints**: Must comply with constitution's 1-3 GraphQL requests per repo guideline. The two new fields add negligible payload.
**Scale/Scope**: Scoring logic change affects all analyzed repositories.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| I. Technology Stack | PASS | No new tech — uses existing TypeScript, Next.js, Tailwind |
| II. Accuracy Policy | PASS | All data from GitHub GraphQL API. Branch name and topics are exact values, not inferred. Missing data marked "unavailable". |
| III. Data Source Rules | PASS | Primary source is GraphQL. `defaultBranchRef.name` and `repositoryTopics` added to existing overview query. No new REST calls. Still within 1-3 requests per repo. |
| IV. Analyzer Module Boundary | PASS | New INI word list and scoring logic are framework-agnostic, live in `lib/`. No Next.js imports in analyzer. |
| V. CHAOSS Alignment | PASS | No new CHAOSS category. Inclusive naming enriches the existing Documentation dimension. |
| VI. Scoring Thresholds | PASS | Tier weights and composite weights in configuration, not hardcoded in logic. |
| IX. Feature Scope Rules | PASS | YAGNI: only INI Tier 1–3 terms, only branch name + description + topics. No source code scanning, no commit message scanning. |
| X. Security & Hygiene | PASS | No new secrets. Token usage unchanged. |
| XI. Testing | PASS | TDD: tests first, then implementation. Vitest + RTL. |
| XII. Definition of Done | PASS | Manual testing checklist, linting, no TODOs required. |
| XIII. Development Workflow | PASS | Feature branch, PR workflow. |

## Project Structure

### Documentation (this feature)

```text
specs/129-inclusive-naming/
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
│   ├── analysis-result.ts    # MODIFY: Add InclusiveNamingResult interface
│   ├── analyze.ts            # MODIFY: Extract branch name, description, topics for INI checks
│   └── queries.ts            # MODIFY: Add defaultBranchRef.name, repositoryTopics to overview query
├── inclusive-naming/
│   ├── word-list.ts          # NEW: INI Tier 1-3 word list with replacements
│   ├── checker.ts            # NEW: Whole-word matching logic for branch name + metadata
│   └── score-config.ts       # NEW: Inclusive naming sub-score calculation
├── documentation/
│   └── score-config.ts       # MODIFY: Four-part composite (35/30/25/10), fallback weights
└── scoring/
    ├── health-score.ts        # MODIFY: Pass inclusive naming recommendations through
    └── calibration-data.json  # MODIFY: Re-calibrate documentation percentiles

components/
├── documentation/
│   ├── DocumentationView.tsx       # MODIFY: Add Inclusive Naming pane
│   └── DocumentationScoreHelp.tsx  # MODIFY: Four-part score explanation

__tests__/
├── inclusive-naming/
│   ├── word-list.test.ts           # NEW: Word list data integrity tests
│   ├── checker.test.ts             # NEW: Whole-word matching, false positive prevention
│   └── score-config.test.ts        # NEW: Sub-score calculation, tier weighting
├── documentation/
│   └── score-config.test.ts        # MODIFY: Update for four-part model
└── components/
    └── DocumentationView.test.tsx   # MODIFY: Test Inclusive Naming pane rendering
```

**Structure Decision**: New `lib/inclusive-naming/` directory for word list data, checker logic, and scoring — mirrors the `lib/licensing/` pattern. Scoring integration stays in `lib/documentation/score-config.ts` since inclusive naming is a sub-score within Documentation. UI additions stay in `components/documentation/`.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
