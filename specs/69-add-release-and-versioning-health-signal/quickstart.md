# Quickstart: Release Health Scoring (P2-F09 / #69)

One-page map for a developer picking up the implementation mid-flight.

---

## What ships

1. A new `release-health` **presentation tag** peer to `governance` and `community`.
2. Five scored signals: `releaseFrequency`, `daysSinceLastRelease`, `semverComplianceRatio`, `releaseNotesQualityRatio`, `tagToReleaseRatio`.
3. One informational signal: `preReleaseRatio` (never scored).
4. **Activity** cadence sub-factor extended to consider time-since-last-release alongside releases-per-year.
5. **Documentation** score gains three small-weight bonuses (semver / notes / tag-promotion).
6. A **Release Health completeness** readout on the per-repo metric card via `buildLensReadouts()` — uses linear ratio → percentile fallback until #152.
7. **Seven recommendations** with staleness tiering and percentile-gate suppression.
8. JSON + Markdown exports gain the signal set and the completeness readout.

## What does NOT ship

- Per-bracket percentile calibration for the five signals → deferred to **#152**.
- Composite OSS Health Score weight changes → existing 25/25/23/12/15 preserved.
- A new tab, a new composite bucket, or a new CHAOSS score.
- Release artifact health (SBOMs, signatures) → that belongs with Security (P2-F07).
- Historical versioning trend charts → Phase 1 is stateless.

---

## Directory walk (implementation order)

1. `lib/analyzer/queries.ts` — additive GraphQL fields (Contract §8).
2. `lib/analyzer/analysis-result.ts` — `ReleaseHealthResult` interface, optional field on `AnalysisResult` (Contract §1).
3. `lib/analyzer/github-graphql.ts` — map new GraphQL response into `AnalysisResult`.
4. `lib/release-health/semver.ts` — regexes + `detectVersioningScheme()` (Contract §4).
5. `lib/release-health/detect.ts` — `detectReleaseHealth()` pure function (Contract §2). **TDD: unit tests first.**
6. `lib/release-health/completeness.ts` — `computeReleaseHealthCompleteness()` (Contract §3). Mirrors `lib/community/completeness.ts`.
7. `lib/release-health/recommendations.ts` — staleness tier + scheme detection rec generator.
8. `lib/tags/release-health.ts` — tag registry entry (data-model §Tag registry).
9. `lib/scoring/config-loader.ts` — add the 11 new shared-config keys (research.md R6 + Summary table).
10. `lib/activity/score-config.ts` — split cadence sub-factor into frequency + recency (Contract §5).
11. `lib/documentation/score-config.ts` — thread the three release-discipline bonuses (Contract §5).
12. `lib/recommendations/catalog.ts` — seven new entries (data-model §Recommendation catalog).
13. `lib/metric-cards/view-model.ts` — extend `buildLensReadouts()` with `release-health` (Contract §6).
14. `lib/comparison/sections.ts` — release-health rows diffable across repos.
15. `lib/export/json-export.ts` + `lib/export/markdown-export.ts` — add signal set (Contract §9).
16. `components/activity/ReleaseCadenceCard.tsx` — new card (FR-017).
17. `components/documentation/ReleaseDisciplineCard.tsx` — new card (FR-018).
18. `components/tags/TagPill.tsx` — `release-health` variant styling.
19. Wire cards into `ActivityView.tsx` and `DocumentationView.tsx`.
20. `e2e/release-health.spec.ts` — lightweight DOM assertions per memory preference.

---

## Gotchas

- **GraphQL refs denial**: if `refs(refPrefix: "refs/tags/")` returns no data, `totalTags` must be `'unavailable'` and `tagToReleaseRatio` cascades to `'unavailable'` — no REST fallback (research R3, Constitution §II).
- **Pre-release tags are valid semver** — do not filter them out of `semverComplianceRatio` (research Q1).
- **CalVer must suppress the semver-adoption recommendation** — check `versioningScheme !== 'calver'` in `release_adopt_semver` trigger (FR-029).
- **At most one staleness recommendation per repo** — evaluate `never_released → stale → cooling` in order; first match wins (FR-028).
- **`preReleaseRatio` is never a rec trigger** — FR-031.
- **Solo-profile repos**: the existing `detectSoloProjectProfile` may hide Documentation bucket. When Documentation is hidden from the metric card, the `release-health` readout still renders (it's a lens peer, not a bucket).

---

## Testing rubric

- **Unit (Vitest)**: `detect.ts`, `completeness.ts`, `semver.ts`, `recommendations.ts`, `score-config.ts` (activity + documentation extensions), `catalog.ts` (new entries gate-suppressed correctly).
- **Component (Vitest + RTL)**: `ReleaseCadenceCard`, `ReleaseDisciplineCard`, `MetricCard` (lens readout), `TagPill` (release-health variant).
- **E2E (Playwright)**: open a repository with releases, assert `release-health` pill on both cards and completeness readout on the metric card.
- **TDD**: red → green → refactor on every unit. Constitution §XI is NON-NEGOTIABLE.

---

## Release sequencing

This feature is one PR (Phase 2 lens pattern). `docs/DEVELOPMENT.md` flips `P2-F09` to `✅ Done` in the Phase 2 table when the PR merges.
