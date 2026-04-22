# Research: CNCF Aspirant Guidance (399)

## Decision 1: CNCF Landscape Fetch Strategy

**Decision**: Fetch `https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml` server-side during the analysis pipeline when `foundationTarget === 'cncf-sandbox'`. Parse YAML on the server (using `js-yaml`, already a transitive dependency) and extract all `repo_url` and `homepage_url` values. Cache the parsed result in-memory for the duration of the server process to avoid re-fetching per repo.

**Rationale**: The landscape.yml is ~4MB of YAML. Fetching it client-side would expose it to CORS issues and slow the browser. Server-side fetch keeps it consistent with the existing proxy pattern for all GitHub API calls. In-memory caching avoids redundant fetches when analyzing multiple repos in one session.

**Alternatives considered**:
- GitHub GraphQL API to read the file: would count against user's rate limit quota; raw.githubusercontent.com is unauthenticated and free.
- Separate `/api/cncf-landscape` route: unnecessary indirection — the data is needed only when `foundationTarget` is set and flows naturally through `/api/analyze`.

---

## Decision 2: Where the Foundation Target Selector Lives in the UI

**Decision**: Add a `foundationTarget` field to the repo input form (`components/repo-input/RepoInputForm.tsx`). It renders as a compact selector control beneath the repo textarea, before the Analyze button. The value is included in the POST body to `/api/analyze` so the server knows to include the CNCF landscape fetch.

**Rationale**: The spec requires the selector be available before Analyze is clicked so the landscape fetch is part of the pipeline. The existing `RepoInputForm` already has a mode selector pattern (`'repos' | 'org'`) that can be extended. Placing it in the form keeps all analysis intent in one place.

**Alternatives considered**:
- Post-analysis toggle: rejected by spec — the landscape data must be fetched during analysis.
- Separate "Foundation" form step: over-engineered for a single dropdown.

---

## Decision 3: CNCF Readiness Evaluation Location

**Decision**: Create `lib/cncf-sandbox/evaluate.ts` as a pure function module. It receives an `AnalysisResult` and a `CNCFLandscapeData` object and returns an `AspirantReadinessResult`. Called server-side in `/api/analyze/route.ts` after the existing analysis pipeline, and the result is added to the analysis response.

**Rationale**: Keeps evaluation logic out of components (testable in isolation), consistent with how `extractDocumentationResult()`, `extractActivityScore()` etc. work in `lib/analyzer/analyze.ts`.

**Alternatives considered**:
- Client-side evaluation: landscape data would need to be sent to the client (~4MB). Rejected.
- Inline in analyze.ts: that file is already 2600+ lines. Separate module is cleaner.

---

## Decision 4: New GraphQL Fields Needed

**Decision**: Add three new file-presence checks to `REPO_OVERVIEW_QUERY` in `lib/analyzer/queries.ts`:
- `adoptersFile: object(expression: "HEAD:ADOPTERS.md")` (+ lowercase, plus `/docs/` variant)
- `roadmapFile: object(expression: "HEAD:ROADMAP.md")` (+ lowercase, + `/docs/` variant)
- `maintainersFile: object(expression: "HEAD:MAINTAINERS")` (+ `.md`, `CODEOWNERS`, `.github/CODEOWNERS`)

Note: MAINTAINERS was partially handled via REST (`fetchMaintainerCount`) but not as a simple file-presence boolean in `DocumentationResult`. We add it as a dedicated boolean.

**Rationale**: These are the only three CNCF-required files not already in the `documentationResult.fileChecks` payload. All other signals (CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, README, LICENSE) are already fetched.

---

## Decision 5: Conditional CNCF Readiness Tab

**Decision**: Add `'cncf-readiness'` to the `ResultTabId` union in `specs/006-results-shell/contracts/results-shell-props.ts` and to `lib/results-shell/tabs.ts`. The tab is only included in the rendered tab list when `aspirantResult !== null`. `ResultsShell.tsx` receives `aspirantResult?: AspirantReadinessResult | null` as a new prop and conditionally adds the tab.

**Rationale**: The existing tab system in `ResultsTabs.tsx` already handles dynamic tab lists — tabs are passed as an array prop. Conditional inclusion is the simplest approach without special-casing inside the tab strip component.

---

## Decision 6: Cross-Tab Badge Implementation

**Decision**: Each domain tab component (DocumentationView, SecurityView, ContributorsScorePane, ActivityView) receives an optional `cncfFields?: CNCFFieldBadge[]` prop. A `CNCFFieldBadge` has `{ fieldId: string; label: string; status: AspirantFieldStatus }`. Each component renders a small `<CNCFBadge>` inline next to the relevant signal row when the prop is non-empty. The badge is purely presentational — it reads status from the prop, not by re-evaluating signals.

**Rationale**: Passing pre-computed status avoids duplication of evaluation logic. Each domain component stays responsible for its own layout; the badge is a thin addition.

---

## Decision 7: TAG Recommendation — Topic/Keyword Matching

**Decision**: Implement `lib/cncf-sandbox/tag-recommender.ts` that receives `repo.repositoryTopics` (already in the GraphQL response as `topics`) and the README first paragraph (already fetched). Applies the keyword priority table from FR-014 in order. Returns one primary TAG recommendation and a fallback note if no match is found. No ML, no external API — pure string matching.

**Rationale**: The topics array is already in the analysis payload. String matching against the FR-014 keyword table is deterministic and testable. The CNCF TAG list (5 TAGs) is stable enough to hardcode with a config update path.

---

## Decision 8: LFX Insights Field

**Decision**: LFX Insights is a static `AspirantField` with status always `'partial'` (shown as ⚠️), a fixed remediation hint, and a direct URL `https://insights.linuxfoundation.org`. It is not fetched or evaluated — it is constructed at evaluation time as a known-manual-check field. Its weight in the score is 0 (it does not contribute to the 100-pt score since it cannot be auto-verified).

**Rationale**: We cannot auto-verify LFX listing without a stable API. Making it always ⚠️ with weight 0 means it appears in the checklist (fulfilling the spec requirement that it not be hidden) without distorting the score.

---

## Decision 9: Code of Conduct Content Check

**Decision**: Fetch `CODE_OF_CONDUCT.md` blob text (not just oid) in the GraphQL query — limited to first 2000 bytes via `text` field. Check if it contains the string "Contributor Covenant". If content is null/unavailable, show ⚠️. If content present and matches, show ✅. If content present but no match, show ⚠️.

**Rationale**: This is the only file where content matters (not just presence). All other files are presence-only checks (oid is sufficient). Limiting to 2000 bytes keeps the query lightweight.

---

## Resolved: Release Distinction (Formal vs. Bare Tags)

The existing `ReleaseHealthResult` already captures:
- `totalReleasesAnalyzed` — formal GitHub releases (have `publishedAt`)
- `totalTags` — total refs count
- `tagToReleaseRatio` — ratio of tags to releases

The CNCF activity threshold (4+ formal releases with release notes in 12 months) uses `totalReleasesAnalyzed` filtered to the last 12 months. The "visibility gap" condition (tags but no formal releases) is detected when `totalTags > 0 AND totalReleasesAnalyzed === 0`. Both values are already in the payload — no new fetching needed.

---

## Resolved: Org Diversity Data

`commitCountsByExperimentalOrg: Record<string, number>` is already in the payload. It maps org login → commit count for the top-10 contributors. The contributor diversity thresholds from the spec (3+ orgs, no org >50%) can be computed directly from this record. No new API calls needed.
