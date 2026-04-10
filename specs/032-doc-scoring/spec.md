# Feature Specification: Documentation Scoring

**Feature Branch**: `032-doc-scoring`  
**Created**: 2026-04-10  
**Status**: Draft  
**Input**: [P2-F01] Documentation scoring — Evaluate open source project documentation quality (GitHub issue #66)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View documentation health for a repository (Priority: P1)

A user analyzes a GitHub repository and sees a Documentation score alongside the existing Activity, Responsiveness, and Sustainability scores. The score tells them how well-documented the project is relative to similar projects in the same star bracket.

**Why this priority**: The documentation score is the core deliverable — without it, no other documentation feature has value.

**Independent Test**: Can be fully tested by analyzing any public GitHub repository and verifying that a Documentation percentile score appears on the scorecard and in the Documentation tab.

**Acceptance Scenarios**:

1. **Given** a user analyzes a repository with README, LICENSE, and CONTRIBUTING files, **When** results load, **Then** a Documentation score badge appears on the scorecard showing an ordinal percentile (e.g., "72nd percentile").
2. **Given** a user analyzes a repository with no documentation files, **When** results load, **Then** the Documentation score shows a low percentile and the recommendations list specific files to add.
3. **Given** a user analyzes a repository, **When** they switch to the Documentation tab, **Then** they see a breakdown of which documentation files are present and which are missing.

---

### User Story 2 - Understand documentation completeness breakdown (Priority: P2)

A user wants to understand exactly which documentation files exist, which are missing, and how the project's README is structured. The Documentation tab shows a per-file presence checklist and README quality signals.

**Why this priority**: The breakdown gives actionable detail behind the score — users need to know what to improve.

**Independent Test**: Can be tested by analyzing a repository and verifying each documentation file is correctly reported as present or absent, and README sections are detected.

**Acceptance Scenarios**:

1. **Given** a repository has README.md, LICENSE, CONTRIBUTING.md, and SECURITY.md, **When** the Documentation tab loads, **Then** each file is listed as present with a check mark, and missing files (CODE_OF_CONDUCT, CHANGELOG) are listed as absent with their corresponding recommendations (e.g., "Add a CODE_OF_CONDUCT.md to set expectations for community interaction").
2. **Given** a README contains sections for "Installation", "Usage", and "License", **When** the Documentation tab loads, **Then** those sections are listed as detected, and missing sections show recommendations (e.g., "Add a contributing section to your README or link to CONTRIBUTING.md").
3. **Given** a repository has no README, **When** the Documentation tab loads, **Then** the README file is listed as missing with a recommendation, and all README section checks show as not detected with their recommendations.

---

### User Story 3 - Compare documentation across repositories (Priority: P3)

A user compares two or more repositories and sees documentation scores side by side in the Comparison view, along with file-level differences.

**Why this priority**: Comparison is valuable but depends on the core scoring being in place first.

**Independent Test**: Can be tested by analyzing 2+ repositories and verifying documentation scores and file presence appear in the comparison table.

**Acceptance Scenarios**:

1. **Given** a user compares two repositories, **When** the Comparison view loads, **Then** a Documentation section shows each repo's documentation score, file count, and README quality signals.
2. **Given** one repository has comprehensive docs and another has minimal docs, **When** compared, **Then** the delta messaging highlights the documentation gap clearly.

---

### Edge Cases

- What happens when a repository has a README but it is empty (0 bytes)? The file is reported as present but README quality signals show no detected sections.
- How does the system handle a repository where the README is not named `README.md` (e.g., `readme.rst`, `README.txt`)? The system checks for all common README variants.
- What happens when the file existence check fails due to rate limiting? The documentation score is marked as "unavailable" and listed in the missing data panel.
- How does the system handle a LICENSE file without a recognized OSI-approved license? The file is reported as present, but the license type is shown as "unrecognized."

## Scoring Methodology

### Documentation completeness score

The documentation score is a weighted composite of two sub-scores:

**File presence sub-score (60%)** — checks whether key documentation files exist in the repository:

| File | Weight | Rationale |
|------|--------|-----------|
| README | 25% | Essential for any project — first thing users see |
| LICENSE | 20% | Required for legal clarity and adoption |
| CONTRIBUTING | 15% | Critical for contributor onboarding |
| CODE_OF_CONDUCT | 10% | Community health signal |
| SECURITY | 15% | Vulnerability disclosure process |
| CHANGELOG | 15% | Release transparency and upgrade guidance |

Each file scores 1 (present) or 0 (absent). The weighted sum produces a 0–1 file presence ratio. Each missing file generates a recommendation:

| Missing file | Recommendation |
|-------------|----------------|
| README | "Add a README to help users understand what this project does and how to use it" |
| LICENSE | "Add a LICENSE file to clarify how others can use, modify, and distribute this project" |
| CONTRIBUTING | "Add a CONTRIBUTING.md to help new contributors understand how to participate" |
| CODE_OF_CONDUCT | "Add a CODE_OF_CONDUCT.md to set expectations for community interaction" |
| SECURITY | "Add a SECURITY.md with vulnerability reporting instructions so users know how to disclose issues responsibly" |
| CHANGELOG | "Add a CHANGELOG to help users understand what changed between releases" |

**README quality sub-score (40%)** — evaluates structure of the README by detecting recommended section headings:

| Section | Weight | Detection | Recommendation when missing |
|---------|--------|-----------|----------------------------|
| Description / Overview | 25% | First paragraph or explicit heading | "Add a project description or overview section to your README" |
| Installation / Setup | 25% | Heading matching install/setup/getting started | "Add installation or setup instructions to your README" |
| Usage / Examples | 25% | Heading matching usage/examples/quick start | "Add usage examples to your README so users can get started quickly" |
| Contributing | 15% | Heading matching contributing or link to CONTRIBUTING file | "Add a contributing section to your README or link to CONTRIBUTING.md" |
| License | 10% | Heading matching license or license badge | "Add a license section or badge to your README" |

Each section scores 1 (detected) or 0 (not detected). The weighted sum produces a 0–1 README quality ratio. Each missing section generates the corresponding recommendation.

**Composite documentation score** = (file presence sub-score × 0.6) + (README quality sub-score × 0.4), producing a 0–1 raw score.

### Percentile ranking

The raw documentation score is ranked as a percentile against repositories in the same star bracket using the existing calibration infrastructure (`interpolatePercentile`). Calibration data for documentation completeness must be collected for the 1600+ calibration repositories.

### Integration into OSS Health Score

The Documentation bucket is added to the composite health score with rebalanced weights:

| Bucket | Current Weight | New Weight |
|--------|---------------|------------|
| Activity | 36% | 30% |
| Responsiveness | 36% | 30% |
| Sustainability | 28% | 25% |
| **Documentation** | — | **15%** |

The composite health score formula becomes:

**Health Score** = Activity(30%) + Responsiveness(30%) + Sustainability(25%) + Documentation(15%)

A repository with no documentation files scores 0 on the documentation composite, resulting in a low percentile. This is intentional — missing documentation is a real weakness, not missing data.

### Recommendations

Recommendations are generated for every missing file and every missing README section — not gated by a percentile threshold. The full list of documentation recommendations is always available in the Documentation tab.

Documentation recommendations are also surfaced in the **Recommendations panel** on the scorecard. This panel is a unified view of all recommendations across all scoring buckets (Activity, Responsiveness, Sustainability, Documentation), ordered by impact. It replaces the existing per-bucket recommendation display with a single consolidated panel so users see everything they can improve in one place.

**Change from current behavior:** The existing health score generates recommendations only when a bucket falls below the 50th percentile. This gate is removed — recommendations are shown for all buckets regardless of percentile. A project at the 70th percentile in Activity can still benefit from seeing what would push it higher.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST check for the presence of key documentation files: README (any common variant), CONTRIBUTING (any common variant), LICENSE (any common variant), SECURITY.md, CODE_OF_CONDUCT.md, and CHANGELOG (any common variant).
- **FR-002**: System MUST evaluate README structure by detecting common section headings: description/overview, installation/setup, usage/examples, contributing, and license.
- **FR-003**: System MUST compute a documentation completeness score as a weighted composite of file presence (60%) and README quality (40%).
- **FR-004**: System MUST rank the documentation completeness score as a percentile against repositories in the same star bracket, using the existing calibration infrastructure.
- **FR-005**: System MUST display the Documentation score on the OSS Health Score scorecard alongside Activity, Responsiveness, and Sustainability.
- **FR-006**: System MUST display a **Documentation tab** in the results workspace showing:
  - Documentation percentile score badge
  - Per-file presence checklist (present/missing status for each of the 6 files)
  - README section detection results (detected/missing for each of the 5 sections)
  - Recommendation text next to each missing file and missing section
- **FR-007**: System MUST include documentation metrics in the Comparison view when comparing multiple repositories.
- **FR-008**: System MUST include documentation metrics in JSON and Markdown export formats.
- **FR-009**: System MUST mark documentation data as "unavailable" only when file checks cannot be completed due to infrastructure failures (rate limiting, network errors). Missing documentation files are scored as 0, not marked unavailable.
- **FR-010**: System MUST include documentation metrics on the Scoring Methodology page with calibration percentile anchors.
- **FR-011**: System MUST rebalance the composite OSS Health Score weights to Activity(30%), Responsiveness(30%), Sustainability(25%), Documentation(15%).
- **FR-012**: System MUST generate a recommendation for every missing documentation file and every missing README section, with actionable text explaining what to add and why.
- **FR-013**: System MUST display a **Recommendations tab** in the results workspace that consolidates all actionable recommendations from all scoring buckets (Activity, Responsiveness, Sustainability, Documentation), ordered by impact. Recommendations are shown regardless of percentile — not gated by a threshold.
- **FR-014**: Each recommendation in the Recommendations tab MUST identify which scoring bucket it belongs to, so users understand the context.
- **FR-015**: The Recommendations tab replaces the existing recommendations panel on the Overview/scorecard. The scorecard shows a summary count (e.g., "12 recommendations") linking to the Recommendations tab. The Overview tab no longer displays inline recommendations — it defers entirely to the Recommendations tab.

### Key Entities

- **DocumentationFile**: Represents a checked documentation file — name, expected paths, whether it was found, quality signals (e.g., recognized license type, section headings detected), and recommendation text when missing.
- **ReadmeSection**: Represents a checked README section — section name, whether it was detected, and recommendation text when missing.
- **DocumentationScore**: The composite documentation completeness score — file presence count, README quality sub-score, overall percentile, bracket label, tone, and list of recommendations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every analyzed repository displays a Documentation percentile score on the scorecard within the same response time as existing scores (no additional user-perceived delay beyond 2 seconds).
- **SC-002**: At least 6 documentation files are checked per repository (README, CONTRIBUTING, LICENSE, SECURITY, CODE_OF_CONDUCT, CHANGELOG).
- **SC-003**: README structure detection identifies at least 4 section types (description, installation, usage, contributing).
- **SC-004**: Documentation scores are percentile-ranked within star brackets, consistent with the existing scoring methodology.
- **SC-005**: Documentation metrics appear in Comparison view, JSON export, and Markdown export for every analyzed repository.
- **SC-006**: Users can identify missing documentation files within 10 seconds of viewing the Documentation tab.

## Assumptions

- Documentation file presence is checked via publicly accessible repository metadata — no repository cloning is required.
- README content analysis is limited to section heading detection — prose quality, readability scoring, and content accuracy are out of scope.
- Calibration data for documentation metrics will need to be collected for the existing 1600+ calibration repositories before percentile scoring is accurate.
- The composite OSS Health Score weights will be rebalanced to include Documentation; exact weight is defined in PRODUCT.md (15%).
- Issue #67 (Getting Started guide validation via sandbox execution) is explicitly out of scope for this feature.
- Common README variants include: `README.md`, `README.rst`, `README.txt`, `readme.md`, `README`.
- Common LICENSE variants include: `LICENSE`, `LICENSE.md`, `LICENSE.txt`, `COPYING`.
- Common CONTRIBUTING variants include: `CONTRIBUTING.md`, `CONTRIBUTING.rst`, `CONTRIBUTING.txt`.
- Common CHANGELOG variants include: `CHANGELOG.md`, `CHANGES.md`, `HISTORY.md`, `NEWS.md`.
