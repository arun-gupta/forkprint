# Feature Specification: Data Fetching

**Feature Branch**: `003-data-fetching`  
**Created**: 2026-03-31  
**Status**: Draft  
**Input**: User description: "P1-F04 Data Fetching"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fetch Verified Repo Data (Priority: P1)

A user submits one or more repositories for analysis and receives verified public GitHub data for each repository that can be analyzed successfully.

**Why this priority**: This is the first feature that turns repo input and authentication into useful output. Without verified data fetching, the app cannot deliver repository health analysis.

**Independent Test**: Can be fully tested by submitting one or more valid repositories with an available token and verifying that each successful repository returns the required metric placeholders from public GitHub data.

**Acceptance Scenarios**:

1. **Given** the user has entered valid repositories and an available token source exists, **When** they submit the form, **Then** the system fetches verified public GitHub data for each repository and returns one result per successfully analyzed repository.
2. **Given** the user submits multiple valid repositories, **When** the analysis completes, **Then** each successful repository result includes the required placeholders for repo metadata, ecosystem signals, evolution, contribution dynamics, and responsiveness.
3. **Given** a metric cannot be verified from the public data source, **When** the result is returned, **Then** that field is surfaced as `"unavailable"` instead of being inferred, substituted, or omitted.

---

### User Story 2 - Partial Failures Do Not Block Other Results (Priority: P1)

A user submits multiple repositories and still receives usable results even when one or more repositories fail to analyze.

**Why this priority**: The constitution requires per-repo error isolation. One bad repository or unavailable response must not collapse the entire analysis experience.

**Independent Test**: Can be fully tested by submitting a mix of analyzable and failing repositories and verifying that successful repositories still return results while failures are isolated to the affected repositories.

**Acceptance Scenarios**:

1. **Given** the user submits multiple repositories and one repository fails during analysis, **When** the response is returned, **Then** the successful repositories still appear in the results and the failed repository is reported separately.
2. **Given** one repository is not found or cannot be analyzed, **When** the response is returned, **Then** the failure is isolated to that repository and does not corrupt the other results.
3. **Given** a user token is missing, invalid, or rejected by GitHub, **When** analysis is attempted, **Then** the user receives a clear fetch-time failure instead of fabricated or partial metric values.

---

### User Story 3 - Loading and Rate Limit State Is Visible (Priority: P2)

A user can see that analysis is in progress and can understand when GitHub rate limits affect the request.

**Why this priority**: Clear progress and rate-limit visibility prevent confusion during slow or constrained API interactions, but they depend on the core fetching behavior already being in place.

**Independent Test**: Can be fully tested by starting an analysis and verifying that in-progress state appears per repository, then simulating rate-limit exhaustion and confirming the remaining-call and retry information is surfaced.

**Acceptance Scenarios**:

1. **Given** analysis is in progress, **When** the user is waiting for results, **Then** the UI shows a loading state for each repository being fetched.
2. **Given** GitHub rate-limit information is available, **When** results or failures are returned, **Then** the UI surfaces remaining-call state to the user.
3. **Given** the rate limit is exhausted and retry information is available, **When** the fetch fails for that reason, **Then** the UI surfaces the retry timing instead of failing silently.

---

### Edge Cases

- What happens when the same submission includes a valid public repository and a nonexistent repository?
- What happens when one or more required GitHub fields are unavailable for a repository?
- What happens when the response includes fewer analyzable repositories than were submitted because some requests fail?
- What happens when the token is present but GitHub rejects it at analysis time?
- What happens when rate-limit information is present for a partially successful analysis?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST fetch repository analysis data from verified public GitHub responses for every submitted repository it can analyze successfully.
- **FR-002**: The system MUST use the GitHub GraphQL API as the primary source for repository analysis data.
- **FR-003**: The system MUST return one result per successfully analyzed repository in the same overall analysis response.
- **FR-004**: The system MUST surface required metric placeholders for repo metadata, ecosystem signals, evolution, contribution dynamics, and responsiveness in each successful result.
- **FR-005**: The system MUST mark unverifiable metric fields as `"unavailable"` and MUST NOT estimate, infer, interpolate, or substitute missing data.
- **FR-006**: The system MUST isolate repository failures so one failed repository does not block or corrupt results for other submitted repositories.
- **FR-007**: The system MUST surface repository-specific failures when a repository cannot be analyzed.
- **FR-008**: The system MUST surface rate-limit state, including remaining calls when available.
- **FR-009**: The system MUST surface retry timing when GitHub rate limiting prevents analysis and retry information is available.
- **FR-010**: The system MUST show a loading state for each repository while analysis is in progress.
- **FR-011**: The system MUST accept the resolved token source from the authentication flow without exposing server-side secrets to the client.
- **FR-012**: The system MUST complete repository fetching using 1–3 GraphQL requests per repository.

### Key Entities

- **Analysis Request**: A user-submitted analysis action containing one or more repository identifiers and an available authentication context.
- **Repository Analysis Result**: The flat per-repository result containing verified metric placeholders and any `"unavailable"` fields that could not be confirmed publicly.
- **Repository Fetch Failure**: A repository-specific failure outcome that records why that repository could not be analyzed without preventing other repositories from succeeding.
- **Rate Limit State**: The GitHub response metadata that describes remaining request capacity and retry timing when limits are exhausted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can submit one or more valid repositories and receive verified analysis results for every successfully analyzable repository in a single response.
- **SC-002**: In mixed-success submissions, 100% of successful repositories still return results even when one or more repositories fail.
- **SC-003**: 100% of unverifiable metric fields are surfaced as `"unavailable"` rather than omitted, zeroed, or approximated.
- **SC-004**: Users can identify that analysis is still running for each in-progress repository without needing to refresh the page.
- **SC-005**: Users can see rate-limit state and retry timing whenever GitHub provides that information during an analysis attempt.

## Assumptions

- The repo input and PAT authentication flows from `P1-F01` and `P1-F02` are already available and provide validated repository slugs plus an available token source.
- Data fetching is still limited to public GitHub repository analysis; private repository support is not introduced by this feature.
- The first implementation of this feature returns verified analysis data and failure state, while later Phase 1 features handle richer visualization and comparison of those results.
- Any invalid or rejected token is treated as a fetch-time failure for this feature rather than an input-time validation concern.
