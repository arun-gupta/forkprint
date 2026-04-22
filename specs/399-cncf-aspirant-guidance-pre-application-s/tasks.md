# Tasks: CNCF Aspirant Guidance (Pre-Application Sandbox Readiness)

**Input**: Design documents from `specs/399-cncf-aspirant-guidance-pre-application-s/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story label (US1–US8)

---

## Phase 1: Setup (Shared Types & Config)

**Purpose**: Establish the `lib/cncf-sandbox/` module with all types and score configuration before any evaluation or UI work begins.

- [x] T001 Create `lib/cncf-sandbox/types.ts` with all TypeScript interfaces from data-model.md: `FoundationTarget`, `AspirantFieldStatus`, `AspirantField`, `AspirantReadinessResult`, `TAGRecommendation`, `CNCFTag`, `CNCFLandscapeData`, `LandscapeCategory`, `CNCFFieldBadge`
- [x] T002 [P] Create `lib/cncf-sandbox/config.ts` with the FR-018 field weight table (10 entries + 11 human-only fields), all field IDs, labels, and human-only guidance notes from FR-015 — exported as a typed config object (consistent with `lib/scoring/config-loader.ts` pattern)

**Checkpoint**: `npm run typecheck` must pass with zero errors after these two tasks.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: GraphQL extensions, landscape fetcher, core evaluator, and API route changes. MUST be complete before any user story UI work.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [x] T003 Extend `REPO_OVERVIEW_QUERY` in `lib/analyzer/queries.ts`: add `adoptersFile` (HEAD:ADOPTERS.md + HEAD:ADOPTERS), `roadmapFile` (HEAD:ROADMAP.md + HEAD:docs/ROADMAP.md), `maintainersFile` (HEAD:MAINTAINERS + HEAD:MAINTAINERS.md + HEAD:.github/CODEOWNERS + HEAD:CODEOWNERS), and `cocText: object(expression: "HEAD:CODE_OF_CONDUCT.md") { ... on Blob { text } }` (limited to first 2000 bytes via text field)
- [x] T004 Extend `DocumentationResult` in `lib/analyzer/analysis-result.ts`: add `adoptersFile: boolean`, `roadmapFile: boolean`, `maintainersFile: boolean`, `cocContent: string | null` fields
- [x] T005 Wire the four new GraphQL fields into `extractDocumentationResult()` in `lib/analyzer/analyze.ts`: map each new field from the query response to the new `DocumentationResult` fields; `cocContent` is `blob.text?.slice(0, 2000) ?? null`
- [x] T006 [P] Create `lib/cncf-sandbox/landscape.ts`: module-level `let cache: CNCFLandscapeData | null = null`; `fetchCNCFLandscape()` fetches `https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml`, parses with `js-yaml`, extracts all `repo_url` and `homepage_url` values into normalized lowercase Sets, extracts `LandscapeCategory` entries; returns cached result on subsequent calls; returns `null` on fetch failure
- [x] T007 Create `lib/cncf-sandbox/evaluate.ts`: pure function `evaluateAspirant(result: AnalysisResult, landscapeData: CNCFLandscapeData | null): AspirantReadinessResult` — evaluates all 10 auto-checkable fields (roadmap, contributing, CoC via Contributor Covenant string check, maintainers, security, license against CNCF allowlist, adopters always-⚠️-if-absent, landscape listing, LFX always-partial weight-0, contributor diversity with all 5 sub-cases from FR-011, project activity with all 5 sub-cases from FR-012); computes `readinessScore = Math.round(sum(pointsEarned))`; sorts `autoFields` by `pointsEarned` ascending; sets `alreadyInLandscape` correctly; builds `humanOnlyFields` from config
- [x] T008 Extend `app/api/analyze/route.ts`: accept `foundationTarget?: FoundationTarget` from request body; when `'cncf-sandbox'`, call `fetchCNCFLandscape()` then `evaluateAspirant()`; include `aspirantResult` or `landscapeOverride: true` in response JSON; when `foundationTarget` is absent or `'none'`, omit both fields from response

**Checkpoint**: `npm run typecheck` passes. Unit test `evaluate.ts` in isolation with mock `AnalysisResult` data (no UI changes yet).

---

## Phase 3: User Story 1 — Foundation Selector + Core CNCF Readiness UI (Priority: P1) 🎯 MVP

**Goal**: User selects "CNCF Sandbox" before analysis, sees the Overview pill and the CNCF Readiness tab with all auto-detectable fields ✅/⚠️/❌, each with remediation hints.

**Independent Test**: Analyze any public repo, select "CNCF Sandbox" from the foundation target selector, click Analyze, verify the "CNCF Sandbox Readiness X / 100" pill appears on Overview and the "CNCF Readiness" tab appears in the tab strip with the full per-field checklist.

- [x] T009 [US1] Add `foundationTarget: FoundationTarget` and `onFoundationTargetChange` props to `RepoInputForm.tsx`; render a `<select>` (or equivalent) below the repo textarea with options: None (default), CNCF Sandbox, CNCF Incubating (disabled + "Coming soon" tooltip), CNCF Graduated (disabled + "Coming soon" tooltip); include `foundationTarget` in the POST body to `/api/analyze`
- [x] T010 [P] [US1] Add `'cncf-readiness'` to `ResultTabId` union in `lib/results-shell/tabs.ts`; define the tab metadata entry (label "CNCF Readiness", icon if applicable) conditionally included when `aspirantResult !== null`
- [x] T011 [US1] Create `components/cncf-readiness/CNCFReadinessTab.tsx`: renders header "Targeting: CNCF Sandbox", score summary ("CNCF Readiness Score: X / 100 — N of 10 auto-checkable fields ready"), three sections: "Ready to submit" (autoFields where status=`ready`), "Needs work before submitting" (autoFields where status=`partial` or `missing`, sorted by pointsEarned ascending, each showing point impact: "+N pts if resolved"), "Needs your input" (humanOnlyFields as a plain to-do checklist with `explanatoryNote` shown)
- [x] T012 [P] [US1] Create `components/overview/CNCFReadinessPill.tsx`: compact pill showing "CNCF Sandbox Readiness  X / 100" with color coding (green ≥ 80, amber 50–79, red < 50); clicking calls `onClickNavigate()` to activate the CNCF Readiness tab
- [x] T013 [US1] Extend `ResultsShell.tsx`: accept `aspirantResult?: AspirantReadinessResult | null` and `landscapeOverride?: boolean` props; conditionally add `'cncf-readiness'` to the tab list when `aspirantResult !== null`; render `CNCFReadinessPill` in the Overview tab section when active; render `CNCFReadinessTab` content when the CNCF Readiness tab is selected
- [x] T014 [US1] Wire `aspirantResult` from the `/api/analyze` response through the client-side analysis state to `ResultsShell` props; ensure `foundationTarget` state is initialized to `'none'` and passed from the top-level page/form component down to `RepoInputForm`

**Checkpoint**: Full US1 flow works end-to-end. Pill appears, tab appears, all 10 auto-checkable fields show ✅/⚠️/❌ with remediation hints. Human-only fields appear in "Needs your input" section.

---

## Phase 4: User Story 2 — Contributor Diversity Signal (Priority: P2)

**Goal**: When aspirant mode is active, contributor diversity shows correct ✅/⚠️ status with the appropriate sub-case remediation hint based on org count and concentration data already in the analysis payload.

**Independent Test**: With aspirant mode active for a repo where all top contributors are from one org, verify the CNCF Readiness tab shows ⚠️ for Contributor Diversity with the single-org concentration remediation hint.

- [ ] T015 [US2] Verify `evaluate.ts` (T007) correctly handles all 5 contributor diversity sub-cases from FR-011: ✅ (3+ orgs, none >50%), ⚠️-2-orgs, ⚠️-concentration (3+ orgs but one >50%), ⚠️-single-org, ⚠️-unverifiable; each sub-case must produce a distinct `remediationHint` string as specified in the acceptance scenarios; fix any gaps found during manual testing
- [ ] T016 [P] [US2] Add unit tests in `tests/unit/cncf-sandbox/evaluate.test.ts` covering all 5 contributor diversity sub-cases using mock `commitCountsByExperimentalOrg` payloads

**Checkpoint**: All 5 contributor diversity sub-cases produce the correct status and distinct remediation hint in the CNCF Readiness tab.

---

## Phase 5: User Story 3 — Project Activity Signal (Priority: P3)

**Goal**: When aspirant mode is active, project activity shows correct ✅/⚠️ status with the appropriate sub-case hint, including the visibility-gap (Reloader) sub-case.

**Independent Test**: With aspirant mode active for a repo that has version tags but zero formal GitHub Releases, verify the CNCF Readiness tab shows ⚠️ for Project Activity with the visibility-gap hint referencing the Reloader pattern.

- [ ] T017 [US3] Verify `evaluate.ts` (T007) correctly handles all 5 project activity sub-cases from FR-012: ✅ (4+ formal releases in 12 months AND 10+ commits in 90 days, OR <6 months old with active commits), ⚠️-visibility-gap (tags but no formal releases), ⚠️-low-cadence (1–3 formal releases), ⚠️-low-commits (1–9 commits in 90 days), ⚠️-new-project (0 releases AND <6 months old); each sub-case must produce a distinct `remediationHint`; fix any gaps
- [ ] T018 [P] [US3] Add unit tests in `tests/unit/cncf-sandbox/evaluate.test.ts` covering all 5 project activity sub-cases using mock `ReleaseHealthResult` and commit count data from the existing analysis payload

**Checkpoint**: All 5 project activity sub-cases produce the correct status and distinct hint. Visibility-gap hint explicitly references the Reloader pattern.

---

## Phase 6: User Story 4 — CNCF Readiness Score + Ranked Recommendations (Priority: P4)

**Goal**: The Overview pill and CNCF Readiness tab show a 0–100 score, and "Needs work before submitting" items are sorted by point impact descending so the highest-value fix appears first.

**Independent Test**: With aspirant mode active on a repo missing License (12 pts) and Roadmap (10 pts), verify "Needs work" lists License first (+12 pts if resolved), then Roadmap (+10 pts if resolved).

- [ ] T019 [US4] Audit `CNCFReadinessTab.tsx` (T011): confirm "Needs work before submitting" items are rendered in descending point-impact order (highest first); each item must show "+N pts if resolved" for ❌ (full weight) or "+N pts if resolved" for ⚠️ (half weight); fix rendering order if autoFields sort from evaluate.ts is ascending (reverse before rendering in this section)
- [ ] T020 [P] [US4] Audit score accuracy: add unit tests in `tests/unit/cncf-sandbox/evaluate.test.ts` for score boundary cases — all-✅ (100), all-❌ (0), all-⚠️ (50), and a mixed realistic case (e.g., 6 ready + 2 partial + 2 missing = specific expected score)

**Checkpoint**: Score is accurate across all field-status combinations. Point impact is shown per item. Items sorted highest-impact-first.

---

## Phase 7: User Story 5 — Cross-Tab Inline CNCF Badges (Priority: P5)

**Goal**: When aspirant mode is active, each domain tab shows an inline "CNCF Sandbox" badge with ✅/⚠️/❌ status next to every signal that maps to a CNCF application form field. Badges are absent when aspirant mode is off. Each badge in the CNCF Readiness tab deep-links to its home tab.

**Independent Test**: With aspirant mode active, navigate to the Documentation tab and verify a "CNCF Sandbox" badge appears next to CONTRIBUTING.md, CODE_OF_CONDUCT.md, ROADMAP.md, MAINTAINERS, and ADOPTERS.md rows. Navigate to Security tab — badge appears next to SECURITY.md. Switch aspirant mode off — all badges disappear.

- [ ] T021 [US5] Create `components/cncf-readiness/CNCFFieldBadgeInline.tsx`: renders a compact inline badge "[status-icon] CNCF Sandbox" where status-icon is ✅/⚠️/❌ based on `status` prop; returns `null` when not rendered (callers gate on `cncfFields?.length > 0`)
- [ ] T022 [P] [US5] Add `cncfFields?: CNCFFieldBadge[]` prop to `components/documentation/DocumentationView.tsx`; render `CNCFFieldBadgeInline` inline next to: ROADMAP.md row (`fieldId: 'roadmap'`), CONTRIBUTING.md row (`fieldId: 'contributing'`), CODE_OF_CONDUCT.md row (`fieldId: 'coc'`), MAINTAINERS/CODEOWNERS row (`fieldId: 'maintainers'`), ADOPTERS.md row (`fieldId: 'adopters'`)
- [ ] T023 [P] [US5] Add `cncfFields?: CNCFFieldBadge[]` prop to `components/security/SecurityView.tsx`; render `CNCFFieldBadgeInline` next to the SECURITY.md presence row (`fieldId: 'security'`)
- [ ] T024 [P] [US5] Add `cncfFields?: CNCFFieldBadge[]` prop to `components/contributors/ContributorsScorePane.tsx`; render `CNCFFieldBadgeInline` next to the org diversity / sustainability signal row (`fieldId: 'contributor-diversity'`)
- [ ] T025 [P] [US5] Add `cncfFields?: CNCFFieldBadge[]` prop to `components/activity/ActivityView.tsx`; render `CNCFFieldBadgeInline` next to the release cadence row and commit frequency row (`fieldId: 'project-activity'`)
- [ ] T026 [US5] Extend `ResultsShell.tsx` (T013): build `cncfFields: CNCFFieldBadge[]` array from `aspirantResult.autoFields` and pass it to DocumentationView, SecurityView, ContributorsScorePane, ActivityView — pass empty array or omit when `aspirantResult` is null
- [ ] T027 [US5] Add deep-links to `CNCFReadinessTab.tsx` (T011): each checklist item whose `AspirantField.homeTab` is defined renders a link/button that calls `onNavigateToTab(field.homeTab)` — items with no `homeTab` (landscape, human-only) have no link

**Checkpoint**: Full cross-tab badge system works. Badges appear in Documentation, Security, Contributors, Activity tabs when active. Deep-links in CNCF Readiness tab navigate correctly to home tabs.

---

## Phase 8: User Story 6 + User Story 7 — Landscape Auto-Detection Override (Priority: P6/P7)

**Goal**: Repos already listed in the CNCF landscape do NOT enter aspirant mode — instead a banner explains why and directs the user toward "CNCF Incubating" (disabled, coming soon). Repos with no CNCF affiliation proceed to aspirant mode normally.

**Independent Test**: Analyze `github.com/kubernetes/kubernetes` (in CNCF landscape), select "CNCF Sandbox" — aspirant panel does NOT appear, banner is shown. Then analyze an OSS repo not in the landscape with "CNCF Sandbox" — aspirant mode activates normally.

- [ ] T028 [US6] Create `components/cncf-readiness/LandscapeOverrideBanner.tsx`: static banner rendering "This project is already a CNCF Sandbox project. To assess readiness for Incubation, select 'CNCF Incubating' from the foundation target selector." — no props needed
- [ ] T029 [US6] Wire `landscapeOverride` in `ResultsShell.tsx` (T013): when `landscapeOverride === true`, render `LandscapeOverrideBanner` in place of the `CNCFReadinessPill` and suppress the `'cncf-readiness'` tab; when `landscapeOverride === false` or absent, no banner
- [ ] T030 [P] [US7] Verify `evaluate.ts` (T007) sets `alreadyInLandscape: true` when the analyzed repo URL appears in `landscapeData.repoUrls` (normalized lowercase match); add a unit test in `tests/unit/cncf-sandbox/evaluate.test.ts` for this branch

**Checkpoint**: Kubernetes or any CNCF landscape repo shows the override banner. Non-landscape repo activates aspirant mode normally.

---

## Phase 9: User Story 8 — Reset Foundation Target (Priority: P8)

**Goal**: The user can switch the foundation target selector back to "None" and the aspirant panel disappears, restoring the standard analysis view.

**Independent Test**: Activate aspirant mode, then change the selector to "None" and re-analyze — pill and CNCF Readiness tab both disappear.

- [ ] T031 [US8] Verify that the `foundationTarget` state in the page/form component correctly drives `ResultsShell` — when `foundationTarget` changes to `'none'` and a new analysis runs, `aspirantResult` is absent from the response and the pill/tab are not rendered; confirm no stale state from the previous analysis bleeds through; fix any state management issues found

**Checkpoint**: Selector reset clears the aspirant panel cleanly.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: TAG recommendation, human-only field guidance wiring, error/edge-case handling, unit tests, E2E tests.

- [ ] T032 Create `lib/cncf-sandbox/tag-recommender.ts`: pure function `recommendTAG(topics: string[], readmeFirstParagraph: string): TAGRecommendation` implementing the FR-014 priority-ordered keyword table for the 5 active CNCF TAGs; returns `primaryTag: null` with `fallbackNote` when no keywords match
- [ ] T033 [P] Wire TAG recommendation into `evaluate.ts` (T007): call `recommendTAG()` with `repositoryTopics` and README first paragraph from the analysis result; include result in `AspirantReadinessResult.tagRecommendation`
- [ ] T034 [P] Surface TAG recommendation in `CNCFReadinessTab.tsx` (T011): in the "Needs your input" section, show the `primaryTag` recommendation (or fallback note) alongside the TAG engagement guidance text from FR-015
- [ ] T035 Add unit tests in `tests/unit/cncf-sandbox/tag-recommender.test.ts`: one test per TAG matching at least 3 distinct keywords, one test for no-match fallback, one test for priority (first-match wins when multiple TAGs could match)
- [ ] T036 [P] Add unit tests in `tests/unit/cncf-sandbox/landscape.test.ts`: mock `fetch()` to return a minimal landscape.yml fixture; verify URL normalization, cache hit behavior, and graceful null return on fetch failure
- [ ] T037 [P] Verify all FR-015 human-only field guidance notes are wired from `lib/cncf-sandbox/config.ts` into `humanOnlyFields` built by `evaluate.ts`; spot-check 3 fields (why-cncf, business-separation, tag-engagement) against spec verbatim text
- [ ] T038 Add E2E test in `tests/e2e/cncf-aspirant.spec.ts` covering: SC-001 (selector → pill + tab appear after analysis), SC-008 (landscape repo does NOT enter aspirant mode), SC-012 (inline badges present when active, absent when off); use Playwright DOM assertions (not visual snapshots) per project E2E style
- [ ] T039 [P] Run `npm run typecheck` and `npm test` — fix any remaining type errors or failing tests
- [ ] T040 [P] Run `npm run lint` — fix any lint warnings introduced by this feature

**Checkpoint**: All automated checks pass. TAG recommendation surfaces in the CNCF Readiness tab. Human-only guidance text matches spec. E2E covers the three key acceptance scenarios.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (types needed in evaluate.ts) — **BLOCKS all user story phases**
- **Phase 3 (US1)**: Depends on Phase 2 — first deliverable UI
- **Phase 4 (US2)**: Depends on Phase 2 (evaluate.ts); Phase 3 recommended first (tab UI must exist)
- **Phase 5 (US3)**: Depends on Phase 2; Phase 3 recommended first
- **Phase 6 (US4)**: Depends on Phase 3 (tab rendering must exist before audit/fix of sort order)
- **Phase 7 (US5)**: Depends on Phase 3 (ResultsShell extension); T021–T025 can run in parallel
- **Phase 8 (US6+US7)**: Depends on Phase 2 (landscape detection in evaluate.ts) and Phase 3 (ResultsShell)
- **Phase 9 (US8)**: Depends on Phase 3 (state management)
- **Phase 10 (Polish)**: Depends on Phase 3+; T032–T037 can run in parallel after Phase 3

### User Story Dependencies

- **US1 (P1)**: Only depends on Foundational phase — no story dependencies
- **US2 (P2)**: Depends on Foundational (evaluate.ts) and US1 (tab UI) — can verify in US1's tab once built
- **US3 (P3)**: Same as US2
- **US4 (P4)**: Depends on US1 (tab must render before sort-order audit)
- **US5 (P5)**: Depends on US1 (ResultsShell wiring); domain tab badge tasks T022–T025 are parallel
- **US6+US7 (P6/P7)**: Depends on Foundational (landscape detection) and US1 (ResultsShell)
- **US8 (P8)**: Depends on US1 (state management established in Phase 3)

### Within Each Phase

- Types before services; services before UI; UI before E2E tests
- T003 → T004 → T005 are sequential (GraphQL → types → extraction)
- T006 and T007 can start in parallel after T003–T005 complete
- T008 must come before the test plan can be validated end-to-end

### Parallel Opportunities

```bash
# Phase 1 — both tasks independent:
T001 lib/cncf-sandbox/types.ts
T002 lib/cncf-sandbox/config.ts

# Phase 2 — landscape and first part of evaluate can start together after T005:
T006 lib/cncf-sandbox/landscape.ts
T007 lib/cncf-sandbox/evaluate.ts  (after T003–T005)
T008 app/api/analyze/route.ts       (after T006, T007)

# Phase 7 — all four domain tab badges are independent:
T022 DocumentationView.tsx
T023 SecurityView.tsx
T024 ContributorsScorePane.tsx
T025 ActivityView.tsx

# Phase 10 — independent polish tasks:
T033 evaluate.ts TAG wiring
T035 tag-recommender.test.ts
T036 landscape.test.ts
T037 human-only guidance audit
```

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + Phase 3 / US1 only)

1. Complete Phase 1: types + config
2. Complete Phase 2: GraphQL extensions, landscape fetcher, evaluate.ts, API route
3. Complete Phase 3 (US1): selector UI, CNCF Readiness tab, Overview pill, ResultsShell wiring
4. **STOP and VALIDATE**: Full end-to-end flow — selector → analysis → pill + tab with all 10 fields
5. All subsequent phases add value incrementally without breaking US1

### Incremental Delivery

- **After Phase 3**: MVP — core aspirant mode with all field evaluations and the CNCF Readiness tab
- **After Phase 4+5**: Diversity and activity sub-cases fully validated
- **After Phase 6**: Score ranking and point-impact display
- **After Phase 7**: Cross-tab badge annotation system
- **After Phase 8**: Landscape override protection
- **After Phase 10**: Full polish + tests

---

## Notes

- `[P]` tasks touch different files and have no shared write conflicts — safe to implement simultaneously
- Each user story phase ends with a named checkpoint — validate before moving to the next phase
- `evaluate.ts` is the most critical file: all field evaluations, score computation, and sub-case logic live here; write it once carefully in Phase 2 rather than incrementally patching it across phases
- Inline badges (`cncfFields` prop) are purely additive to existing domain tab components — no existing behavior changes
- Never re-fetch landscape data client-side; all landscape access is through the server response
