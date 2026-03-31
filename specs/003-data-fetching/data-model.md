# Data Model: P1-F04 Data Fetching

## Entities

### AnalysisRequest

Represents one user-initiated submission for repository analysis.

| Field | Type | Notes |
|-------|------|-------|
| `repos` | `string[]` | Validated `owner/repo` slugs from `P1-F01` |
| `token` | `string \| null` | Client token when no server-side token is configured |

---

### AnalysisResult

Represents the flat per-repository analysis output consumed by later Phase 1 features.

| Field | Type | Notes |
|-------|------|-------|
| `repo` | `string` | Canonical `owner/repo` slug |
| `name` | `string \| "unavailable"` | Verified repo name |
| `description` | `string \| "unavailable"` | Verified repo description |
| `createdAt` | `string \| "unavailable"` | Verified repo creation timestamp |
| `primaryLanguage` | `string \| "unavailable"` | Verified primary language |
| `stars` | `number \| "unavailable"` | Ecosystem metric |
| `forks` | `number \| "unavailable"` | Ecosystem metric |
| `watchers` | `number \| "unavailable"` | Ecosystem metric |
| `commits30d` | `number \| "unavailable"` | Evolution metric |
| `commits90d` | `number \| "unavailable"` | Evolution metric |
| `releases12mo` | `number \| "unavailable"` | Evolution metric |
| `prsOpened90d` | `number \| "unavailable"` | Evolution metric |
| `prsMerged90d` | `number \| "unavailable"` | Evolution metric |
| `issuesOpen` | `number \| "unavailable"` | Evolution metric |
| `issuesClosed90d` | `number \| "unavailable"` | Evolution metric |
| `uniqueCommitAuthors90d` | `number \| "unavailable"` | Contribution metric |
| `totalContributors` | `number \| "unavailable"` | Contribution metric |
| `commitCountsByAuthor` | `Record<string, number> \| "unavailable"` | Contribution metric |
| `issueFirstResponseTimestamps` | `string[] \| "unavailable"` | Responsiveness input |
| `issueCloseTimestamps` | `string[] \| "unavailable"` | Responsiveness input |
| `prMergeTimestamps` | `string[] \| "unavailable"` | Responsiveness input |
| `missingFields` | `string[]` | Explicit list of unverifiable fields |

---

### RepositoryFetchFailure

Represents a repository-specific analysis failure that must not block other repositories.

| Field | Type | Notes |
|-------|------|-------|
| `repo` | `string` | Submitted repo slug |
| `reason` | `string` | User-visible failure summary |
| `code` | `string` | Stable failure category such as `NOT_FOUND`, `UNAUTHORIZED`, `RATE_LIMITED` |

---

### RateLimitState

Represents GitHub rate-limit metadata surfaced to the user.

| Field | Type | Notes |
|-------|------|-------|
| `remaining` | `number \| "unavailable"` | Remaining request capacity |
| `resetAt` | `string \| "unavailable"` | Reset timestamp when available |
| `retryAfter` | `number \| "unavailable"` | Retry delay in seconds when available |

## Relationships

- One `AnalysisRequest` can produce many `AnalysisResult` entries
- One `AnalysisRequest` can produce many `RepositoryFetchFailure` entries
- One analysis response can include one `RateLimitState`

## State Transitions

1. User submits repos and available token context
2. API route resolves server-token precedence
3. Analyzer fetches up to three GraphQL query groups per repository
4. Each repository becomes either:
   - `AnalysisResult`
   - `RepositoryFetchFailure`
5. Response returns successes, failures, and rate-limit metadata together
