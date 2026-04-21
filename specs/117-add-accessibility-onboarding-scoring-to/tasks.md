# Tasks: P2-F08 Accessibility & Onboarding Scoring

**Input**: Design documents from `specs/117-add-accessibility-onboarding-scoring-to/`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Constitution**: TDD is mandatory — tests written and failing before each implementation task.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend the analysis result type and GraphQL queries — prerequisites for all user stories.

- [X] T001 Add 4 new fields to `AnalysisResult` in `lib/analyzer/analysis-result.ts`: `goodFirstIssueCount: number | Unavailable`, `devEnvironmentSetup: boolean | Unavailable`, `gitpodPresent: boolean | Unavailable`, `newContributorPRAcceptanceRate: number | Unavailable`
- [X] T002 [P] Add devcontainer/Gitpod file-presence probes to `REPO_OVERVIEW_QUERY` in `lib/analyzer/queries.ts`: `onbDevcontainerDir`, `onbDevcontainerJson`, `onbDockerComposeYml`, `onbDockerComposeYaml`, `onbGitpod`
- [X] T003 [P] Add `$goodFirstIssueQuery` variable and `goodFirstIssues: search(...)` count field to `REPO_ACTIVITY_SEARCH_QUERY` in `lib/analyzer/queries.ts`
- [X] T004 [P] Add `authorAssociation` to `recentMergedPullRequests` node fragment and add `recentOpenFirstTimePRs` search count to `REPO_ACTIVITY_SEARCH_QUERY` in `lib/analyzer/queries.ts`

**Checkpoint**: `AnalysisResult` type compiles with new fields; GraphQL query strings include all new aliases — run `npm run typecheck`

---

## Phase 2: Foundational (Signal Extraction — Blocking Prerequisite)

**Purpose**: Wire the four new fields through the analyzer so all downstream layers have real data to consume.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Write failing unit tests for devcontainer/Gitpod extraction logic in `lib/analyzer/onboarding-signals.test.ts`: cover devcontainer dir present, `.devcontainer.json` only, docker-compose only, Gitpod only, all absent, all unavailable
- [X] T006 Implement devcontainer/Gitpod extraction in `lib/analyzer/analyze.ts`: read `onbDevcontainerDir`, `onbDevcontainerJson`, `onbDockerComposeYml`, `onbDockerComposeYaml` → `devEnvironmentSetup`; read `onbGitpod` → `gitpodPresent`
- [X] T007 Write failing unit tests for good-first-issue count extraction in `lib/analyzer/onboarding-signals.test.ts`: count > 0, count = 0, API field null/missing
- [X] T008 Implement good-first-issue count extraction in `lib/analyzer/analyze.ts`: read `goodFirstIssues.issueCount` → `goodFirstIssueCount`; populate `$goodFirstIssueQuery` search variable with label OR logic
- [X] T009 Write failing unit tests for `newContributorPRAcceptanceRate` in `lib/analyzer/onboarding-signals.test.ts`: ≥3 qualifying PRs merged/total, <3 qualifying PRs → unavailable, 0 merged of 5 → 0%, all merged → 100%
- [X] T010 Implement `newContributorPRAcceptanceRate` extraction in `lib/analyzer/analyze.ts`: filter `recentMergedPullRequests` nodes where `authorAssociation === 'FIRST_TIME_CONTRIBUTOR'`; compute ratio against `recentOpenFirstTimePRs.issueCount + mergedCount`; mark `unavailable` when total < 3
- [X] T011 Populate `missingFields` array in `lib/analyzer/analyze.ts` for any of the four new fields that resolve to `'unavailable'`

**Checkpoint**: `npm test lib/analyzer` passes; `goodFirstIssueCount`, `devEnvironmentSetup`, `gitpodPresent`, `newContributorPRAcceptanceRate` all populated correctly on mocked GraphQL fixtures

---

## Phase 3: User Story 1 — Onboarding Pill (Priority: P1) 🎯 MVP

**Goal**: The `onboarding` tag pill filters Documentation and Contributors tabs to surface all nine onboarding-tagged signals.

**Independent Test**: Activate the `onboarding` pill; verify Documentation tab shows issue template, PR template, contributing, code-of-conduct, README installation and contributing sections only; Contributors tab shows good first issues, dev environment, and new contributor PR acceptance rate only.

### Tests

- [X] T012 [P] [US1] Write failing unit tests for `lib/tags/onboarding.ts` in `lib/tags/onboarding.test.ts`: `isOnboardingItem` returns true/false for each domain set; all expected doc files, readme sections, and contributor metrics are tagged
- [X] T013 [P] [US1] Write failing unit tests for `onboarding` branch in `lib/tags/tab-counts.test.ts`: doc tab count includes issue_templates, pull_request_template, contributing, code_of_conduct; readme section count includes installation and contributing; contributors tab count includes the three new metrics

### Implementation

- [X] T014 [US1] Create `lib/tags/onboarding.ts`: define `ONBOARDING_DOC_FILES`, `ONBOARDING_README_SECTIONS`, `ONBOARDING_CONTRIBUTORS_METRICS` sets and `isOnboardingItem(key, domain)` function (tests T012 must pass)
- [X] T015 [US1] Add `onboarding` branch to `docFileMatches()`, `readmeSectionMatches()`, and contributor-metric matching in `lib/tags/tab-counts.ts` (tests T013 must pass)

**Checkpoint**: `npm test lib/tags` passes; activating `onboarding` tag in the UI filters both tabs to the correct nine signals

---

## Phase 4: User Story 2 — Community Score Integration (Priority: P2)

**Goal**: Good first issues, dev environment setup, and new contributor PR acceptance rate feed into the Community completeness score; Gitpod adds a bonus lift.

**Independent Test**: Analyze two repos — one with all three signals present, one with none — and verify their Community scores differ in the expected direction.

### Tests

- [X] T016 [P] [US2] Write failing unit tests for extended `CommunitySignalKey` in `lib/community/completeness.test.ts`: `good_first_issues` maps correctly to present/missing/unknown; `dev_environment_setup` maps correctly; `new_contributor_acceptance` applies threshold; Gitpod bonus increments present count without growing denominator
- [X] T017 [P] [US2] Write failing unit tests for `newContributorAcceptanceFloor` threshold in `lib/community/score-config.test.ts`: rate ≥ floor → present; rate < floor → missing; unavailable → unknown

### Implementation

- [X] T018 [US2] Add `'good_first_issues' | 'dev_environment_setup' | 'new_contributor_acceptance'` to `CommunitySignalKey` union in `lib/community/completeness.ts`
- [X] T019 [US2] Extend `extractSignalPresence()` in `lib/community/completeness.ts` to derive presence for the three new keys using `goodFirstIssueCount`, `devEnvironmentSetup`, and `newContributorPRAcceptanceRate` from `AnalysisResult` (tests T016 must pass)
- [X] T020 [US2] Add Gitpod bonus logic to `computeCommunityCompleteness()` in `lib/community/completeness.ts`: when `gitpodPresent === true`, push `'gitpod_bonus'` to `present[]` without incrementing denominator
- [X] T021 [US2] Add `newContributorAcceptanceFloor: number` (default 0.5) and `newContributorMinSampleSize: number` (default 3) to `lib/community/score-config.ts` (tests T017 must pass)

**Checkpoint**: `npm test lib/community` passes; Community score visibly changes between a repo with good first issues + devcontainer vs a repo with neither

---

## Phase 5: User Story 3 — Comparison Tab (Priority: P3)

**Goal**: Comparison tab includes rows for all five net-new A&O signals in the contributors section.

**Independent Test**: Compare two repos; Comparison tab shows good first issue count, dev environment setup, and new contributor PR acceptance rate rows with correct values and delta highlighting.

### Tests

- [X] T022 [US3] Write failing unit tests for the three new comparison rows in `lib/comparison/sections.test.ts`: `getValue` returns correct value or `'unavailable'`; `formatValue` formats 0%, 100%, and unavailable correctly

### Implementation

- [X] T023 [US3] Add `good-first-issues-count`, `dev-environment-setup`, and `new-contributor-pr-acceptance` attribute definitions to the `'contributors'` section in `lib/comparison/sections.ts` (test T022 must pass)

**Checkpoint**: `npm test lib/comparison` passes; Comparison tab renders the three new rows for any two-repo analysis

---

## Phase 6: Contributors Tab UI — Onboarding Pane

**Purpose**: Surface the three Contributors-tab signals visually in a named pane.

- [X] T024 Write failing component tests for `OnboardingPane` in `components/contributors/OnboardingPane.test.tsx`: renders good first issue count (0 shows as 0, not hidden); shows dev environment setup present/not-detected; shows acceptance rate as percentage or "unavailable"; shows Gitpod as present/—; shows all signals as unavailable when all are `'unavailable'`
- [X] T025 Create `components/contributors/OnboardingPane.tsx`: render good first issue count, dev environment setup (primary + Gitpod bonus), and new contributor PR acceptance rate with ✓/✗ indicators and unavailable handling (test T024 must pass)
- [X] T026 Wire `OnboardingPane` into `components/contributors/ContributorsView.tsx` or equivalent: render pane always-visible in the Contributors tab; apply `onboarding` tag filtering to show/hide when pill is active

**Checkpoint**: `npm test components/contributors` passes; OnboardingPane renders correctly for all data states in the browser at `http://localhost:3014`

---

## Phase 7: Recommendations, Exports, and Missing Data

**Purpose**: Cross-cutting concerns — recommendations catalog, exports, and missing data panel.

- [X] T027 [P] Add CTR-8 (`good_first_issues`), CTR-9 (`dev_environment_setup`), CTR-10 (`new_contributor_acceptance`) entries to `lib/recommendations/catalog.ts` with `onboarding` tag
- [X] T028 [P] Add `onboarding` block to `lib/export/json-export.ts`: include `goodFirstIssueCount`, `devEnvironmentSetup`, `gitpodPresent`, `newContributorPRAcceptanceRate` (or `'unavailable'` markers)
- [X] T029 [P] Add onboarding signals table to `lib/export/markdown-export.ts`: four rows — Good first issues, Dev environment setup, Gitpod support, New contributor PR acceptance
- [X] T030 Write unit tests for the three catalog entries in `lib/recommendations/catalog.test.ts` (if catalog has tests) and for the onboarding block in `lib/export/json-export.test.ts` and `lib/export/markdown-export.test.ts`

**Checkpoint**: `npm test lib/recommendations lib/export` passes; JSON and Markdown exports include onboarding signals

---

## Phase 8: Polish & Verification

- [X] T031 [P] Run `npm run lint` and `npm run typecheck` — fix all errors
- [X] T032 [P] Run full test suite `npm test` — all tests pass
- [X] T033 [P] Run `npm run build` — production build succeeds (with `DEV_GITHUB_PAT=` prefix per DEVELOPMENT.md)
- [X] T034 Update `docs/DEVELOPMENT.md` Phase 2 feature order table: mark P2-F08 as ✅ Done
- [X] T035 Manual browser verification at `http://localhost:3014`: activate `onboarding` pill, verify Documentation and Contributors tabs filter correctly; verify OnboardingPane renders for a real repo; verify Community score changes; verify Comparison tab shows new rows; verify JSON and Markdown exports include onboarding block

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — T001–T004 can start immediately; T002/T003/T004 are parallel
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story phases; T005–T011 sequential within phase
- **Phase 3 (US1 — Pill)**: Depends on Phase 2; T012/T013 parallel, T014 after T012, T015 after T013
- **Phase 4 (US2 — Community Score)**: Depends on Phase 2; T016/T017 parallel, T018–T021 sequential
- **Phase 5 (US3 — Comparison)**: Depends on Phase 2; T022 then T023
- **Phase 6 (UI)**: Depends on Phase 2 and Phase 3 (pill active state); T024 → T025 → T026
- **Phase 7 (Cross-cutting)**: Depends on Phase 2; T027/T028/T029 parallel, T030 after all three
- **Phase 8 (Polish)**: Depends on all preceding phases

### Parallel Opportunities

```bash
# Phase 1 — run together after T001:
T002  # devcontainer probes in queries.ts
T003  # goodFirstIssues search variable
T004  # authorAssociation + openFirstTimePRs

# Phase 3 — run together:
T012  # onboarding.test.ts
T013  # tab-counts.test.ts

# Phase 4 — run together:
T016  # completeness.test.ts
T017  # score-config.test.ts

# Phase 7 — run together:
T027  # recommendations catalog
T028  # json-export
T029  # markdown-export
```

---

## Implementation Strategy

### MVP (Phase 1 + 2 + 3 only)

1. Extend `AnalysisResult` type and GraphQL queries (Phase 1)
2. Extract all four signals in the analyzer (Phase 2)
3. Create `onboarding` tag and wire tab counts (Phase 3)
4. **STOP and VALIDATE**: pill filters both tabs correctly, signals display in Contributors tab

### Full delivery

Add Phase 4 (Community score) → Phase 5 (Comparison) → Phase 6 (UI pane) → Phase 7 (exports + recommendations) → Phase 8 (polish)

---

## Notes

- `[P]` = different files, no blocking dependency — safe to run in parallel
- TDD is mandatory per constitution §XI: each test task must produce failing tests before the paired implementation task runs
- Minimum sample floor for `newContributorPRAcceptanceRate`: 3 qualifying PRs (configurable via `newContributorMinSampleSize`)
- Gitpod (`gitpodPresent`) is bonus-only — never penalises the Community score when absent
- Dev server is running on port 3014 for manual verification
