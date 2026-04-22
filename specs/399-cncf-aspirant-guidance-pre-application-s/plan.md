# Implementation Plan: CNCF Aspirant Guidance (Pre-Application Sandbox Readiness)

**Branch**: `399-cncf-aspirant-guidance-pre-application-s` | **Date**: 2026-04-21 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/399-cncf-aspirant-guidance-pre-application-s/spec.md`

## Summary

Add a "Foundation target" selector to the repo input area that lets users declare CNCF Sandbox as their target before clicking Analyze. When active, the analysis pipeline fetches the CNCF landscape data, evaluates every required CNCF Sandbox application form field with ✅/⚠️/❌ status, and returns an `AspirantReadinessResult` (0–100 score + per-field remediation hints). The UI surfaces this as a compact Overview pill, a dedicated "CNCF Readiness" tab with ranked recommendations, and inline "CNCF Sandbox" badges in the existing Documentation, Security, Contributors, and Activity tabs.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: Next.js 16.2.1, React 19.2.4, Tailwind CSS 4, js-yaml (transitive dep — already present for YAML parsing)  
**Storage**: In-memory module-level cache for CNCF landscape data (process lifetime, no persistence)  
**Testing**: Vitest 4.1.2 (unit), Playwright 1.58.2 (E2E)  
**Target Platform**: Vercel edge-compatible Next.js App Router (server-side analysis pipeline)  
**Project Type**: Web application — full-stack Next.js with server-side analysis route  
**Performance Goals**: Landscape fetch + parse adds <500ms to analysis time on first call; <5ms on cache hit  
**Constraints**: Landscape fetch is server-side only (no CORS). Score computed once server-side, never re-derived client-side. No additional GitHub API calls beyond existing analysis pipeline.  
**Scale/Scope**: Single-repo aspirant evaluation per analysis run; in-memory cache shared across concurrent requests within the same process

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|---|---|---|
| No new dependencies without justification | PASS | `js-yaml` is already a transitive dep. No new npm packages needed. |
| Score/config must be config-driven, not hardcoded | PASS | Field weights live in `lib/cncf-sandbox/config.ts` (per §VI) |
| No fabricated or inferred values in score | PASS | FR-030, SC-010 — all inputs are verified GitHub API data or CNCF landscape data |
| New tab follows existing ResultsShell pattern | PASS | Conditional tab insertion via existing `tabs` array prop pattern |
| No client-side fetch of landscape data | PASS | Landscape fetch is server-side only in `/api/analyze/route.ts` |
| New lib module follows existing module isolation pattern | PASS | `lib/cncf-sandbox/` mirrors `lib/analyzer/`, `lib/scoring/` patterns |
| No API rate-limit impact | PASS | Landscape fetch from `raw.githubusercontent.com` is unauthenticated; existing GitHub API calls unchanged |

*Post-Phase 1 re-check*: All gates still pass. The `CNCFFieldBadge[]` prop pattern (Decision 6) adds a prop to four existing components but does not introduce abstraction layers or new dependencies. The conditional tab (Decision 5) is the simplest approach without special-casing inside the tab strip. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/399-cncf-aspirant-guidance-pre-application-s/
├── plan.md              ← this file
├── research.md          ← Phase 0 (complete)
├── data-model.md        ← Phase 1 (complete)
├── quickstart.md        ← Phase 1 (complete)
├── contracts/
│   ├── api-analyze.md   ← Phase 1 (complete)
│   └── ui-props.md      ← Phase 1 (complete)
└── tasks.md             ← Phase 2 (created by /speckit.tasks)
```

### Source Code

```text
lib/
├── cncf-sandbox/            # NEW module
│   ├── types.ts             # AspirantReadinessResult, AspirantField, CNCFLandscapeData, TAGRecommendation, etc.
│   ├── config.ts            # Field weights, label strings (config-driven per §VI)
│   ├── landscape.ts         # Fetch + parse landscape.yml; in-memory cache
│   ├── evaluate.ts          # Pure evaluation function: AnalysisResult + CNCFLandscapeData → AspirantReadinessResult
│   └── tag-recommender.ts   # Topic/keyword → CNCF TAG mapping (FR-014)
│
├── analyzer/
│   ├── analysis-result.ts   # EXTENDED: DocumentationResult gains adoptersFile, roadmapFile, maintainersFile, cocContent
│   ├── queries.ts           # EXTENDED: REPO_OVERVIEW_QUERY gains adoptersFile, roadmapFile, maintainersFile, cocText fields
│   └── analyze.ts           # EXTENDED: extractDocumentationResult() wires new GraphQL fields
│
└── results-shell/
    └── tabs.ts              # EXTENDED: 'cncf-readiness' tab added conditionally

app/api/analyze/
└── route.ts                 # EXTENDED: accept foundationTarget; call landscape fetch + evaluate

components/
├── repo-input/
│   └── RepoInputForm.tsx    # EXTENDED: FoundationTargetSelector added
│
├── app-shell/
│   └── ResultsShell.tsx     # EXTENDED: aspirantResult prop; conditional tab; cncfFields to domain tabs
│
├── cncf-readiness/          # NEW directory
│   ├── CNCFReadinessTab.tsx             # Full readiness checklist tab
│   ├── CNCFFieldBadgeInline.tsx         # Inline ✅/⚠️/❌ badge for domain tabs
│   └── LandscapeOverrideBanner.tsx      # Banner for existing CNCF projects
│
├── overview/
│   └── CNCFReadinessPill.tsx            # NEW: compact pill for Overview tab
│
├── documentation/
│   └── DocumentationView.tsx            # EXTENDED: cncfFields prop + inline badges
│
├── security/
│   └── SecurityView.tsx                 # EXTENDED: cncfFields prop + inline badge
│
├── contributors/
│   └── ContributorsScorePane.tsx        # EXTENDED: cncfFields prop + inline badge
│
└── activity/
    └── ActivityView.tsx                 # EXTENDED: cncfFields prop + inline badge

tests/
├── unit/
│   ├── cncf-sandbox/
│   │   ├── evaluate.test.ts             # All FR-008 field evaluations, score computation
│   │   ├── tag-recommender.test.ts      # FR-014 keyword table coverage
│   │   └── landscape.test.ts           # Fetch, parse, cache, failure handling
│   └── analyzer/
│       └── documentation-result.test.ts # Extended file-presence fields
└── e2e/
    └── cncf-aspirant.spec.ts            # Key acceptance scenarios (SC-001, SC-008, SC-012)
```

**Structure Decision**: Single Next.js project (existing repo layout). New functionality isolated in `lib/cncf-sandbox/` module. No new top-level directories. Consistent with `lib/scoring/`, `lib/analyzer/` module patterns.

## Complexity Tracking

No constitution violations.
