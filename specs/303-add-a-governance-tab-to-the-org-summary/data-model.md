# Data Model: Governance tab on org-summary view

This feature introduces **no new data entities**. The only data-shape edits are in two TypeScript types:

## 1. `ResultTabId` union (extended)

**File**: `specs/006-results-shell/contracts/results-shell-props.ts`

```diff
- export type ResultTabId = 'overview' | 'contributors' | 'activity' | 'responsiveness' | 'documentation' | 'security' | 'recommendations' | 'comparison'
+ export type ResultTabId = 'overview' | 'contributors' | 'activity' | 'responsiveness' | 'documentation' | 'governance' | 'security' | 'recommendations' | 'comparison'
```

`'governance'` is positioned between `'documentation'` and `'security'` in the union (cosmetic; matches the visible tab order).

## 2. `PanelBucketId` union (extended)

**File**: `components/org-summary/panels/registry.tsx`

```diff
  export type PanelBucketId =
    | 'overview'
    | 'contributors'
    | 'activity'
    | 'responsiveness'
    | 'documentation'
+   | 'governance'
    | 'security'
    | 'recommendations'
    | 'repos'
```

## 3. `PANEL_BUCKETS` array (mutated)

**File**: `components/org-summary/panels/registry.tsx`

| Bucket | Before | After |
|---|---|---|
| `contributors` | `['contributor-diversity', 'maintainers', 'org-affiliations', 'bus-factor']` | `['contributor-diversity', 'org-affiliations', 'bus-factor']` |
| `documentation` | `['documentation-coverage', 'license-consistency', 'inclusive-naming-rollup', 'governance', 'adopters']` | `['documentation-coverage', 'inclusive-naming-rollup', 'adopters']` |
| `governance` *(NEW)* | — | `['maintainers', 'governance', 'license-consistency']` |
| `security` | `['security-rollup']` | unchanged |

Bucket-level descriptions:

- `contributors`: update to "Who contributes and how concentrated contribution is across the org." (drop "maintains").
- `documentation`: update to "Docs coverage, inclusive naming, and adopters across the repo set." (drop "licensing", "governance").
- `governance` (new): "Org-level hygiene and policy signals — account activity, designated maintainers, governance file presence, and license consistency."

## 4. Stale Admins extra-panel injection (re-homed)

**File**: `components/org-summary/OrgBucketContent.tsx`

The condition that injects `<StaleAdminsPanel ... />` moves from `bucketId === 'documentation'` to `bucketId === 'governance'`. The panel is rendered **before** registry-driven panels in the governance bucket (so it lands first in the visual order, matching FR-003 risk-first ordering).

## 5. Search `EXTRACTORS` map (extended)

**File**: `lib/search/search-index.ts`

```diff
  const EXTRACTORS: Record<ResultTabId, Extractor> = {
    overview: extractOverview,
    contributors: extractContributors,
    activity: extractActivity,
    responsiveness: extractResponsiveness,
    documentation: extractDocumentation,
+   governance: () => [],
    security: extractSecurity,
    recommendations: extractRecommendations,
    comparison: extractComparison,
  }
```

The empty extractor reflects R3 in `research.md`: per-repo search has no governance content; the empty function exists only to satisfy the exhaustive `Record<ResultTabId, Extractor>` type.

## What this feature does NOT change

- `AnalysisResult` schema — unchanged.
- `OrgSummaryViewModel` and `AggregatePanel` types — unchanged.
- `view.panels[panelId]` shape for any `PanelId` — unchanged.
- Any aggregator under `lib/org-aggregation/aggregators/` — unchanged.
- Any GraphQL query — unchanged.
- Any scoring config or threshold — unchanged.
- `ResultsShellProps` interface — gets one new optional field (`governance?: React.ReactNode`); the change is additive and backwards-compatible.
