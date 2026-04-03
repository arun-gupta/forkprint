# Data Model: Responsiveness

## Entities

### ResponsivenessViewState

- **Purpose**: Represents the local UI state for the `Responsiveness` workspace
- **Fields**:
  - `hasResults: boolean`
  - `hasSuccessfulResults: boolean`
  - `hasFailures: boolean`
  - `expandedScoreHelp: boolean`

### ResponseTimeMetrics

- **Purpose**: Holds the first-response and first-review latency signals for one repository
- **Fields**:
  - `issueFirstResponseMedianHours: number | "unavailable"`
  - `issueFirstResponseP90Hours: number | "unavailable"`
  - `prFirstReviewMedianHours: number | "unavailable"`
  - `prFirstReviewP90Hours: number | "unavailable"`

### ResolutionMetrics

- **Purpose**: Holds issue/PR resolution-duration and closure-flow signals for one repository
- **Fields**:
  - `issueResolutionMedianHours: number | "unavailable"`
  - `issueResolutionP90Hours: number | "unavailable"`
  - `prMergeMedianHours: number | "unavailable"`
  - `prMergeP90Hours: number | "unavailable"`
  - `issueResolutionRate: number | "unavailable"`

### MaintainerActivityMetrics

- **Purpose**: Holds responder-participation signals for one repository
- **Fields**:
  - `contributorResponseRate: number | "unavailable"`
  - `botResponseRatio: number | "unavailable"`
  - `humanResponseRatio: number | "unavailable"`

### BacklogHealthMetrics

- **Purpose**: Holds stale-item and backlog-health signals for one repository
- **Fields**:
  - `staleIssueRatio: number | "unavailable"`
  - `stalePrRatio: number | "unavailable"`

### EngagementQualityMetrics

- **Purpose**: Holds quality-oriented responsiveness signals for one repository
- **Fields**:
  - `prReviewDepth: number | "unavailable"`
  - `issuesClosedWithoutCommentRatio: number | "unavailable"`

### ResponsivenessScoreDefinition

- **Purpose**: Defines the computed score and explanation shown in overview cards and the `Responsiveness` tab
- **Fields**:
  - `value: "High" | "Medium" | "Low" | "Insufficient verified public data"`
  - `tone: "success" | "warning" | "danger" | "neutral"`
  - `description: string`
  - `summary: string`
  - `weightedCategories: Array<{ id: string; label: string; weight: number }>`
  - `missingInputs: string[]`

### ResponsivenessSection

- **Purpose**: Represents one repository section rendered in the `Responsiveness` tab
- **Fields**:
  - `repo: string`
  - `responseTime: ResponseTimeMetrics`
  - `resolution: ResolutionMetrics`
  - `maintainerActivity: MaintainerActivityMetrics`
  - `backlogHealth: BacklogHealthMetrics`
  - `engagementQuality: EngagementQualityMetrics`
  - `score: ResponsivenessScoreDefinition`
  - `missingFields: string[]`

## Validation Rules

- Response and review timing metrics render only when the required verified public event trail exists
- `median` and `p90` values are shown only when enough verified samples exist to compute them honestly
- Bot-vs-human response metrics remain `"unavailable"` when responder identity cannot be publicly verified
- Unavailable metrics remain explicit and are never hidden, zeroed, or guessed
- The same `AnalysisResult` payload must support both the overview Responsiveness badge and the `Responsiveness` tab detail
- Opening or interacting with `Responsiveness` must not trigger another analysis request
