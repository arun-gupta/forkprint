# Data Model: Activity

## Entities

### ActivityViewState

- **Purpose**: Represents the local UI state for the `Activity` workspace
- **Fields**:
  - `windowKey: ActivityWindowKey`
  - `hasResults: boolean`
  - `hasSuccessfulResults: boolean`
  - `hasFailures: boolean`

### ActivityWindowKey

- **Purpose**: Defines the supported recent-activity window presets
- **Fields**:
  - `value: "30d" | "60d" | "90d" | "180d" | "12mo"`
  - `label: string`
  - `days: 30 | 60 | 90 | 180 | 365`

### ActivityMetricsByWindow

- **Purpose**: Holds activity metrics scoped to one supported recent-activity window
- **Fields**:
  - `commits: number | "unavailable"`
  - `prsOpened: number | "unavailable"`
  - `prsMerged: number | "unavailable"`
  - `prsClosed: number | "unavailable"`
  - `issuesOpened: number | "unavailable"`
  - `issuesClosed: number | "unavailable"`
  - `releases: number | "unavailable"`
  - `prMergeRate: number | "unavailable"`
  - `issueClosureRate: number | "unavailable"`
  - `staleIssueRatio: number | "unavailable"`
  - `medianTimeToMergeHours: number | "unavailable"`
  - `medianTimeToCloseHours: number | "unavailable"`

### ActivityScoreInput

- **Purpose**: Captures the verified raw and derived inputs required to compute the Activity score
- **Fields**:
  - `commits30d: number | "unavailable"`
  - `commits90d: number | "unavailable"`
  - `commits180d: number | "unavailable"`
  - `selectedWindowMetrics: ActivityMetricsByWindow`
  - `releaseCadenceWindow: ActivityWindowKey`
  - `missingInputs: string[]`

### ActivityScoreDefinition

- **Purpose**: Defines the computed score and explanation shown in overview cards and the `Activity` tab
- **Fields**:
  - `value: "High" | "Medium" | "Low" | "Insufficient verified public data"`
  - `tone: "success" | "warning" | "danger" | "neutral"`
  - `description: string`
  - `weightedFactors: Array<{ id: string; label: string; weight: number }>`

### ActivitySection

- **Purpose**: Represents one repository section rendered in the `Activity` tab
- **Fields**:
  - `repo: string`
  - `windowKey: ActivityWindowKey`
  - `metrics: ActivityMetricsByWindow`
  - `throughputRatioDetails: { prMergeRateDetail: string | "unavailable"; issueClosureRateDetail: string | "unavailable" }`
  - `fixedCommitWindows: { commits30d: number | "unavailable"; commits90d: number | "unavailable"; commits180d: number | "unavailable" }`
  - `score: ActivityScoreDefinition`
  - `missingFields: string[]`

## Validation Rules

- `windowKey` always matches one supported preset
- Switching `windowKey` never mutates server-side analysis request state by itself
- Primary counts and selected-window values remain visible outside tooltip-only surfaces
- Derived rates and timing metrics are shown only when all required verified inputs exist; otherwise they remain `"unavailable"`
- Throughput percentages always render next to or beneath the raw counts they are derived from
- Activity scoring returns `Insufficient verified public data` when the minimum verified inputs are incomplete
- The same `AnalysisResult` payload must support both the overview Activity badge and the `Activity` tab detail
