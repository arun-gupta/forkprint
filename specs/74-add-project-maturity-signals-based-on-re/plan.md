# Implementation Plan: Project Maturity Signals

**Branch**: `74-add-project-maturity-signals-based-on-re` | **Date**: 2026-04-20
**Spec**: [`spec.md`](./spec.md)
**Issue**: #74 (P2-F11 — Project maturity)
**Related**: #152 (calibration regeneration tracker — comment posted adding this
feature's calibration surface)

## Summary

Derive a small set of age-normalized fields on `AnalysisResult` (`ageInDays`,
`starsPerYear`, `contributorsPerYear`, `commitsPerMonth`, `commitsPerMonthRecent12mo`,
`commitsPerMonthLifetime`, `growthTrajectory`), surface them as secondary captions
and a trajectory indicator, gate Resilience + Activity scoring for very-young repos,
extend the calibration schema to stratify community brackets by age, and stop short
of re-sampling (that happens in #152). Threshold knobs go in
`lib/scoring/config-loader.ts`; all UI text follows the Phase 1 accuracy language.

## Technical Context

**Language/Version**: TypeScript (Next.js 14 App Router, strict mode).
**Primary Dependencies**: existing analyzer module (`lib/analyzer`), scoring config
(`lib/scoring`), Tailwind + Chart.js UI, Vitest + Playwright for tests.
**Storage**: stateless (Phase 1); calibration anchors live in
`lib/scoring/calibration-data.json`.
**Testing**: Vitest unit/integration, React Testing Library for components, Playwright
for E2E. TDD is mandatory (constitution §XI).
**Target Platform**: Vercel-deployed Next.js web app.
**Project Type**: single Next.js web app with a framework-agnostic analyzer module.
**Performance Goals**: no new network calls; lifetime commit count is added to the
existing `RepoOverview` GraphQL query as `defaultBranchRef.target.history(first: 0) { totalCount }`
— one extra field on an already-sent query, zero new round-trips.
**Constraints**: constitution §II (no estimation), §V (no new CHAOSS category), §VI
(config-driven thresholds), §IX (YAGNI).
**Scale/Scope**: cross-cutting change — analyzer, scoring, metric cards, comparison,
export, calibration script, scoring methodology doc.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **§I Technology Stack** — no new tech. Analyzer remains framework-agnostic. PASS.
- **§II Accuracy Policy** — all derived fields are formulas over verified
  `createdAt`, `stars`, `totalContributors`, `defaultBranchRef.target.history.totalCount`.
  Missing inputs propagate as `"unavailable"`; age-guarded scores render the literal
  `"Insufficient verified public data"`. No estimation. PASS.
- **§III Data Source Rules** — one extra field on an existing GraphQL query; OAuth
  token already in place; no REST additions. PASS.
- **§IV Analyzer Module Boundary** — all derivations live in
  `lib/analyzer/analyze.ts` (framework-agnostic) or `lib/scoring/*` (shared across
  phases). UI wraps, never reimplements. PASS.
- **§V CHAOSS Alignment** — no new CHAOSS category. Growth Trajectory is a context
  label on existing Activity output, not a fifth score. PASS.
- **§VI Scoring Thresholds** — six new knobs (`minimumNormalizationAgeDays`,
  `minimumTrajectoryAgeDays`, `acceleratingRatio`, `decliningRatio`,
  `minimumResilienceScoringAgeDays`, `minimumActivityScoringAgeDays`,
  `ageStratumBoundaryDays`) all in `lib/scoring/config-loader.ts`. PASS.
- **§VII Ecosystem Spectrum** — no change to P1-F05. PASS.
- **§VIII Contribution Dynamics Honesty** — feature does not touch org attribution.
  Age-guard on Resilience protects honest "Insufficient" output on young repos,
  reinforcing §VIII. PASS.
- **§IX Feature Scope Rules** — YAGNI: no new weighted bucket; no recommendations
  copy; no archived-mode inference. Solo brackets intentionally not stratified. PASS.
- **§X Security & Hygiene** — no new secrets; token never touches exports. PASS.
- **§XI Testing** — TDD per task list in `tasks.md`. Unit tests for analyzer
  derivations, config-loader routing, score-config age-guards; component tests for
  captions and trajectory indicator; export round-trip tests; one Playwright guard
  for the results-shell caption rendering (lightweight DOM assertion per user
  preference, no visual snapshot). PASS.
- **§XII Definition of Done** — PR test plan will cover all DoD items; calibration
  re-sampling is tracked in #152 and explicitly deferred. PASS.
- **§XIII Development Workflow** — feature branch, tests + lint clean pre-PR,
  `docs/DEVELOPMENT.md` Phase 2 table updated to ✅ Done post-merge. PASS.

**Gate result: PASS — no complexity-tracking entries required.**

## Project Structure

### Documentation (this feature)

```text
specs/74-add-project-maturity-signals-based-on-re/
├── plan.md               # this file
├── research.md           # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── maturity.ts       # Phase 1 output — TypeScript contract types
├── checklists/
│   └── requirements.md   # specify-phase quality check
├── spec.md               # approved spec
└── tasks.md              # /speckit.tasks output
```

### Source Code touchpoints

Follows the "Adding a new scoring signal — integration checklist" in
`docs/DEVELOPMENT.md`:

```text
lib/
├── analyzer/
│   ├── queries.ts                # add lifetimeCommits field to RepoOverview
│   ├── analyze.ts                # extractMaturitySignals(); populate new fields
│   ├── analysis-result.ts        # extend AnalysisResult; MaturitySignals types
│   └── analyzer.test.ts          # unit coverage for extractor + fallbacks
├── scoring/
│   ├── config-loader.ts          # new thresholds + BracketKey union +
│   │                             # getBracket(stars, age); getBracketLabel updates
│   ├── calibration-data.json     # schema change: stratified community brackets,
│   │                             # new percentile fields (sampleSize 0 placeholder
│   │                             # entries until #152 re-sample)
│   └── config-loader.test.ts     # routing helper + label + fallback tests
├── activity/
│   └── score-config.ts           # consume minimumActivityScoringAgeDays age-guard
├── contributors/
│   └── score-config.ts           # consume minimumResilienceScoringAgeDays age-guard
├── metric-cards/
│   └── view-model.ts             # render secondary captions + trajectory badge +
│                                 # cohort context line + tooltip copy
├── comparison/
│   └── sections.ts               # add maturity rows (stars/yr, contributors/yr,
│                                 # commits/mo, trajectory)
├── export/
│   ├── json-export.ts            # emit maturity fields
│   └── markdown-export.ts        # emit maturity block per repo
└── completeness.ts (per lens)    # only touched if a signal lives in a tagged tab;
                                  # maturity signals are cross-cutting and don't
                                  # require a new tab — skipped.

components/
├── metric-cards/*                # render new captions + trajectory indicator
└── results-shell/*               # no structural change

scripts/
└── calibrate.ts                  # schema-aware writer: emits stratified brackets
                                  # + new percentile fields; actual re-sample run
                                  # is scheduled under #152

docs/
├── DEVELOPMENT.md                # mark P2-F11 as ✅ Done on merge
├── PRODUCT.md                    # no change (Phase 2 issue is the spec)
└── scoring-and-calibration.md    # add Maturity section + stratified bracket list

tests/e2e/
└── maturity-signals.spec.ts      # single lightweight DOM assertion that the
                                  # captions + trajectory render for a fixture repo
```

**Structure Decision**: Single Next.js app + framework-agnostic analyzer (existing
repo shape). All touchpoints above are files that already exist; this plan only adds
fields, props, and a small set of helpers — no new top-level directories.

## Complexity Tracking

No constitution violations to justify; table intentionally empty.
