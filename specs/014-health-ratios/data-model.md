# Data Model: Health Ratios

## Entities

### HealthRatiosViewState

- **Purpose**: Represents the local UI state for the `Health Ratios` workspace
- **Fields**:
  - `hasResults: boolean`
  - `hasSuccessfulResults: boolean`
  - `sortBy: string`
  - `sortDirection: "asc" | "desc"`

### RatioDefinition

- **Purpose**: Defines one reusable ratio, including its category, label, formula text, and value selector
- **Fields**:
  - `id: string`
  - `category: "ecosystem" | "activity" | "contributors"`
  - `label: string`
  - `description: string`
  - `formula: string`
  - `valueSelector: (result: AnalysisResult) => number | "unavailable"`

### ContributorCompositionRatioInputs

- **Purpose**: Holds the verified contributor counts required to derive contributor-composition ratios
- **Fields**:
  - `totalContributors: number | "unavailable"`
  - `repeatContributors: number | "unavailable"`
  - `newContributors: number | "unavailable"`

### RatioCell

- **Purpose**: Represents one repository value in the `Health Ratios` table for a given ratio
- **Fields**:
  - `repo: string`
  - `value: number | "unavailable"`
  - `displayValue: string`

### RatioRow

- **Purpose**: Represents one ratio definition rendered across all successful repositories
- **Fields**:
  - `id: string`
  - `category: "ecosystem" | "activity" | "contributors"`
  - `label: string`
  - `description: string`
  - `formula: string`
  - `cells: RatioCell[]`

### ContributorRatiosSection

- **Purpose**: Represents the contributor-composition ratio block rendered in the `Contributors` tab
- **Fields**:
  - `repeatContributorRatio: number | "unavailable"`
  - `newContributorRatio: number | "unavailable"`
  - `missingFields: string[]`

## Validation Rules

- A ratio renders only from verified public inputs already present in `AnalysisResult`
- Contributor-composition ratios are `"unavailable"` when the required contributor counts are unavailable
- The same ratio definition must drive both the home-view rendering and the `Health Ratios` rollup value
- `Health Ratios` table cells display `—` for unavailable values
- Sorting must treat unavailable values consistently and must not fabricate comparable numeric fallbacks
- Opening or sorting the `Health Ratios` table must not trigger another analysis request
