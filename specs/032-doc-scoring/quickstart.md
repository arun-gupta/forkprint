# Quickstart: Documentation Scoring

## What this feature does

Adds a Documentation scoring bucket to the OSS Health Score. It checks for 6 key documentation files and evaluates README structure, producing a percentile score relative to repos in the same star bracket. Missing files and sections generate actionable recommendations.

## Key files to create/modify

### New files
- `lib/documentation/score-config.ts` — Documentation scoring logic
- `lib/documentation/view-model.ts` — View model for Documentation tab
- `lib/documentation/view-model.test.ts` — Tests
- `lib/documentation/score-config.test.ts` — Tests
- `lib/analyzer/github-rest-docs.ts` — Community profile + README fetch
- `components/documentation/DocumentationView.tsx` — Documentation tab
- `components/documentation/DocumentationView.test.tsx` — Tests
- `components/recommendations/RecommendationsView.tsx` — Unified recommendations tab
- `components/recommendations/RecommendationsView.test.tsx` — Tests

### Modified files
- `lib/analyzer/analyze.ts` — Add documentation fetch calls
- `lib/analyzer/analysis-result.ts` — Add `documentationResult` to `AnalysisResult`
- `lib/analyzer/queries.ts` — Add CHANGELOG `object()` aliases to overview query
- `lib/scoring/health-score.ts` — Rebalance weights (30/30/25/15), remove 50th percentile gate, generate doc recommendations
- `lib/scoring/config-loader.ts` — Add documentation calibration data
- `components/metric-cards/MetricCard.tsx` — Add Documentation score badge
- `components/repo-input/RepoInputClient.tsx` — Add Documentation and Recommendations tabs
- `lib/comparison/sections.ts` — Add documentation comparison section
- `lib/export/json-export.ts` — Include documentation data
- `lib/export/markdown-export.ts` — Include documentation data
- `components/baseline/BaselineView.tsx` — Add documentation metrics to Scoring Methodology

## Data flow

```
analyze()
  ├── fetchCommunityProfile(token, owner, name)     → 5 file checks (1 REST call)
  ├── fetchReadmeContent(token, owner, name)         → README content for section detection (1 REST call)
  └── GraphQL overview query (existing)              → CHANGELOG variants via object() (0 extra calls)
  │
  ▼
AnalysisResult.documentationResult
  │
  ▼
getDocumentationScore(documentationResult, stars)    → percentile via calibration
  │
  ▼
DocumentationSectionViewModel                        → Documentation tab UI
  │
  ▼
getHealthScore(result)                               → composite with 30/30/25/15 weights
  └── recommendations[]                              → unified Recommendations tab
```

## Testing approach

1. Unit tests for scoring logic (weights, composite calculation)
2. Unit tests for README section detection (regex patterns)
3. Unit tests for view model (file statuses, recommendations)
4. Component tests for Documentation tab rendering
5. Component tests for Recommendations tab
6. Integration test for end-to-end analyze → score → display
