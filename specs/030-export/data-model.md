# Data Model: Export (P1-F13)

## Entities

### ExportPayload (JSON export)

The JSON export is the raw `AnalyzeResponse` object, serialized verbatim — no fields added, removed, or transformed.

```
AnalyzeResponse {
  results:     AnalysisResult[]          // one entry per successfully fetched repo
  failures:    RepositoryFetchFailure[]  // repos that could not be fetched
  rateLimit:   RateLimitState | null     // rate limit snapshot at time of analysis
  diagnostics: AnalysisDiagnostic[]      // optional diagnostic messages
}
```

Fields map directly to `lib/analyzer/analysis-result.ts`. Any field with value `"unavailable"` is exported as the string `"unavailable"` — not `null`, not `0`, not omitted.

**Filename**: `repopulse-YYYY-MM-DD-HHmmss.json`  
**MIME type**: `application/json`  
**Encoding**: UTF-8

---

### MarkdownReport (Markdown export)

Generated client-side from `AnalyzeResponse`. Structure per research decision.

Top-level metadata:
- Generated timestamp (ISO 8601)
- Repository count

Per-repo section (one `##` heading per repo):
- Basic info: stars, primary language, description
- CHAOSS scores: Activity, Sustainability, Responsiveness
- Key metrics per category (see Markdown structure in research.md)
- Missing data list (from `result.missingFields`)

`"unavailable"` values render as `N/A` in Markdown output.

**Filename**: `repopulse-YYYY-MM-DD-HHmmss.md`  
**MIME type**: `text/markdown`  
**Encoding**: UTF-8

---

### ShareableURL

A standard browser URL with a single `repos` query parameter.

```
Structure: http[s]://[host]/?repos=[slug1],[slug2],...
Example:   https://repopulse.vercel.app/?repos=facebook/react,vercel/next.js
```

- Encoded with `URLSearchParams` — forward slashes within slugs are preserved
- Token is never included
- Decoded on app mount; decoded value pre-populates the repo list textarea

---

## State Transitions

```
No results                → Export controls: disabled (not rendered or greyed out)
Analysis in progress      → Export controls: disabled
Analysis complete         → Export controls: enabled
User clicks Download JSON → Blob created → anchor click triggered → file download starts → same state
User clicks Download MD   → Blob created → anchor click triggered → file download starts → same state
User clicks Copy Link     → Clipboard write attempted → success: "Copied!" confirmation shown
                                                      → failure: URL displayed in fallback input
```

---

## Key Derivations

| Export field | Derived from |
|---|---|
| JSON file | `AnalyzeResponse` serialized directly |
| MD timestamp | `new Date().toISOString()` at download time |
| MD Activity score | `getActivityScore(result)` from `lib/activity/score-config` |
| MD Sustainability score | `getSustainabilityScore(result)` from `lib/contributors/score-config` |
| MD Responsiveness score | `getResponsivenessScore(result)` from `lib/responsiveness/score-config` |
| Shareable URL repos param | Analyzed repo slugs joined with `,` |
