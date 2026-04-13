# Quickstart: Inclusive Naming Analysis

**Feature**: 129-inclusive-naming

## What This Feature Does

Adds inclusive naming checks to the Documentation scoring bucket. Scans the default branch name, repository description, and topic labels for non-inclusive terms from the [Inclusive Naming Initiative](https://inclusivenaming.org/) word list (Tiers 1–3). Generates tier-weighted scores and actionable recommendations.

## Key Files to Understand First

1. **`lib/documentation/score-config.ts`** — Current three-part Documentation scoring. This is where the fourth sub-score (inclusive naming) gets integrated.
2. **`lib/analyzer/queries.ts`** — GraphQL queries. Needs `defaultBranchRef { name }` and `repositoryTopics` added to overview query.
3. **`lib/analyzer/analysis-result.ts`** — Type definitions. Needs `InclusiveNamingResult` added to `AnalysisResult`.
4. **`components/documentation/DocumentationView.tsx`** — Documentation tab UI. Needs a fourth pane for inclusive naming results.

## Implementation Order

1. **Word list data** (`lib/inclusive-naming/word-list.ts`) — Static INI Tier 1–3 terms with replacements
2. **Checker logic** (`lib/inclusive-naming/checker.ts`) — Whole-word matching for descriptions, exact match for topics/branch
3. **Type definitions** (`lib/analyzer/analysis-result.ts`) — `InclusiveNamingResult` interface
4. **GraphQL query update** (`lib/analyzer/queries.ts`) — Add branch name and topics fields
5. **Extraction** (`lib/analyzer/analyze.ts`) — Extract and run checks during analysis
6. **Scoring** (`lib/inclusive-naming/score-config.ts`) — Tier-weighted sub-score calculation
7. **Documentation composite update** (`lib/documentation/score-config.ts`) — Four-part model (35/30/25/10)
8. **UI pane** (`components/documentation/DocumentationView.tsx`) — Inclusive Naming pane
9. **Score help update** (`components/documentation/DocumentationScoreHelp.tsx`) — Four-part explanation

## Testing Strategy

- **TDD**: Write tests first for each layer (word list, checker, scoring, UI)
- **Word list tests**: Verify all Tier 1–3 terms present, no Tier 0 terms included
- **Checker tests**: Whole-word matching correctness, false positive prevention ("mastery" != "master")
- **Scoring tests**: Tier weighting, composite calculation, fallback when unavailable
- **UI tests**: Pane rendering for passing/failing checks, recommendation display

## Weight Configuration

```
Documentation composite (15% of health score):
├── File Presence:      35%  (was 40%)
├── README Quality:     30%  (unchanged)
├── Licensing:          25%  (was 30%)
└── Inclusive Naming:   10%  (new)

Inclusive Naming sub-score:
├── Branch name check:  70%
└── Metadata checks:    30%

Tier penalties (applied to metadata score):
├── Tier 1: -0.25 per term
├── Tier 2: -0.15 per term
└── Tier 3: -0.10 per term
```
