# Data Model: Ecosystem Map

## Entities

### EcosystemProfileRow

- **Purpose**: Represents one successful repository as visible ecosystem metrics plus derived profile data
- **Fields**:
  - `repo: string`
  - `stars: number | "unavailable"`
  - `forks: number | "unavailable"`
  - `watchers: number | "unavailable"`
  - `builderEngagementRate: number | "unavailable"`
  - `attentionRate: number | "unavailable"`
  - `missingEcosystemMetrics: Array<"stars" | "forks" | "watchers">`

### SpectrumProfile

- **Purpose**: Represents the derived ecosystem summary for one repository
- **Fields**:
  - `reachTier: "Emerging" | "Growing" | "Strong" | "Exceptional" | null`
  - `engagementTier: "Light" | "Healthy" | "Strong" | "Exceptional" | null`
  - `attentionTier: "Light" | "Active" | "Strong" | "Exceptional" | null`
  - `forkRateLabel: string | null`
  - `watcherRateLabel: string | null`

### SpectrumConfig

- **Purpose**: Holds the shared threshold bands for ecosystem profile tiers
- **Fields**:
  - `reachBands`
  - `builderEngagementBands`
  - `attentionBands`

### VisibleMetricRow

- **Purpose**: User-visible summary of ecosystem metrics that remains readable without secondary interactions
- **Fields**:
  - `repo: string`
  - `starsLabel: string`
  - `forksLabel: string`
  - `watchersLabel: string`
  - `plotStatusNote: string | null`

## Relationships

- One `AnalyzeResponse.results[]` entry can produce:
  - one `EcosystemProfileRow`
  - one `VisibleMetricRow`
  - one `SpectrumProfile` when verified ecosystem metrics exist
- One analysis run consumes:
  - one `SpectrumConfig`

## Validation Rules

- `builderEngagementRate` and `attentionRate` are derived only when the required verified source metrics exist and stars is greater than zero
- `SpectrumProfile` values are derived from shared config bands, not inline thresholds
- `missingEcosystemMetrics` is populated from `"unavailable"` ecosystem values and never inferred
