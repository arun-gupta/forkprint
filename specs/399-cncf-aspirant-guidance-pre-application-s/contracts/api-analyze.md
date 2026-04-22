# Contract: POST /api/analyze — CNCF Aspirant Extensions (399)

This document extends the existing `/api/analyze` contract with the additions introduced by issue #399.

## Request Body Extension

The existing `AnalyzeRequest` body gains one new optional field:

```typescript
interface AnalyzeRequest {
  // ... existing fields unchanged ...
  foundationTarget?: 'none' | 'cncf-sandbox';  // NEW — defaults to 'none' if absent
}
```

When `foundationTarget === 'cncf-sandbox'`, the analysis pipeline MUST fetch the CNCF landscape data as part of the same request before returning a response.

## Response Body Extension

The existing `AnalyzeResponse` gains two new optional fields:

```typescript
interface AnalyzeResponse {
  // ... existing fields unchanged ...
  aspirantResult?: AspirantReadinessResult | null;   // NEW — present when foundationTarget === 'cncf-sandbox' AND repo is NOT already in landscape
  landscapeOverride?: boolean;                        // NEW — true when repo IS already in CNCF landscape (aspirant mode blocked)
}
```

### AspirantReadinessResult (serialized form)

```typescript
interface AspirantReadinessResult {
  foundationTarget: 'cncf-sandbox';
  readinessScore: number;           // 0–100 integer
  autoFields: AspirantFieldDTO[];
  humanOnlyFields: AspirantFieldDTO[];
  readyCount: number;
  totalAutoCheckable: number;
  alreadyInLandscape: boolean;      // always false here (if true, landscapeOverride is sent instead)
  tagRecommendation: TAGRecommendationDTO;
}

interface AspirantFieldDTO {
  id: string;
  label: string;
  status: 'ready' | 'partial' | 'missing' | 'human-only';
  weight: number;
  pointsEarned: number;
  homeTab?: string;                 // ResultTabId as string
  evidence?: string;
  remediationHint?: string;
  explanatoryNote?: string;
}

interface TAGRecommendationDTO {
  primaryTag: string | null;        // e.g. 'tag-security', 'tag-infrastructure', or null
  matchedSignals: string[];
  fallbackNote: string | null;
}
```

## AnalysisResult Type Extension

The `AnalysisResult` type in `lib/analyzer/analysis-result.ts` gains these fields:

```typescript
interface AnalysisResult {
  // ... existing fields unchanged ...
  
  // NEW file-presence fields added to DocumentationResult:
  // (extended in the DocumentationResult sub-type, not top-level)
  // adoptersFile: boolean;       — added to DocumentationResult
  // roadmapFile: boolean;        — added to DocumentationResult
  // maintainersFile: boolean;    — added to DocumentationResult
  // cocContent: string | null;   — first 2000 bytes of CODE_OF_CONDUCT.md, for Contributor Covenant check
}
```

### DocumentationResult Extension

```typescript
interface DocumentationResult {
  // ... existing fields unchanged ...
  adoptersFile: boolean;          // NEW — ADOPTERS.md or ADOPTERS present
  roadmapFile: boolean;           // NEW — ROADMAP.md, docs/ROADMAP.md, or README Roadmap heading
  maintainersFile: boolean;       // NEW — MAINTAINERS, MAINTAINERS.md, CODEOWNERS, or .github/CODEOWNERS
  cocContent: string | null;      // NEW — first 2000 bytes of CODE_OF_CONDUCT.md text (null if unavailable)
}
```

## Error Cases

| Condition | Behavior |
|---|---|
| CNCF landscape fetch fails | `autoFields` contains `landscape` field with `status: 'partial'` and hint to check landscape.cncf.io manually. Analysis proceeds. |
| `foundationTarget` is absent or `'none'` | `aspirantResult` and `landscapeOverride` are both absent from response. |
| Repo is already in CNCF landscape | `landscapeOverride: true` is returned; `aspirantResult` is absent. |
