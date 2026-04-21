# Research: P2-F08 Accessibility & Onboarding Scoring

**Branch**: `117-add-accessibility-onboarding-scoring-to` | **Date**: 2026-04-20

---

## Decision 1: authorAssociation — not yet fetched

**Decision**: Add `authorAssociation` to the `recentMergedPullRequests` search block in `REPO_ACTIVITY_SEARCH_QUERY` (the search-based pass-2 query, lines ~481–488 of `queries.ts`).

**Rationale**: GitHub sets `authorAssociation` on every PR at creation time. `FIRST_TIME_CONTRIBUTOR` reliably identifies a user whose first PR to this repo has no prior merged PRs — no heuristic author-history lookup required. The field is zero-cost to add alongside the `createdAt`/`mergedAt` already fetched there.

**Alternatives considered**: Computing first-time status from the contributor history already fetched — rejected because that history only covers recent activity windows and cannot definitively identify "first ever PR to this repo."

---

## Decision 2: Devcontainer / Gitpod file probes — not yet in query

**Decision**: Add the following `object(expression: "HEAD:<path>")` probes to `REPO_OVERVIEW_QUERY`, grouped with the existing `commFunding`, `commGovernance*`, and `workflowDir` entries:

```graphql
onbDevcontainerDir: object(expression: "HEAD:.devcontainer") { ... on Tree { entries { name } } }
onbDevcontainerJson: object(expression: "HEAD:.devcontainer.json") { ... on Blob { oid } }
onbDockerComposeYml: object(expression: "HEAD:docker-compose.yml") { ... on Blob { oid } }
onbDockerComposeYaml: object(expression: "HEAD:docker-compose.yaml") { ... on Blob { oid } }
onbGitpod: object(expression: "HEAD:.gitpod.yml") { ... on Blob { oid } }
```

**Rationale**: Follows the exact pattern used for all other file-presence signals (security, governance, funding). `REPO_OVERVIEW_QUERY` is the right place — these are lightweight `oid`-only checks with no text content needed. No additional API request required.

**Alternatives considered**: Checking the `rootTree` entries list — rejected because `rootTree` returns all root entries (potentially large) and would require client-side scanning rather than the targeted single-field null-check pattern.

---

## Decision 3: Good first issue count — new search query needed

**Decision**: Add a dedicated label-search query variable to the existing `REPO_ACTIVITY_SEARCH_QUERY` pass (or, if that query is already at limit, a separate lightweight query). Use GitHub search syntax: `repo:owner/name is:issue is:open label:"good first issue" OR label:"good-first-issue" OR label:beginner OR label:"help wanted" OR label:"help-wanted"`.

**Rationale**: GitHub's search API supports `label:` filters and OR logic in a single `search(query:, type: ISSUE)` call returning `issueCount` — the same zero-node pattern already used for stale PR/issue counts. This is a single additional search variable, not a separate API request.

**Alternatives considered**: Fetching issues with label nodes and filtering client-side — rejected; would require fetching potentially hundreds of issue nodes for large repos. Count-only via `issueCount` is sufficient and accurate.

---

## Decision 4: Community score integration — completeness model, not weighted composite

**Decision**: The Community score uses a **signal-presence completeness ratio** (`lib/community/completeness.ts`), not a weighted composite like Documentation. The three new A&O signals (good first issue count, dev environment setup, new contributor PR acceptance rate) are added as new `CommunitySignalKey` entries. Each maps to a `Presence` value (`'present' | 'missing' | 'unknown'`).

- `goodFirstIssueCount > 0` → `'present'`; `goodFirstIssueCount === 0` → `'missing'`; unavailable → `'unknown'`
- `devEnvironmentSetup` (any primary signal found) → `'present'` / `'missing'` / `'unknown'`
- `newContributorPRAcceptanceRate >= threshold` → `'present'`; below threshold → `'missing'`; unavailable → `'unknown'`

Gitpod is a **bonus-only** signal: adds +1 to `present` count when detected, never added to the denominator (so its absence never penalises the ratio).

**Rationale**: This matches the existing community model exactly. The Documentation score uses weighted composites because file types have different importance levels; community signals are treated as equally-weighted presence checks.

**Alternatives considered**: Adding to Documentation's `FILE_WEIGHTS` composite — rejected; these are contributor-pipeline signals, not documentation artifacts.

---

## Decision 5: Documentation score integration — add to FILE_WEIGHTS

**Decision**: Issue template and PR template are already probed in `REPO_OVERVIEW_QUERY` and already appear in `DocumentationFileCheck[]` (as `issue_templates` and `pull_request_template`). They already have entries in `FILE_WEIGHTS` (`0.05` each). **No new query or extraction logic is needed.** The `onboarding` tag is added to these file names in a new `lib/tags/onboarding.ts`, following the `COMMUNITY_DOC_FILES` / `GOVERNANCE_DOC_FILES` pattern.

**Rationale**: The file-presence signals are fully wired; only the tag membership is missing.

---

## Decision 6: New contributor PR acceptance rate — minimum sample floor

**Decision**: Mark `unavailable` when fewer than **3** `FIRST_TIME_CONTRIBUTOR` PRs exist in the `recentMergedPullRequests` window (last 365 days). The acceptance rate = `mergedFirstTimePRs / totalFirstTimePRs` where totalFirstTimePRs includes open + merged first-time-contributor PRs seen in the window.

**Rationale**: A rate computed from 1–2 PRs is statistically meaningless and could swing from 0% to 100% on a single event. 3 is a low but defensible floor consistent with how other ratio signals handle small-sample repos.

**Alternatives considered**: Using 5 as the floor — rejected as too aggressive; would mark too many small/quiet repos unavailable.

---

## Decision 7: onboarding tag — new lib/tags/onboarding.ts

**Decision**: Create `lib/tags/onboarding.ts` following the `lib/tags/community.ts` / `lib/tags/governance.ts` pattern. Define:

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
```

Update `lib/tags/tab-counts.ts` to handle `tag === 'onboarding'` alongside the existing `'community'` and `'governance'` branches.

**Rationale**: New tag file avoids polluting existing tag modules. The three-set pattern (doc files, README sections, contributors metrics) is identical to the community tag structure.
