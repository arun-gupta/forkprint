# Feature Specification: Community Scoring

**Feature Branch**: `180-community-scoring`
**Created**: 2026-04-14
**Status**: Draft
**Input**: GitHub issue [#70](https://github.com/arun-gupta/forkprint/issues/70) — "Add community health signals (discussions, code of conduct, templates)"
**Phase 2 Feature**: P2-F05

## Overview

A repository's community health — distinct from code activity — predicts whether new contributors can engage productively and whether the project remains sustainable. Templates that structure contributor onboarding, a code of conduct that sets expectations, funding information that signals sustainability, and active discussions that indicate an engaged community are all observable signals that today are either undetected or not reflected in the OSS Health Score.

This feature adds Community as a **lens** over the existing scored buckets, following the Governance (P2-F04, #116) precedent in `lib/tags/governance.ts`. Each community signal is scored in exactly one existing bucket (Documentation, Sustainability, or Activity) and carries a "community" lens tag for cross-cutting visibility. A derived "Community completeness" readout summarizes how many community signals are present, satisfying the percentile-style ranking expectation from #70 without introducing a new weighted bucket that could double-count signals already scored elsewhere.

### Why a lens, not a new composite bucket

The current composite (`lib/scoring/health-score.ts`) weights five buckets: Activity, Responsiveness, Sustainability, Documentation, Security. Governance, Licensing, and Inclusive Naming are already handled without adding new composite buckets — Governance is pure tagging, and Licensing/Inclusive Naming fold into Documentation's score. Adding Community as a sixth weighted bucket would force either (a) double-counting CoC, CODEOWNERS, and similar artifacts that are already scored, or (b) moving them out of their current buckets, which destabilizes shipped behavior. The lens pattern avoids both.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Community signals visible in context via a lens (Priority: P1)

A maintainer reviewing their repository in RepoPulse can see which existing items across Documentation, Sustainability (Contributors), and Activity tabs are considered community signals. A "community" pill is attached to the relevant rows, mirroring the existing Governance lens.

**Why this priority**: The lens is the primary deliverable. Without the tags, users cannot trace community signal presence back to the scorecard.

**Independent Test**: Open a repository report, visit Documentation, Contributors/Sustainability, and Activity tabs, and confirm that community-relevant items display a "community" pill and that hovering/clicking the pill communicates the dimension.

**Acceptance Scenarios**:

1. **Given** a repository with CODE_OF_CONDUCT.md, **When** the user views the Documentation tab, **Then** the CODE_OF_CONDUCT row displays a "community" pill.
2. **Given** a repository with CODEOWNERS (already tagged as governance), **When** the user views the Contributors/Sustainability pane, **Then** the CODEOWNERS row displays both "governance" and "community" pills.
3. **Given** a repository with `.github/ISSUE_TEMPLATE/` or `.github/PULL_REQUEST_TEMPLATE.md`, **When** the user views the Documentation tab, **Then** these templates appear as detected items with a "community" pill.
4. **Given** a repository with `.github/FUNDING.yml`, **When** the user views the Contributors/Sustainability pane, **Then** the funding signal appears with a "community" pill.
5. **Given** a repository with Discussions enabled, **When** the user views the Activity tab, **Then** the Discussions card appears with a "community" pill.

---

### User Story 2 — Net-new signals detected and scored in their natural buckets (Priority: P1)

Signals not detected today (issue templates, PR template, FUNDING.yml, Discussions enabled, Discussions activity) are detected by the analyzer and contribute to the appropriate existing bucket's score: templates to Documentation, FUNDING.yml to Sustainability, Discussions to Activity.

**Why this priority**: Detection is prerequisite for the lens to have anything to tag, and the scoring contribution is what makes these signals matter to the composite.

**Independent Test**: Analyze a repository that has each of the five net-new signals and confirm (a) each is detected and visible on the appropriate tab, (b) the host bucket's score reflects their presence, and (c) absence of a signal results in a correspondingly lower host-bucket score.

**Acceptance Scenarios**:

1. **Given** a repository with `.github/ISSUE_TEMPLATE/issue.md` and `.github/PULL_REQUEST_TEMPLATE.md`, **When** the analyzer runs, **Then** both templates are detected and contribute positively to the Documentation score.
2. **Given** a repository with `.github/FUNDING.yml`, **When** the analyzer runs, **Then** funding is detected and contributes positively to the Sustainability score.
3. **Given** a repository with Discussions enabled and recent discussion activity, **When** the analyzer runs, **Then** both Discussions enablement and activity contribute positively to the Activity score.
4. **Given** a repository with Discussions disabled, **When** the analyzer runs, **Then** no Discussions activity API call is made and the Activity score is computed without a Discussions contribution (neither positive nor penalizing).
5. **Given** a repository missing all five net-new signals, **When** the analyzer runs, **Then** Documentation, Sustainability, and Activity scores are each lower than an otherwise-identical repo that has them, by an amount consistent with a minor per-signal weight.

---

### User Story 3 — Community completeness readout in the scorecard (Priority: P2)

The scorecard surface shows a "Community completeness" readout — a count/percentile of how many community signals are present relative to the peer set — as a derived summary, not a new weighted composite bucket. This satisfies #70's acceptance criterion for "percentile ranking for community health completeness" without adding a sixth composite bucket.

**Why this priority**: The readout gives users a single glanceable community health number, but the lens + host-bucket scoring from Stories 1–2 are the load-bearing parts. The readout is derived from them.

**Independent Test**: Analyze repositories with varying numbers of community signals present and confirm the completeness readout ranks them correctly (more signals = higher percentile) against the peer set.

**Acceptance Scenarios**:

1. **Given** a repository with all seven community signals present (CoC, issue templates, PR template, CODEOWNERS, GOVERNANCE.md, FUNDING.yml, Discussions), **When** the user views the scorecard, **Then** Community completeness appears in the top quartile of the peer set.
2. **Given** a repository with no community signals present, **When** the user views the scorecard, **Then** Community completeness appears in the bottom quartile.
3. **Given** the methodology/baseline page, **When** the user reads the Community section, **Then** it explains that Community is a lens (not a composite-weighted bucket) and lists which signals are scored in which host bucket.

---

### User Story 4 — Actionable recommendations for missing community signals (Priority: P3)

A maintainer whose repository is missing community signals sees recommendations pointing them at the specific gaps (e.g., "Add a PR template", "Add a FUNDING.yml", "Enable GitHub Discussions"), routed through the existing recommendations surface under the appropriate host bucket.

**Why this priority**: Recommendations enhance the feature but are not required for scoring or visibility.

**Independent Test**: Analyze a repository missing several community signals and confirm recommendations list the gaps with actionable guidance under their host buckets (templates under Documentation, FUNDING under Sustainability, Discussions under Activity).

**Acceptance Scenarios**:

1. **Given** a repository missing a PR template, **When** the user views recommendations, **Then** a Documentation-bucket recommendation suggests adding one.
2. **Given** a repository without FUNDING.yml, **When** the user views recommendations, **Then** a Sustainability-bucket recommendation suggests adding one.
3. **Given** a repository with Discussions disabled, **When** the user views recommendations, **Then** an Activity-bucket recommendation suggests enabling Discussions.

---

### Edge Cases

- **Partial-signal repositories**: A repository with some but not all community signals produces a partial completeness readout and partial positive contribution to each host bucket — never zero, never full.
- **Forked repositories**: Inherited community files count the same as native ones. Detection is presence-based in the analyzed repo.
- **Private repositories with limited API scope**: When a signal cannot be determined, it is reported as "unknown" on the lens and excluded from the completeness readout.
- **Discussions enabled but empty**: Shown as "enabled, no activity yet" — weaker positive than "enabled with activity", stronger than "not enabled". Activity bucket receives a small positive for enablement, zero for activity.
- **Discussions disabled**: No Discussions API call is made. Activity bucket is computed exactly as today (no penalty, no bonus).
- **Score shift on existing repositories**: Adding net-new signals into Documentation/Sustainability/Activity scoring will produce a small, one-time shift in those bucket scores across all repos. This is acceptable because analyses are stateless (no stored historical scores to reconcile).
- **Calibration coverage**: Until #152 recalibration, the per-signal weights are applied with fixed small values. The completeness readout percentile draws on the current calibrated sample; precision improves post-recalibration.

## Requirements *(mandatory)*

### Functional Requirements

#### Detection (net-new)

- **FR-001**: The analyzer MUST detect the presence of one or more issue templates in `.github/ISSUE_TEMPLATE/` (directory with at least one `.md` or `.yml` file) or a legacy `ISSUE_TEMPLATE.md` in the repo root or `.github/`.
- **FR-002**: The analyzer MUST detect the presence of `PULL_REQUEST_TEMPLATE.md` in `.github/`, repo root, or `docs/`.
- **FR-003**: The analyzer MUST detect the presence of `.github/FUNDING.yml`.
- **FR-004**: The analyzer MUST detect whether GitHub Discussions is enabled on the repository.
- **FR-005**: The analyzer MUST, only when Discussions is enabled, fetch a basic Discussions activity indicator (e.g., total discussion count within a bounded window). The system MUST NOT attempt Discussion activity fetches when Discussions is not enabled.

#### Reuse of existing detection

- **FR-006**: Detection of `CODE_OF_CONDUCT.md`, `CODEOWNERS`, and `GOVERNANCE.md` reuses the existing analyzer logic — this feature does NOT re-implement their detection.

#### Scoring contributions to host buckets

- **FR-007**: Issue templates and PR template presence MUST contribute positively to the Documentation bucket score, at a small per-signal weight consistent with how existing doc files (README, CONTRIBUTING, etc.) contribute.
- **FR-008**: FUNDING.yml presence MUST contribute positively to the Sustainability bucket score as a bonus signal. Absence MUST NOT cause a hard penalty — the existing maintainer-count logic remains the primary Sustainability driver.
- **FR-009**: Discussions enablement MUST contribute a small positive signal to the Activity bucket score. Discussions activity (volume) MUST contribute an additional small signal when Discussions is enabled. When Discussions is disabled, the Activity bucket score MUST be computed exactly as it is today.
- **FR-010**: The per-signal weights for FR-007, FR-008, FR-009 MUST be deliberately modest so that introducing these signals does not destabilize existing bucket scores. Exact values are an implementation-time decision subject to calibration refresh (#152).
- **FR-011**: No signal from this feature may be scored in more than one bucket. Specifically, CODE_OF_CONDUCT.md continues to be scored in Documentation (not moved), CODEOWNERS continues to feed Sustainability (not moved), and no signal added here duplicates an existing scored input.

#### Lens (visibility)

- **FR-012**: The system MUST define a `community` tag in the tag system (mirroring `lib/tags/governance.ts`) and apply it to rows representing community signals across the relevant tabs: Documentation (CoC, issue templates, PR template, GOVERNANCE.md), Contributors/Sustainability (CODEOWNERS, FUNDING.yml), Activity (Discussions card).
- **FR-013**: A row tagged with both `governance` and `community` (e.g., CODEOWNERS, GOVERNANCE.md) MUST display both pills. Tag co-occurrence is expected and must render cleanly.
- **FR-014**: The Activity tab MUST display a Discussions card showing enabled/disabled state and, when enabled, the basic activity indicator. The card MUST carry the `community` tag.

#### Completeness readout

- **FR-015**: The scorecard MUST display a "Community completeness" readout — a percentile rank against the peer set, computed from the count of community signals present. This is a derived summary. It MUST NOT be added to the composite OSS Health Score as a weighted bucket. It MUST NOT alter the existing composite weights (Activity 25%, Responsiveness 25%, Sustainability 23%, Documentation 12%, Security 15%).
- **FR-016**: When a signal cannot be determined (e.g., API access denied), it MUST be reported as "unknown" and excluded from the completeness calculation (not counted as missing).

#### Methodology and exports

- **FR-017**: The methodology/baseline page MUST describe Community as a lens, list the seven community signals and their host scoring buckets, and clarify that Community is not an independent composite bucket.
- **FR-018**: The export feature MUST include the community signal detections, the host-bucket contributions, and the Community completeness readout, consistent with how Security, Licensing, and Inclusive Naming were added to exports (#170).
- **FR-019**: Recommendations for missing community signals MUST be generated via the existing per-bucket recommendation catalog, attached to the signal's host bucket (templates → Documentation recs, FUNDING → Sustainability recs, Discussions → Activity recs).

### Key Entities

- **Community tag**: A presentation-layer tag, peer to the existing `governance` tag. Applied to rows across Documentation, Sustainability, and Activity views. Does not alter scoring.
- **CommunitySignal detection**: New analyzer outputs for issue templates, PR template, FUNDING.yml, Discussions enabled, and Discussions activity. Attached to the appropriate tab's data model.
- **DiscussionsStatus**: New data shape with `enabled` (boolean) and `activity` (basic indicator; gated on enabled). Attached to the Activity tab.
- **CommunityCompleteness**: Derived summary (count of community signals present vs total, expressed as a percentile against peers). Displayed on the scorecard; not a weighted composite input.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every repository analysis displays a Community lens: every detected community signal across Documentation, Sustainability, and Activity tabs carries a `community` pill.
- **SC-002**: The composite OSS Health Score weights (Activity 25%, Responsiveness 25%, Sustainability 23%, Documentation 12%, Security 15%) are unchanged after this feature ships. No new composite bucket is introduced.
- **SC-003**: Repositories with Discussions disabled incur zero additional Discussions API calls across analyses.
- **SC-004**: For a repository where all five net-new signals are added, the Documentation, Sustainability, and Activity bucket scores each increase monotonically (or stay flat) vs. baseline — no regression.
- **SC-005**: Community completeness readout appears on the scorecard and ranks a signal-rich repository in the top quartile and a signal-poor repository in the bottom quartile of the peer set.
- **SC-006**: The methodology/baseline page explains the lens model and host-bucket mapping; no user-facing wording refers to a "Community bucket weight" in the composite.
- **SC-007**: Analysis latency regresses by no more than 10% for repositories without Discussions; repositories with Discussions enabled incur at most one additional bounded API call.
- **SC-008**: Exports include all community signals and the completeness readout, structurally parallel to how other lens-style signals are exported.

## Assumptions

- **Lens model, not a new composite bucket**: Ratified during design discussion. Community follows the Governance pattern — tags and host-bucket scoring — rather than adding a weighted dimension to the composite.
- **Signal-to-bucket mapping**:
  - Documentation — issue templates, PR template (plus existing CoC detection).
  - Sustainability — FUNDING.yml (plus existing CODEOWNERS).
  - Activity — Discussions enabled, Discussions activity.
- **No migration of currently-scored signals**: CoC stays in Documentation, CODEOWNERS stays in Sustainability. This avoids destabilizing shipped scores.
- **Small per-signal weights**: Net-new signals contribute modestly to their host buckets. Exact weights are tuned at implementation time and revisited during #152 recalibration.
- **Discussions metric cost gate**: Activity fetches only when enablement is true. Simple count within a bounded window is preferred over response-rate (see open question Q2).
- **Calibration refresh deferred**: #152 already tracks recalibration; Community's new signals are included in that batch without this feature blocking on it.
- **Stateless analyses**: No historical scores to reconcile when host-bucket weights shift.

## Dependencies

- Governance bucket/lens (P2-F04, #116) — shipped. Community follows its tag pattern (`lib/tags/governance.ts`).
- Documentation scoring (`lib/documentation/score-config.ts`) — extended to include issue/PR template signals.
- Sustainability scoring (`lib/contributors/score-config.ts`) — extended to include FUNDING.yml as a bonus signal.
- Activity scoring (`lib/activity/score-config.ts`) — extended to include Discussions enablement and activity.
- Export (P1-F13) — extended to include community signals and completeness, per the pattern of #170.
- Issue #152 — downstream consumer of this feature's new signals during recalibration.

## Out of Scope

- A new composite bucket for Community (explicitly rejected — lens model chosen).
- Moving CoC, CODEOWNERS, or GOVERNANCE.md between scored buckets.
- Recalibration of existing buckets (handled by #152).
- Deep Discussions analytics (response latency, sentiment, per-discussion drilldown).
- Mentorship-program or contributor-ladder detection.
- Code of Conduct content inspection beyond existence (Inclusive Naming handles content signals).

## Open Questions

Questions do not block spec approval — they are resolved during `/speckit.clarify` or at implementation time.

1. **Q1 (per-signal weights)**: What specific weight should each net-new signal carry in its host bucket? For example, should an issue template be treated equivalent to one existing doc-file check (e.g., same weight as README), or at half weight? Candidates:
   - A: Equal weight to existing peer signals in the host bucket.
   - B: Half weight (more conservative — signals are less load-bearing than existing inputs).
   - C: Defer — detect but do not score until #152 recalibration.
2. **Q2 (Discussions activity metric)**: Which specific indicator should Discussions activity use?
   - A: Total discussion count (cheap, coarse).
   - B: Count within a bounded window (e.g., last 90 days) (cheap, more recency-sensitive).
   - C: Response-rate computation over recent discussions (richer, but requires GraphQL pagination).
3. **Q3 (completeness denominator)**: Should Community completeness count all seven signals (CoC, issue templates, PR template, CODEOWNERS, GOVERNANCE.md, FUNDING.yml, Discussions) equally, or weight some higher (e.g., CoC and templates as "must-have" vs FUNDING as "nice-to-have")? Equal weighting is the simpler default.
