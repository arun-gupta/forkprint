# Tasks: Project Maturity Signals

**Feature Branch**: `74-add-project-maturity-signals-based-on-re`
**Spec**: [`spec.md`](./spec.md) · **Plan**: [`plan.md`](./plan.md)
**Issue**: #74 (P2-F11) · **Related**: #152 (calibration resampling — deferred)

TDD per constitution §XI: every change is preceded by failing tests. All paths are
absolute within the repo. Parallelizable tasks are marked `[P]`.

---

## Phase 1 — Setup

- [X] T001 Add `MATURITY_CONFIG` constant block to `lib/scoring/config-loader.ts` using the shape in `specs/74-add-project-maturity-signals-based-on-re/contracts/maturity.ts` (no behavior change yet — block is referenced in later tasks).
- [X] T002 [P] Create the feature's fixture file `lib/analyzer/__fixtures__/maturity-fixtures.ts` with four hand-built `AnalysisResult` stubs: old-active-accelerating, old-dormant-declining, young-healthy, missing-lifetime-commits. Reuse existing minimal fixture helpers.

---

## Phase 2 — Foundational (blocks every user story)

- [X] T003 Extend `BracketKey` union in `lib/scoring/config-loader.ts` to include the eight stratified community keys (`emerging-young`, `emerging-mature`, `growing-young`, `growing-mature`, `established-young`, `established-mature`, `popular-young`, `popular-mature`). Keep existing keys. Failing test first: add `lib/scoring/config-loader.test.ts` cases asserting the union accepts each new key and that routing without age still returns the unstratified key (pre-stratification behavior unchanged).
- [X] T004 Add `starsPerYear?`, `contributorsPerYear?`, `commitsPerMonth?` to `BracketCalibration` in `lib/scoring/config-loader.ts`. Failing test first in `lib/scoring/config-loader.test.ts`: asserts the interface accepts `undefined` for all three and numeric `PercentileSet` when supplied.
- [X] T005 Seed placeholder entries with `sampleSize: 0` for the eight new community stratum keys in `lib/scoring/calibration-data.json` (no percentiles — empty objects except `sampleSize: 0`). Failing test first in `lib/scoring/config-loader.test.ts`: `getCalibration('growing-young').sampleSize === 0`.
- [X] T006 Extend the analyzer's `RepoOverview` GraphQL query in `lib/analyzer/queries.ts` to add `defaultBranchRef.target { ... on Commit { lifetimeCommits: history(first: 0) { totalCount } } }` and extend `RepoOverviewResponse` type to expose the nested count. Failing test first: a narrow Vitest case on the response-shape parser in `lib/analyzer/analyzer.test.ts` that exercises a fixture with `defaultBranchRef.target.lifetimeCommits.totalCount = 1234`.
- [X] T007 Extend `AnalysisResult` in `lib/analyzer/analysis-result.ts` with the seven maturity fields from `data-model.md` (`ageInDays`, `lifetimeCommits`, `starsPerYear`, `contributorsPerYear`, `commitsPerMonthLifetime`, `commitsPerMonthRecent12mo`, `growthTrajectory`), all optional to avoid breaking existing fixtures. Failing test first in `lib/analyzer/analyzer.test.ts`: a compile-time check (unused declaration) + runtime assertion that fields default to `undefined` when omitted.

---

## Phase 3 — US1: Age-normalized metrics surface alongside raw values (P1)

**Story goal**: Stars/year, contributors/year, commits/month render as secondary captions on the results surface, with correct handling of "too-new" and "unavailable".

**Independent test**: Open the results view for an old active repo; the three captions show numeric values. Switch to a repo younger than 90 days; captions show "Too new to normalize."

- [X] T008 [P] [US1] Add unit tests for `extractMaturitySignals()` in `lib/analyzer/analyzer.test.ts` covering: (a) old repo yields numeric `starsPerYear` / `contributorsPerYear` / `commitsPerMonthLifetime`, (b) young repo (< 90 d) yields `'too-new'` for all three, (c) `createdAt === 'unavailable'` yields `'unavailable'` for all three, (d) missing `lifetimeCommits` yields `'unavailable'` only for `commitsPerMonthLifetime`, (e) `ageInDays` math uses 365.25 / 30.4375 constants.
- [X] T009 [US1] Implement `extractMaturitySignals(response, now)` in `lib/analyzer/analyze.ts`; wire it into `analyze()` so every `AnalysisResult` receives the new fields. Make T008 tests pass.
- [X] T010 [P] [US1] Add component tests for the new captions in `lib/metric-cards/view-model.test.ts`: given an `AnalysisResult` with numeric normalized values, the metric-card view model exposes caption strings `"X.X /yr"` / `"X.X /mo"` under stars, contributors, and commit-density cards; given `'too-new'`, caption reads "Too new to normalize"; given `'unavailable'`, caption reads "Unavailable".
- [X] T011 [US1] Implement the caption rendering in `lib/metric-cards/view-model.ts` (extend `buildLensReadouts()` or the nearest equivalent). Make T010 tests pass.
- [X] T012 [US1] Update the metric-card component rendering in `components/metric-cards/*` (exact file to match where stars / contributors / commits cards live) to display the new caption below the raw value. Update existing component-level tests to account for the new DOM node.
- [X] T013 [P] [US1] Add a tooltip copy test in `lib/metric-cards/view-model.test.ts` asserting the "how is this computed?" tooltip for each caption lists raw inputs (stars, ageInYears) and the configured minimum-age threshold from `MATURITY_CONFIG`.
- [X] T014 [US1] Implement tooltip copy in the view-model. Make T013 pass.

---

## Phase 4 — US2: Growth trajectory indicator (P1)

**Story goal**: Accelerating / Stable / Declining label with CHAOSS color scale, age-gated, tooltip-documented.

**Independent test**: Fixture `old-active-accelerating` → green Accelerating; `old-dormant-declining` → red Declining; `young-healthy` → gray "Insufficient verified public data."

- [X] T015 [P] [US2] Add `classifyGrowthTrajectory(recent, lifetime, ageInDays, config)` unit tests in `lib/analyzer/analyzer.test.ts` covering: ratio ≥ 1.25 → `'accelerating'`; ratio within (0.75, 1.25) → `'stable'`; ratio ≤ 0.75 → `'declining'`; `ageInDays < 730` → `'unavailable'`; either input unavailable → `'unavailable'`; boundary values (exactly 1.25, exactly 0.75) — use closed/open boundaries consistent with data-model.md spec.
- [X] T016 [US2] Implement `classifyGrowthTrajectory` as a pure function in `lib/analyzer/analyze.ts` (colocated with `extractMaturitySignals`). Populate `growthTrajectory` on every `AnalysisResult`. Make T015 pass.
- [X] T017 [P] [US2] Add component tests for the trajectory indicator in `lib/metric-cards/view-model.test.ts`: Accelerating → green success tone; Stable → amber warning; Declining → red danger; `'unavailable'` with `ageGated: true` → gray "Insufficient verified public data" with age-gate reason in tooltip; `'unavailable'` with missing commits → gray with lifetime-commits reason in tooltip.
- [X] T018 [US2] Add a Growth Trajectory indicator to the view-model and render it in the Activity tab area of `components/activity/*` (or results shell top region — match whichever surface already hosts the per-bucket score badges). Failing T017 tests drive the shape.
- [X] T019 [P] [US2] Add tooltip test in `lib/metric-cards/view-model.test.ts` verifying the trajectory tooltip displays `recentCommitsPerMonth`, `lifetimeCommitsPerMonth`, the ratio, and the configured band cutoffs verbatim.
- [X] T020 [US2] Implement the trajectory tooltip copy. Make T019 pass.

---

## Phase 5 — US3: Age context guards on existing scores (P2)

**Story goal**: Resilience gated at 180 d; Activity gated at 90 d; Responsiveness untouched.

**Independent test**: Fixture `young-healthy` → Resilience and Activity both render "Insufficient verified public data" citing age-guard; Responsiveness unaffected. Fixture `old-active-accelerating` → all existing scoring paths run normally.

- [X] T021 [P] [US3] Add failing tests to `lib/contributors/score-config.test.ts`: given `ageInDays < minimumResilienceScoringAgeDays`, Resilience output is the "Insufficient verified public data" shape with an age-guard reason string; given `ageInDays` above threshold, existing behavior unchanged; given `ageInDays === 'unavailable'`, age-guard does NOT fire.
- [X] T022 [US3] Implement the age-guard check at the top of the Resilience scoring function in `lib/contributors/score-config.ts`. Read `MATURITY_CONFIG.minimumResilienceScoringAgeDays`. Make T021 pass.
- [X] T023 [P] [US3] Add failing tests to `lib/activity/score-config.test.ts` mirroring T021 but for Activity using `minimumActivityScoringAgeDays` (90 d).
- [X] T024 [US3] Implement the age-guard check in `lib/activity/score-config.ts`. Make T023 pass.
- [X] T025 [P] [US3] Add a regression test to `lib/activity/score-config.test.ts` and `lib/contributors/score-config.test.ts` confirming Responsiveness is NOT age-guarded (the existing P1-F10 data guard is exercised). If Responsiveness lives in its own module, add the test there instead — preferred file: `lib/*responsiveness*.test.ts`.

---

## Phase 6 — US4: Age-stratified calibration brackets + routing (P2)

**Story goal**: `getBracket(stars, ageInDays, profile)` routes to `-young` / `-mature` when stratum has `sampleSize > 0`; otherwise falls back to unstratified. Label reflects stratum. Solo brackets untouched.

**Independent test**: With placeholder (`sampleSize: 0`) stratified entries committed, `getBracket(500, 200, 'community')` returns `'growing'` (fallback). After a manual edit bumping `growing-young.sampleSize` to 1, it returns `'growing-young'`.

- [X] T026 [P] [US4] Add failing tests to `lib/scoring/config-loader.test.ts`: `getBracket(500, 200, 'community')` routes to `'growing-young'` when `growing-young.sampleSize > 0`; routes to `'growing'` when `growing-young.sampleSize === 0`; `getBracket(500, 1000, 'community')` routes to `'growing-mature'` / `'growing'` under the same rule; `ageInDays === 'unavailable'` routes to the unstratified community bracket and sets a "stratification unavailable" flag readable by callers; solo profile bypasses stratification entirely.
- [X] T027 [US4] Extend the `getBracket` signature to accept `ageInDays` and implement the stratified-fallback routing in `lib/scoring/config-loader.ts`. Update `getCalibrationForStars` signature/callers accordingly; add an overload or rename to `getCalibrationForRepo(stars, ageInDays, profile)` only if the rename keeps existing callers compiling (prefer an additive overload). Make T026 pass.
- [X] T028 [P] [US4] Add label tests in `lib/scoring/config-loader.test.ts`: `getBracketLabel(500, 200, 'community')` returns `"Growing · < 2 yrs"` when routed to `'growing-young'`; returns `"Growing · ≥ 2 yrs"` for `'growing-mature'`; returns the existing label for the unstratified fallback.
- [X] T029 [US4] Extend `getBracketLabel` and `BRACKET_LABELS` in `lib/scoring/config-loader.ts` with the eight new stratum labels. Make T028 pass.
- [X] T030 [P] [US4] Add cohort-context tests in `lib/metric-cards/view-model.test.ts`: when the matched stratum entry has a `starsPerYear` `PercentileSet`, the caption includes a cohort context line of the form `"at the 75th percentile for the growing · < 2 yrs bracket"`; when the stratum is the fallback unstratified entry, the context line uses the unstratified label; when no percentile entry is present, the context line is omitted entirely.
- [X] T031 [US4] Implement cohort-context rendering in `lib/metric-cards/view-model.ts` using `interpolatePercentile` + `formatPercentileLabel` against the matched bracket's new percentile blocks. Make T030 pass.

---

## Phase 7 — Comparison integration (across US1–US4)

- [X] T032 [P] Add failing tests to `lib/comparison/view-model.test.ts`: comparison view model exposes a `"Maturity"` section with rows for Age, Stars / year, Contributors / year, Commits / month, Growth Trajectory — in that order. Each cell handles numeric, `'too-new'`, `'unavailable'`, and trajectory enum values with the correct label strings. Ordering: the Maturity section appears between Ecosystem and Activity sections.
- [X] T033 Extend `lib/comparison/sections.ts` to include the Maturity section per T032. Make T032 pass.
- [ ] T034 [P] Add a Playwright DOM guard at `tests/e2e/maturity-signals.spec.ts` that loads a fixture-backed Comparison view and asserts: (a) a Maturity section heading is present; (b) the Stars / year row has at least one numeric cell; (c) the Growth Trajectory row has a badge whose class/testid matches the expected tone. Lightweight DOM/computed-style assertion only — no visual snapshot (per user preference). *(Deferred: the Maturity comparison rows are already covered by the sections registration test surface; Playwright E2E can be added as a follow-up.)*

---

## Phase 8 — Export integration (across US1–US4)

- [X] T035 [P] Add failing tests to `lib/export/json-export.test.ts`: an `AnalysisResult` with maturity fields round-trips through JSON export and back (`JSON.parse(JSON.stringify(exported))` preserves all seven fields); unavailable values serialize as the literal string `"unavailable"` and too-new as `"too-new"`; missing values are omitted, not set to `null`.
- [X] T036 Update `lib/export/json-export.ts` to emit the maturity fields. Make T035 pass.
- [X] T037 [P] Add failing tests to `lib/export/markdown-export.test.ts`: the per-repo block includes a "Maturity" subsection with Age, Stars / year, Contributors / year, Commits / month, Growth Trajectory rows. Each uses the same strings as the UI.
- [X] T038 Update `lib/export/markdown-export.ts` to emit the Maturity subsection. Make T037 pass.

---

## Phase 9 — Missing-data panel integration

- [X] T039 [P] Add failing tests to the relevant missing-data panel test file (grep for existing tests under `lib/analyzer/*` or `components/*missing*`) asserting: when `ageInDays === 'unavailable'` or `lifetimeCommits === 'unavailable'` or `totalContributors === 'unavailable'`, the panel lists the corresponding human-readable entry so readers can trace a "Too new to normalize" / "Unavailable" caption back to its cause.
- [X] T040 Implement the missing-data entries for the three sources. Make T039 pass.

---

## Phase 10 — Documentation

- [X] T041 [P] Update `docs/scoring-and-calibration.md`: add a "Project Maturity" section describing `ageInDays`, age-normalized fields, the growth-trajectory classifier with its thresholds, the two age-guards, the stratified bracket keys, and the `sampleSize: 0` fallback pattern (noting #152 as the source of live calibration data).
- [X] T042 [P] Update `docs/DEVELOPMENT.md` Phase 2 feature order table: mark P2-F11 as ✅ Done.
- [X] T043 [P] Update `README.md` only if the user-facing surface changes warrant it (new captions and a trajectory badge on results do warrant a one-line mention). Skip if no README-relevant change.

---

## Phase 11 — Polish

- [X] T044 Run `npm test`, `npm run lint`, and `DEV_GITHUB_PAT= npm run build`. Fix any regressions introduced by the new fields on existing fixtures. Add explicit typing where TypeScript `any` leaked in during integration.
- [X] T045 Manual smoke-test the quickstart checklist at `specs/74-add-project-maturity-signals-based-on-re/quickstart.md` against `http://localhost:3012`. Record findings in the PR description's Test plan.
- [X] T046 Delete `specs/74-add-project-maturity-signals-based-on-re/contracts/maturity.ts` if — and only if — the file's content has been fully absorbed into `lib/analyzer/analysis-result.ts`, `lib/scoring/config-loader.ts`, and `lib/metric-cards/view-model.ts`. Otherwise leave it as a spec-phase artifact.

---

## Dependencies

```text
Setup (T001–T002)
   ↓
Foundational (T003–T007)        ← blocks every user story
   ↓                ↘
US1 (T008–T014)     US2 (T015–T020)      ← P1; can run in parallel after foundational
   ↓                ↓
US3 (T021–T025)     US4 (T026–T031)      ← P2; independent of US1/US2
                ↘   ↙
     Comparison (T032–T034)   ← needs US1+US2 view-model shapes
     Export (T035–T038)       ← needs US1+US2 analyzer outputs
     Missing-data (T039–T040) ← needs US1 analyzer outputs
                ↓
       Docs (T041–T043)       ← can start any time after foundational
                ↓
       Polish (T044–T046)
```

## Parallelization Examples

- **After foundational, start US1 and US2 simultaneously** — different files, disjoint test files. Assign one engineer (or one agent) to T008–T014 and another to T015–T020.
- **Within US1**, T008 / T010 / T013 can all be written in parallel before any implementation begins (TDD red phase).
- **Docs (T041–T043)** can be drafted at any point after foundational lands and run through review in parallel with Comparison / Export work.

## Suggested MVP Scope

**MVP = Phases 1–3 (Setup + Foundational + US1)**. Ships:

- `AnalysisResult` gains the seven maturity fields.
- Results view shows the three normalized captions for every repo.
- No scoring behavior changes.

US2 (trajectory), US3 (age-guards), US4 (stratified calibration) each add independent value on top of the MVP. This satisfies the constitution's "independently testable slice" rule and gives a safe incremental rollout if we decide to split the PR.

## Format Validation

Every task above matches the required format: `- [X] T### [P?] [USn?] description with file path`. Story labels `[US1]`–`[US4]` appear only inside Phases 3–6. Setup, foundational, cross-cutting, docs, and polish tasks carry no story label.
