# Implementation Plan: Release Health Scoring

**Branch**: `69-add-release-and-versioning-health-signal` | **Date**: 2026-04-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/69-add-release-and-versioning-health-signal/spec.md`

## Summary

Add a **Release Health lens** over the existing scored buckets, mirroring the Governance (P2-F04, #116) and Community (P2-F05, #70) precedents. Five net-new signals are detected and scored inside their most appropriate existing host bucket — `releaseFrequency` and `daysSinceLastRelease` extend the Activity `cadence` sub-factor; `semverComplianceRatio`, `releaseNotesQualityRatio`, and `tagToReleaseRatio` become small-weight bonuses inside Documentation. `preReleaseRatio` is informational only and never scores. A new `release-health` presentation tag is applied to rows and cards on the Activity and Documentation tabs. A derived "Release Health completeness" readout is surfaced on the per-repo metric card via `buildLensReadouts()`, peer to the Community and Governance lens readouts, using a **linear ratio → percentile fallback** until the calibration refresh in #152 adds per-bracket percentiles. Recommendations honor the existing `RECOMMENDATION_PERCENTILE_GATE` and differentiate three staleness tiers.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16+)
**Primary Dependencies**: Next.js (App Router), React, Tailwind CSS
**Storage**: N/A (stateless, on-demand analysis per Constitution §I)
**Testing**: Vitest + React Testing Library (units and components); Playwright (E2E)
**Target Platform**: Vercel serverless (web app)
**Project Type**: Web application (single Next.js app under repository root)
**Performance Goals**: Per SC-003 — no additional GraphQL round-trip per repo (release-health data is fetched via additive field selection on the existing `REPO_COMMIT_AND_RELEASES_QUERY` pass); per-repo request count stays within the 1–3 budget.
**Constraints**: Constitution §II Accuracy Policy — every numeric signal uses `"unavailable"` at the field level and `"Insufficient verified public data"` at the completeness-readout level whenever inputs are missing; no estimation. Constitution §VI — all new thresholds (semver regex, substantive-notes floor, staleness tier cutoffs, per-signal weights) live in shared scoring config.
**Scale/Scope**: One-shot per-repo analysis; scales to 4-repo comparison sessions. Releases sample bounded at 100 most recent per repo (matches existing `releases(first: 100)` cap in the shipped GraphQL query).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Rule | Status | Notes |
|---|---|---|---|
| I | Technology Stack | ✅ Pass | No new runtime dependencies — reuses Next.js, TypeScript, Tailwind, Vitest, Playwright. |
| II | Accuracy Policy | ✅ Pass | Every net-new signal derives from a single GraphQL-verifiable field (release `tagName` / `body` / `isPrerelease` / `publishedAt`, refs `totalCount`). FR-003, FR-004, FR-008, FR-020, FR-021 enforce `unavailable` / `Insufficient verified public data` whenever inputs are missing. `preReleaseRatio` is informational only and never substitutes for another metric. |
| III | Data Source Rules | ✅ Pass | Release-health data is additive field selection on the existing Pass-1 GraphQL query (no new round-trip). Per-repo request count remains 1–3. SC-003 enforces this. |
| IV | Analyzer Module Boundary | ✅ Pass | Detection lives under `lib/analyzer/`; scoring logic inside the per-bucket `score-config.ts` modules; lens presentation under `lib/tags/` and `components/`; completeness under a new `lib/release-health/` module (parallel to `lib/community/`). No Next.js-only imports inside the analyzer layer. |
| V | CHAOSS Alignment | ✅ Pass | **Release Health is a lens, not a CHAOSS category.** FR-014 and FR-019 explicitly forbid a new composite bucket. Existing Activity / Responsiveness / Sustainability / Documentation / Security weights (25 / 25 / 23 / 12 / 15) remain unchanged. No constitution amendment required. |
| VI | Scoring Thresholds | ✅ Pass | Semver regex, substantive-notes floor, per-signal weights, `RECOMMENDATION_PERCENTILE_GATE`, and staleness tier cutoffs all live in shared scoring config (`lib/scoring/config-loader.ts` and the existing per-bucket `score-config.ts` modules). No hardcoded thresholds inside components or scoring functions. |
| VII | Ecosystem Spectrum | ✅ N/A | Unchanged by this feature. |
| VIII | Contribution Dynamics Honesty | ✅ N/A | No contributor org affiliation claims introduced. |
| IX | Feature Scope Rules (YAGNI) | ✅ Pass | Scope is strictly the 5 scored detections + 1 informational signal + lens tagging + completeness readout + 8 recommendations with tiering. No speculative infrastructure (no new tab, no calibration payload changes — deferred to #152, no new GraphQL pass, no historical snapshots). |
| X | Security & Hygiene | ✅ N/A | No new secrets or external services. Token handling unchanged. |
| XI | Testing (TDD NON-NEGOTIABLE) | ✅ Pass | Each detection gets a unit test before implementation. Lens tagging gets a component test. Completeness readout gets a view-model test. Recommendation tier logic gets unit coverage. Playwright coverage extends existing activity/documentation scenarios to assert the `release-health` pill and the Release Cadence / Release Discipline cards. |
| XII | Definition of Done | ✅ Pass | PR body `## Test plan` section carries the manual testing checklist (per constitution v1.2 — in-repo checklist file dropped). |
| XIII | Development Workflow | ✅ Pass | Feature branch, spec-first, PR test plan, DEVELOPMENT.md update on completion (Phase 2 table marks P2-F09 as `✅ Done`). |

**Gate result**: PASS. No violations requiring the Complexity Tracking section.

## Project Structure

### Documentation (this feature)

```text
specs/69-add-release-and-versioning-health-signal/
├── plan.md                             # This file
├── spec.md                             # Feature spec (approved)
├── research.md                         # Phase 0 output
├── data-model.md                       # Phase 1 output
├── quickstart.md                       # Phase 1 output
├── contracts/
│   └── release-health-scoring.md       # Phase 1 output
├── checklists/
│   └── requirements.md                 # Already created (PASS)
└── tasks.md                            # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
lib/
├── analyzer/
│   ├── queries.ts                      # Extended: additive fields on the releases node — tagName, body, isPrerelease — and refs totalCount
│   ├── github-graphql.ts               # Extended: map new release fields + tag count into AnalysisResult
│   └── analysis-result.ts              # Extended: ReleaseHealthResult interface and releaseHealthResult field
├── tags/
│   ├── governance.ts                   # Existing — reference pattern (pill only)
│   ├── community.ts                    # Existing — reference pattern (pill + completeness split)
│   └── release-health.ts               # NEW — mirrors community.ts (tag registry for Activity / Documentation rows)
├── release-health/
│   ├── detect.ts                       # NEW — pure functions computing the five ratios + preReleaseRatio from the releases array
│   ├── semver.ts                       # NEW — semver + CalVer regex matchers; exported to score-config and recommendations
│   ├── completeness.ts                 # NEW — computeReleaseHealthCompleteness(result) + linear fallback
│   └── recommendations.ts              # NEW — staleness tier + scheme detection for rec generation
├── activity/
│   ├── score-config.ts                 # Extended: cadence sub-factor reads daysSinceLastRelease in addition to releases12mo
│   └── view-model.ts                   # Extended: Release Cadence card data shape
├── documentation/
│   └── score-config.ts                 # Extended: three small-weight bonus signals (semver / notes / tag-promotion)
├── scoring/
│   └── config-loader.ts                # Extended: new shared config values — semver regex, CalVer regex, substantive-notes floor, staleness tier cutoffs, per-signal weights
├── metric-cards/
│   └── view-model.ts                   # Extended: buildLensReadouts() adds a 'release-health' readout peer to community/governance
├── recommendations/
│   └── catalog.ts                      # Extended: 8 new entries (never-released, stale >24mo, cooling, adopt-semver, adopt-any-scheme, notes-below-floor, promote-tags; gate-suppressed when host percentile clears RECOMMENDATION_PERCENTILE_GATE)
├── comparison/
│   └── sections.ts                     # Extended: release-health rows diffable across repos (flat-schema compatible with P1-F06)
└── export/
    ├── json-export.ts                  # Extended: releaseHealthResult + completeness + preReleaseRatio
    └── markdown-export.ts              # Extended: Release Health section mirroring Community format

components/
├── tags/
│   └── TagPill.tsx                     # Existing — add 'release-health' variant styling (parallel to governance/community)
├── activity/
│   └── ReleaseCadenceCard.tsx          # NEW — renders frequency / recency / pre-release usage with the release-health pill
├── documentation/
│   └── ReleaseDisciplineCard.tsx       # NEW — three rows (semver / notes / tag-promotion) with the release-health pill
└── metric-cards/
    └── MetricCard.tsx                  # Existing — surfaces the Release Health completeness readout via buildLensReadouts() output

e2e/
└── release-health.spec.ts              # NEW — Playwright E2E covering the lens pill, both cards, and the completeness readout
```

**Structure Decision**: Single Next.js app (the existing Phase 1 structure). No new packages, no new framework boundaries — additive extensions only, in the directories the constitution already permits. `lib/release-health/` mirrors `lib/community/` so the mental model for future lenses stays consistent. The analyzer module boundary (Constitution §IV) is preserved: detection inside `lib/analyzer/` and `lib/release-health/`, scoring inside per-bucket `score-config.ts`, presentation inside `components/` and `lib/tags/`.

## Complexity Tracking

No violations. Section intentionally left empty.
