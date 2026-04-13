# Data Model: Richer Security Recommendations

## Entities

### RecommendationCatalogEntry

A static catalog entry mapping a Scorecard check name or direct check name to structured recommendation metadata. Defined once, shipped with the application.

| Field | Type | Description |
|-------|------|-------------|
| key | string | Scorecard check name (e.g., "Token-Permissions") or direct check name (e.g., "security_policy") |
| source | "scorecard" or "direct_check" | Whether this entry covers a Scorecard check or a direct check |
| title | string | Descriptive, action-oriented recommendation title (e.g., "Restrict GitHub Actions token permissions") |
| riskLevel | "Critical" or "High" or "Medium" or "Low" | Risk classification from OpenSSF Scorecard documentation |
| groupCategory | "critical_issues" or "quick_wins" or "workflow_hardening" or "best_practices" | Which recommendation category this entry belongs to (may be overridden at generation time based on score) |
| whyItMatters | string | Explanation of why a low score or missing signal is a risk |
| remediation | string | Recommended action to address the finding |
| remediationHint | string or null | Brief practical hint (e.g., "Add `permissions: read-all` at the top of workflow files") |
| docsUrl | string or null | URL to the relevant OpenSSF Scorecard check documentation |
| directCheckMapping | string or null | If this is a Scorecard entry, the corresponding direct check name for deduplication (e.g., "security_policy" for "Security-Policy") |

### SecurityRecommendation (extended)

The existing SecurityRecommendation interface extended with structured fields. All new fields are optional to preserve backward compatibility.

| Field | Type | Description |
|-------|------|-------------|
| bucket | "security" | Always "security" (unchanged) |
| category | "scorecard" or "direct_check" | Source category (unchanged) |
| item | string | Check name (unchanged) |
| weight | number | Sorting weight (unchanged) |
| text | string | Full recommendation text — continues to serve as the message source for HealthScoreRecommendation (unchanged) |
| title | string or undefined | Descriptive action-oriented title (new) |
| riskLevel | "Critical" or "High" or "Medium" or "Low" or undefined | Risk classification (new) |
| evidence | string or undefined | Repo-specific evidence string (e.g., "Token-Permissions scored 0/10") (new) |
| explanation | string or undefined | Why this finding matters (new) |
| remediationHint | string or undefined | Brief practical remediation hint (new) |
| docsUrl | string or undefined | Link to OpenSSF check documentation (new) |
| groupCategory | "critical_issues" or "quick_wins" or "workflow_hardening" or "best_practices" or undefined | Recommendation category for grouping — computed from risk level + score (new) |

### RecommendationCategory

A labeled group used to organize recommendations in the UI.

| Field | Type | Description |
|-------|------|-------------|
| key | string | Machine-readable identifier (e.g., "quick_wins") |
| label | string | Display label (e.g., "Quick Wins") |
| order | number | Sort order for display (lower = first) |

### Category Definitions (Static)

| Key | Label | Order | Description |
|-----|-------|-------|-------------|
| critical_issues | Critical Issues | 1 | Critical/High risk + low score (0–4) — urgent problems needing immediate attention |
| quick_wins | Quick Wins | 2 | Low/Medium risk or score 5–9 with a clear simple fix — easy improvements |
| workflow_hardening | Workflow Hardening | 3 | CI/CD, branch protection, token permissions at medium scores |
| best_practices | Best Practices | 4 | Mature security practices like fuzzing, SAST, SBOM, signed releases |

## Relationships

```
RecommendationCatalog (static, keyed by check name)
  └── entries: RecommendationCatalogEntry[]

SecurityResult (from analysis)
  ├── scorecard: ScorecardAssessment | "unavailable"
  │     └── checks: ScorecardCheck[]
  └── directChecks: DirectSecurityCheck[]

getSecurityScore() consumes both:
  ├── For each Scorecard check scoring below 10 → lookup catalog entry → emit enriched SecurityRecommendation
  ├── For each missing direct check → lookup catalog entry → emit enriched SecurityRecommendation
  ├── Deduplication: if Scorecard entry has directCheckMapping → suppress the direct-check rec
  └── Sort: by groupCategory order, then riskLevel severity, then weight

SecurityView (UI)
  └── groups recommendations by groupCategory
        └── renders enriched fields (title, source, riskLevel, evidence, explanation, remediation, docsUrl)

HealthScoreRecommendation (unchanged)
  └── reads rec.text as message (backward compatible)
```

## Validation Rules

- RecommendationCatalogEntry.key must be unique across the catalog
- RecommendationCatalogEntry.riskLevel must be one of: "Critical", "High", "Medium", "Low"
- RecommendationCatalogEntry.groupCategory must be one of: "critical_issues", "quick_wins", "workflow_hardening", "best_practices"
- SecurityRecommendation.text must always be populated (backward compatibility)
- SecurityRecommendation.groupCategory, when present, must match a defined category key
- Deduplication: at most one recommendation per security concern (no Scorecard + direct-check duplicates)
