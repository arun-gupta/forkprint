# Feature Specification: Licensing & Compliance Scoring

**Feature Branch**: `128-licensing-compliance`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: GitHub Issue #115 — Add Licensing & Compliance scoring to health score

## User Scenarios & Testing *(mandatory)*

### User Story 1 - License Presence and Quality Assessment (Priority: P1)

A user analyzing a repository sees licensing details within the Documentation tab that reflect whether the project has a recognized, machine-readable license. This is the most fundamental signal: without a clear license, the project cannot be safely adopted.

**Why this priority**: License presence is the single most important compliance signal. A project without a recognized license is legally ambiguous and unadoptable in enterprise settings.

**Independent Test**: Can be tested by analyzing repos with known license states (MIT-licensed, unlicensed, custom license text) and verifying the score reflects license quality.

**Acceptance Scenarios**:

1. **Given** a repository with an OSI-approved license detected by GitHub (valid SPDX ID), **When** the user views the Documentation tab, **Then** the Licensing pane shows a high sub-score for license presence and recognition.
2. **Given** a repository with no license file or no detected license, **When** the user views the Documentation tab, **Then** the Licensing pane shows a zero sub-score and the user sees a recommendation to add a license.
3. **Given** a repository where GitHub detects a license but the SPDX ID is `NOASSERTION` or unrecognized, **When** the user views the Documentation tab, **Then** the Licensing pane reflects partial credit (license file exists but is not machine-readable or OSI-approved) and a recommendation to use a standard license.

---

### User Story 2 - License Permissiveness Classification (Priority: P2)

A user evaluating a repository for enterprise adoption sees whether the license is permissive (MIT, Apache-2.0, BSD) or copyleft (GPL, AGPL, LGPL, MPL) within the Licensing pane. This classification helps users quickly assess adoption friction.

**Why this priority**: Permissiveness tier is a key enterprise adoption signal, but it only matters when a license is actually present (depends on P1 signal data).

**Independent Test**: Can be tested by analyzing repos with known permissive and copyleft licenses and verifying the classification is displayed correctly.

**Acceptance Scenarios**:

1. **Given** a repository with a permissive OSI-approved license (e.g., MIT, Apache-2.0, BSD-2-Clause), **When** the user views the Licensing pane, **Then** the license is classified as "Permissive."
2. **Given** a repository with a copyleft license (e.g., GPL-3.0, AGPL-3.0), **When** the user views the Licensing pane, **Then** the license is classified as "Copyleft."
3. **Given** a repository with a weak copyleft license (e.g., MPL-2.0, LGPL-3.0), **When** the user views the Licensing pane, **Then** the license is classified as "Weak Copyleft."

---

### User Story 3 - DCO/CLA Enforcement Detection (Priority: P3)

A user sees whether the project enforces contributor agreements (DCO or CLA) within the Licensing pane, signaling that contributions are legally vetted. This is a strong governance signal for enterprise-maintained or foundation-backed projects.

**Why this priority**: DCO/CLA enforcement is a valuable compliance signal but is less universally applicable than license presence — many healthy projects do not use formal contributor agreements.

**Independent Test**: Can be tested by analyzing repos with known DCO bot configurations, CLA enforcement workflows, or Signed-off-by commit trailers.

**Acceptance Scenarios**:

1. **Given** a repository whose recent commits consistently include `Signed-off-by` trailers, **When** the user views the Licensing pane, **Then** the system reports DCO enforcement as detected.
2. **Given** a repository with a GitHub Actions workflow referencing a known DCO or CLA bot action, **When** the user views the Licensing pane, **Then** the system reports CLA/DCO enforcement as detected.
3. **Given** a repository with no contributor agreement enforcement signals, **When** the user views the Licensing pane, **Then** the system reports no enforcement detected and provides a recommendation to consider adding DCO or CLA enforcement.

---

### Edge Cases

- What happens when a repo has multiple LICENSE files (e.g., dual licensing)? The system uses the primary license detected by GitHub via `licenseInfo.spdxId`.
- What happens when the SPDX ID is `NOASSERTION`? Treated as "license present but unrecognized" — partial credit, with a recommendation to adopt a standard OSI-approved license.
- What happens when GitHub detects a license but no LICENSE file exists at the repo root? The system relies on GitHub's `licenseInfo` detection; file placement is not independently verified.
- What happens when a repo has zero commits (empty repo)? DCO/CLA signals are scored as "not applicable" rather than penalized.
- What happens when GitHub Actions workflows are not accessible? DCO/CLA detection falls back to commit trailer analysis only; missing workflow data does not penalize the score.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect whether a repository has a license recognized by GitHub (`licenseInfo.spdxId` is non-null and not `NOASSERTION`).
- **FR-002**: System MUST determine whether the detected license is OSI-approved based on the SPDX identifier.
- **FR-003**: System MUST classify detected licenses into permissiveness tiers: Permissive, Weak Copyleft, or Copyleft, based on the SPDX identifier.
- **FR-004**: System MUST check recent commits for `Signed-off-by` trailer presence as a DCO enforcement signal.
- **FR-005**: System MUST check GitHub Actions workflow files for references to known DCO/CLA bot actions as a contributor agreement enforcement signal.
- **FR-006**: System MUST compute a composite Licensing & Compliance sub-score from weighted sub-signals: license presence/recognition, OSI approval, permissiveness classification, and DCO/CLA enforcement.
- **FR-007**: System MUST produce actionable recommendations when licensing signals are missing or weak (e.g., no license, non-OSI license, no contributor agreement enforcement).
- **FR-008**: System MUST integrate the Licensing & Compliance sub-score as a third component within the Documentation bucket, alongside the existing file presence and README quality sub-scores.
- **FR-009**: System MUST rebalance the Documentation bucket's internal weights to accommodate three sub-scores (file presence, README quality, and licensing compliance) while preserving the Documentation bucket's existing weight in the overall health score.
- **FR-010**: System MUST replace the existing license file presence check in the Documentation file presence sub-score with the richer licensing sub-score to avoid double-counting license signals.
- **FR-011**: System MUST redistribute the weight previously assigned to the license file check within file presence across the remaining documentation files (README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG).
- **FR-012**: System MUST display licensing details in a dedicated Licensing pane within the Documentation tab, showing: license name, SPDX ID, OSI approval status, permissiveness tier, and DCO/CLA enforcement status.
- **FR-013**: System MUST update the Documentation score tooltip and help section to reflect the three-part scoring model (file presence, README quality, licensing compliance).
- **FR-014**: When license data is unavailable from the GitHub API, the system MUST mark the licensing sub-score as `"Insufficient verified public data"` per the constitution's accuracy policy.
- **FR-015**: When the licensing sub-score has insufficient data, the system MUST compute the Documentation bucket score from the remaining two sub-scores (file presence and README quality) rather than penalizing the repository.

### Key Entities

- **License Detection Result**: The license identified by GitHub for a repository — includes SPDX ID, name, whether it is OSI-approved, and its permissiveness tier.
- **Contributor Agreement Signal**: Whether DCO or CLA enforcement is detected — derived from commit trailers and workflow file analysis.
- **Licensing & Compliance Sub-Score**: A composite score combining license quality and contributor agreement signals, integrated as one of three sub-scores within the Documentation bucket.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every analyzed repository displays licensing details (or an explicit "insufficient data" indicator) within the Documentation tab's Licensing pane.
- **SC-002**: Repositories with OSI-approved, machine-readable licenses score measurably higher in the Documentation bucket than repositories with no license or unrecognized licenses.
- **SC-003**: Users can distinguish between permissive and copyleft-licensed projects at a glance from the Licensing pane.
- **SC-004**: Repositories with active DCO/CLA enforcement score higher in the Documentation bucket than those without, all else being equal.
- **SC-005**: The Documentation bucket score changes to reflect the new three-part model (file presence + README quality + licensing compliance).
- **SC-006**: At least one actionable recommendation is generated for any repository missing a license or lacking contributor agreement enforcement.

## Health Score Integration

### Documentation Bucket — Three-Part Model

The Documentation bucket currently uses a two-part scoring model: file presence (60%) and README quality (40%). This feature adds a third sub-score — Licensing & Compliance — creating a three-part model. The exact sub-score weights are deferred to the planning phase but the structure is:

1. **File Presence** — presence of key documentation files (README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG). The license file check moves out of this sub-score and into the Licensing sub-score.
2. **README Quality** — detection of key sections (description, installation, usage, contributing, license mention).
3. **Licensing & Compliance** — license recognition, OSI approval, permissiveness tier, and DCO/CLA enforcement.

### Impact on Scores

- The overall health score weights (Activity 30%, Responsiveness 30%, Sustainability 25%, Documentation 15%) remain unchanged.
- Within the Documentation bucket, licensing signals gain significantly more influence than the current ~3% effective weight (20% of the file presence sub-score's 60% share).
- Repositories with strong licensing practices (OSI-approved license + DCO/CLA enforcement) see a Documentation score boost.
- Repositories with no license see a larger Documentation score penalty than before, since the licensing sub-score contributes more than a single file presence check did.
- The file presence sub-score is simplified (5 files instead of 6) and its internal weights are redistributed.

### UI Display

The Documentation tab gains a **Licensing pane** displayed alongside the existing documentation files and README sections views. The Licensing pane shows:

- License name and SPDX identifier
- OSI approval status (approved / not approved / no license)
- Permissiveness tier (Permissive / Weak Copyleft / Copyleft / N/A)
- DCO/CLA enforcement status (detected / not detected)
- Licensing sub-score contribution to the Documentation bucket
- Actionable recommendations for missing or weak signals

The Documentation score help section is updated to explain the three-part model.

## Assumptions

- The GitHub GraphQL API `licenseInfo.spdxId` field is the authoritative source for license detection. The system does not independently parse LICENSE file content beyond what GitHub provides.
- The list of OSI-approved SPDX identifiers and their permissiveness tiers is maintained as a static configuration within the analyzer, not fetched from an external API at runtime.
- DCO/CLA detection via commit trailers uses a sample of recent commits (consistent with existing commit-fetching patterns in the analyzer), not the full commit history.
- Workflow file analysis for DCO/CLA bots is limited to `.github/workflows/` YAML files accessible via the GitHub API.
- Dependency license compatibility scanning is explicitly out of scope for this feature (deferred to a separate issue).
- Copyright notice completeness checking is out of scope — the system does not parse LICENSE file text content for copyright headers.
- Licensing & Compliance is integrated as a sub-score within the existing Documentation bucket, not as a standalone 5th bucket. The overall health score bucket weights remain unchanged.
- The existing calibration infrastructure (star-bracket percentile interpolation) continues to work with the Documentation bucket — no new top-level calibration is needed.
