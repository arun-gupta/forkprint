# Data Model: Security Scoring (P2-F07)

## Entities

### ScorecardAssessment

Represents the OpenSSF Scorecard API response for a repository.

| Field | Type | Description |
|-------|------|-------------|
| overallScore | number | Scorecard composite score (0-10) |
| checks | ScorecardCheck[] | Individual check results |
| scorecardVersion | string | Scorecard version that produced the result |

### ScorecardCheck

An individual Scorecard check result.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Check name (e.g., "Security-Policy", "Code-Review") |
| score | number | Check score (0-10, or -1 for indeterminate) |
| reason | string | Human-readable explanation of the score |

### DirectSecurityCheck

A security signal collected directly from the GitHub API.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Signal name (e.g., "dependabot", "security_policy", "ci_cd", "branch_protection") |
| detected | boolean or "unavailable" | Whether the signal was detected |
| details | string or null | Additional context (e.g., file path found, protection rule details) |

### SecurityResult

The complete security assessment for a repository, stored on AnalysisResult.

| Field | Type | Description |
|-------|------|-------------|
| scorecard | ScorecardAssessment or "unavailable" | Scorecard API result, or "unavailable" if not in dataset |
| directChecks | DirectSecurityCheck[] | Always-collected direct check results |
| branchProtectionEnabled | boolean or "unavailable" | Direct branch protection query result |

### SecurityScoreDefinition

The computed security score for display and health score integration.

| Field | Type | Description |
|-------|------|-------------|
| value | number or "Insufficient verified public data" | Composite security score (0-100) |
| tone | ScoreTone | success / warning / danger / neutral |
| percentile | number or null | Percentile within star bracket |
| bracketLabel | string or null | Star bracket name |
| compositeScore | number | Raw composite (0-1) |
| scorecardScore | number or null | Scorecard normalized score (0-1), null if unavailable |
| directCheckScore | number | Direct checks composite (0-1) |
| mode | "scorecard" or "direct-only" | Which scoring mode was used |
| recommendations | SecurityRecommendation[] | Actionable improvement suggestions |

### SecurityRecommendation

An actionable recommendation for improving security posture.

| Field | Type | Description |
|-------|------|-------------|
| bucket | "security" | Always "security" |
| category | string | Signal category (e.g., "scorecard", "direct_check") |
| item | string | Specific signal (e.g., "security_policy", "dependabot") |
| weight | number | Relative importance for sorting |
| text | string | Human-readable recommendation |

## Relationships

```
AnalysisResult
  └── securityResult: SecurityResult | Unavailable
        ├── scorecard: ScorecardAssessment | "unavailable"
        │     └── checks: ScorecardCheck[]
        ├── directChecks: DirectSecurityCheck[]
        └── branchProtectionEnabled: boolean | "unavailable"

HealthScoreDefinition
  └── buckets[]
        └── { name: "Security", percentile, weight, label }

SecurityScoreDefinition (computed from SecurityResult)
  ├── scorecardScore (from ScorecardAssessment)
  ├── directCheckScore (from DirectSecurityCheck[])
  └── recommendations: SecurityRecommendation[]
```

## Validation Rules

- ScorecardCheck.score must be -1 (indeterminate) or 0-10
- ScorecardAssessment.overallScore must be 0-10
- DirectSecurityCheck.detected must be boolean or "unavailable" — never null
- SecurityResult.directChecks must always contain entries for all 4 direct signals, even if "unavailable"
- SecurityScoreDefinition.compositeScore must be 0-1
- SecurityScoreDefinition.percentile must be 0-99 or null
