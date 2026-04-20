# Feature Specification: Project Maturity Signals

**Feature Branch**: `74-add-project-maturity-signals-based-on-re`
**Created**: 2026-04-20
**Status**: Draft
**Issue**: #74 (P2-F11 — Project maturity)
**Input**: GitHub issue #74 — "Add project maturity signals based on repository age and lifecycle stage"

## Summary

Repository age and lifecycle stage are missing context when RepoPulse interprets health
metrics today. A 2-month-old repo with 50 stars looks weak next to a 5-year-old peer, yet
it may actually be growing faster. A 5-year-old repo with the same 50 stars may be
stagnant. This feature adds age-normalized metrics, a growth-trajectory classification,
and age-aware guards so scores reflect what the numbers mean given the project's
lifecycle stage — not just their absolute size.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Age-normalized metrics surface alongside raw values (Priority: P1)

An evaluator opens the results for a repository and sees each headline count (stars,
contributors, commits) annotated with its per-year or per-month equivalent. The raw
number is still the primary figure; the normalized value is a secondary caption that
frames the count against how long the project has been running.

**Why this priority**: This is the minimum viable slice — it delivers the core insight
(same count means different things at different ages) without changing any score. An
evaluator comparing a 6-month-old repo to a 6-year-old peer can see immediately that
"1,200 stars" came from very different growth rates.

**Independent Test**: Analyze two repos of different ages with similar raw counts.
Verify each repo's result surface shows age-normalized captions under the raw value
(e.g., "1,200 stars · 2,400 /yr" vs "1,200 stars · 200 /yr"), and that the underlying
values come from verified GitHub API data for both age and count.

**Acceptance Scenarios**:

1. Given a repo with a verified `createdAt` and `stars` count, when its results render,
   then a stars-per-year caption appears under the stars metric, computed as
   `stars / ageInYears` where `ageInYears` is derived from `createdAt` to now.
2. Given a repo with a verified `totalContributors` count, when its results render,
   then a contributors-per-year caption appears under the contributors metric.
3. Given a repo with a verified total-commit count (from the default branch's
   `history.totalCount`), when its results render, then a commits-per-month caption
   appears under the commit-density metric.
4. Given a repo younger than the minimum age for meaningful normalization (default:
   90 days), when its results render, then the normalized captions are shown as
   "Too new to normalize" rather than an inflated rate.
5. Given a repo where any of `createdAt`, stars, contributors, or total commits is
   `"unavailable"`, when its results render, then the normalized caption for that
   specific metric reads `"Unavailable"` and the raw value continues to display.

---

### User Story 2 — Growth trajectory indicator distinguishes growth, stability, and decline (Priority: P1)

An evaluator wants a single-glance answer to "is this project still gaining momentum,
coasting, or winding down?" A qualitative Growth Trajectory indicator — Accelerating /
Stable / Declining — is derived by comparing the repo's recent commit cadence to its
long-run lifetime cadence.

**Why this priority**: Trajectory is the single most-requested context signal in the
issue. Without it, an evaluator has to eyeball sparklines to guess direction. With it,
the signal is explicit, labeled, and surfaces next to raw activity metrics.

**Independent Test**: Analyze a repo whose last-12-months commit count differs
materially from its historical rate. Verify the trajectory label is assigned per the
configured thresholds and that the supporting values (recent commits/month, lifetime
commits/month) are shown in the tooltip for transparency.

**Acceptance Scenarios**:

1. Given a repo whose commits/month over the most recent 12 months is at least the
   configured "accelerating" factor above its lifetime commits/month (default: ≥ +25 %),
   when its results render, then the trajectory label is **Accelerating**.
2. Given a repo whose recent commits/month is within the configured stable band of its
   lifetime rate (default: –25 % to +25 %), when its results render, then the trajectory
   label is **Stable**.
3. Given a repo whose recent commits/month is at least the configured declining factor
   below its lifetime rate (default: ≤ –25 %), when its results render, then the
   trajectory label is **Declining**.
4. Given a repo younger than the minimum trajectory-eligible age (default: 2 years),
   when its results render, then the trajectory label reads **Insufficient verified
   public data** — never guessed — and the tooltip explains the age gate.
5. Given a repo whose total commit count is `"unavailable"`, when its results render,
   then the trajectory label reads **Unavailable** and the underlying cause is listed
   in the per-repo missing-data panel.
6. Given any trajectory label, when the user hovers the "how is this computed?"
   tooltip, then the recent-12-months commits/month, the lifetime commits/month, the
   ratio, and the configured band cutoffs are displayed verbatim.

---

### User Story 3 — Age context guards prevent penalizing young repos (Priority: P2)

A maintainer of a 4-month-old repo with 3 contributors should not see their
Sustainability (Resilience) score reported as "Low" simply because the absolute
contributor count is small — that's the normal shape of a healthy young project. The
age-aware guard demotes to "Insufficient verified public data" when the repo is below
the minimum age for confident scoring, rather than producing a penalty that reflects
age more than health.

**Why this priority**: Protects Phase 1's Resilience and Activity scores from known
false-negative cases. Constitution §II (Accuracy Policy) already forbids guessing; this
story extends that discipline to scoring by replacing a low-confidence judgment with an
explicit "insufficient data" outcome when age is the dominant cause.

**Independent Test**: Analyze a < 6-month-old repo with few contributors and a low
absolute commit count. Verify the Resilience score renders as "Insufficient verified
public data" rather than "Low", and that the score tooltip explicitly cites the age
guard as the reason.

**Acceptance Scenarios**:

1. Given a repo younger than the configured minimum age for Resilience scoring
   (default: 180 days), when the Resilience score is computed, then the output is
   "Insufficient verified public data" — not High/Medium/Low — and the tooltip cites
   age-guard as the reason.
2. Given a repo younger than the configured minimum age for Activity scoring (default:
   90 days), when the Activity score is computed, then the output is "Insufficient
   verified public data" and the tooltip cites age-guard as the reason.
3. Given a repo older than the minimum guarded ages, when scores are computed, then
   age-guarded behavior is inactive and scoring proceeds per existing Phase 1 rules.
4. Given age is `"unavailable"`, when scoring runs, then the age-guard does not fire
   (absence of evidence is not evidence of youth) and existing scoring rules apply.

---

### User Story 4 — Calibration data stratifies cohorts by age and stars (Priority: P2)

The operator running `npm run calibrate` produces calibration data where the existing
community star brackets (`emerging`, `growing`, `established`, `popular`) are further
stratified by repository age into `-young` (< 2 years) and `-mature` (≥ 2 years)
variants. Each stratum records its own percentile distributions for stars,
age-normalized metrics (`starsPerYear`, `contributorsPerYear`, `commitsPerMonth`), and
the existing rate fields. A repo is compared against the cohort that matches both its
star tier and its age stratum — so a 1-year-old 200-star repo is benchmarked against
other young 100–499 star repos, not against 5-year-old ones.

**Why this priority**: This is the "compare accordingly" payoff. Without age
stratification, a young repo in the `growing` bracket is benchmarked against the same
distribution as mature repos in that bracket — and since mature repos have had longer
to accumulate signal, the young repo's percentile is misleadingly low. Age
stratification makes the cohort comparison itself age-aware, not just the displayed
captions.

**Independent Test**: Run `npm run calibrate -- --dry-run` and verify the output file
reports both `-young` and `-mature` variants for each community star bracket, with
full percentile blocks (stars, `starsPerYear`, `contributorsPerYear`, `commitsPerMonth`,
and all existing rate fields) per stratum. Then, given a known 1-year-old repo in the
`growing` star tier, verify the scorecard bracket label reads "Growing · < 2 yrs"
(or equivalent) and percentile anchors come from the `growing-young` entry rather than
`growing`.

**Acceptance Scenarios**:

1. Given `lib/scoring/calibration-data.json` is regenerated, when the file is loaded,
   then every community bracket (`emerging`, `growing`, `established`, `popular`) has
   two variants `-young` (< 2 years) and `-mature` (≥ 2 years), each with percentile
   blocks for: stars, forks, watchers, `forkRate`, `watcherRate`, `prMergeRate`,
   `issueClosureRate`, `staleIssueRatio` (preserving the existing schema),
   `starsPerYear`, `contributorsPerYear`, and `commitsPerMonth` — same
   `p25/p50/p75/p90` shape throughout.
2. Given a repo whose `stars` places it in the `growing` tier and whose `ageInDays` is
   below the age-stratum boundary (default 730), when the scorecard renders, then the
   bracket key is `growing-young` and the bracket label reads "Growing · < 2 yrs"
   (exact wording per label helper).
3. Given a repo in the same `growing` star tier whose `ageInDays` is at or above the
   boundary, when the scorecard renders, then the bracket key is `growing-mature` and
   the bracket label reads "Growing · ≥ 2 yrs".
4. Given a repo whose `ageInDays` is `"unavailable"`, when the scorecard renders, then
   the bracket falls back to the unstratified community bracket for its star tier (the
   existing Phase 1 behavior) and the label notes that age stratification was
   unavailable.
5. Given the solo star brackets (`solo-tiny`, `solo-small`), when calibration
   regenerates, then they are **not** age-stratified in this feature (YAGNI — solo
   classification already encodes the dominant cohort signal) and continue as-is.
6. Given the percentile data is present, when a repo's results render, then each
   age-normalized caption includes a cohort context line ("at the 75th percentile for
   the growing · < 2 yrs bracket") that reads from the matched stratified entry and
   degrades gracefully if the stratum is missing (falls back to the unstratified
   bracket, then to no context line).
7. Given the calibration script is run with `--dry-run`, when the preview output is
   written, then the stratified entries appear in the preview, existing unstratified
   entries are preserved byte-for-byte, and the sampling report lists per-stratum
   sample sizes so reviewers can detect thin strata before committing the JSON.

---

### Edge Cases

- **Brand-new repo (< 30 days old)**: normalized captions read "Too new to normalize",
  trajectory reads "Insufficient verified public data", and the raw values still
  display.
- **Zero-day-old repo (`createdAt === now`)**: division-by-zero is guarded — normalized
  outputs are marked "Too new to normalize" with no arithmetic attempted.
- **Total commit count unavailable** (default branch history not retrievable): the
  commits/month caption, the trajectory label, and the per-bracket cohort context all
  read "Unavailable"; Activity and Resilience scoring is not blocked because they
  already rely on window-based counts that are independent of lifetime totals.
- **Ancient repo with no recent activity** (e.g., 10+ years old, 0 commits in last 12
  months): trajectory is "Declining"; raw activity figures are shown; no synthetic
  "archived" inference is made because that would exceed verified data
  (constitution §II).
- **Repo older than stored commit-history window**: if the default-branch commit
  history cannot reach the repo's `createdAt` (very rare; GraphQL returns a paginated
  cursor cap), lifetime commits/month is treated as `"unavailable"` and the trajectory
  label is "Unavailable" with a specific missing-data reason.
- **Comparison view**: two repos of very different ages are compared side-by-side; the
  age-normalized captions and trajectory labels are present for both and are aligned in
  the same row for direct reading.
- **Export**: JSON export includes the new derived fields (`ageInDays`, `starsPerYear`,
  `contributorsPerYear`, `commitsPerMonth`, `growthTrajectory`) alongside the raw
  fields they normalize; Markdown export includes them in the per-repo block.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The analyzer MUST derive `ageInDays` from the verified `createdAt`
  timestamp and the analysis time. When `createdAt` is `"unavailable"`, `ageInDays`
  MUST be `"unavailable"`.
- **FR-002**: The analyzer MUST derive `starsPerYear` as
  `stars / (ageInDays / 365.25)` when both `stars` and `ageInDays` are available and
  `ageInDays ≥ minimumNormalizationAgeDays` (config-driven; default 90). Otherwise the
  value MUST be `"too-new"` or `"unavailable"` per the applicable missing input.
- **FR-003**: The analyzer MUST derive `contributorsPerYear` as
  `totalContributors / (ageInDays / 365.25)` under the same availability rules as
  FR-002.
- **FR-004**: The analyzer MUST derive `commitsPerMonth` over the repo's lifetime as
  `totalCommits / (ageInDays / 30.4375)`, where `totalCommits` is the default branch's
  verified lifetime commit count. Availability rules mirror FR-002.
- **FR-005**: The analyzer MUST compute a `growthTrajectory` classification with
  values `'accelerating' | 'stable' | 'declining' | 'unavailable'`. Computation
  compares `commitsPerMonthRecent12mo` against `commitsPerMonthLifetime`. Thresholds
  (`acceleratingRatio`, `decliningRatio`, `minimumTrajectoryAgeDays`) MUST live in
  scoring configuration, not in logic. Default cutoffs: `+25 %` / `–25 %`; default
  minimum age: 2 years.
- **FR-006**: The results UI MUST display `starsPerYear`, `contributorsPerYear`, and
  `commitsPerMonth` as secondary captions under their respective raw metric. Each
  caption MUST clearly indicate its unit (`/yr`, `/mo`) and MUST fall back to
  "Too new to normalize" or "Unavailable" per the analyzer output.
- **FR-007**: The results UI MUST display a Growth Trajectory indicator using the
  CHAOSS-consistent color scale: Accelerating = green, Stable = amber, Declining =
  red, Insufficient = gray.
- **FR-008**: Each maturity signal MUST expose a "how is this computed?" tooltip
  listing the raw inputs and the configured thresholds, matching the Phase 1 pattern
  used for Activity / Resilience / Responsiveness.
- **FR-009**: Resilience scoring (P1-F09) MUST gate its High/Medium/Low output behind
  a configurable `minimumResilienceScoringAgeDays` (default 180). When a repo is below
  this age, the score MUST be "Insufficient verified public data" and the tooltip MUST
  name age-guard as the reason.
- **FR-010**: Activity scoring (P1-F08) MUST gate its High/Medium/Low output behind
  a configurable `minimumActivityScoringAgeDays` (default 90). When a repo is below
  this age, the score MUST be "Insufficient verified public data" and the tooltip MUST
  name age-guard as the reason.
- **FR-011**: The calibration pipeline (`scripts/calibrate.ts`) MUST stratify each
  community star bracket (`emerging`, `growing`, `established`, `popular`) into
  `-young` (`ageInDays < ageStratumBoundaryDays`) and `-mature`
  (`ageInDays ≥ ageStratumBoundaryDays`) variants, where `ageStratumBoundaryDays` is
  config-driven (default 730). For every stratum it MUST emit percentile distributions
  (p25/p50/p75/p90) for: the existing fields (stars, forks, watchers, `forkRate`,
  `watcherRate`, `prMergeRate`, `issueClosureRate`, `staleIssueRatio`) and the new
  age-normalized fields (`starsPerYear`, `contributorsPerYear`, `commitsPerMonth`).
  Solo brackets (`solo-tiny`, `solo-small`) MUST remain age-unstratified in this
  feature.
- **FR-011a**: `starsPerYear` MUST be a first-class comparison axis alongside raw
  `stars` in the calibration data — not merely a caption. Its percentile entries per
  stratum are the primary velocity anchor used by the UI's cohort context line and by
  the Comparison view's stars/year row (see FR-012).
- **FR-011b**: Bracket routing MUST key on both the star tier and the age stratum when
  age is available; when age is unavailable, routing MUST fall back to the
  unstratified star-tier bracket (preserving existing Phase 1 behavior) and the
  bracket label MUST note that age stratification was unavailable.
- **FR-012**: The Comparison view MUST show maturity signals for every participant in
  their own rows, aligned so two repos of different ages can be read at a glance. At
  minimum these rows are required: raw stars (existing), **stars/year** (new;
  age-velocity comparison — differentiates steady growers from flat plateaus),
  contributors/year, commits/month, and Growth Trajectory label. Each cell MUST render
  "Too new to normalize" or "Unavailable" when the underlying signal is gated by age
  or missing data, respectively.
- **FR-013**: JSON export MUST include the new derived fields alongside their raw
  parents; Markdown export MUST include them in the per-repo block. The token MUST
  never appear in any export (constitution §X.3).
- **FR-014**: Per-repo missing-data panel MUST list age, total commit count, and
  total contributor count when any is unavailable, so readers can trace a "Too new to
  normalize" or "Unavailable" caption back to its root cause.
- **FR-015**: All maturity-related thresholds (`minimumNormalizationAgeDays`,
  `minimumTrajectoryAgeDays`, `acceleratingRatio`, `decliningRatio`,
  `minimumResilienceScoringAgeDays`, `minimumActivityScoringAgeDays`) MUST live in
  shared scoring configuration (constitution §VI) — not inline in components, not in
  constants files treated as logic.
- **FR-016**: This feature MUST NOT introduce a new CHAOSS category or a new
  composite score (constitution §V). The Growth Trajectory indicator is a context
  label on existing Activity output, not a fifth CHAOSS score.

### Key Entities

- **Maturity Signals (per repo)**: derived fields on `AnalysisResult` — `ageInDays`,
  `starsPerYear`, `contributorsPerYear`, `commitsPerMonth`,
  `commitsPerMonthRecent12mo`, `commitsPerMonthLifetime`, `growthTrajectory`. Each can
  hold a numeric value, the string `"too-new"`, or `"unavailable"`.
- **Maturity Thresholds (config)**: `minimumNormalizationAgeDays`,
  `minimumTrajectoryAgeDays`, `acceleratingRatio`, `decliningRatio`,
  `minimumResilienceScoringAgeDays`, `minimumActivityScoringAgeDays`,
  `ageStratumBoundaryDays`. Read by both analyzer logic and tooltip rendering.
- **Calibration Bracket Addition**: each community bracket in
  `lib/scoring/calibration-data.json` (`emerging`, `growing`, `established`,
  `popular`) splits into `-young` and `-mature` variants. Each variant records
  percentile blocks for the existing fields plus `starsPerYear`,
  `contributorsPerYear`, and `commitsPerMonth`. `starsPerYear` is a first-class
  cohort axis (FR-011a). Solo brackets remain age-unstratified.
- **Bracket Routing Helper**: a function that takes `(stars, ageInDays)` and returns
  the appropriate bracket key. When `ageInDays` is `"unavailable"`, returns the
  unstratified star-tier bracket. Used by scorecard, cohort captions, and the
  Comparison view.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every analyzed repo where `createdAt`, `stars`, `totalContributors`,
  and total commits are all available and `ageInDays ≥ 90`, the results surface shows
  three age-normalized captions (stars/yr, contributors/yr, commits/mo) without any
  "Unavailable" state.
- **SC-002**: For every analyzed repo with `ageInDays ≥ 2 × 365`, the Growth
  Trajectory indicator renders with one of Accelerating / Stable / Declining (never
  guessed, never blank) and its tooltip exposes the underlying numbers.
- **SC-003**: For every repo with `ageInDays < 180`, the Resilience score renders
  "Insufficient verified public data" with an age-guard reason — eliminating the
  false-negative "Low" output observed today on young healthy repos.
- **SC-004**: After calibration regeneration, `lib/scoring/calibration-data.json`
  contains, for every community star bracket, both `-young` and `-mature` stratum
  entries (total ≥ 8 community stratum keys: `emerging-young`, `emerging-mature`,
  `growing-young`, `growing-mature`, `established-young`, `established-mature`,
  `popular-young`, `popular-mature`). Each stratum includes `starsPerYear`,
  `contributorsPerYear`, and `commitsPerMonth` percentile blocks alongside existing
  fields. Solo brackets remain unstratified.
- **SC-005**: A user comparing two repos of materially different ages (e.g., one < 1
  year old, one > 5 years old) with similar stars can read the answer to "which is
  growing faster?" directly from the Comparison view — stars/year, contributors/year,
  commits/month, and Growth Trajectory are all explicit rows — without leaving the
  page and without performing arithmetic.
- **SC-007**: A repo routed to a stratified bracket (`growing-young`, etc.) receives
  percentile anchors drawn from repos in the same age stratum and star tier. The
  scorecard bracket label reflects the stratum ("Growing · < 2 yrs").
- **SC-006**: JSON export of an analysis containing maturity signals round-trips
  through `JSON.parse(JSON.stringify(result))` with the maturity fields identical
  before and after.

## Assumptions

- Verified total commit count is available from the GitHub GraphQL API via the default
  branch's `history.totalCount`. (Confirmed: Phase 1 already queries this surface.)
- This feature does NOT introduce a new CHAOSS category, a new composite score, or a
  new scoring bucket in the Phase 2 bucket table. It adds context metrics and a
  qualitative trajectory label, plus age-aware guards on existing scores. Rationale:
  the issue's acceptance criteria describe normalization and interpretation of
  existing signals — adding a brand-new percentile bucket would exceed the issue's
  scope (constitution §IX.6, YAGNI).
- Growth Trajectory comparison windows default to "last 12 months vs lifetime." This
  interpretation of "first vs recent activity" is the simplest that (a) is
  well-defined for repos older than 2 years, (b) needs only the lifetime and the
  last-12-months commit counts already available, and (c) reacts meaningfully to
  recent change. Alternative interpretations (first-year vs last-year; last-12 vs
  previous-12) remain possible but are deferred unless calibration reveals they
  discriminate better.
- Age-guard minimum ages (90 days for Activity, 180 days for Resilience) are initial
  defaults that can be re-tuned in configuration after calibration data is in place.
  Responsiveness scoring (P1-F10) is NOT age-guarded: response-time medians already
  auto-degrade to "Insufficient" when issue/PR counts are too small, so the existing
  data-guard is sufficient.
- The age-stratum boundary (`ageStratumBoundaryDays`, default 730) is kept equal to
  the trajectory minimum age so the two thresholds are coherent: a repo old enough
  to receive a trajectory label is also old enough to land in the `-mature` stratum.
  Retuning after calibration may split these; for this feature they share a value.
- Solo brackets are intentionally NOT age-stratified. Reason: the solo cohort already
  filters heavily on contributor-count signals, and splitting further by age would
  produce strata too thin for reliable percentiles. YAGNI (constitution §IX.6).
- Calibration sample sizes per stratum may be thinner than their unstratified
  predecessors (the same budget is split ~50/50 between young and mature). The
  calibration script's sampling report lists per-stratum counts so thin strata can
  be flagged. If a stratum falls below a reasonable floor (e.g., 100 samples), the
  routing helper falls back to the unstratified bracket for that star tier — same
  pattern as the existing solo fallback in issue #229 / feature spec 229.
- Comparison and Export integration follow the cross-cutting pattern in
  `docs/DEVELOPMENT.md` "Adding a new scoring signal — integration checklist."
  Components touched: metric cards, comparison, JSON/Markdown export, tab counts (if
  the signals live within a tagged tab). Recommendations catalog is out of scope — no
  advice text is added in this feature.
- Heuristic Elephant Factor and Single-vendor dependency ratio (constitution §II.7 /
  §VIII.6) are NOT touched by this feature.

## Out of Scope

- Adding a new CHAOSS category or a fifth composite score.
- Adding a new Phase 2 scoring bucket with its own percentile weight in the composite
  health score. (The age-normalized percentiles feed existing captions as context, not
  a new weighted bucket.)
- Recommendations text ("Consider …") derived from the trajectory label. The
  trajectory is informational in this feature; advice generation can follow in a later
  feature if calibration data justifies it.
- Automatic "archived / maintenance mode" inference. Even an old repo with zero
  recent commits is labeled "Declining," not "Abandoned" — constitution §II forbids
  inferences beyond verified GitHub data.
- Retroactive recomputation of prior analyses. Maturity signals are derived at
  analysis time; there is no historical backfill.
