# Feature Specification: Inclusive Naming Analysis

**Feature Branch**: `129-inclusive-naming`
**Created**: 2026-04-12
**Status**: Draft
**Input**: User description: "P2-F03 Inclusive Naming - GitHub issue #107"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Default Branch Name Check (Priority: P1)

A project maintainer analyzes their repository and sees whether the default branch uses inclusive naming. If the default branch is `master`, the system flags it with a recommendation to rename it to `main`, referencing the Inclusive Naming Initiative. If the branch is already `main` or another inclusive name, the system shows a passing check.

**Why this priority**: The default branch name is the single most visible and impactful inclusive naming signal. It is already available in the existing data fetch at zero additional API cost. The Inclusive Naming Initiative classifies `master` as Tier 1 ("replace immediately").

**Independent Test**: Can be fully tested by analyzing any repository and verifying the default branch name is evaluated and displayed with the correct status and recommendation.

**Acceptance Scenarios**:

1. **Given** a repository with default branch `master`, **When** the analysis completes, **Then** the inclusive naming section shows a failing check for the default branch with a recommendation to rename to `main`.
2. **Given** a repository with default branch `main`, **When** the analysis completes, **Then** the inclusive naming section shows a passing check for the default branch.
3. **Given** a repository with a custom default branch name (e.g., `develop`, `trunk`), **When** the analysis completes, **Then** the inclusive naming section shows a passing check (only `master` is flagged).

---

### User Story 2 - Repo Metadata Terminology Check (Priority: P2)

A project maintainer sees whether their repository description or topics contain non-inclusive terms from the Inclusive Naming Initiative word list (Tiers 1–3). The system scans the description and topic labels and surfaces recommendations with suggested replacements. The recommendation tone varies by tier severity.

**Why this priority**: Repository description and topics are publicly visible metadata that shape first impressions. Checking them extends coverage beyond the branch name at zero additional API cost (these fields are already fetched).

**Independent Test**: Can be fully tested by analyzing a repository whose description or topics contain a known non-inclusive term and verifying the term is flagged with the correct replacement suggestion and tier-appropriate severity.

**Acceptance Scenarios**:

1. **Given** a repository whose description contains "whitelist" (Tier 1), **When** the analysis completes, **Then** the inclusive naming section flags the term with recommended replacement "allowlist" and severity "Replace immediately".
2. **Given** a repository whose description contains "sanity-check" (Tier 2), **When** the analysis completes, **Then** the inclusive naming section flags the term with recommended replacement "confidence check" and severity "Recommended to replace".
3. **Given** a repository with topic "man-in-the-middle" (Tier 3), **When** the analysis completes, **Then** the inclusive naming section flags the term with recommended replacement "adversary-in-the-middle attack" and severity "Consider replacing".
4. **Given** a repository whose description and topics contain no flagged terms, **When** the analysis completes, **Then** the inclusive naming section shows all metadata checks passing.
5. **Given** a repository whose description contains "mastermind" or "blackbox" (Tier 0 — no change recommended), **When** the analysis completes, **Then** those terms are NOT flagged (Tier 0 terms are excluded from checks).

---

### User Story 3 - Inclusive Naming Score Integration (Priority: P3)

A project maintainer views their overall Documentation score and sees the inclusive naming sub-score contributing to it. The inclusive naming check is weighted at 10% of the Documentation composite, with the remaining weights redistributed: File Presence 35%, README Quality 30%, Licensing Compliance 25%.

**Why this priority**: Integrating into the existing scoring system ensures inclusive naming is reflected in the health score and generates actionable recommendations in the unified Recommendations tab.

**Independent Test**: Can be fully tested by comparing the Documentation composite score for a repository with `master` branch vs one with `main` branch and verifying the 10% weight impact.

**Acceptance Scenarios**:

1. **Given** a repository where all inclusive naming checks pass, **When** the Documentation score is calculated, **Then** the inclusive naming sub-score contributes its full 10% weight to the composite.
2. **Given** a repository with `master` as default branch and non-inclusive terms in metadata, **When** the Documentation score is calculated, **Then** the inclusive naming sub-score is reduced proportionally, lowering the overall Documentation score.
3. **Given** a repository where inclusive naming data is unavailable, **When** the Documentation score is calculated, **Then** the system falls back to the three-part formula (File Presence / README Quality / Licensing) with redistributed weights.

---

### Edge Cases

- What happens when the default branch ref is null (empty repository)? The inclusive naming check for branch name is marked as "unavailable" — it does not fail or pass.
- What happens when the repository description is empty or null? The metadata terminology check is skipped for description — only topics are evaluated. If both are empty, the metadata check passes by default (no non-inclusive terms found).
- What happens when a Tier 1 term appears as a substring of a legitimate word (e.g., "mastery" contains "master")? The system uses whole-word matching to avoid false positives.
- What happens when a repository description contains a Tier 0 term (e.g., "blackbox", "whitebox")? Tier 0 terms are explicitly excluded — no flag, no recommendation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST check the default branch name against the Inclusive Naming Initiative word list and flag `master` with a recommendation to rename to `main`.
- **FR-002**: System MUST scan the repository description for non-inclusive terms (Tiers 1–3) using whole-word matching and surface recommendations with INI-suggested replacements.
- **FR-003**: System MUST scan repository topic labels for non-inclusive terms (Tiers 1–3) using exact match and surface recommendations with INI-suggested replacements.
- **FR-004**: System MUST NOT flag Tier 0 terms (terms where the INI recommends no change, e.g., "blackbox", "mastermind", "disable", "parent child").
- **FR-005**: System MUST display inclusive naming results within the Documentation tab as a distinct pane, alongside the existing File Presence, README Quality, and Licensing panes.
- **FR-006**: System MUST weight the inclusive naming sub-score at 10% of the Documentation composite, with File Presence at 35%, README Quality at 30%, and Licensing Compliance at 25%.
- **FR-007**: System MUST apply tier-based severity weighting to the inclusive naming sub-score: Tier 1 terms carry a full penalty, Tier 2 terms carry a moderate penalty, and Tier 3 terms carry a minor penalty.
- **FR-008**: System MUST generate actionable recommendations for each failing check, including the flagged term, its INI tier, the tier-appropriate severity label, and the recommended replacement(s).
- **FR-009**: System MUST display tier-appropriate severity labels in recommendations: "Replace immediately" for Tier 1, "Recommended to replace" for Tier 2, "Consider replacing" for Tier 3.
- **FR-010**: System MUST surface inclusive naming recommendations in the unified Recommendations tab alongside recommendations from other scoring buckets.
- **FR-011**: System MUST reference the Inclusive Naming Initiative (inclusivenaming.org) in recommendation text so users can find authoritative guidance.
- **FR-012**: System MUST use only data already available from existing queries (default branch name, description, topics) — no additional API calls.
- **FR-013**: System MUST use whole-word matching for description scanning to avoid false positives on legitimate words (e.g., "mastery", "masterpiece" must not trigger a flag for "master").

### INI Word List Terms In Scope

All Tier 1–3 terms from the Inclusive Naming Initiative word list are checked. Tier 0 terms ("no change recommended") are explicitly excluded.

#### Tier 1 — "Replace immediately" (full penalty)

| Term | Context | Recommended Replacements |
|------|---------|--------------------------|
| master | Branch name, description, topics | main, original, source, control plane |
| master-slave | Description, topics | primary/replica, primary/secondary, leader/follower, controller/doer |
| whitelist | Description, topics | allowlist |
| blackhat/whitehat | Description, topics | ethical hacker / unethical hacker |
| grandfathered | Description, topics | exempted, legacy, preapproved |
| tribe | Description, topics | team, squad |
| cripple | Description, topics | impacted, degraded, restricted |
| abort | Description, topics | cancel, stop, end, halt |

#### Tier 2 — "Recommended to replace" (moderate penalty)

| Term | Context | Recommended Replacements |
|------|---------|--------------------------|
| sanity-check | Description, topics | confidence check, coherence check, verification |

#### Tier 3 — "Consider replacing" (minor penalty)

| Term | Context | Recommended Replacements |
|------|---------|--------------------------|
| blast-radius | Description, topics | extent, affected components |
| end-of-life | Description, topics | end of support, device retirement |
| evangelist | Description, topics | advocate, ambassador, proponent |
| hallucinate | Description, topics | inaccurate information, factual error |
| man-hour | Description, topics | work-hour, person-hour, staff-hour |
| man-in-the-middle | Description, topics | adversary-in-the-middle, interceptor attack |
| segregate | Description, topics | segment, separate |
| totem-pole | Description, topics | (avoid in idioms like "low on the totem pole") |

#### Tier 0 — Explicitly excluded (no flag, no penalty)

blackbox, blackout, disable, fair hiring practice, fellow, master inventor, mastermind, parent child, red team, white-label, whitebox

### Tier-Based Scoring Weights

Within the inclusive naming sub-score, flagged terms reduce the score with severity-based penalties:

- **Tier 1**: Full penalty per term (highest impact — these are the most urgent to address)
- **Tier 2**: Moderate penalty per term (important but less urgent)
- **Tier 3**: Minor penalty per term (advisory — worth addressing but low urgency)

The inclusive naming sub-score starts at 1.0 (all checks passing) and is reduced by each flagged term according to its tier weight. The sub-score floors at 0.0.

Within the 10% inclusive naming allocation of the Documentation composite:
- **Default branch name check**: 70% weight (highest-visibility signal)
- **Metadata terminology check (description + topics)**: 30% weight (secondary signals)

### Key Entities

- **InclusiveNamingCheck**: Represents a single check (branch name or metadata term). Contains: check type, term found, passed/failed status, recommendation text, and INI tier.
- **InclusiveNamingResult**: Aggregation of all checks for a repository. Contains: branch name check, metadata term checks, overall sub-score.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All repositories with `master` as default branch display a recommendation to rename to `main` within the Documentation tab.
- **SC-002**: Tier 1–3 non-inclusive terms in repository descriptions and topics are detected with zero false positives on Tier 0 terms and legitimate substrings.
- **SC-003**: The Documentation composite score correctly reflects the 10% inclusive naming weight — repositories with all checks passing score higher than those with failing checks, all else being equal.
- **SC-004**: Inclusive naming analysis adds zero additional API calls beyond the existing data fetch.
- **SC-005**: Users can understand why a term was flagged and what to do about it from the recommendation text alone, without needing to visit external resources.

## Assumptions

- The Inclusive Naming Initiative word list (Tiers 1–3) is stable enough to embed as a static reference in the codebase. If the INI updates their list, a code update would be needed.
- All three tiers are checked, with severity-weighted penalties reflecting the INI's own urgency guidance.
- The `master` branch check is the primary signal (70% of sub-score); metadata term checks are secondary (30%) but included because the data is already available.
- Whole-word matching is sufficient to avoid false positives. No natural language processing or context-aware analysis is needed.
- The 10% weight for inclusive naming within the Documentation composite is appropriate for the current scope (branch name + metadata terms). This weight may be revisited if additional signals are added later.
