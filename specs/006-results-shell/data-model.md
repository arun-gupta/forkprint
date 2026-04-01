# Data Model: Results Shell

## Entities

### ResultsShellState

- **Purpose**: Represents the active shell layout state on the page
- **Fields**:
  - `activeTab: ResultTabId`
  - `hasAnalysis: boolean`
  - `hasSuccessfulResults: boolean`
  - `hasFailures: boolean`

### ResultTab

- **Purpose**: Defines one tab in the result workspace
- **Fields**:
  - `id: "overview" | "ecosystem-map" | "comparison" | "metrics"`
  - `label: string`
  - `status: "implemented" | "placeholder"`
  - `description: string`

### HeaderBanner

- **Purpose**: Represents the shell header content
- **Fields**:
  - `title: string`
  - `tagline: string`
  - `githubUrl: string`

### PlaceholderView

- **Purpose**: Defines the temporary content for an unimplemented tab
- **Fields**:
  - `tabId: ResultTabId`
  - `title: string`
  - `message: string`

## Validation Rules

- `activeTab` always matches one declared `ResultTab`
- Tab switching never mutates analysis request state by itself
- `hasAnalysis` is `true` only after at least one analyze attempt has returned or failed
- The shell can render placeholder tabs even when they have no implemented feature body yet
