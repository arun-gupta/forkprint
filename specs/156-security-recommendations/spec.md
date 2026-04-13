# Feature Specification: Richer Security Recommendations

**Feature Branch**: `156-security-recommendations`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: GitHub Issue #140 — Build richer security recommendations on top of OpenSSF Scorecard guidance

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Structured Security Recommendations (Priority: P1)

A maintainer analyzes their repository and sees security recommendations enriched with risk level, evidence from the actual analysis, an explanation of why the finding matters, and a concrete recommended action — instead of generic one-line guidance.

**Why this priority**: The core value proposition of #140. Without structured recommendations, the security tab is just a score display. Structured fields turn findings into actionable remediation guidance.

**Independent Test**: Can be fully tested by analyzing a repo with low-scoring Scorecard checks and missing direct checks, then verifying each recommendation shows the structured fields (title, source, risk level, evidence, why it matters, recommended action, and docs link where available).

**Acceptance Scenarios**:

1. **Given** a repo with OpenSSF Scorecard data where `Token-Permissions` scored 0/10, **When** the user views security recommendations, **Then** the recommendation displays a descriptive title (e.g., "Restrict GitHub Actions token permissions"), source label ("OpenSSF Scorecard"), risk level, the actual score as evidence, an explanation of why overly broad tokens are risky, a specific remediation action, and a link to the relevant OpenSSF check documentation.
2. **Given** a repo missing `SECURITY.md` (direct check), **When** the user views security recommendations, **Then** the recommendation displays a descriptive title, source label ("Direct check"), risk level, evidence that the file was not detected, why a security policy matters, and the recommended action to add one.
3. **Given** a repo where all Scorecard checks score 10/10 and all direct checks pass, **When** the user views security recommendations, **Then** no security recommendations are shown.
4. **Given** a repo where a Scorecard check scores 7/10 and the catalog has remediation guidance for it, **When** the user views security recommendations, **Then** a recommendation is shown with the actual score as evidence and the OpenSSF remediation guidance.

---

### User Story 2 - Grouped Recommendations by Category (Priority: P2)

A maintainer sees their security recommendations organized into meaningful categories (e.g., Quick Wins, Workflow Hardening, Release Integrity, Security Process) so they can prioritize which group to tackle first.

**Why this priority**: Grouping transforms a flat list into a structured remediation plan. It helps maintainers focus on the highest-impact cluster of fixes instead of reading recommendations one by one.

**Independent Test**: Can be tested by analyzing a repo with multiple low-scoring checks spanning different categories, then verifying recommendations are grouped under labeled category headings.

**Acceptance Scenarios**:

1. **Given** a repo with a Critical-risk check scoring 0/10 and a Low-risk check scoring 8/10, **When** the user views the recommendations, **Then** the critical finding appears under "Critical Issues" and the low-risk finding appears under "Quick Wins" or "Best Practices", with Critical Issues displayed first.
2. **Given** a repo with findings in only one category, **When** the user views the recommendations, **Then** only that single category heading is shown — empty categories are not displayed.

---

### User Story 3 - Source Attribution and Finding Distinction (Priority: P2)

A maintainer can clearly distinguish between recommendations sourced from OpenSSF Scorecard findings, direct repository checks performed by RepoPulse, and unavailable signals — so they understand the origin and confidence of each finding.

**Why this priority**: Transparency about where findings come from builds trust. Maintainers need to know whether a recommendation is industry-standard (Scorecard) or app-specific (direct check).

**Independent Test**: Can be tested by analyzing a repo with both Scorecard and direct-check findings, then verifying each recommendation is labeled with its source.

**Acceptance Scenarios**:

1. **Given** a repo with both Scorecard and direct-check findings, **When** the user views recommendations, **Then** each recommendation displays a source label distinguishing "OpenSSF Scorecard" from "Direct check".
2. **Given** a repo where Scorecard is unavailable (direct-only mode), **When** the user views recommendations, **Then** all recommendations are labeled as "Direct check" and no Scorecard-sourced recommendations appear.

---

### User Story 4 - Remediation Snippets and Documentation Links (Priority: P3)

A maintainer sees actionable remediation snippets or links for common security fixes, helping them go from finding to fix without needing to research the solution.

**Why this priority**: Reduces friction between seeing a recommendation and acting on it. Links and snippets are the last-mile value that differentiate RepoPulse from raw Scorecard output.

**Independent Test**: Can be tested by analyzing a repo with specific low-scoring checks (e.g., missing `dependabot.yml`, missing `SECURITY.md`) and verifying relevant recommendations include remediation snippets or documentation links.

**Acceptance Scenarios**:

1. **Given** a recommendation for a check that has a known remediation snippet (e.g., adding `permissions:` blocks to workflows), **When** the user views the recommendation, **Then** the recommendation includes a brief remediation hint describing what to do.
2. **Given** a recommendation sourced from an OpenSSF Scorecard check, **When** the user views the recommendation, **Then** the recommendation includes a link to the relevant OpenSSF Scorecard check documentation.

---

### Edge Cases

- What happens when a Scorecard check returns an indeterminate score (-1)? Indeterminate checks should not generate recommendations since the finding is inconclusive.
- What happens when a direct check is `unavailable`? Unavailable checks should not generate recommendations (preserve current behavior — don't penalize what can't be measured).
- What happens when a repo has zero findings across both Scorecard and direct checks? The existing "no recommendations" messaging should be preserved.
- What happens when the same security concern is flagged by both Scorecard and a direct check (e.g., Branch-Protection)? The recommendation should be deduplicated, preferring the richer Scorecard-sourced version when available.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each security recommendation MUST include structured fields: a descriptive title, source label (OpenSSF Scorecard or Direct check), risk level (Critical, High, Medium, Low), evidence string, why-it-matters explanation, and recommended action text.
- **FR-002**: Recommendations sourced from OpenSSF Scorecard checks MUST use guidance derived from the published OpenSSF Scorecard checks documentation as the baseline for title, risk level, why-it-matters, and remediation text — not generic invented guidance.
- **FR-003**: Each Scorecard-sourced recommendation MUST include a documentation link pointing to the relevant OpenSSF Scorecard check documentation.
- **FR-004**: Recommendations MUST be grouped into priority-driven categories. The initial categories are: Critical Issues (Critical/High risk + low score 0–4), Quick Wins (Low/Medium risk or high score 5–9 with a clear simple fix), Workflow Hardening (CI/CD, branch protection, token permissions at medium scores), and Best Practices (mature security practices like fuzzing, SAST, SBOM, signed releases). Each recommendation maps to exactly one category based on its risk level and score.
- **FR-005**: Empty categories (no findings in that group) MUST NOT be displayed.
- **FR-006**: Each recommendation MUST display a source label distinguishing between "OpenSSF Scorecard" and "Direct check" origins.
- **FR-007**: When a security concern is covered by both a Scorecard check and a direct check, the system MUST deduplicate by presenting a single recommendation that prefers the richer Scorecard-sourced version when available.
- **FR-008**: Recommendations for checks with indeterminate Scorecard scores (-1) MUST NOT be generated.
- **FR-009**: Recommendations for direct checks with `unavailable` detection status MUST NOT be generated (preserving current behavior).
- **FR-010**: Where applicable, recommendations MUST include brief remediation hints describing common fixes (e.g., adding workflow permissions blocks, enabling Dependabot, adding a SECURITY.md file).
- **FR-011**: Recommendations MUST be sorted within each category by risk level (Critical first, then High, Medium, Low), with weight as a tiebreaker.
- **FR-012**: The recommendation catalog MUST cover at minimum the following OpenSSF Scorecard checks: Branch-Protection, Binary-Artifacts, CI-Tests, Dangerous-Workflow, Pinned-Dependencies, Signed-Releases, Token-Permissions, and Security-Policy — plus all four existing direct checks.
- **FR-013**: The existing recommendation integration with the shared Recommendations tab and health score MUST continue to work — the richer recommendation data is additive, not breaking.
- **FR-014**: The recommendation catalog MUST be defined in a structured data source (not hardcoded in scoring logic) so entries can be reviewed and maintained independently of the recommendation engine.

### Key Entities

- **SecurityRecommendation**: An enriched recommendation with title, source, risk level, evidence, explanation, remediation action, category, and optional documentation link and remediation hint.
- **RecommendationCatalog**: A structured mapping from Scorecard check names and direct check types to their baseline recommendation metadata (title, risk level, category, why-it-matters template, remediation template, docs link).
- **RecommendationCategory**: A labeled grouping (Quick Wins, Workflow Hardening, Release Integrity, Security Process) used to organize recommendations in the UI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every security recommendation displayed to the user includes at minimum: a descriptive title, source label, risk level, evidence, explanation, and recommended action — no recommendation falls back to the previous generic one-line format.
- **SC-002**: Recommendations for repos with Scorecard data are grouped into at least 2 distinct categories when findings span multiple security domains.
- **SC-003**: Users can distinguish the source of every recommendation (OpenSSF Scorecard vs. Direct check) by reading the visible label without expanding or hovering.
- **SC-004**: At least 8 OpenSSF Scorecard checks and 4 direct checks have catalog entries with complete structured guidance.
- **SC-005**: Duplicate recommendations for the same security concern (covered by both Scorecard and direct check) are merged into a single entry.
- **SC-006**: The existing Recommendations tab continues to render security recommendations alongside other scoring dimensions without regression.

## Assumptions

- The OpenSSF Scorecard checks documentation (https://github.com/ossf/scorecard/blob/main/docs/checks.md) is the authoritative reference for Scorecard check guidance. Recommendation catalog entries are derived from this source.
- Risk levels for Scorecard checks are informed by the risk classifications in the Scorecard documentation (Critical, High, Medium, Low).
- The recommendation catalog is static and ships with the application — it is not fetched dynamically from the OpenSSF API at runtime.
- The existing `SecurityRecommendation` interface will be extended (not replaced) to include the new structured fields, maintaining backward compatibility with the health score integration.
- Category assignments for each check are determined at catalog authoring time based on the nature of the remediation, not dynamically computed.
- Remediation hints are brief textual descriptions, not executable code snippets or full file templates.
