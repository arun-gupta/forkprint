# Feature Specification: Security Scoring

**Feature Branch**: `130-security-scoring`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: GitHub Issue #68 — Add security health signals (dependency updates, vulnerability disclosure)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Security Posture Overview via OpenSSF Scorecard (Priority: P1)

A user analyzing a repository sees a Security section in the analysis results that displays the project's security posture. The system retrieves the repository's OpenSSF Scorecard data as the primary assessment source, showing industry-standard security check results covering areas like security policy, code review practices, CI security, static analysis, fuzzing, signed releases, pinned dependencies, dangerous workflows, and token permissions.

**Why this priority**: OpenSSF Scorecard is the industry-standard security assessment used by enterprises and foundations. Leveraging it as the primary data source provides the richest, most credible security signal with a single external call — no need to independently replicate checks that Scorecard already performs well.

**Independent Test**: Can be tested by analyzing repos known to be in the Scorecard dataset (e.g., large CNCF projects) and verifying that Scorecard check results are displayed with their scores.

**Acceptance Scenarios**:

1. **Given** a repository that exists in the OpenSSF Scorecard dataset, **When** the user views the Security section, **Then** the system displays individual Scorecard check results (Security-Policy, Code-Review, Maintained, Pinned-Dependencies, Signed-Releases, Fuzzing, SAST, Dangerous-Workflow, Token-Permissions) with their scores.
2. **Given** a repository that exists in the OpenSSF Scorecard dataset, **When** the user views the Security section, **Then** the system displays the overall Scorecard score alongside the individual check breakdowns.
3. **Given** a repository that is NOT in the OpenSSF Scorecard dataset, **When** the user views the Security section, **Then** the system indicates that Scorecard data is unavailable and shows only the results from direct checks (see User Story 2).

---

### User Story 2 - Direct Security Checks (Priority: P2)

A user analyzing any repository sees direct security signals collected independently from OpenSSF Scorecard: dependency update automation (Dependabot/Renovate configuration), security policy presence (SECURITY.md), and CI/CD pipeline presence (GitHub Actions workflows). These checks run for every repository and are displayed alongside Scorecard results when available, or as the sole security signals when Scorecard data is not available.

**Why this priority**: Direct checks provide security signals for every repository regardless of Scorecard coverage. For repos in the Scorecard dataset, they supplement Scorecard with signals Scorecard does not cover (e.g., Dependabot/Renovate config detection). For repos outside the dataset, they ensure every repository gets some level of security assessment.

**Independent Test**: Can be tested by analyzing any repository and verifying that direct checks produce results for dependency automation, security policy, and CI/CD presence — independent of whether Scorecard data exists.

**Acceptance Scenarios**:

1. **Given** any repository with a `.github/dependabot.yml` or Renovate configuration file, **When** the user views the Security section, **Then** the system reports that automated dependency updates are enabled.
2. **Given** any repository with a `SECURITY.md` file, **When** the user views the Security section, **Then** the system reports that a security policy is present.
3. **Given** any repository with files in `.github/workflows/`, **When** the user views the Security section, **Then** the system reports that CI/CD pipelines are present.
4. **Given** a repository with none of these signals and no Scorecard data, **When** the user views the Security section, **Then** the system shows all direct checks as not detected and provides actionable recommendations.
5. **Given** a repository with Scorecard data available, **When** the user views the Security section, **Then** direct check results are displayed alongside Scorecard results as supplemental signals.

---

### User Story 3 - Branch Protection Fallback (Priority: P3)

A user analyzing a repository sees branch protection status even when the OpenSSF Scorecard cannot determine it. The Scorecard Branch-Protection check frequently returns an indeterminate result (-1) due to API permission limitations. When this happens, the system falls back to querying branch protection rules directly via the GitHub API, providing the user with visibility into whether code review is enforced on the default branch.

**Why this priority**: Branch protection is a key security signal for code review enforcement. Scorecard's inability to reliably assess it (due to permission constraints) makes a direct fallback valuable, but it depends on Scorecard data being attempted first (P1).

**Independent Test**: Can be tested by analyzing repos where Scorecard returns -1 for Branch-Protection and verifying the system falls back to a direct query that correctly reports whether branch protection is enabled.

**Acceptance Scenarios**:

1. **Given** a repository where Scorecard returns a valid Branch-Protection score (0-10), **When** the user views the Security section, **Then** the Scorecard score is used for branch protection.
2. **Given** a repository where Scorecard returns -1 for Branch-Protection, **When** the user views the Security section, **Then** the system queries branch protection rules directly and displays whether branch protection is enabled on the default branch.
3. **Given** a repository not in the Scorecard dataset, **When** the user views the Security section, **Then** the system queries branch protection rules directly as part of the direct checks.

---

### Edge Cases

- What happens when the OpenSSF Scorecard API is temporarily unavailable or returns an error? The system marks Scorecard signals as unavailable. The Security score is computed from direct checks only, same as if the repo were not in the dataset.
- What happens when a repo has Scorecard data but with many checks scoring 0? The scores are displayed as-is — a 0 is a valid result indicating the check ran but the repo lacks that practice.
- What happens when Scorecard data is stale (Scorecard scans weekly)? The system uses whatever data the Scorecard API returns. Staleness is inherent in the Scorecard dataset and is acceptable.
- What happens when the branch protection GraphQL query fails due to insufficient OAuth token permissions? The branch protection signal is marked as "unavailable" per the accuracy policy.
- What happens when a repo has both Scorecard Security-Policy check data and a directly detected SECURITY.md? Both are displayed. The Scorecard Security-Policy score contributes to the Scorecard layer; the direct SECURITY.md detection contributes to the direct checks layer. The scoring model reconciles overlapping signals to avoid double-counting (deferred to planning phase).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST query the OpenSSF Scorecard API for the repository's security assessment data as the primary security data source.
- **FR-002**: When Scorecard data is available, system MUST display individual check results for: Security-Policy, Code-Review, Maintained, Pinned-Dependencies, Signed-Releases, Fuzzing, SAST, Dangerous-Workflow, and Token-Permissions — each with their score (0-10).
- **FR-003**: When Scorecard data is available, system MUST display the overall Scorecard score for the repository.
- **FR-004**: When Scorecard data is unavailable (API returns no data or an error), system MUST mark Scorecard-dependent signals as "unavailable" and compute the Security score from direct checks only.
- **FR-005**: System MUST check for dependency update automation by detecting Dependabot configuration or Renovate configuration files.
- **FR-006**: System MUST check for security policy presence by detecting a SECURITY.md file.
- **FR-007**: System MUST check for CI/CD pipeline presence by detecting GitHub Actions workflow files.
- **FR-008**: When the Scorecard Branch-Protection check returns an indeterminate result (-1), system MUST fall back to querying branch protection rules directly via the GitHub API for the default branch.
- **FR-009**: When a repository is not in the Scorecard dataset, system MUST also query branch protection rules directly as part of the fallback checks.
- **FR-010**: System MUST compute a composite Security score from available signals — using Scorecard check scores as the primary input when available, and direct check results as the input when Scorecard data is unavailable.
- **FR-011**: System MUST integrate the Security score into the overall health score as a new scoring dimension.
- **FR-012**: System MUST display the Security assessment in a dedicated Security section within the analysis results.
- **FR-013**: System MUST produce actionable recommendations when security signals are missing or weak (e.g., no security policy, no dependency automation, no branch protection).
- **FR-014**: When security data is unavailable from any source, the system MUST mark the affected signal as `"Insufficient verified public data"` per the accuracy policy.
- **FR-015**: System MUST NOT penalize a repository for signals that are unavailable — only signals with actual data (positive or negative) contribute to the score.

### Key Entities

- **Scorecard Assessment**: The OpenSSF Scorecard result for a repository — includes an overall score and individual check results (name, score 0-10, reason).
- **Direct Security Check Result**: A check performed directly via GitHub API or file detection — includes the signal name, whether it was detected (true/false/unavailable), and supporting details.
- **Security Score**: A composite score combining Scorecard check scores (when available) and direct check results (as fallback), integrated into the overall health score.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every analyzed repository displays a Security section showing either Scorecard-based results or direct check results (or an explicit "insufficient data" indicator when neither is available).
- **SC-002**: Repositories with strong security practices (high Scorecard scores, branch protection enabled, dependency automation configured) score measurably higher in the overall health score than repositories without these practices.
- **SC-003**: Users can identify at a glance which specific security practices a repository follows or lacks from the Security section.
- **SC-004**: Repositories not in the Scorecard dataset still receive a meaningful security assessment from direct checks, rather than no assessment at all.
- **SC-005**: At least one actionable recommendation is generated for any repository missing key security practices (no security policy, no dependency automation, no branch protection).
- **SC-006**: No repository is penalized for signals that are unavailable — scores reflect only what can be verified.

## Health Score Integration

### New Security Dimension

Security scoring is introduced as a new dimension in the overall health score. The existing bucket weights (Activity 30%, Responsiveness 30%, Sustainability 25%, Documentation 15%) will need to be rebalanced to accommodate Security. The exact weight allocation is deferred to the planning phase, but Security is expected to carry meaningful weight given its importance to project health assessment.

### Two-Layer Scoring

The Security score combines two layers of signals:

1. **Direct checks** (always collected) — Dependency update automation, security policy presence, CI/CD pipeline presence, and branch protection. These run for every repository regardless of Scorecard coverage.
2. **OpenSSF Scorecard checks** (when available) — Industry-standard checks including Code-Review, Maintained, Pinned-Dependencies, Signed-Releases, Fuzzing, SAST, Dangerous-Workflow, and Token-Permissions. When Scorecard data is available, these checks enrich the Security score alongside the direct checks. When Scorecard data is unavailable, these signals are excluded from scoring rather than penalized.

For the Branch-Protection signal specifically: the Scorecard score is used when valid (0-10), but when Scorecard returns -1 (indeterminate), the system uses its own direct query via the GitHub API.

### Signals Consolidation

Per issue #68 comments, dependency freshness and known vulnerability signals from closed issue #71 were originally consolidated into this feature. These are now covered by the OpenSSF Scorecard's Vulnerabilities and Pinned-Dependencies checks when Scorecard data is available. No independent implementation is needed — Scorecard subsumes these signals.

### UI Display

The analysis results gain a dedicated **Security section** displaying:

- Overall security score and its contribution to the health score
- Data source indicator (Scorecard + direct checks vs. direct checks only)
- Individual signal results with scores or detection status
- Actionable recommendations for missing or weak signals
- Clear "unavailable" indicators for signals that could not be assessed

## Assumptions

- The OpenSSF Scorecard API (`https://api.securityscorecards.dev/projects/github.com/{owner}/{repo}`) is a public, unauthenticated endpoint that requires no API key or additional dependencies.
- The Scorecard API covers approximately 1 million repositories, primarily popular open source projects. Repos outside this dataset return no data.
- Scorecard data is refreshed approximately weekly. The system accepts this staleness as inherent to the data source.
- Branch protection rules are queryable via the GitHub GraphQL API using the authenticated user's OAuth token. Some repos may restrict this data, in which case the signal is marked as unavailable.
- The SECURITY.md file presence check already exists in the Documentation scoring (file presence sub-score). The Security feature will use its own detection for SECURITY.md and the existing Documentation file presence check remains unchanged — no double-counting occurs because the two buckets score different aspects (Documentation: "does the file exist?" vs. Security: "does the project have a vulnerability disclosure process?").
- Adding Security as a new health score dimension requires rebalancing all bucket weights. This rebalancing is deferred to the planning phase.
- The OpenSSF Scorecard API call does not count against the user's GitHub API rate limit since it is a separate, unauthenticated service.
