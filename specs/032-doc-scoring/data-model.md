# Data Model: Documentation Scoring

## Entities

### DocumentationFileCheck

Represents the result of checking one documentation file.

| Field | Type | Description |
|-------|------|-------------|
| name | string | File category: `readme`, `license`, `contributing`, `code_of_conduct`, `security`, `changelog` |
| found | boolean | Whether the file was detected |
| path | string or null | Actual path if found (e.g., `CONTRIBUTING.md`) |
| licenseType | string or null | SPDX identifier if applicable (e.g., `MIT`, `Apache-2.0`) |
| recommendation | string | Actionable text when missing |

### ReadmeSectionCheck

Represents the result of checking one README section.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Section category: `description`, `installation`, `usage`, `contributing`, `license` |
| detected | boolean | Whether the section heading was found |
| recommendation | string | Actionable text when missing |

### DocumentationResult

Added to `AnalysisResult` — the raw documentation data before scoring.

| Field | Type | Description |
|-------|------|-------------|
| fileChecks | DocumentationFileCheck[] | Results for each of the 6 file checks |
| readmeSections | ReadmeSectionCheck[] | Results for each of the 5 section checks |
| filePresenceScore | number | 0–1 weighted file presence ratio |
| readmeQualityScore | number | 0–1 weighted README quality ratio |
| compositeScore | number | 0–1 overall documentation score |

### DocumentationScoreDefinition

The scored output — percentile-ranked against calibration data.

| Field | Type | Description |
|-------|------|-------------|
| value | number or 'Insufficient verified public data' | Percentile (0–99) |
| tone | ScoreTone | success / warning / danger / neutral |
| percentile | number or null | Numeric percentile |
| bracketLabel | string or null | Star bracket label |
| compositeScore | number | Raw 0–1 score |
| filePresenceScore | number | Raw 0–1 file sub-score |
| readmeQualityScore | number | Raw 0–1 README sub-score |
| recommendations | DocumentationRecommendation[] | All missing-item recommendations |

### DocumentationRecommendation

| Field | Type | Description |
|-------|------|-------------|
| bucket | 'documentation' | Always 'documentation' for this bucket |
| category | 'file' or 'readme_section' | What type of item is missing |
| item | string | The missing item name |
| weight | number | The item's weight in the scoring formula |
| text | string | Actionable recommendation text |

## Relationships

```
AnalysisResult
  └── documentationResult: DocumentationResult
        ├── fileChecks: DocumentationFileCheck[]
        └── readmeSections: ReadmeSectionCheck[]

DocumentationScoreDefinition (computed from DocumentationResult + calibration)
  └── recommendations: DocumentationRecommendation[]
```

## Integration points

- `AnalysisResult` gains a `documentationResult` field
- `HealthScoreDefinition` gains a `documentation` percentile in its composite
- Health score weights change: Activity 30%, Responsiveness 30%, Sustainability 25%, Documentation 15%
- Unified Recommendations tab aggregates `DocumentationRecommendation[]` with recommendations from other buckets
