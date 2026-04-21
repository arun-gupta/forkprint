# Data Model: P2-F08 Accessibility & Onboarding Scoring

**Branch**: `117-add-accessibility-onboarding-scoring-to` | **Date**: 2026-04-20

---

## New fields on AnalysisResult (`lib/analyzer/analysis-result.ts`)

```typescript
// Net-new A&O signals
goodFirstIssueCount: number | Unavailable
devEnvironmentSetup: boolean | Unavailable       // true if any primary signal found
gitpodPresent: boolean | Unavailable             // bonus-only; absence never penalised
newContributorPRAcceptanceRate: number | Unavailable  // 0–1 ratio; unavailable when < 3 qualifying PRs
```

---

## New GraphQL aliases (`lib/analyzer/queries.ts`)

### In REPO_OVERVIEW_QUERY — file-presence probes

```graphql
onbDevcontainerDir: object(expression: "HEAD:.devcontainer") {
  ... on Tree { entries { name } }
}
onbDevcontainerJson: object(expression: "HEAD:.devcontainer.json") { ... on Blob { oid } }
onbDockerComposeYml: object(expression: "HEAD:docker-compose.yml") { ... on Blob { oid } }
onbDockerComposeYaml: object(expression: "HEAD:docker-compose.yaml") { ... on Blob { oid } }
onbGitpod: object(expression: "HEAD:.gitpod.yml") { ... on Blob { oid } }
```

### In REPO_ACTIVITY_SEARCH_QUERY — label-filtered issue count

New variable: `$goodFirstIssueQuery: String!`

```graphql
goodFirstIssues: search(query: $goodFirstIssueQuery, type: ISSUE) {
  issueCount
}
```

Query value built as:
```
repo:<owner>/<name> is:issue is:open label:"good first issue" OR label:"good-first-issue" OR label:beginner OR label:"help wanted" OR label:"help-wanted"
```

### In REPO_ACTIVITY_SEARCH_QUERY — authorAssociation on merged PRs

Add `authorAssociation` to the existing `recentMergedPullRequests` node fragment:

```graphql
recentMergedPullRequests: search(query: $prsMerged365Query, type: ISSUE, first: 100) {
  nodes {
    ... on PullRequest {
      createdAt
      mergedAt
      authorAssociation   # ← add this
    }
  }
}
```

Also add a companion open-PR query to count total first-time-contributor PRs:

```graphql
recentOpenFirstTimePRs: search(query: $prsOpenFirstTimeQuery, type: ISSUE) {
  issueCount
}
```

---

## New types

### RepoOverviewResponse additions (`lib/analyzer/analyze.ts` — response type)

```typescript
onbDevcontainerDir: { entries: Array<{ name: string }> } | null
onbDevcontainerJson: { oid: string } | null
onbDockerComposeYml: { oid: string } | null
onbDockerComposeYaml: { oid: string } | null
onbGitpod: { oid: string } | null
```

### RepoActivitySearchResponse additions

```typescript
goodFirstIssues: { issueCount: number } | null
recentMergedPullRequests: {
  nodes: Array<{
    createdAt: string
    mergedAt: string | null
    authorAssociation: string   // ← added
  }>
} | null
recentOpenFirstTimePRs: { issueCount: number } | null
```

---

## Community signal keys (`lib/community/completeness.ts`)

Three new entries added to `CommunitySignalKey`:

```typescript
export type CommunitySignalKey =
  | 'code_of_conduct'
  | 'issue_templates'
  | 'pull_request_template'
  | 'codeowners'
  | 'governance'
  | 'funding'
  | 'discussions_enabled'
  | 'good_first_issues'           // ← new
  | 'dev_environment_setup'       // ← new
  | 'new_contributor_acceptance'  // ← new
```

### Presence derivation rules

| Signal key | present | missing | unknown |
|---|---|---|---|
| `good_first_issues` | `goodFirstIssueCount > 0` | `goodFirstIssueCount === 0` | `goodFirstIssueCount === 'unavailable'` |
| `dev_environment_setup` | `devEnvironmentSetup === true` | `devEnvironmentSetup === false` | `devEnvironmentSetup === 'unavailable'` |
| `new_contributor_acceptance` | rate ≥ config threshold (default 0.5) | rate < threshold | `newContributorPRAcceptanceRate === 'unavailable'` |

### Gitpod bonus

`gitpodPresent === true` adds 1 to the `present` count without adding to the denominator. Implemented as a post-ratio adjustment in `computeCommunityCompleteness()`:

```typescript
if (result.gitpodPresent === true) {
  present.push('gitpod_bonus')
  // denominator unchanged — bonus only
}
```

---

## Onboarding tag sets (`lib/tags/onboarding.ts` — new file)

```typescript
export const ONBOARDING_DOC_FILES = new Set<string>([
  'issue_templates',
  'pull_request_template',
  'contributing',
  'code_of_conduct',
])

export const ONBOARDING_README_SECTIONS = new Set<string>([
  'installation',
  'contributing',
])

export const ONBOARDING_CONTRIBUTORS_METRICS = new Set<string>([
  'Good first issues',
  'Dev environment setup',
  'New contributor PR acceptance rate',
])

export type OnboardingDomain = 'doc_file' | 'readme_section' | 'contributors_metric'

export function isOnboardingItem(key: string, domain: OnboardingDomain): boolean {
  switch (domain) {
    case 'doc_file': return ONBOARDING_DOC_FILES.has(key)
    case 'readme_section': return ONBOARDING_README_SECTIONS.has(key)
    case 'contributors_metric': return ONBOARDING_CONTRIBUTORS_METRICS.has(key)
  }
}
```

---

## Recommendations catalog entries (`lib/recommendations/catalog.ts`)

```typescript
{ id: 'CTR-8',  bucket: 'Contributors', key: 'good_first_issues',         title: 'Label issues as good first issues to attract newcomers',      tags: ['onboarding', 'community', 'quick-win'] },
{ id: 'CTR-9',  bucket: 'Contributors', key: 'dev_environment_setup',     title: 'Add a devcontainer or Docker Compose for zero-setup onboarding', tags: ['onboarding', 'quick-win'] },
{ id: 'CTR-10', bucket: 'Contributors', key: 'new_contributor_acceptance', title: 'Improve first-time contributor PR review and merge rate',       tags: ['onboarding', 'contrib-ex'] },
```

---

## Comparison rows (`lib/comparison/sections.ts`)

New rows added to the `'contributors'` section:

| id | label | direction | valueType | getValue |
|---|---|---|---|---|
| `good-first-issues-count` | Good first issues (open) | higher-is-better | number | `result.goodFirstIssueCount` |
| `dev-environment-setup` | Dev environment setup | higher-is-better | label | `result.devEnvironmentSetup` |
| `new-contributor-pr-acceptance` | New contributor PR acceptance | higher-is-better | percentage | `result.newContributorPRAcceptanceRate` |

---

## Export additions

### JSON (`lib/export/json-export.ts`)

Add `onboarding` block to each repo export:

```typescript
onboarding: {
  goodFirstIssueCount: result.goodFirstIssueCount,
  devEnvironmentSetup: result.devEnvironmentSetup,
  gitpodPresent: result.gitpodPresent,
  newContributorPRAcceptanceRate: result.newContributorPRAcceptanceRate,
}
```

### Markdown (`lib/export/markdown-export.ts`)

Add onboarding section to per-repo output:

```markdown
### Onboarding signals
| Signal | Value |
|--------|-------|
| Good first issues (open) | {count} |
| Dev environment setup | Yes / Not detected |
| Gitpod support | Yes / — |
| New contributor PR acceptance | {pct}% / unavailable |
```
