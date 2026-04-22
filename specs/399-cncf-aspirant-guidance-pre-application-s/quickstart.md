# Quickstart: Implementing CNCF Aspirant Guidance (399)

## Prerequisites

- Node.js 20+, `npm install` already run
- Existing passing tests: `npm test` and `npm run typecheck`
- Working knowledge of: Next.js App Router, React 19 props patterns, the existing `lib/analyzer/` module structure

## Key Files to Touch

| File | Change |
|---|---|
| `lib/analyzer/queries.ts` | Add `adoptersFile`, `roadmapFile`, `maintainersFile`, `cocText` to `REPO_OVERVIEW_QUERY` |
| `lib/analyzer/analysis-result.ts` | Extend `DocumentationResult` with `adoptersFile`, `roadmapFile`, `maintainersFile`, `cocContent` |
| `lib/analyzer/analyze.ts` | Wire new GraphQL fields into `extractDocumentationResult()` |
| `lib/cncf-sandbox/evaluate.ts` | **NEW** — pure evaluation function; receives `AnalysisResult + CNCFLandscapeData`, returns `AspirantReadinessResult` |
| `lib/cncf-sandbox/tag-recommender.ts` | **NEW** — keyword/topic → CNCF TAG mapping (FR-014 table) |
| `lib/cncf-sandbox/landscape.ts` | **NEW** — fetches and caches `landscape.yml`; returns `CNCFLandscapeData` |
| `lib/cncf-sandbox/config.ts` | **NEW** — field weights and label strings (score-config-driven, per constitution §VI) |
| `lib/cncf-sandbox/types.ts` | **NEW** — all TypeScript types for this module |
| `app/api/analyze/route.ts` | Accept `foundationTarget` in request body; call landscape fetch + evaluate when active |
| `components/repo-input/RepoInputForm.tsx` | Add `FoundationTargetSelector` below textarea, above Analyze button |
| `lib/results-shell/tabs.ts` | Add `'cncf-readiness'` tab definition (conditional on `aspirantResult` presence) |
| `components/app-shell/ResultsShell.tsx` | Accept aspirant props; pass `cncfFields` to domain tabs; add CNCF Readiness tab |
| `components/cncf-readiness/CNCFReadinessTab.tsx` | **NEW** — full readiness checklist rendering |
| `components/overview/CNCFReadinessPill.tsx` | **NEW** — compact pill for Overview tab |
| `components/cncf-readiness/CNCFFieldBadgeInline.tsx` | **NEW** — inline ✅/⚠️/❌ badge |
| `components/cncf-readiness/LandscapeOverrideBanner.tsx` | **NEW** — informational banner for existing landscape projects |
| `components/documentation/DocumentationView.tsx` | Accept `cncfFields` and render inline badges |
| `components/security/SecurityView.tsx` | Accept `cncfFields` and render inline badge on SECURITY.md row |
| `components/contributors/ContributorsScorePane.tsx` | Accept `cncfFields` and render inline badge on diversity row |
| `components/activity/ActivityView.tsx` | Accept `cncfFields` and render inline badge on release/commit rows |

## Suggested Implementation Order

1. **Types first** — write `lib/cncf-sandbox/types.ts` with all interfaces from data-model.md. This unblocks all downstream work.
2. **GraphQL query extensions** — add the three new file-presence fields + CoC text to `REPO_OVERVIEW_QUERY` and extend `DocumentationResult`.
3. **Landscape fetcher** — write `lib/cncf-sandbox/landscape.ts`. Keep in-memory cache at module level (`let cache: CNCFLandscapeData | null`). Fetch from `https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml`. Parse with `js-yaml` (already a transitive dep). Extract `repo_url` and `homepage_url` from all entries. Handle fetch failure gracefully.
4. **Config** — write `lib/cncf-sandbox/config.ts` with the field weight table from FR-018. Export as a typed config object (consistent with `lib/scoring/config-loader.ts` pattern).
5. **TAG recommender** — write `lib/cncf-sandbox/tag-recommender.ts`. Pure function: `(topics: string[], readmeFirstParagraph: string) => TAGRecommendation`. Implement the FR-014 keyword table in priority order.
6. **Evaluator** — write `lib/cncf-sandbox/evaluate.ts`. Pure function: `(result: AnalysisResult, landscapeData: CNCFLandscapeData) => AspirantReadinessResult`. Evaluate each field against the FR-008 table. Compute score. Sort autoFields by pointsEarned ascending.
7. **API route** — extend `app/api/analyze/route.ts` to: (a) accept `foundationTarget` from request body, (b) call `fetchCNCFLandscape()` when active, (c) call `evaluateAspirant()`, (d) include result in response.
8. **Foundation target selector** — add the selector UI to `RepoInputForm.tsx`. Include `foundationTarget` in the POST body.
9. **Results Shell wiring** — extend `ResultsShell.tsx` to accept `aspirantResult` and conditionally add the CNCF Readiness tab and pass `cncfFields` props to domain tabs.
10. **Domain tab badges** — add `cncfFields` prop to DocumentationView, SecurityView, ContributorsScorePane, ActivityView and render `CNCFFieldBadgeInline` at the mapped signal rows.
11. **CNCFReadinessTab** — build the full tab content component: header, score block, three sections.
12. **Overview pill** — add `CNCFReadinessPill` to the Overview tab.
13. **LandscapeOverrideBanner** — implement the banner for existing CNCF projects.
14. **Tests** — unit tests for `evaluate.ts`, `tag-recommender.ts`, `landscape.ts` (with mocked fetch); Playwright E2E for the key acceptance scenarios.

## Critical Invariants

- The landscape fetch MUST happen server-side only. Never fetch `landscape.yml` from a browser.
- `aspirantResult` MUST be absent from the response when `foundationTarget === 'none'` or when `landscapeOverride === true`.
- Score MUST equal `Math.round(sum(pointsEarned))` across `autoFields` — computed once in `evaluate.ts`, not re-derived client-side.
- `adopters` field MUST use `'partial'` (⚠️) when the file is absent — never `'missing'` (❌).
- `lfx` and `project-activity` MUST have `weight: 0` — they are informational only and do not affect the score.
- The `'cncf-readiness'` tab MUST NOT appear in the tab list when `aspirantResult` is null or absent.
- Inline badges MUST be absent from all domain tabs when aspirant mode is off — guard rendering with `cncfFields?.length > 0`.

## Running Tests

```bash
npm run typecheck        # must pass before PR
npm test                 # Vitest unit tests
npm run test:e2e         # Playwright (if E2E tests added for this feature)
```
