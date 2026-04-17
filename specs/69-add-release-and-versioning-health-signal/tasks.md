# Tasks: Release Health Scoring

**Feature**: P2-F09 — Release Health Scoring (issue #69)
**Branch**: `69-add-release-and-versioning-health-signal`
**Inputs**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/release-health-scoring.md`, `quickstart.md`

Tests-first per Constitution §XI (NON-NEGOTIABLE): for every new unit, write the failing test before the implementation.

**Conventions**:
- `[P]` — safe to run in parallel with other `[P]` tasks in the same phase (different files, no shared state).
- `[USn]` — tied to User Story n from `spec.md`.

---

## Phase 1 — Setup

- [X] T001 Verify the pending branch `69-add-release-and-versioning-health-signal` has a clean worktree and run `npm test` + `npm run lint` once as a baseline snapshot, so later regressions are attributable to this feature. No code change — record baseline counts in the task log.
- [X] T002 Confirm `docs/DEVELOPMENT.md` Phase 2 table row for P2-F09 is still blank (no `✅ Done` yet). File: `docs/DEVELOPMENT.md`.

---

## Phase 2 — Foundational (blocks every user story)

These are the shared types, config keys, and GraphQL fields that every downstream task depends on.

- [X] T003 [P] Add the five regex / threshold / weight constants listed in `research.md` §Summary to the shared scoring config. File: `lib/scoring/config-loader.ts`. Constants: `SEMVER_REGEX`, `CALVER_REGEX`, `RELEASE_NOTES_SUBSTANTIVE_FLOOR`, `STALE_RELEASE_CUTOFF_DAYS`, `COOLING_RELEASE_CUTOFF_DAYS`, `SEMVER_ADOPTION_THRESHOLD`, `ACTIVITY_CADENCE_FREQUENCY_WEIGHT`, `ACTIVITY_CADENCE_RECENCY_WEIGHT`, `DOCUMENTATION_SEMVER_BONUS`, `DOCUMENTATION_NOTES_BONUS`, `DOCUMENTATION_TAG_PROMOTION_BONUS`. All values named per research.md defaults.
- [X] T004 [P] Add unit tests asserting each new scoring-config constant is exported and has the documented default. File: `lib/scoring/config-loader.test.ts`.
- [X] T005 Define the `ReleaseHealthResult` interface and the optional `releaseHealthResult` field on `AnalysisResult`. File: `lib/analyzer/analysis-result.ts`. Shape comes verbatim from `contracts/release-health-scoring.md` §1.
- [X] T006 [P] Extend the existing Pass-1 GraphQL query with the additive fields (release `tagName`, `name`, `body`, `isPrerelease`, `totalCount`; `refs(refPrefix: "refs/tags/", first: 0).totalCount`) per `contracts/release-health-scoring.md` §8. File: `lib/analyzer/queries.ts`. No new query pass.
- [X] T007 [P] Update the GraphQL response TypeScript types so the new fields flow end-to-end. File: `lib/analyzer/queries.ts` (or wherever `RepoOverviewResponse`-equivalent lives — follow the same pattern as existing release nodes).

---

## Phase 3 — User Story 1 (P1): Release-health signals detected and visible with a `release-health` pill

**Goal**: Analyze a repo with releases and show a Release Cadence card (Activity) + Release Discipline card (Documentation), each carrying the `release-health` pill.

**Independent test**: Open a report for a repo with active releases; visit Activity and Documentation tabs; confirm both cards render, each with the `release-health` pill, and tooltip/label surfaces "Release Health" (per spec's revised independent test wording).

### Tests first

- [X] T008 [P] [US1] Unit tests for `detectReleaseHealth()` covering: zero releases → object with field-level `'unavailable'`; one release → frequency `'unavailable'`, recency computed; tag-only project → `tagToReleaseRatio` present, `releaseNotesQualityRatio` `'unavailable'`; pre-release-only mix; ≥100 releases bounded sample; `totalTags === 'unavailable'` → `tagToReleaseRatio === 'unavailable'`. File: `lib/release-health/detect.test.ts`.
- [X] T009 [P] [US1] Unit tests for `SEMVER_REGEX`, `CALVER_REGEX`, and `detectVersioningScheme()` covering: standard semver (`v1.2.3`, `1.2.3-rc.1`, `1.0.0+build.7`); CalVer (`2026.04.17`, `24.04`); unrecognized; empty input → `'unavailable'`. File: `lib/release-health/semver.test.ts`.
- [X] T010 [P] [US1] Unit tests for the `release-health` tag registry — asserts the tag key, row set, and metric set are exported and cover the five metric keys. File: `lib/tags/release-health.test.ts`.
- [X] T011 [P] [US1] Component test for `TagPill` asserting a `release-health` variant renders with the expected accessible name / tooltip. File: `components/tags/TagPill.test.tsx` (extend existing test file).
- [X] T012 [P] [US1] Component test for `ReleaseCadenceCard` — renders three metrics (releases per year, days since last release, pre-release usage), carries the `release-health` pill, renders `"unavailable"` on zero-release input. File: `components/activity/ReleaseCadenceCard.test.tsx`.
- [X] T013 [P] [US1] Component test for `ReleaseDisciplineCard` — renders three rows (semver compliance ratio, release-notes quality ratio, tag-to-release promotion ratio), each with the `release-health` pill, renders `"unavailable"` appropriately. File: `components/documentation/ReleaseDisciplineCard.test.tsx`.

### Implementation

- [X] T014 [US1] Implement `lib/release-health/semver.ts` — export `SEMVER_REGEX`, `CALVER_REGEX`, and `detectVersioningScheme(tagNames)` per `contracts/release-health-scoring.md` §4.
- [X] T015 [US1] Implement `lib/release-health/detect.ts` — pure `detectReleaseHealth(input)` computing all seven fields per `data-model.md` and `contracts/release-health-scoring.md` §2. Injected `now` for determinism.
- [X] T016 [US1] Wire `detectReleaseHealth()` into the analyzer pipeline so `releaseHealthResult` is populated on every `AnalysisResult`. File: `lib/analyzer/github-graphql.ts` (or wherever the pass-1 response is mapped into `AnalysisResult`).
- [X] T017 [P] [US1] Create the `release-health` tag registry. File: `lib/tags/release-health.ts` (shape per `data-model.md` §Tag registry).
- [X] T018 [P] [US1] Extend `TagPill` to support the `release-health` variant styling (parallel to `governance` and `community`). File: `components/tags/TagPill.tsx`.
- [X] T019 [US1] Implement `ReleaseCadenceCard`. File: `components/activity/ReleaseCadenceCard.tsx`. Reads `releaseHealthResult` from the passed `AnalysisResult`; renders frequency, recency, and pre-release state; carries the `release-health` pill.
- [X] T020 [US1] Implement `ReleaseDisciplineCard`. File: `components/documentation/ReleaseDisciplineCard.tsx`. Reads `releaseHealthResult`; renders semver / notes / tag-promotion ratios with per-row `release-health` pills.
- [X] T021 [US1] Wire `ReleaseCadenceCard` into the Activity tab. File: `components/activity/ActivityView.tsx`.
- [X] T022 [US1] Wire `ReleaseDisciplineCard` into the Documentation tab. File: `components/documentation/DocumentationView.tsx`.
- [X] T023 [US1] Extend `lib/activity/view-model.ts` to expose the Release Cadence card data shape consumed by `ReleaseCadenceCard`.

**Checkpoint** — User Story 1 complete: pill + both cards render end-to-end; dev server on port 3010 shows them for any repo with releases.

---

## Phase 4 — User Story 2 (P1): Release-health signals feed their host buckets

**Goal**: Activity and Documentation scores move monotonically in response to release-health signal presence; composite weights unchanged.

**Independent test**: Analyze a release-health-rich repo and a release-health-poor repo; confirm Activity and Documentation bucket scores on the rich repo are ≥ the poor repo; confirm composite `WEIGHTS` in `lib/scoring/health-score.ts` are untouched.

### Tests first

- [X] T024 [P] [US2] Unit tests for the extended Activity cadence sub-factor — asserts splitting into `ACTIVITY_CADENCE_FREQUENCY_WEIGHT` + `ACTIVITY_CADENCE_RECENCY_WEIGHT` sums to the current cadence allocation (0.20) and falls back to today's `releases12mo`-only logic when `releaseHealthResult` is `'unavailable'` / `undefined`. File: `lib/activity/score-config.test.ts`.
- [X] T025 [P] [US2] Unit tests for the three Documentation bonuses — asserts `getDocumentationScore()` output with vs. without release-health signals; composite Documentation percentile is clamped to `[0, 99]`; absence of release-health never drops score below baseline. File: `lib/documentation/score-config.test.ts`.
- [X] T026 [P] [US2] Guard test that `WEIGHTS` in `lib/scoring/health-score.ts` is unchanged (25/25/23/12/15). File: `lib/scoring/health-score.test.ts`.

### Implementation

- [X] T027 [US2] Extend Activity cadence to consume `daysSinceLastRelease` in addition to `releases12mo`, per research R6 and `contracts/release-health-scoring.md` §5. File: `lib/activity/score-config.ts`. No signature change on `getActivityScore()`.
- [X] T028 [US2] Add the three bonus multipliers to Documentation scoring (semver, notes, tag-promotion) per research R6 and Contract §5. File: `lib/documentation/score-config.ts`. No signature change on `getDocumentationScore()`.

**Checkpoint** — User Story 2 complete: host-bucket scores are moved by release-health signals; composite untouched.

---

## Phase 5 — User Story 3 (P2): Release Health completeness readout on the per-repo metric card

**Goal**: Metric card surfaces a `release-health` lens readout, peer to Community and Governance, using the linear ratio → percentile fallback.

**Independent test**: Open the per-repo metric card; confirm a third lens readout labeled "Release Health" appears alongside Community and Governance; a zero-release repo shows "Insufficient verified public data".

### Tests first

- [X] T029 [P] [US3] Unit tests for `computeReleaseHealthCompleteness()` covering: all five signals present → ratio 1.0, percentile 99; all five `unknown` → ratio null, percentile null; mixed → linear ratio reflected in percentile; `unknown` signals excluded from numerator and denominator (FR-021). File: `lib/release-health/completeness.test.ts`.
- [X] T030 [P] [US3] Component test for `MetricCard` asserting the `release-health` lens readout renders after `community` / `governance` when `releaseHealthResult` is present and the completeness ratio is non-null; renders the `"Insufficient verified public data"` copy when ratio is null. File: `components/metric-cards/MetricCard.test.tsx` (extend existing).

### Implementation

- [X] T031 [US3] Implement `computeReleaseHealthCompleteness()` mirroring `lib/community/completeness.ts`. File: `lib/release-health/completeness.ts`. Export `ReleaseHealthSignalKey`, `ReleaseHealthCompleteness` types per `data-model.md`.
- [X] T032 [US3] Extend `buildLensReadouts()` to append a `release-health` readout after `community` / `governance`, per `contracts/release-health-scoring.md` §6. File: `lib/metric-cards/view-model.ts`.

**Checkpoint** — User Story 3 complete: third lens readout live on the metric card.

---

## Phase 6 — User Story 4 (P3): Recommendations for missing release-health signals

**Goal**: Recommendations fire for gaps with staleness tiering and percentile-gate suppression; no rec on `preReleaseRatio` alone.

**Independent test**: Analyze repos matching each of US4's ten acceptance scenarios; confirm the correct recommendation (or suppression) for each.

### Tests first

- [X] T033 [P] [US4] Unit tests for `generateReleaseHealthRecommendations()` covering US4 AC1–AC10: never-released, stale (>24 mo), cooling, adopt-semver, adopt-a-scheme, CalVer suppresses semver rec, notes-below-floor (not only empty), promote-tags, percentile-gate suppression, `preReleaseRatio` never fires. File: `lib/release-health/recommendations.test.ts`.
- [X] T034 [P] [US4] Unit test that the staleness tier engine emits at most one recommendation per repo (FR-028) across all three tiers. File: `lib/release-health/recommendations.test.ts` (same file as T033).

### Implementation

- [X] T035 [US4] Implement `generateReleaseHealthRecommendations()` per research R4, R5, R9 and `data-model.md` §Recommendation catalog. File: `lib/release-health/recommendations.ts`. Pure function — consumes the bucket percentile + the release-health signal state; returns `HealthScoreRecommendation[]` or `[]`.
- [X] T036 [US4] Add the seven catalog entries (never_released, stale, cooling, adopt_semver, adopt_scheme, improve_notes, promote_tags) with static user-facing copy and `gate: RECOMMENDATION_PERCENTILE_GATE`. File: `lib/recommendations/catalog.ts`.
- [X] T037 [US4] Integrate `generateReleaseHealthRecommendations()` into the existing recommendations rollup so entries appear in the host-bucket tab. File: `lib/scoring/health-score.ts` (or wherever the recommendations list is assembled).

**Checkpoint** — User Story 4 complete: recommendations tested and wired into the existing surface.

---

## Phase 7 — Polish & Cross-Cutting Concerns

- [X] T038 [P] Extend `lib/comparison/sections.ts` so release-health rows diff across repos (P1-F06 flat-schema compatibility; FR-013 / FR-025 adjacent). File: `lib/comparison/sections.ts`.
- [X] T039 [P] Extend JSON export with `releaseHealthResult` and `releaseHealthCompleteness` top-level fields. File: `lib/export/json-export.ts`.
- [X] T040 [P] Extend Markdown export with a `## Release Health` section (Release Cadence / Release Discipline / Completeness subsections) parallel to the `## Community` section. File: `lib/export/markdown-export.ts`.
- [X] T041 [P] Extend the methodology / baseline page to describe Release Health as a lens, list the five signals and host buckets, explain the completeness denominator, and note that per-bracket calibration is tracked in #152 (FR-024, SC-006). File: `components/baseline/BaselineView.tsx`.
- [X] T042 Extend Playwright E2E to assert: (1) `release-health` pill on Release Cadence and Release Discipline cards; (2) Release Health completeness readout on the metric card; (3) zero-release repo renders "Insufficient verified public data". Prefer lightweight DOM / computed-style assertions over visual snapshots. File: `e2e/release-health.spec.ts`.
- [X] T043 [P] Add release-health coverage to the tag-match / tab-count logic so the `release-health` tag is counted in the tab-strip badges. File: `lib/tags/tab-counts.ts`.
- [X] T044 Flip `docs/DEVELOPMENT.md` Phase 2 table row for P2-F09 to `✅ Done` only when all tests and linting pass (DoD §XII). File: `docs/DEVELOPMENT.md`.
- [X] T045 Run `npm test && npm run lint && DEV_GITHUB_PAT= npm run build && npm run test:e2e` and confirm all green before opening the PR.

---

## Dependencies

```
Phase 1 (Setup: T001, T002)
   └── Phase 2 (Foundational: T003–T007)
          ├── Phase 3 (US1: T008–T023)
          │      └── Phase 4 (US2: T024–T028)          ← depends on US1's detect + analysis-result shape
          │             └── Phase 5 (US3: T029–T032)   ← depends on US1 detect + US2 scoring
          │                    └── Phase 6 (US4: T033–T037)
          └── Phase 7 (Polish: T038–T045)
                 ↑ depends on every preceding phase
```

**Independent-story notes**:
- US1 is the strict prerequisite for US2, US3, US4 (no signals → nothing to score / render / recommend).
- US2 and US3 are independent given US1 is done (scoring vs. readout are orthogonal).
- US4 requires the trigger inputs from US1 and respects the gate values; best scheduled after US2.

---

## Parallelization map

| Batch | Tasks | Rationale |
|---|---|---|
| Batch A (Phase 2) | T003, T006, T007 | Different files, no inter-dependency |
| Batch B (US1 tests) | T008, T009, T010, T011, T012, T013 | Separate test files, no import cycles |
| Batch C (US1 impl) | T017, T018 (after T014) | Tag registry and TagPill variant are independent files |
| Batch D (US2 tests) | T024, T025, T026 | Separate test files |
| Batch E (US3 tests) | T029, T030 | Separate test files |
| Batch F (US4 tests) | T033, T034 | Same file but can be written in one sitting |
| Batch G (Polish) | T038, T039, T040, T041, T043 | Touch different files |

---

## Implementation strategy

**MVP**: User Story 1 (Phases 1–3). Ships the lens pill, the Release Cadence card, and the Release Discipline card. Delivers user-visible value standalone without touching scores or recommendations.

**Incremental**: US2 moves scores, US3 surfaces completeness, US4 ships recommendations. Each is a standalone PR-worthy increment but this feature ships as a single PR per the Phase 2 lens pattern.

**Constitution reminders**:
- §XI TDD is NON-NEGOTIABLE — every T0xx implementation task in US1–US4 has a test task immediately above it.
- §II Accuracy — `'unavailable'` and `"Insufficient verified public data"` are the only acceptable missing-data strings.
- §VI — thresholds live in shared config (T003), never hardcoded in logic.
- §IX YAGNI — no calibration payload changes (deferred to #152), no new tab, no new bucket.
- PR merge discipline per CLAUDE.md — Claude opens the PR and stops; user merges manually.

---

## Summary

- **Total tasks**: 45
- **Per phase**: Setup 2 / Foundational 5 / US1 16 / US2 5 / US3 4 / US4 5 / Polish 8
- **Parallel opportunities**: 7 batches identified above.
- **MVP scope**: US1 (T001–T023).
- **Independent tests**: one per user story, defined in spec.md §User Scenarios.
