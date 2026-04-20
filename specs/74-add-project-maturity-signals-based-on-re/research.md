# Phase 0 — Research: Project Maturity Signals

No `NEEDS CLARIFICATION` markers remained in the approved spec; this document
captures the research behind the design decisions already encoded there so the
Phase 1 contracts section has a stable reference.

## R1. Source of lifetime commit count

**Decision**: Extend the existing `REPO_OVERVIEW_QUERY` with
`defaultBranchRef.target.history(first: 0) { totalCount }` aliased as
`lifetimeCommits`.

**Rationale**: GitHub's GraphQL `Commit.history` connection exposes `totalCount`
without needing to page. `first: 0` returns just the count. The query already
selects `defaultBranchRef`, so this is an additive field on an already-sent
request — zero extra round-trips, keeping the constitution §III.2 "1–3 GraphQL
requests per repo" budget intact.

**Alternatives considered**:

- *REST `/repos/:o/:n/stats/contributors`*: includes per-author commit counts that
  sum to lifetime, but the endpoint returns `202 Accepted` on cold cache and
  requires a poll loop. Not worth the complexity when GraphQL gives a direct count.
- *Derive lifetime from `commits30d + commits90d + commits365d` extrapolated to
  age*: violates constitution §II (no interpolation / no estimation).

## R2. Growth trajectory window choice

**Decision**: Compare `commitsPerMonthRecent12mo` (lifetime history's last 365 days
of commits / 12) against `commitsPerMonthLifetime` (lifetime total / age in
months). Classify: ≥ +`acceleratingRatio` → accelerating, ≤ −`decliningRatio` →
declining, otherwise stable. Defaults: ±25 %. Gated behind
`minimumTrajectoryAgeDays` (default 730).

**Rationale**:

- "Last 12 vs lifetime" is the simplest definition that's well-defined for any
  repo older than 12 months, needs only two numbers already on the result (lifetime
  total from R1; recent commits 365d already present as `recent365Commits`-window
  signals), and reacts meaningfully to recent change.
- Gating at 2 years ensures the "lifetime excluding last 12 months" baseline has
  at least 12 months of history to stabilize. Below that, `growthTrajectory =
  'unavailable'` and the label reads "Insufficient verified public data."

**Alternatives considered**:

- *First-year vs last-year*: elegant semantically (literal reading of the issue),
  but requires paginating older commit history for repos older than the existing
  365-day window — adds network cost and a pagination loop. Deferred pending
  calibration evidence that the extra granularity adds signal.
- *Last-12-months vs previous-12-months*: cleanest comparison window-to-window,
  but doubles the "recent" query cost and eliminates the signal for 12–24-month-
  old repos (whose previous-12 is shorter than 12). The "vs lifetime" choice
  degrades more gracefully.

## R3. Age-guard placement on existing scores

**Decision**: Add configurable minimum-age gates to Activity (default 90 d) and
Resilience (default 180 d) scoring; do not gate Responsiveness.

**Rationale**:

- **Activity (P1-F08)** and **Resilience (P1-F09)** are count-based and already
  output "Low" when absolute counts are small. A young repo with 3 contributors is
  genuinely indistinguishable from an unhealthy old repo by count alone, so the
  current "Low" is a false negative driven by age. Replacing it with "Insufficient
  verified public data" when age is the dominant factor is the constitution §II
  honest outcome.
- **Responsiveness (P1-F10)** already auto-degrades to "Insufficient" when issue
  / PR counts are too thin to compute a stable median. That guard is independent
  of age and remains sufficient — adding an age gate would be redundant.

**Alternatives considered**:

- *No age guard, just display age-normalized captions*: leaves the known
  false-negative in place. Rejected.
- *Apply the same age guard to Responsiveness*: redundant with existing
  data-count guard; adds a knob without adding coverage.

## R4. Calibration bracket stratification strategy

**Decision**: Stratify the four community brackets (`emerging`, `growing`,
`established`, `popular`) into `-young` (< 2 years) and `-mature` (≥ 2 years)
variants. Do **not** stratify solo brackets. Age stratum boundary
(`ageStratumBoundaryDays`) is config-driven, default 730 (= trajectory minimum age
for coherence).

**Rationale**:

- Mirrors the pattern established by issue #229 / spec 229 (solo-tiny /
  solo-small), which split an existing bracket by a secondary axis and introduced
  a routing helper + fallback. The existing `getBracket(stars, profile)` signature
  generalizes naturally to `getBracket(stars, age, profile)`.
- Solo brackets already encode the dominant cohort signal (contributor count);
  splitting them further would fragment small samples, violating the signal /
  sample tradeoff. YAGNI (constitution §IX.6).
- Matching the stratum boundary to the trajectory minimum age (730 days) keeps
  the number of "age cutoff" knobs the user can retune to three:
  normalization (90 d), scoring age-guards (90 / 180 d), and
  stratum+trajectory (730 d).

**Alternatives considered**:

- *Three-way stratification (`-young` / `-mid` / `-mature`)*: triples the sample
  requirement per bracket; with existing calibration budget, each stratum becomes
  too thin for stable percentiles.
- *Stratify by age continuously (smooth interpolation)*: fits better statistically
  but is not introspectable — a user can't see "I'm in the growing · < 2 yrs
  cohort" and understand the calibration. Rejected for readability.

## R5. Shipping stratified brackets before re-sampling

**Decision**: This feature commits the stratified schema and adds
`sampleSize: 0` placeholder entries for the eight new community strata. The
`getBracket` routing helper treats `sampleSize: 0` as "not calibrated" and falls
back to the unstratified star-tier bracket (same behavior as the solo fallback in
`isSoloFallback`). Actual sampling happens under #152.

**Rationale**:

- Decouples schema/code delivery from the multi-hour calibration sweep.
- Matches the precedent set by the solo brackets' initial landing in spec 229,
  where the schema shipped with placeholder entries until solo sampling completed.
- The UI continues to render percentiles against the existing community anchors
  until #152 lands, so there is zero user-visible regression.

## R6. Comparison-view layout for maturity rows

**Decision**: Insert a new "Maturity" section in the Comparison view with these
rows in order: Age, Stars / year, Contributors / year, Commits / month, Growth
Trajectory. Rows render `"Too new to normalize"`, `"Unavailable"`, or the
numeric value per the analyzer output. The section sits between the existing
"Ecosystem" and "Activity" sections.

**Rationale**:

- Stars/year is the single most requested velocity comparison (per user's
  follow-up). Grouping the four maturity rows together lets a reader scan a
  single region rather than hunting for the stars/year number.
- Placing the section between Ecosystem (which covers stars/forks/watchers) and
  Activity (which covers cadence) matches the semantic ordering: cohort size →
  age-normalized cohort size → what the cohort is doing now.

**Alternatives considered**:

- *Inline each normalized value under its raw counterpart* (no dedicated section):
  matches the metric-card layout pattern, but in the multi-repo Comparison table
  it produces scattered rows and hurts at-a-glance comparison.
