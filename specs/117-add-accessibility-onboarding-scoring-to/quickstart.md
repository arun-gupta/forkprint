# Quickstart: P2-F08 Accessibility & Onboarding Scoring

**Branch**: `117-add-accessibility-onboarding-scoring-to`

## What this feature adds

An `onboarding` tag pill that cross-cuts the Documentation and Contributors tabs, surfacing nine signals (five net-new, four already-scored) that together describe how welcoming a repo is to newcomers. The three Community-bound signals (good first issues, dev environment setup, new contributor PR acceptance rate) feed into the Community score. The two Documentation-bound signals (issue template, PR template) were already in `FILE_WEIGHTS` — only their `onboarding` tag is new.

## Touch points in implementation order

### 1. GraphQL queries (`lib/analyzer/queries.ts`)
- Add 5 devcontainer/Gitpod `object(expression:...)` probes to `REPO_OVERVIEW_QUERY`
- Add `goodFirstIssues` search count using `$goodFirstIssueQuery` variable
- Add `authorAssociation` to `recentMergedPullRequests` node fragment
- Add `recentOpenFirstTimePRs` search count for the acceptance rate denominator

### 2. Analysis result type (`lib/analyzer/analysis-result.ts`)
- Add `goodFirstIssueCount`, `devEnvironmentSetup`, `gitpodPresent`, `newContributorPRAcceptanceRate` fields

### 3. Signal extraction (`lib/analyzer/analyze.ts`)
- Extract devcontainer/Gitpod presence from `onbDevcontainerDir`, `onbDevcontainerJson`, `onbDockerComposeYml`, `onbDockerComposeYaml`, `onbGitpod`
- Extract good first issue count from `goodFirstIssues.issueCount`
- Compute `newContributorPRAcceptanceRate` from `recentMergedPullRequests` nodes where `authorAssociation === 'FIRST_TIME_CONTRIBUTOR'` vs `recentOpenFirstTimePRs.issueCount`

### 4. Community completeness (`lib/community/completeness.ts`)
- Add `'good_first_issues'`, `'dev_environment_setup'`, `'new_contributor_acceptance'` to `CommunitySignalKey`
- Extend `extractSignalPresence()` to derive presence for the three new keys
- Add Gitpod bonus logic in `computeCommunityCompleteness()`
- Add `newContributorAcceptanceFloor` threshold to `lib/community/score-config.ts`

### 5. Onboarding tag (`lib/tags/onboarding.ts` — new file)
- Define `ONBOARDING_DOC_FILES`, `ONBOARDING_README_SECTIONS`, `ONBOARDING_CONTRIBUTORS_METRICS`
- Implement `isOnboardingItem(key, domain)`

### 6. Tab counts (`lib/tags/tab-counts.ts`)
- Add `onboarding` branch alongside `community` and `governance` in `docFileMatches()`, `readmeSectionMatches()`, and contributor-metric matching

### 7. Recommendations catalog (`lib/recommendations/catalog.ts`)
- Add CTR-8, CTR-9, CTR-10 entries with `onboarding` tag

### 8. Comparison sections (`lib/comparison/sections.ts`)
- Add 3 new attribute rows to the `'contributors'` section

### 9. Exports
- `lib/export/json-export.ts` — add `onboarding` block
- `lib/export/markdown-export.ts` — add onboarding signals table

### 10. Contributors tab UI (`components/contributors/`)
- Add `OnboardingPane` component showing the three Contributors-tab signals
- Render pane when `onboarding` tag is active or always-visible in the Contributors tab

### 11. Tests (TDD — write first)
- Unit: signal extraction, acceptance rate computation, community completeness extension, tag matching, tab counts
- Integration: `analyze()` end-to-end with mocked GraphQL responses covering all onboarding fields
- Component: `OnboardingPane` rendering, pill filter behaviour

## Running the dev server

```bash
npm run dev   # already running on port 3014
```

## Running tests

```bash
npm test                          # full unit + integration suite
npx vitest run lib/community/     # community completeness only
npx vitest run lib/tags/          # tag system only
npx vitest run components/contributors/  # UI components
npm run lint && npm run typecheck
```
