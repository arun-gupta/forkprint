# Tasks: Security Scoring (P2-F07)

**Input**: Design documents from `/specs/130-security-scoring/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: TDD is mandatory per constitution Section XI. Test tasks are included for each phase.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the security module structure and shared types

- [x] T001 Create SecurityResult, ScorecardAssessment, ScorecardCheck, DirectSecurityCheck types in lib/security/analysis-result.ts per data-model.md
- [x] T002 Create SecurityScoreDefinition and SecurityRecommendation types in lib/security/analysis-result.ts
- [x] T003 Add `securityResult: SecurityResult | Unavailable` field to AnalysisResult interface in lib/analyzer/analysis-result.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend GraphQL queries and analyzer to collect security-related file data for all repos

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Write tests for GraphQL security file aliases (dependabot.yml, renovate.json, .github/renovate.json, .github/workflows tree) in lib/security/__tests__/direct-checks.test.ts
- [x] T005 Add GraphQL aliases for `.github/dependabot.yml`, `renovate.json`, `.github/renovate.json`, and `.github/workflows` (tree check) to REPO_OVERVIEW_QUERY in lib/analyzer/queries.ts
- [x] T006 Extract security file detection results from GraphQL response into SecurityResult.directChecks in lib/analyzer/analyze.ts — populate `securityResult` on AnalysisResult with direct checks and `scorecard: 'unavailable'` as initial default
- [x] T007 Update existing analyzer tests to include the new securityResult field in lib/analyzer/__tests__/ (ensure no regressions)

**Checkpoint**: Every analyzed repo now has a `securityResult` with direct file check data. Scorecard is still "unavailable".

---

## Phase 3: User Story 1 — Scorecard Integration (Priority: P1) MVP

**Goal**: Fetch OpenSSF Scorecard data and display it in a new Security section

**Independent Test**: Analyze a repo in the Scorecard dataset (e.g., `kubernetes/kubernetes`) and verify Scorecard check results are displayed with scores

### Tests for User Story 1

> **Write tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Write tests for Scorecard API client: success response, 404 (not in dataset), network error, timeout (5s) in lib/security/__tests__/scorecard-client.test.ts
- [x] T009 [P] [US1] Write tests for security score computation Mode A (Scorecard + direct checks): composite = scorecardNormalized * 0.60 + directComposite * 0.40 in lib/security/__tests__/score-config.test.ts
- [x] T010 [P] [US1] Write tests for SecurityView component with Scorecard data: renders overall score, individual check scores, mode indicator showing "Scorecard + direct checks" in __tests__/security/SecurityView.test.tsx

### Implementation for User Story 1

- [x] T011 [US1] Implement Scorecard API client: `fetchScorecardData(owner, repo)` with 5s timeout, 404 → 'unavailable', error → 'unavailable' in lib/security/scorecard-client.ts
- [x] T012 [US1] Call Scorecard API in analyze.ts in parallel with existing GitHub API calls — populate `securityResult.scorecard` with response or 'unavailable' in lib/analyzer/analyze.ts
- [x] T013 [US1] Implement `getSecurityScore(securityResult, stars)` with Mode A scoring (Scorecard available): normalize Scorecard overall score to 0-1, weight at 60%, direct checks at 40%, generate recommendations for low Scorecard checks in lib/security/score-config.ts
- [x] T014 [US1] Add security bucket to health score: add `security: 0.15` weight, rebalance existing weights (activity 0.25, responsiveness 0.25, sustainability 0.23, documentation 0.12), call getSecurityScore, push to bucketValues and recommendations in lib/scoring/health-score.ts
- [x] T015 [US1] Update HealthScoreRecommendation tab type to include `'security'` in lib/scoring/health-score.ts
- [x] T016 [US1] Add placeholder `securityScore` percentile sets to all brackets in lib/scoring/calibration-data.json
- [x] T017 [US1] Create SecurityView component per contracts/security-view-props.ts: score badge, Scorecard checks table (name + score 0-10 + reason), direct checks list, recommendations, mode indicator in components/security/SecurityView.tsx
- [x] T018 [US1] Add `'security'` to ResultTabId type in specs/006-results-shell/contracts/results-shell-props.ts and add security tab entry to resultTabs array in lib/results-shell/tabs.ts
- [x] T019 [US1] Wire SecurityView into ResultsShell: compute SecurityViewProps from AnalysisResult + SecurityScoreDefinition, render when security tab is active in components/app-shell/ResultsShell.tsx
- [x] T020 [US1] Update existing health score tests for new weight distribution (activity 0.25, responsiveness 0.25, sustainability 0.23, documentation 0.12, security 0.10) in lib/scoring/__tests__/

**Checkpoint**: Repos in Scorecard dataset show full security assessment. Repos not in dataset show direct checks only with Scorecard marked "unavailable". Health score includes Security bucket.

---

## Phase 4: User Story 2 — Direct Security Checks (Priority: P2)

**Goal**: Ensure direct checks produce meaningful results for all repos, with proper Mode B scoring when Scorecard is unavailable

**Independent Test**: Analyze a small repo not in the Scorecard dataset and verify direct checks (Dependabot, SECURITY.md, CI/CD) are displayed with recommendations

### Tests for User Story 2

- [ ] T021 [P] [US2] Write tests for Mode B scoring (direct checks only, no Scorecard): verify Scorecard-only signals excluded not penalized, direct check weights rebalanced (security_policy 0.30, dependabot 0.30, ci_cd 0.20, branch_protection 0.20) in lib/security/__tests__/score-config.test.ts
- [ ] T022 [P] [US2] Write tests for recommendation generation: at least one recommendation per missing direct check signal in lib/security/__tests__/score-config.test.ts
- [ ] T023 [P] [US2] Write tests for SecurityView in direct-only mode: mode indicator shows "direct checks only", Scorecard section hidden, direct checks displayed with detected/not-detected status in __tests__/security/SecurityView.test.tsx

### Implementation for User Story 2

- [ ] T024 [US2] Implement Mode B scoring in getSecurityScore: when scorecard is 'unavailable', use direct checks only with rebalanced weights, exclude Scorecard-only signals from computation in lib/security/score-config.ts
- [ ] T025 [US2] Implement recommendation text for each direct check signal: missing security policy, no dependency automation, no CI/CD, no branch protection in lib/security/score-config.ts
- [ ] T026 [US2] Implement Mode A direct check weight adjustment: when Scorecard is available, reduce security_policy weight to 0.10 and redistribute to other signals in lib/security/score-config.ts
- [ ] T027 [US2] Update SecurityView to handle direct-only mode: hide Scorecard section, show mode indicator, display "unavailable" badges for Scorecard-only signals in components/security/SecurityView.tsx

**Checkpoint**: Every repo gets a meaningful security assessment. Small repos show direct checks with recommendations. Large repos show both layers.

---

## Phase 5: User Story 3 — Branch Protection Fallback (Priority: P3)

**Goal**: When Scorecard returns -1 for Branch-Protection, fall back to direct GraphQL query for branch protection status

**Independent Test**: Analyze a repo where Scorecard returns -1 for Branch-Protection and verify the direct query provides the branch protection status

### Tests for User Story 3

- [ ] T028 [P] [US3] Write tests for branch protection GraphQL query: enabled, disabled, unavailable (permission error) in lib/security/__tests__/direct-checks.test.ts
- [ ] T029 [P] [US3] Write tests for Branch-Protection fallback logic: Scorecard score valid (0-10) → use Scorecard, Scorecard score -1 → use direct query, no Scorecard → use direct query in lib/security/__tests__/score-config.test.ts

### Implementation for User Story 3

- [ ] T030 [US3] Implement `fetchBranchProtection(owner, repo, defaultBranch, token)` using GraphQL `branchProtectionRules` query in lib/security/direct-checks.ts
- [ ] T031 [US3] Call branch protection query in analyze.ts — populate `securityResult.branchProtectionEnabled` in lib/analyzer/analyze.ts
- [ ] T032 [US3] Implement Branch-Protection fallback in score-config: if Scorecard Branch-Protection score is -1 and direct query returned a result, substitute direct result into scoring in lib/security/score-config.ts
- [ ] T033 [US3] Update SecurityView to show branch protection status from either source, with indicator of data source in components/security/SecurityView.tsx

**Checkpoint**: Branch protection is reliably assessed for all repos regardless of Scorecard's ability to determine it.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Calibration, manual testing, definition of done

- [ ] T034 [P] Add security score to Overview tab health score breakdown display in components/app-shell/ResultsShell.tsx or relevant overview component
- [ ] T035 [P] Run `npm run lint` and fix any lint errors across all new and modified files
- [ ] T036 Run `npm run build` and fix any build errors
- [ ] T037 Create manual testing checklist at specs/130-security-scoring/checklists/manual-testing.md
- [ ] T038 Execute manual testing checklist and sign off
- [ ] T039 Update docs/DEVELOPMENT.md to reflect Security scoring status

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types must exist)
- **User Story 1 (Phase 3)**: Depends on Phase 2 (securityResult on AnalysisResult)
- **User Story 2 (Phase 4)**: Depends on Phase 3 (scoring function must exist to add Mode B)
- **User Story 3 (Phase 5)**: Depends on Phase 2 (analyzer integration). Can run in parallel with Phase 4.
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (Scorecard)**: Depends on Foundational only — MVP deliverable
- **US2 (Direct checks scoring)**: Depends on US1 (extends scoring function)
- **US3 (Branch protection fallback)**: Depends on Foundational — can parallelize with US2

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD per constitution)
- Types before logic
- Scoring logic before UI
- Unit tests before integration

### Parallel Opportunities

- T008, T009, T010 can run in parallel (different test files)
- T021, T022, T023 can run in parallel (different test files)
- T028, T029 can run in parallel (different test files)
- T034, T035 can run in parallel (different concerns)
- US2 and US3 implementation can partially overlap (US3 doesn't depend on US2)

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all US1 tests together:
Task T008: "Scorecard client tests in lib/security/__tests__/scorecard-client.test.ts"
Task T009: "Score computation Mode A tests in lib/security/__tests__/score-config.test.ts"
Task T010: "SecurityView component tests in __tests__/security/SecurityView.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types)
2. Complete Phase 2: Foundational (GraphQL + analyzer)
3. Complete Phase 3: User Story 1 (Scorecard + health score + UI)
4. **STOP and VALIDATE**: Test with a Scorecard-covered repo (e.g., `kubernetes/kubernetes`)
5. Security tab visible, health score includes Security bucket

### Incremental Delivery

1. Setup + Foundational → Security data collected for all repos
2. Add US1 → Scorecard integration works → MVP!
3. Add US2 → Direct-only mode polished with recommendations
4. Add US3 → Branch protection reliable for all repos
5. Polish → Calibration, manual testing, docs

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- TDD is mandatory: write tests first, verify they fail, then implement
- Scorecard API is mocked in all unit tests — real calls only in E2E
- Commit after each task or logical group
