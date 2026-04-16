# Implementation Plan: Stale Admin Detection

**Branch**: `287-detect-stale-admin-accounts-in-organizat` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/287-detect-stale-admin-accounts-in-organizat/spec.md`

## Summary

Detect and surface stale organization admins on RepoPulse's org-aggregation view. On the baseline OAuth path (minimum scope `public_repo`, unchanged default) the feature enumerates the org's **publicly-listed** admins, resolves each admin's most-recent public activity (public events with last-commit-to-org-repo as fallback), and classifies them as `active` / `stale` / `no public activity` / `unavailable` against a shared-config threshold drawn from the fixed set **{30, 60, 90, 180, 365}** days, default 90. A new `StaleAdminsPanel` slots into the existing org-summary panel registry next to `GovernancePanel`.

An opt-in **landing-page checkbox** adds a session-only elevated scope (`read:org`) to the OAuth authorization request. When the signed-in user is also a member of the analyzed org, the elevated grant widens the admin list to include concealed members. The elevated path holds no new state beyond the existing in-memory token — the effective scope is just a property of the already-in-memory grant. A baseline/elevated mode indicator renders inside the panel itself.

The feature does not feed the composite OSS Health Score; it ships as a governance observation surface alongside the score, consistent with parent issue #285.

## Technical Context

**Language/Version**: TypeScript 5.x on Next.js 14+ (App Router), React 18
**Primary Dependencies**: existing — `@octokit/*` is not used (raw `fetch` against `api.github.com`); Tailwind CSS; Chart.js (not needed here); `vitest` + `@testing-library/react` for unit, `@playwright/test` for E2E
**Storage**: none (stateless per Constitution I Phase 1). OAuth token held in React context in-memory only
**Testing**: `vitest` for pure logic and React components; `@playwright/test` for E2E on the landing page and the org view
**Target Platform**: Vercel-deployed Next.js web app
**Project Type**: web (Next.js App Router with co-located API routes)
**Performance Goals**: no measurable change to existing org-aggregation analyze-time. Stale-admin fetches run once per analysis (1 call for admin list + 1 call per admin for public events; last-commit fallback via existing GraphQL only when needed). Fetches are per-admin isolated and run in parallel with a bounded concurrency cap.
**Constraints**: per-admin error isolation (Constitution X.5); no new persistent state; no token logged; 30/60/90/180/365 threshold values only; no inline threshold literals in classification or rendering code (Constitution VI.1)
**Scale/Scope**: typical org: tens of admins. Hard upper bound: all admins a single API page returns (GitHub paginates at 100); pagination is handled. No silent truncation (spec edge case).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Note |
|---|---|---|
| **I.** Stack constraints (Next.js / Tailwind / Chart.js; no new tech) | PASS | No new dependencies |
| **II.1** Every metric from verified GitHub API response | PASS | Admin list from REST `/orgs/{org}/members?role=admin`; activity from REST `/users/{user}/events/public` and existing GraphQL for last-commit fallback |
| **II.2** No estimation / inference / fabrication | PASS | Classification is a deterministic timestamp comparison; "no public activity" state is a literal outcome, not a guess |
| **II.3** Missing fields marked `"unavailable"`, not hidden/zeroed | PASS | `unavailable` is a first-class classification state (FR-003, FR-009) |
| **II.7** `Elephant Factor` / single-vendor experimental exception | N/A | Not an attribution metric |
| **III.1–3** Primary GraphQL + targeted REST | PASS | REST used where GraphQL does not expose the admin list — a documented exception, not a pattern |
| **III.4** OAuth-only, in-memory token, `public_repo` minimum | PASS | **Minimum** scope remains `public_repo`; elevated `read:org` is opt-in and held in-memory only. Default path unchanged for users who do not opt in (FR-014, FR-015) |
| **III.5** No server-side `GITHUB_TOKEN` | PASS | All calls use the user's OAuth token |
| **III.7** Token never logged / in URLs | PASS | Same token-handling path; no new logging surface |
| **IV.** Analyzer module framework-agnostic | PASS | Pure classification logic lives in `lib/governance/stale-admins.ts` with zero Next.js / React / OAuth-flow imports; the OAuth & UI glue lives in `app/` and `components/` |
| **V.** CHAOSS category mapping | N/A | Does not introduce or alter a CHAOSS category |
| **VI.** Thresholds in shared config | PASS | `STALE_ADMIN_THRESHOLD_DAYS` + allowed-value whitelist live in `lib/config/governance.ts`; classification and tooltip both read from it |
| **VII.** Ecosystem spectrum | N/A | No ecosystem-profile changes |
| **VIII.** Contribution dynamics honesty | PASS | Spec is explicit that baseline path sees publicly-listed admins only; concealed admins are not inferred. Mode indicator discloses which view produced the list (FR-016) |
| **IX.1–8** Scope rules + YAGNI + simplicity | PASS | Feature stops at surfacing the signal — no scoring integration (FR-012). Opt-in affordance is worded generically but **only** bound to stale-admin detection in this spec (Assumption). No speculative future-feature scaffolding |
| **X.** Security & hygiene | PASS | No new secrets; elevated scope lives in the same in-memory token; per-admin error isolation preserved |
| **XI.** TDD | PASS | Plan includes unit tests for classifier, config validator, aggregator, panel, and elevated-scope login route; E2E for both modes. Tests authored before implementation |
| **XII./XIII.** Definition of Done + workflow | PASS | Standard PR with `## Test plan`; `docs/DEVELOPMENT.md` gets a row; no README change required since this is an internal panel on an existing page |

**Gate result**: PASS. No violations to justify in Complexity Tracking.

A formal constitution amendment was considered for Section III.4 to document the elevated-scope path as a first-class capability. The spec treats Section III.4's word *minimum* as permissive (baseline remains `public_repo`; elevation is explicit and user-consented). Proceeding on that reading; if reviewers want an explicit amendment before merge, it can be folded into the PR as a separate commit.

## Project Structure

### Documentation (this feature)

```text
specs/287-detect-stale-admin-accounts-in-organizat/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── stale-admin-types.ts     # TypeScript contract for the StaleAdminsSection model
│   └── github-endpoints.md      # REST + GraphQL endpoints this feature calls
├── checklists/
│   └── requirements.md  # Spec quality checklist (already written)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
lib/
├── governance/
│   ├── completeness.ts              # existing
│   ├── stale-admins.ts              # NEW — pure classifier; no Next.js/React imports
│   └── stale-admins.test.ts         # NEW — vitest unit tests
├── config/
│   ├── org-aggregation.ts           # existing
│   ├── governance.ts                # NEW — STALE_ADMIN_THRESHOLD_DAYS + allowed-values + validator
│   └── governance.test.ts           # NEW
├── analyzer/
│   └── github-rest.ts               # EXTENDED — add fetchOrgAdmins, fetchUserPublicEvents, fetchUserLatestCommitInOrg (GraphQL helper)
└── org-aggregation/
    └── aggregators/
        ├── index.ts                 # EXTENDED — export staleAdminAggregator
        ├── stale-admins.ts          # NEW — aggregator that calls REST helpers + classifier
        └── stale-admins.test.ts     # NEW

components/
├── auth/
│   ├── AuthGate.tsx                 # EXTENDED — render elevated-scope checkbox on unauthenticated branch
│   └── SignInButton.tsx             # EXTENDED — propagate elevated intent via query param
└── org-summary/
    └── panels/
        ├── registry.tsx             # EXTENDED — register StaleAdminsPanel
        └── StaleAdminsPanel.tsx     # NEW — renders admin rows, mode indicator, threshold tooltip, N/A

app/
└── api/
    └── auth/
        └── login/route.ts           # EXTENDED — accept ?elevated=1, build scope string accordingly

e2e/
└── stale-admins.spec.ts             # NEW — baseline path + elevated-scope-request path

docs/
└── DEVELOPMENT.md                   # EXTENDED — Phase 2 feature-order table (P2-F?? Stale Admin Detection)
```

**Structure Decision**: Extend existing Next.js App Router layout; no new top-level directories. Pure classification logic is segregated under `lib/governance/` so it stays framework-agnostic (Constitution IV). UI and OAuth glue are co-located with their siblings. No analyzer-module changes beyond the existing `github-rest.ts` REST helper file.

## Complexity Tracking

No constitution violations. Table intentionally left empty.
