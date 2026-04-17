# Feature Specification: Release Health Scoring

**Feature Branch**: `69-add-release-and-versioning-health-signal`
**Created**: 2026-04-16
**Status**: Draft
**Input**: GitHub issue [#69](https://github.com/arun-gupta/repo-pulse/issues/69) — "Add release and versioning health signals"
**Phase 2 Feature**: P2-F09

## Overview

Release cadence and versioning discipline are observable proxies for project maturity: a repository that ships regularly under a recognizable versioning scheme with informative notes gives adopters confidence that upgrades are safe, changes are communicated, and the maintainer pipeline is alive. Today RepoPulse already captures a raw 12-month release count (`releases12mo`) and a release-cadence sub-factor inside the Activity score, but it does not surface any of the following: whether release tags follow semantic versioning, whether releases carry substantive notes, whether pre-release channels are in use, how long it has been since the last release, or how many git tags never got promoted to a GitHub release.

This feature adds Release Health as a **lens-style signal set** layered over existing scored buckets, following the Governance (P2-F04, #116) and Community (P2-F05, #70) precedent. Each release signal is scored in exactly one existing bucket — release frequency and recency stay in Activity (where cadence already lives), and semver compliance, release-notes quality, and tag-to-release promotion feed Documentation (where versioning-discipline communication belongs). A derived **Release Health completeness** readout is surfaced on the per-repo metric card (alongside the existing Governance and Community lens readouts rendered by `buildLensReadouts()`), summarizing how many release-health signals are present. Percentile brackets for the new numeric signals are **deferred to the calibration refresh tracked in #152** — this feature uses a linear ratio → percentile fallback for the completeness readout, matching the pattern shipped by Community (P2-F05).

### Why a lens, not a new composite bucket

The composite OSS Health Score already weights Activity 25%, Responsiveness 25%, Sustainability 23%, Documentation 12%, Security 15%. Activity already includes a `20%` release-cadence sub-factor (see P1-F08 in PRODUCT.md, `lib/activity/score-config.ts`). Adding a new weighted "Release Health" bucket would either double-count that sub-factor or force a rebalance that destabilizes shipped scores. The lens pattern — detect + tag + feed existing buckets + surface a derived completeness readout — matches how Governance and Community shipped and preserves current composite weights.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Release health signals detected and visible with a `release-health` pill (Priority: P1)

A maintainer reviewing their repository in RepoPulse can see which items across the Activity and Documentation tabs are release-health signals. A "release-health" pill is attached to the relevant rows and cards, mirroring the existing `governance` and `community` pills.

**Why this priority**: The lens is the primary deliverable. Without detection and tagging, users cannot trace release-health signals back to the scorecard, and downstream scoring contributions have nothing to render.

**Independent Test**: Open a repository report for a project with active releases (e.g., `facebook/react`) and a project without any releases (e.g., a small personal repo). Visit the Activity and Documentation tabs and confirm that release-health rows display a `release-health` pill and that hovering or clicking the pill surfaces a label or tooltip containing the literal text "Release Health" (parallel to the disclosure behavior shipped for the governance and community pills).

**Acceptance Scenarios**:

1. **Given** a repository with recent GitHub releases, **When** the user views the Activity tab, **Then** a Release Cadence card shows release frequency, time since last release, and pre-release usage, each carrying a `release-health` pill.
2. **Given** a repository whose release tags match `v?MAJOR.MINOR.PATCH[-prerelease]`, **When** the user views the Documentation tab, **Then** a "Semver compliance" row shows the compliant ratio and carries a `release-health` pill.
3. **Given** a repository with many git tags and far fewer GitHub releases, **When** the user views the Documentation tab, **Then** a "Tag-to-release promotion" row shows the ratio and carries a `release-health` pill.
4. **Given** a repository with empty release bodies, **When** the user views the Documentation tab, **Then** a "Release notes quality" row shows the share of releases with substantive notes and carries a `release-health` pill.
5. **Given** a repository with zero releases, **When** the user views Activity and Documentation tabs, **Then** each release-health row renders the literal string `"unavailable"` at the field level (and the scorecard Release Health completeness readout renders `"Insufficient verified public data"` per Constitution §II) — never zeroed, never hidden.

---

### User Story 2 — Release-health signals feed their host buckets (Priority: P1)

Detected signals contribute modestly to their host bucket's score. Per-bracket percentile calibration for the new numeric signals is deferred to the recalibration tracked in #152; until that lands, signals use the same linear ratio → percentile fallback Community (P2-F05) shipped with.

**Why this priority**: Detection is prerequisite for scoring, and the scoring contribution is what makes these signals matter to the composite.

**Independent Test**: Analyze two repositories — one with a strong release-health posture (frequent releases, strict semver, rich notes, few orphan tags) and one with none — and confirm the Activity and Documentation bucket scores of the strong repo are monotonically higher, and that the completeness readout ratio on the strong repo is higher than on the weak one.

**Acceptance Scenarios**:

1. **Given** the Activity scoring config, **When** a repository with releases in the last 90 days is scored, **Then** the existing `cadence` sub-factor is extended (not duplicated) to consider "time since last release" in addition to "releases per year".
2. **Given** the Documentation scoring config, **When** a repository with semver-compliant tags and populated release bodies is scored, **Then** three net-new per-signal bonuses apply (semver compliance ratio, release-notes quality, tag-to-release promotion) at weights deliberately small enough that no shipped repo score shifts by more than ~5 percentile points in aggregate.
3. **Given** a repository with zero releases (legitimate absence), **When** the analyzer runs, **Then** `releaseHealthResult` is emitted but frequency / recency / semver / notes / promotion fields are each reported as `unavailable`, and the Activity / Documentation bucket scores are computed exactly as they are today (no penalty relative to pre-feature baseline beyond the calibrated absence of a bonus).
4. **Given** a repository whose release tags include both release and pre-release markers (`v1.2.0`, `v1.3.0-rc.1`), **When** the analyzer runs, **Then** pre-release usage is captured as a boolean signal and does not negatively influence semver compliance (pre-release tags are valid semver per SPEC).

---

### User Story 3 — Release Health completeness readout on the per-repo metric card (Priority: P2)

The per-repo metric card surfaces a "Release Health completeness" readout — count / linear-ratio percentile of release-health signals present — rendered via `buildLensReadouts()` alongside the existing Governance and Community lens readouts. This satisfies #69's acceptance criteria for "release frequency percentile ranking" and "time since last release with percentile context" without adding a sixth composite bucket. Per-bracket calibrated percentiles for the underlying signals are tracked in #152 and not in scope here.

**Why this priority**: The readout gives users a single glanceable release-health number on the same metric card where Governance and Community already live, but the lens + host-bucket scoring from Stories 1–2 are the load-bearing parts. The readout is derived from them.

**Independent Test**: Analyze repositories with varying release-health postures and confirm the completeness readout ranks them monotonically (more / healthier signals → higher ratio and percentile) using the linear fallback, and confirm the readout renders peer-positioned alongside the shipped Community and Governance lens readouts on the metric card.

**Acceptance Scenarios**:

1. **Given** a repository with all release-health signals present (frequent releases, recent release, semver-compliant tags, substantive notes, no orphan tags), **When** the user views the per-repo metric card, **Then** Release Health completeness appears with ratio `1.0` and a percentile label in the top quartile under the linear fallback.
2. **Given** a repository with no releases at all, **When** the user views the per-repo metric card, **Then** Release Health completeness appears as `Insufficient verified public data` (not a score of zero).
3. **Given** a repository with a moderate release-health posture (some releases, mixed semver, some orphan tags), **When** the user views the per-repo metric card, **Then** Release Health completeness appears in the middle of the ratio range and its constituent signals are each shown as raw ratios or durations in the Activity / Documentation tabs (percentile labels for individual signals deferred to #152).
4. **Given** the methodology / baseline page, **When** the user reads the Release Health section, **Then** it explains that Release Health is a lens (not a composite-weighted bucket), lists which signals are scored in which host bucket, describes the completeness denominator, and notes that per-bracket calibration is tracked in #152.

---

### User Story 4 — Actionable recommendations for missing release-health signals (Priority: P3)

A maintainer whose repository lacks release-health signals sees recommendations pointing them at specific gaps, routed through the existing recommendations surface under the appropriate host bucket (cadence recs under Activity; semver / notes / tag-promotion recs under Documentation).

**Why this priority**: Recommendations enhance the feature but are not required for scoring or visibility. They mirror the Documentation / Security / Community recommendation rollout pattern already shipped.

**Independent Test**: Analyze a repository missing several release-health signals and confirm recommendations list the gaps with actionable guidance under their host buckets.

**Acceptance Scenarios**:

1. **Given** a repository that has never cut a GitHub release, **When** the user views recommendations, **Then** an Activity-bucket recommendation suggests cutting a first release, worded for the "never released" case.
2. **Given** a repository whose most recent release is more than 24 months old, **When** the user views recommendations, **Then** an Activity-bucket recommendation calls the project stale and suggests either cutting a maintenance release or marking the repository archived.
3. **Given** a repository with no release in the last 12 months but with commits inside the last 90 days, **When** the user views recommendations, **Then** an Activity-bucket recommendation suggests cutting a release to reflect the in-flight work (distinct wording from scenarios 1 and 2).
4. **Given** a repository whose release tags mostly fail semver and no alternative scheme (such as CalVer) is detected, **When** the user views recommendations, **Then** a Documentation-bucket recommendation suggests adopting semantic versioning.
5. **Given** a repository whose tag names match neither semver nor any other recognized scheme (e.g., bot-generated or ad-hoc strings), **When** the user views recommendations, **Then** a Documentation-bucket recommendation suggests adopting *a* versioning scheme (not specifically semver), consistent with the "date-tagged mirror projects" edge case.
6. **Given** a repository whose release tags match a recognized alternative scheme such as CalVer, **When** the user views recommendations, **Then** no semver-adoption recommendation fires (the CalVer edge case suppresses it).
7. **Given** a repository whose `releaseNotesQualityRatio` is below the configured "substantive notes" floor — not only when every body is empty — **When** the user views recommendations, **Then** a Documentation-bucket recommendation suggests improving release-note depth for subsequent releases.
8. **Given** a repository with many more git tags than GitHub releases, **When** the user views recommendations, **Then** a Documentation-bucket recommendation suggests promoting tags to releases.
9. **Given** a repository whose release-health signals already sit above the existing `RECOMMENDATION_PERCENTILE_GATE` on their host bucket, **When** the user views recommendations, **Then** release-health recommendations are suppressed for those signals — matching the suppression pattern shipped for Documentation, Security, and Community recs.
10. **Given** a repository whose releases are entirely pre-release (`-alpha` / `-beta` / `-rc`), **When** the user views recommendations, **Then** no recommendation fires on `preReleaseRatio` alone — consistent with FR-012, which keeps pre-release usage informational.

---

### Edge Cases

- **Zero releases**: `releaseHealthResult` fields are all `unavailable`; the completeness readout reports `Insufficient verified public data`. Host-bucket scores are unchanged relative to pre-feature baseline for this case.
- **Exactly one release**: Release frequency is `unavailable` (cannot compute a cadence from one data point); `daysSinceLastRelease` is computed. Semver / notes / pre-release are computed from that single release.
- **Tag-only project (git tags, no GitHub releases)**: `tagToReleaseRatio` is explicitly large; the Documentation-bucket `release-health` signals are scored from tag names (for semver) but release-notes quality is `unavailable`.
- **Calendar versioning (CalVer)**: Projects using schemes like `2026.04.16` or `24.04.0` are detected as non-semver but flagged distinctly in the Documentation tab row so the maintainer recommendation does not inappropriately push them toward semver when a valid alternative is in use. CalVer projects are not penalized by the "semver compliance" contribution beyond the absence of a positive signal.
- **Date-tagged mirror projects** where tags are created by bots without any coherent scheme: scored as non-semver, non-calver; recommendation surface suggests adopting a versioning scheme.
- **Pre-release-only projects** (e.g., all releases are `-alpha` / `-beta`): pre-release usage signal is `true`, semver compliance is computed normally (pre-release tags are valid semver), notes quality is computed normally.
- **Release created from a tag without a release body**: counted as a release for frequency/recency; release-notes quality treats empty body as "insubstantive".
- **Very high release volume** (>100 releases in the recent window): semver / notes analysis uses a bounded sample of recent releases (e.g., last 100) — no unbounded pagination.
- **Privately published releases**: not visible via the public GraphQL API; surface as `unavailable`, no inference.
- **Score shift on existing repositories**: Net-new Documentation contributions introduce a small, one-time score shift. Acceptable because analyses are stateless (no stored historical scores to reconcile). Absolute shift per repo is bounded by the modest per-signal weights (User Story 2, AC 2).

## Requirements *(mandatory)*

### Functional Requirements

#### Detection (net-new signals)

- **FR-001**: The analyzer MUST obtain, via additive field selection on an existing GraphQL pass (no new network round-trip), the following per-release fields for up to the 100 most recent releases: tag name, created-at and published-at timestamps, body text, and `isPrerelease` flag. Any additional GraphQL cost introduced by this feature MUST stay within the existing 1–3-request-per-repo budget (Constitution §III.2).
- **FR-002**: The analyzer MUST fetch git tag count via the existing GraphQL repository payload (`refs(refPrefix: "refs/tags/")` totalCount) so tag-to-release ratio can be computed. This is an additive field on an existing query, not a new network round-trip.
- **FR-003**: The analyzer MUST compute `releaseFrequency` (releases per year, derived from the 12-month rolling window that already feeds `releases12mo`). When the repository has fewer than two releases ever, the value MUST be `unavailable`.
- **FR-004**: The analyzer MUST compute `daysSinceLastRelease` from the most recent release's `publishedAt` (falling back to `createdAt` when `publishedAt` is null). When there are zero releases, the value MUST be `unavailable`.
- **FR-005**: The analyzer MUST compute `semverComplianceRatio` as the share of the most recent 100 releases whose tag names match the semver regex pattern defined in shared config (accepting an optional leading `v` and optional pre-release / build-metadata suffixes, per https://semver.org ).
- **FR-006**: The analyzer MUST compute `releaseNotesQualityRatio` as the share of the most recent 100 releases whose body text exceeds a configurable minimum character threshold (default in shared config, not hardcoded). Releases with null or whitespace-only bodies are counted as non-substantive.
- **FR-007**: The analyzer MUST compute `preReleaseRatio` as the share of the most recent 100 releases with `isPrerelease === true`. This signal is informational; it is reported on the lens but does not contribute to any host-bucket score on its own.
- **FR-008**: The analyzer MUST compute `tagToReleaseRatio` as `max(0, totalTags - totalReleases) / max(1, totalTags)` — expressed as the share of tags that never became a release. When `totalTags` cannot be fetched, the ratio MUST be `unavailable`.
- **FR-009**: The analyzer MUST emit a top-level `releaseHealthResult` on `AnalysisResult` (or `'unavailable'` when releases cannot be retrieved at all), shaped consistently with `licensingResult`, `securityResult`, and the existing community signal set — flat enough to diff across repos without transformation (Constitution §IX.5).

#### Scoring contributions to host buckets

- **FR-010**: The Activity scoring config MUST extend the existing `cadence` sub-factor (see P1-F08) to consider `daysSinceLastRelease` alongside the existing `releases12mo`-based cadence input. Weights MUST be defined in shared config and read by logic (Constitution §VI). The overall Activity composite weight inside the OSS Health Score MUST remain 25% (no re-weighting).
- **FR-011**: The Documentation scoring config MUST introduce three net-new small-weight bonus inputs: `semverComplianceRatio`, `releaseNotesQualityRatio`, and `tagToReleaseRatio` (inverse — higher orphan-tag share → lower contribution). Per-signal weights MUST be small and defined in shared config so that documentation scores for existing repositories do not shift by more than ~5 percentile points in aggregate at calibration refresh.
- **FR-012**: Pre-release usage (`preReleaseRatio`) MUST NOT be scored into any host bucket on its own. It is surfaced as a pill on the lens and used only as informational context in recommendations.
- **FR-013**: No release-health signal may be scored in more than one bucket. Specifically, `releaseFrequency` / `daysSinceLastRelease` live in Activity only; `semverComplianceRatio` / `releaseNotesQualityRatio` / `tagToReleaseRatio` live in Documentation only.
- **FR-014**: The existing composite OSS Health Score weights (Activity 25%, Responsiveness 25%, Sustainability 23%, Documentation 12%, Security 15%) MUST remain unchanged.

#### Lens (visibility)

- **FR-015**: The system MUST define a `release-health` presentation tag peer to the existing `governance` and `community` tags, and apply it to release-health-relevant rows / cards on the Activity and Documentation tabs.
- **FR-016**: A row tagged with both `release-health` and another lens (e.g., CHANGELOG.md is already tagged under Documentation — co-occurrence with `release-health` is expected) MUST display all applicable pills cleanly.
- **FR-017**: The Activity tab MUST surface a Release Cadence card showing: releases per year, time since last release, and pre-release usage state. Each metric MUST show its raw value (or `"unavailable"`) at ship time; per-signal percentile labels are deferred to #152. The card MUST carry the `release-health` pill.
- **FR-018**: The Documentation tab MUST surface a Release Discipline card with three rows — Semver compliance ratio, Release notes quality ratio, Tag-to-release promotion ratio — each carrying the `release-health` pill, each showing its raw ratio (or `"unavailable"`). Per-signal percentile labels are deferred to #152.

#### Completeness readout

- **FR-019**: The per-repo metric card MUST display a "Release Health completeness" readout via `buildLensReadouts()` — a count (signals detected / total) and percentile rank derived from a **linear ratio → percentile fallback** (matching the fallback shipped by Community P2-F05 until #152 lands), computed from the five scored release-health signals (release frequency, time since last release, semver compliance, release-notes quality, tag-to-release promotion). This readout MUST NOT be added to the composite OSS Health Score as a weighted bucket.
- **FR-020**: When every release-health signal is `unavailable` (e.g., repository has zero releases), the completeness readout MUST render as `Insufficient verified public data` — not as a percentile of zero (Constitution §II.5).
- **FR-021**: When a subset of signals is `unavailable`, those signals MUST be excluded from the completeness calculation (treated as "unknown", not "missing").

#### Calibration (deferred to #152)

- **FR-022**: Per-bracket percentile calibration data for the five new release-health signals (`releaseFrequency`, `daysSinceLastRelease`, `semverComplianceRatio`, `releaseNotesQualityRatio`, `tagToReleaseRatio`) is **out of scope for this feature** and is tracked in issue #152 ("Re-run calibration to include licensing, compliance, inclusive naming, and security signals"). This feature MUST NOT add placeholder or partial percentile entries to the calibration payload.
- **FR-023**: The config-loader and UI MUST render Release Health percentile labels via the same pattern Community shipped: **linear ratio → percentile fallback for the completeness readout**, and "Insufficient verified public data" or the raw value for per-signal rows until #152 adds calibrated brackets.

#### Methodology and exports

- **FR-024**: The methodology / baseline page MUST describe Release Health as a lens, list the five scored signals and their host scoring buckets, explain the completeness denominator, and explicitly note that Release Health is not an independent composite bucket.
- **FR-025**: The export feature (P1-F13) MUST include the release-health signal detections, the host-bucket contributions, and the Release Health completeness readout in both JSON and Markdown exports — consistent with how Security, Licensing, Inclusive Naming, and Community were added to exports.
- **FR-026**: Recommendations for missing release-health signals MUST be generated via the existing per-bucket recommendation catalog, attached to the signal's host bucket (cadence / recency → Activity recs, semver / notes / tag-promotion → Documentation recs).
- **FR-027**: Release-health recommendations MUST flow through the existing `RECOMMENDATION_PERCENTILE_GATE` so that recommendations are suppressed for any signal whose host-bucket percentile already clears the gate, matching the suppression behavior shipped for Documentation, Security, and Community recommendations.
- **FR-028**: Recommendation triggers MUST differentiate the three staleness tiers — "never released", "stale (>24 months since last release)", and "no release in last 12 months with recent commits" — and emit distinct, tier-appropriate wording. A repository MUST never receive more than one staleness recommendation at a time.
- **FR-029**: The semver-adoption recommendation MUST be suppressed when a recognized alternative versioning scheme (e.g., CalVer) is detected. When tag names match neither semver nor any other recognized scheme, the recommendation MUST instead suggest adopting *a* versioning scheme rather than specifically semver.
- **FR-030**: The release-notes recommendation trigger MUST be driven by the `releaseNotesQualityRatio` signal falling below a configurable "substantive notes" floor (default in shared config), not only by the narrow "every body is empty" case.
- **FR-031**: No recommendation MUST fire on `preReleaseRatio` alone — consistent with FR-012's informational-only treatment of pre-release usage.

### Key Entities

- **Release-health tag**: A presentation-layer tag, peer to the existing `governance` and `community` tags. Applied to rows / cards on the Activity and Documentation tabs. Does not alter scoring.
- **ReleaseHealthResult**: New `AnalysisResult` field holding the five computed ratios / durations / counts plus `preReleaseRatio`, `totalReleasesAnalyzed`, and `totalTags`. Emitted as `'unavailable'` when releases cannot be retrieved at all; per-field `'unavailable'` is used for individual signals that cannot be computed.
- **Release**: Already present in the GraphQL payload — this feature extends field selection to include `tagName`, `body`, and `isPrerelease`.
- **ReleaseHealthCompleteness**: Derived summary (count of release-health signals detected / five, expressed as a linear-fallback percentile until #152 lands). Displayed on the per-repo metric card via `buildLensReadouts()`, peer to the Governance and Community lens readouts; not a weighted composite input.
- **Semver pattern**: Regex stored in shared scoring config, defining acceptance (leading `v?`, MAJOR.MINOR.PATCH, optional pre-release suffix, optional build metadata), per https://semver.org .

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every repository analysis with at least one GitHub release surfaces a Release Cadence card on the Activity tab and a Release Discipline card on the Documentation tab; each detected signal carries a `release-health` pill.
- **SC-002**: The composite OSS Health Score weights (Activity 25%, Responsiveness 25%, Sustainability 23%, Documentation 12%, Security 15%) are unchanged after this feature ships. No new composite bucket is introduced.
- **SC-003**: No additional GraphQL round-trip is required per repository. Release-health data is fetched through additive field selection on existing passes; per-repo request count remains within 1–3 (Constitution §III.2).
- **SC-004**: For a repository gaining release-health signals (e.g., a maintainer cuts a release, adds notes, and adopts semver), its Activity and Documentation bucket scores each increase monotonically (or stay flat) — no regression.
- **SC-005**: Release Health completeness readout appears on the per-repo metric card, peer to the Community and Governance lens readouts, and ranks a release-health-rich repository's ratio higher than a release-health-poor repository's under the linear fallback; a repository with zero releases is reported as `Insufficient verified public data`.
- **SC-006**: The methodology / baseline page describes Release Health as a lens with host-bucket scoring; no user-facing wording implies a "Release Health bucket weight" in the composite; and the page notes that per-bracket calibration is tracked in #152.
- **SC-007**: No new percentile entries are added to the shared calibration payload by this feature — per-bracket calibration for the five release-health signals remains the responsibility of #152. A comment on issue #152 lists the five Release Health signal names so the recalibration work explicitly covers them.
- **SC-008**: Exports (JSON and Markdown) include all five signals, the completeness readout, and the `preReleaseRatio` informational indicator — structurally parallel to how Community signals are exported.
- **SC-009**: For a representative sample of pre-existing analyses, introducing this feature shifts Activity and Documentation bucket scores by at most ~5 percentile points in aggregate.
- **SC-010**: Semver compliance detection correctly classifies at least 95% of a manually reviewed calibration sample of `v?MAJOR.MINOR.PATCH[-pre][+build]` tag names (standard semver), including pre-release and build-metadata variants.

## Assumptions

- **Lens model, not a new composite bucket**: Chosen explicitly — matches the shipped Governance and Community patterns and preserves composite weights that are already load-bearing in the solo vs. community profile logic.
- **Signal-to-bucket mapping**:
  - Activity — `releaseFrequency`, `daysSinceLastRelease` (already where cadence lives).
  - Documentation — `semverComplianceRatio`, `releaseNotesQualityRatio`, `tagToReleaseRatio` (these are communication-discipline signals about versioning, which belong with other Documentation signals).
- **`preReleaseRatio` is informational only**: it appears on the lens and in exports, but does not adjust any score directly. Pre-release channel usage is neither inherently good nor bad.
- **Bounded sampling**: The analyzer inspects up to the 100 most recent releases for semver / notes / pre-release computations — the same window already loaded by `REPO_COMMIT_AND_RELEASES_QUERY`. No unbounded pagination.
- **Calendar versioning is not semver, but is not penalized**: CalVer repos get no semver compliance bonus but also do not trigger an inappropriate "adopt semver" recommendation — the recommendation logic checks for a detectable non-semver scheme before suggesting semver adoption.
- **Small per-signal weights**: Documentation bonuses and the Activity cadence extension are sized to keep absolute score shifts modest on the calibrated sample (~5 percentile points in aggregate). Exact weights are tuned at implementation time.
- **Per-bracket percentile calibration is deferred to #152**: this feature does not extend the shared calibration payload. The completeness readout uses a linear ratio → percentile fallback until #152 lands — matching the fallback shipped with Community (P2-F05).
- **Stateless analyses**: No historical scores to reconcile when host-bucket inputs expand. Consistent with every prior scoring extension.

## Dependencies

- Governance lens (P2-F04, #116) and Community lens (P2-F05, #70) — shipped. Release Health follows the same tag + lens pattern (`lib/tags/`).
- Activity scoring (`lib/activity/score-config.ts`) — extended to include `daysSinceLastRelease` in the cadence sub-factor.
- Documentation scoring (`lib/documentation/score-config.ts`) — extended to include three net-new small-weight release-discipline bonuses.
- Calibration refresh (#152) — downstream consumer. The five new release-health signal names are communicated on #152 so the recalibration covers them; this feature does not modify the calibration payload itself.
- Export (P1-F13) — extended to include release-health signals and completeness, mirroring the Community rollout.
- Recommendations catalog (`lib/recommendations/catalog.ts`) — extended with release-health recommendations under Activity and Documentation.
- Shared GraphQL query (`lib/analyzer/queries.ts`) — field selection on the `releases` node and addition of tag `totalCount`. No new query pass is introduced.

## Out of Scope

- A new composite bucket for Release Health (explicitly rejected — lens model chosen).
- Per-bracket percentile calibration for the five new release-health signals — deferred to issue #152.
- Re-weighting the existing composite OSS Health Score (handled by a separate calibration refresh if ever required).
- Deep release-notes analysis beyond "substantive length" (e.g., Keep a Changelog conformance, Conventional Commits alignment, changelog-linking). Content quality signals beyond length are a future extension.
- Verifying that release artifacts exist (binaries, SBOMs, signatures) — out of scope here; release artifact health belongs with Security (P2-F07).
- Cross-ecosystem version discovery (npm, PyPI, crates.io) — Phase 1–2 is GitHub-only.
- Historical versioning-quality trending over time (no stored history per Constitution §I Phase 1 stateless rule).

## Open Questions

Questions do not block spec approval — they are resolved during `/speckit.clarify` or at implementation time.

1. **Q1 (semver pre-release handling)**: When a repository's most recent releases are mostly pre-release (`-rc`, `-beta`), should the semver compliance score be computed over all releases or only over non-pre-release tags? Candidates:
   - A: All releases — pre-release tags are valid semver, count them.
   - B: Non-pre-release only — a project that has not yet cut a stable release is not meaningfully demonstrating versioning discipline.
   - C: Split — surface two ratios ("semver compliance" and "stable-release compliance") and score only the first.
2. **Q2 (release-notes quality threshold)**: What minimum body length qualifies a release as having "substantive notes"? Candidates:
   - A: ≥ 40 characters (roughly one sentence).
   - B: ≥ 120 characters (roughly one short paragraph).
   - C: Content-aware — accept any body that contains a bullet list, heading, or link, regardless of length.
3. **Q3 (tag-to-release ratio interpretation when tags are missing)**: If a repository has GitHub releases but the GraphQL tag `totalCount` is unavailable (e.g., refs query denied), should `tagToReleaseRatio` be `unavailable` or inferred as `0` (no orphan tags)? Candidates:
   - A: `unavailable` — cannot verify.
   - B: `0` — if we can see releases, we can see at least their tags, so worst case is parity.
   - C: Feature-detect and fall back to a lightweight REST `/tags` call only when GraphQL denies the refs query.
