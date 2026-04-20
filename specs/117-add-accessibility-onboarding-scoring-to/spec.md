# Feature Specification: Accessibility & Onboarding Scoring

**Feature Branch**: `117-add-accessibility-onboarding-scoring-to`  
**Feature ID**: P2-F08  
**Created**: 2026-04-20  
**Status**: Draft  
**Input**: GitHub Issue #117 — Add Accessibility & Onboarding scoring to health score

## Overview

Accessibility & Onboarding (A&O) is implemented as a cross-cutting `onboarding` tag pill — not a new top-level score badge. The five signals are distributed across two existing tabs and feed into two existing scores:

| Signal | Tab | Feeds into | Net-new? |
|---|---|---|---|
| Issue template presence | Documentation | Documentation score | Yes |
| PR template presence | Documentation | Documentation score | Yes |
| Good first issue count | Contributors | Community score | Yes |
| Dev environment setup (devcontainer, Gitpod, Docker Compose) | Contributors | Community score | Yes |
| New contributor PR acceptance rate | Contributors | Community score | Yes |
| CONTRIBUTING.md presence | Documentation | Documentation score (existing) | Tag only |
| Code of Conduct presence | Documentation | Community score (existing) | Tag only |
| README Installation section | Documentation | Documentation score (existing) | Tag only |
| README Contributing section | Documentation | Documentation score (existing) | Tag only |

The `onboarding` pill (consistent with the existing `community`, `governance`, `compliance` pills) lets users filter across Documentation and Contributors tabs to surface all nine signals together. The bottom four are already scored under their existing dimensions — the pill simply makes them visible in the onboarding context without re-scoring them.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filter to Onboarding Signals via Pill (Priority: P1)

A user analyzing a repo wants to see everything that affects newcomer accessibility in one pass. They click the `onboarding` tag pill and the Documentation and Contributors tabs both update to show only the signals tagged `onboarding`, with irrelevant signals hidden.

**Why this priority**: This is the primary user-facing surface of the feature. All signal tagging and placement work exists to make this filter useful.

**Independent Test**: Click the `onboarding` pill anywhere it appears; verify the Documentation tab shows only issue template and PR template (plus the four already-tagged signals), and the Contributors tab shows only good first issue count, dev environment setup, and new contributor PR acceptance rate.

**Acceptance Scenarios**:

1. **Given** a user is viewing any analyzed repo, **When** they activate the `onboarding` pill, **Then** the Documentation tab filters to issue template, PR template, CONTRIBUTING.md, Code of Conduct, README Installation, and README Contributing signals only, and the Contributors tab filters to good first issue count, dev environment setup, and new contributor PR acceptance rate only.
2. **Given** the `onboarding` pill is active, **When** the user deactivates it, **Then** both tabs restore their full signal display.
3. **Given** a repo where all five onboarding signals are absent or unavailable, **When** the user activates the `onboarding` pill, **Then** the filtered view shows each signal explicitly as absent or `unavailable` — none are hidden.

---

### User Story 2 - Issue and PR Templates Feed Documentation Score (Priority: P2)

Issue template and PR template presence are sub-factors of the Documentation score. A maintainer who adds these files sees the Documentation score improve.

**Why this priority**: Grounds the template signals in an existing scored dimension so they influence the health score without introducing a new composite weight.

**Independent Test**: Analyze two repos — one with both templates, one without — and verify the Documentation score differs in a direction consistent with the templates sub-factor weight.

**Acceptance Scenarios**:

1. **Given** a repo has `.github/ISSUE_TEMPLATE/` and `.github/PULL_REQUEST_TEMPLATE.md`, **When** the Documentation score is computed, **Then** both template signals contribute positively to the score per the configured sub-factor weights.
2. **Given** a repo has neither template, **When** the user views the Documentation tab (with or without the `onboarding` pill active), **Then** both signals are shown as absent with their absence reflected in the Documentation score.
3. **Given** the Documentation tab already renders a file-presence list, **When** issue template and PR template are added as sub-factors, **Then** they appear in that list tagged `onboarding` — not as a duplicate section.

---

### User Story 3 - Good First Issues, Dev Environment, and Time-to-Contribution Feed Community Score (Priority: P2)

Good first issue count, dev environment setup presence, and new contributor PR acceptance rate are sub-factors of the Community score. A maintainer who labels issues and adds a devcontainer sees the Community score improve.

**Why this priority**: Grounds the three contributor-pipeline signals in the Community score, which already measures project welcoming and accessibility. Issue #117 explicitly anticipated Community as the natural home.

**Independent Test**: Analyze two repos — one with labeled good first issues and a devcontainer, one without — and verify the Community score differs in a direction consistent with the sub-factor weights.

**Acceptance Scenarios**:

1. **Given** a repo has 10 open `good first issue` issues and a `.devcontainer/` directory, **When** the Community score is computed, **Then** both signals contribute positively per the configured sub-factor weights.
2. **Given** fewer than 3 first-time contributor PRs exist in the fetch window, **Then** new contributor PR acceptance rate is marked `unavailable`, listed in the missing data panel, and omitted from the Community score sub-factor calculation without causing the score to fail entirely.
3. **Given** a repo has zero good first issues, **When** the Contributors tab is shown, **Then** the count displays as 0, not hidden.

---

### User Story 4 - Onboarding Signals in Repo Comparison (Priority: P3)

A user comparing repos can see the onboarding-relevant sub-signals (good first issue count, template presence, dev environment) side by side in the Comparison tab.

**Why this priority**: Comparison is an existing feature that surfaces sub-signals from other scores; A&O signals extend it naturally.

**Independent Test**: Compare two repos; the Comparison tab includes rows for good first issue count, issue template, PR template, and dev environment setup in their respective sections (Documentation, Community/Contributors).

**Acceptance Scenarios**:

1. **Given** two repos with different good first issue counts, **When** the user views the Comparison tab, **Then** a row for good first issue count appears in the Community/Contributors section with the raw count per repo.
2. **Given** one repo's new contributor PR acceptance rate is `unavailable`, **When** viewed in comparison, **Then** that cell shows `—`, never a fabricated value.

---

### Edge Cases

- What happens when no open issues carry any recognized `onboarding` label variant? → Count is 0; shown as 0, not hidden.
- What happens when fewer than 3 first-time contributor PRs exist in the fetch window? → New contributor PR acceptance rate is `unavailable`; Community score still computed from the other sub-factors.
- What happens when the file tree check for devcontainer or templates is unavailable via the API? → Those signals are marked `unavailable`; missing data panel lists them; Community/Documentation scores computed from available sub-factors only.
- What happens when the `onboarding` pill is activated but a tab has no onboarding-tagged signals visible (e.g., Activity tab)? → The pill has no effect on that tab; it continues to render normally.

## Requirements *(mandatory)*

### Functional Requirements

**Signal collection**

- **FR-001**: The analyzer MUST collect the count of open issues labeled with any of: `good first issue`, `good-first-issue`, `beginner`, `help wanted`, `help-wanted`; if no labels match, the count is 0.
- **FR-002**: The analyzer MUST check for the presence of `.github/ISSUE_TEMPLATE/` directory, `.github/ISSUE_TEMPLATE.md`, or `.github/issue_template.md` in the repository file tree.
- **FR-003**: The analyzer MUST check for the presence of `.github/PULL_REQUEST_TEMPLATE.md`, `.github/pull_request_template.md`, or `.github/PULL_REQUEST_TEMPLATE/` in the repository file tree.
- **FR-004**: The analyzer MUST check for the presence of a primary dev environment setup signal: `.devcontainer/` directory, `.devcontainer.json`, or `docker-compose.yml` / `docker-compose.yaml` at the repository root. Absence of all three counts against the dev environment setup sub-factor score.
- **FR-004a**: The analyzer MUST additionally check for `.gitpod.yml` as a secondary (bonus) dev environment signal. If present, it applies a small additive weight to the Community score; if absent, no penalty is applied. Gitpod presence cannot compensate for a missing primary dev environment signal.
- **FR-005**: The analyzer MUST compute the new contributor PR acceptance rate as the percentage of PRs where `authorAssociation == FIRST_TIME_CONTRIBUTOR` that were merged, derived from already-fetched PR data. If fewer than 3 qualifying PRs exist in the fetch window, the field MUST be marked `unavailable`.

**Score integration**

- **FR-006**: Issue template presence (FR-002) and PR template presence (FR-003) MUST be added as sub-factors of the Documentation score with weights defined in shared configuration.
- **FR-007**: Good first issue count (FR-001), dev environment setup presence (FR-004), and new contributor PR acceptance rate (FR-005) MUST be added as sub-factors of the Community score with weights defined in shared configuration.
- **FR-008**: When a sub-factor signal is `unavailable`, it MUST be excluded from the score calculation without causing the parent score to fail; the remaining sub-factors MUST still produce a valid score.
- **FR-009**: All sub-factor weights MUST be defined in shared configuration — not hardcoded in logic.

**Onboarding pill**

- **FR-010**: An `onboarding` tag pill MUST be added to the tag system, consistent with the existing `community`, `governance`, and `compliance` pills.
- **FR-011**: When the `onboarding` pill is active, the Documentation tab MUST filter to show only signals tagged `onboarding`: issue template, PR template, CONTRIBUTING.md, Code of Conduct, README Installation section, and README Contributing section.
- **FR-012**: When the `onboarding` pill is active, the Contributors tab MUST filter to show only signals tagged `onboarding` (good first issue count, dev environment setup, new contributor PR acceptance rate).
- **FR-012a**: CONTRIBUTING.md, Code of Conduct, README Installation section, and README Contributing section MUST be tagged `onboarding` in the Documentation tab; their scores are not changed — only their tag membership is extended.
- **FR-013**: Activating or deactivating the `onboarding` pill MUST NOT trigger any additional API calls.

**Transparency**

- **FR-014**: Missing or unavailable A&O signals MUST be listed explicitly in the per-repo missing data panel; none may be hidden or zeroed.
- **FR-015**: Issue template and PR template MUST appear in the Documentation tab's existing file-presence list tagged `onboarding` — not as a separate duplicate section.
- **FR-016**: Good first issue count, dev environment setup, and new contributor PR acceptance rate MUST appear as a named pane in the Contributors tab tagged `onboarding`.
- **FR-017**: Where the absence of onboarding signals warrants advice, recommendation entries MUST appear in the recommendations catalog using the existing catalog pattern.

**Comparison and export**

- **FR-018**: The Comparison tab MUST include rows for all five A&O signals in their respective sections (Documentation, Community/Contributors).
- **FR-019**: JSON and Markdown exports MUST include all five A&O signal values (or their `unavailable` markers).

**Calibration**

- **FR-020**: The calibration sampling script MUST be updated to collect the three Community-bound A&O signals (good first issue count, dev environment setup presence, new contributor PR acceptance rate) across all star brackets so that percentile distributions are available; this work is tracked under issue #152.

### Key Entities

- **OnboardingSignalSet**: Five net-new signals — good-first-issue count (integer or `unavailable`), issue template present (boolean or `unavailable`), PR template present (boolean or `unavailable`), dev environment setup present (boolean or `unavailable`, primary: devcontainer / Docker Compose; bonus: Gitpod adds marginal lift only), new contributor PR acceptance rate (percentage or `unavailable` when fewer than 3 qualifying PRs exist in the fetch window).
- **`onboarding` tag**: Cross-cutting tag that groups nine signals across the Documentation and Contributors tabs — five net-new signals plus four already-scored signals (CONTRIBUTING.md, Code of Conduct, README Installation section, README Contributing section) that are tag-extended without re-scoring.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Activating the `onboarding` pill surfaces exactly the five A&O signals — two in Documentation, three in Contributors — without any additional API calls.
- **SC-002**: All five A&O signals are individually visible with their raw value or absence status; none are hidden when absent or unavailable.
- **SC-003**: The Documentation score changes when issue template or PR template presence changes, in a direction consistent with their configured sub-factor weights.
- **SC-004**: The Community score changes when good first issue count, dev environment setup, or time-to-first-contribution change, in a direction consistent with their configured sub-factor weights.
- **SC-005**: When any A&O signal is `unavailable`, the parent score (Documentation or Community) still produces a valid result using the remaining sub-factors.
- **SC-006**: The Comparison tab includes rows for all five A&O signals in their respective sections.
- **SC-007**: JSON and Markdown exports include all five A&O signal values or their `unavailable` markers.
- **SC-008**: All sub-factor weights are readable from shared configuration without modifying any logic or component code.
- **SC-009**: The calibration sampling script (issue #152) includes the three Community-bound A&O signals, producing percentile distribution data per star bracket.

## Assumptions

- The good-first-issue label scan covers the five label variants named in FR-001; uncommon project-specific label names (e.g., `starter-task`) are out of scope.
- New contributor PR acceptance rate is derived from the `authorAssociation` field on already-fetched PR data — no additional API request is required. GitHub sets `authorAssociation: FIRST_TIME_CONTRIBUTOR` natively at PR creation time, so no heuristic author-history lookup is needed.
- Dev environment setup detection is a file-presence check only. Primary signals (devcontainer, Docker Compose) carry full sub-factor weight; absence counts against the score. Gitpod (`.gitpod.yml`) is a bonus signal — presence adds a marginal lift, absence has no penalty and cannot be compensated by Gitpod alone. Contents or validity of any of these files are not evaluated.
- Issue template and PR template are already partially rendered in the Documentation tab's file-presence list; this feature adds their `onboarding` tag and Documentation score sub-factor weight — it does not duplicate the rendering.
- CONTRIBUTING.md, Code of Conduct, README Installation section, and README Contributing section are already scored under Documentation and Community respectively; this feature extends their tag membership to include `onboarding` only — their score contributions are unchanged.
- The `onboarding` pill follows the same UX pattern as the existing `community`, `governance`, and `compliance` pills — same visual treatment, same activation/deactivation behavior.
- Initial sub-factor weights for the three Community-bound signals are set to reasonable defaults pending calibration data from issue #152; they are updated once calibrated percentile data is available.
- The recognized file paths for template and devcontainer detection are a fixed list for this implementation; expanding the list is a follow-up task.
