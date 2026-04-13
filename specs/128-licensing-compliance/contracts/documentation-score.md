# Contract: Documentation Score — Three-Part Model

## Context

The Documentation bucket score changes from a two-part composite (file presence 60%, README quality 40%) to a three-part composite (file presence 40%, README quality 30%, licensing compliance 30%).

## Contract

### DocumentationScoreDefinition (updated)

```typescript
{
  value: number | 'Insufficient verified public data'
  tone: ScoreTone
  percentile: number | null
  bracketLabel: string | null
  compositeScore: number          // weighted composite of 3 sub-scores
  filePresenceScore: number       // 0.0–1.0, from 5 files (license removed)
  readmeQualityScore: number      // 0.0–1.0, unchanged
  licensingScore: number          // 0.0–1.0, NEW
  recommendations: DocumentationRecommendation[]
}
```

### Composite formula

```
compositeScore = filePresenceScore * 0.40
               + readmeQualityScore * 0.30
               + licensingScore * 0.30
```

### Recommendation categories

Existing categories: `'file'`, `'readme_section'`
New category: `'licensing'`

### Function signature (updated)

```typescript
getDocumentationScore(
  docResult: DocumentationResult,
  licensingResult: LicensingResult | 'unavailable',
  stars: number | 'unavailable'
): DocumentationScoreDefinition
```

The `licensingResult` parameter is new. When `'unavailable'`, the licensing sub-score is excluded and the composite falls back to the two-part model (file presence + README quality only).
