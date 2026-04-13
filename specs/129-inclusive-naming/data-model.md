# Data Model: Inclusive Naming Analysis

**Feature**: 129-inclusive-naming
**Date**: 2026-04-12

## Entities

### INI Term Entry

Represents one entry from the Inclusive Naming Initiative word list.

| Field | Type | Description |
|-------|------|-------------|
| term | string | The non-inclusive term (e.g., "master", "whitelist") |
| tier | 1 \| 2 \| 3 | INI tier classification |
| recommendation | string | INI recommendation text (e.g., "Replace immediately") |
| replacements | string[] | Suggested replacement terms |
| termPage | string | URL to the INI word list page for this term |

Tier 0 terms are NOT included — they are explicitly excluded ("no change recommended").

### Inclusive Naming Check

Represents one check result for a repository.

| Field | Type | Description |
|-------|------|-------------|
| checkType | 'branch' \| 'description' \| 'topic' | What was checked |
| term | string | The non-inclusive term found |
| passed | boolean | true if no non-inclusive term detected |
| tier | 1 \| 2 \| 3 \| null | INI tier of the flagged term (null if passed) |
| severity | string \| null | "Replace immediately" / "Recommended to replace" / "Consider replacing" |
| replacements | string[] | Suggested replacement terms |
| context | string \| null | Where the term was found (e.g., topic label, quoted description excerpt) |

### Inclusive Naming Result

Aggregation of all checks for a repository. Added to `AnalysisResult`.

| Field | Type | Description |
|-------|------|-------------|
| defaultBranchName | string \| null | The default branch name (e.g., "main", "master") |
| branchCheck | InclusiveNamingCheck | Result of branch name check |
| metadataChecks | InclusiveNamingCheck[] | Results of description + topic scans |

### Inclusive Naming Score Definition

Scoring output, following the existing `DocumentationScoreDefinition` pattern.

| Field | Type | Description |
|-------|------|-------------|
| branchScore | number | 0.0 or 1.0 (binary: master = 0, anything else = 1) |
| metadataScore | number | 0.0–1.0 (reduced by tier-weighted penalties per flagged term) |
| compositeScore | number | Weighted: 0.70 * branchScore + 0.30 * metadataScore |
| recommendations | InclusiveNamingRecommendation[] | Actionable recommendations for flagged terms |

### Inclusive Naming Recommendation

Follows the existing `DocumentationRecommendation` pattern.

| Field | Type | Description |
|-------|------|-------------|
| bucket | 'documentation' | Always 'documentation' (sub-score of Documentation) |
| category | 'inclusive_naming' | Recommendation category |
| item | string | The flagged term |
| weight | number | Compound weight (tier penalty * sub-score allocation) |
| text | string | Actionable recommendation text with INI reference |
| tier | 1 \| 2 \| 3 | INI tier of the flagged term |
| severity | string | "Replace immediately" / "Recommended to replace" / "Consider replacing" |

## Relationships

```
AnalysisResult
  └── inclusiveNamingResult: InclusiveNamingResult | Unavailable
        ├── branchCheck: InclusiveNamingCheck
        └── metadataChecks: InclusiveNamingCheck[]

DocumentationScoreDefinition
  └── inclusiveNamingScore: number (new field, 0.0–1.0)
        └── recommendations: InclusiveNamingRecommendation[] (merged into existing array)
```

## State Transitions

None — inclusive naming is a stateless, on-demand analysis with no persisted state.
