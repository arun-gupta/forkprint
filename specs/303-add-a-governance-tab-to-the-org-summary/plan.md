# Implementation Plan: Governance tab on org-summary view

**Branch**: `303-add-a-governance-tab-to-the-org-summary` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/303-add-a-governance-tab-to-the-org-summary/spec.md`

## Summary

Surface a new "Governance" tab on the org-summary view, between Documentation and Security, that gathers four already-shipped panels (Org admin activity, Maintainers, Governance file presence, License consistency) into a single risk-first hygiene + policy view. This is a UI / registry change only — no analyzer code, no aggregator code, no scoring impact. The Stale Admins panel — currently injected as an "extra panel" under the Documentation bucket via `OrgBucketContent.tsx` — moves to Governance as part of this PR. `docs/PRODUCT.md` is updated to mention the new tab.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 14 App Router)
**Primary Dependencies**: Next.js 14, React 18, Tailwind CSS, Vitest + React Testing Library, Playwright
**Storage**: N/A (Phase 1 stateless analyzer)
**Testing**: Vitest unit/component tests + Playwright E2E
**Target Platform**: Browser (web app deployed on Vercel)
**Project Type**: web-service / single-app Next.js
**Performance Goals**: No new network calls; tab switch latency unchanged from existing org-summary buckets (panel content is already in memory once aggregation completes)
**Constraints**: Must not change `AnalysisResult` schema, GraphQL queries, REST routes, scoring config, or composite OSS Health Score; must reuse existing panel components verbatim
**Scale/Scope**: One new bucket id, one new tab definition, 4 panel re-homings, 1 tab-content slot in `ResultsShell`, ~3 file edits to wire the tab through `RepoInputClient`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Section | Rule | Status | Notes |
|---|---|---|---|
| I — Tech stack | No new tech | ✅ PASS | Reuses existing Next.js/React/Tailwind. No new dependencies. |
| II — Accuracy policy | No estimation/inference | ✅ PASS | No new metric is computed. Existing panels' "unavailable" handling is preserved. |
| III — Data source rules | GraphQL/REST surface | ✅ PASS | No new API calls; FR-010 forbids it. |
| IV — Analyzer module boundary | Phase-agnostic analyzer | ✅ PASS | No analyzer code touched. |
| V — CHAOSS alignment | Score mappings fixed | ✅ PASS | Composite OSS Health Score unchanged (SC-005). |
| VI — Scoring thresholds | Config-driven | ✅ PASS | No scoring changes. |
| VII — Ecosystem spectrum | Spectrum model | ✅ PASS | Not engaged. |
| VIII — Contribution dynamics honesty | Org affiliation handling | ✅ PASS | Not engaged (no new affiliation logic). |
| IX — Feature scope (YAGNI/KISS) | No speculative work | ✅ PASS | Asymmetry with per-repo view is explicitly deferred (spec Assumptions); deferred per-repo Governance tab is documented as intentional, not a placeholder. |
| X — Security & hygiene | No secrets / per-repo isolation | ✅ PASS | No new env vars, no new error paths. |
| XI — Testing | TDD, Vitest + Playwright | ✅ PASS | Tests will be added for: registry shape (governance bucket position + panel order), `OrgBucketContent` extra-panel migration, `RepoInputClient` org tab list contains Governance, `ResultsShell` renders the governance slot. |
| XII — Definition of Done | Tests pass, lint clean, docs current | ✅ PASS | `docs/PRODUCT.md` updated per FR-014; `docs/DEVELOPMENT.md` not affected (no workflow change); README not affected (no user-facing setup change). |
| XIII — Development workflow | Feature branch, PR with Test Plan | ✅ PASS | Branch already created; PR will include Test Plan section. |

**Result**: All gates pass. No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/303-add-a-governance-tab-to-the-org-summary/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (panel-bucket shape only — no data model changes)
├── quickstart.md        # Phase 1 output (manual verification steps)
├── contracts/           # Phase 1 output (UI contract — bucket/tab additions)
│   └── ui-contract.md
└── checklists/
    └── requirements.md  # Spec-quality checklist (already generated)
```

### Source Code (repository root)

This is a Next.js single-app codebase. The change touches a small, well-bounded set of UI files:

```text
specs/006-results-shell/contracts/
└── results-shell-props.ts                  # Add 'governance' to ResultTabId union

components/app-shell/
├── ResultsShell.tsx                        # Add optional governance prop slot + tab-content div
└── ResultsShell.test.tsx                   # No edit needed (governance is optional)

components/org-summary/
├── panels/registry.tsx                     # Add 'governance' bucket between docs and security; remove migrated panel ids from contributors/documentation buckets
└── OrgBucketContent.tsx                    # Move StaleAdminsPanel injection from bucketId === 'documentation' to bucketId === 'governance'

components/repo-input/
└── RepoInputClient.tsx                     # Add governance entry to orgInventoryTabs; pass <OrgBucketContent bucketId="governance" .../> as governance prop

lib/search/
└── search-index.ts                         # Add governance: () => [] to EXTRACTORS (per-repo search; no governance content at repo level)

docs/
└── PRODUCT.md                              # Note the new Governance tab on the org-summary view (FR-014)

# Tests (new or extended):
components/org-summary/panels/
└── registry.test.tsx                       # NEW — assert governance bucket present, position, panel order, no duplicates across buckets
components/org-summary/
└── OrgBucketContent.test.tsx               # NEW — extra-panel injection moved from documentation to governance
components/app-shell/
└── ResultsShell.test.tsx                   # EXTEND — governance content renders when governance prop + governance tab provided
e2e/
└── governance-tab.spec.ts                  # NEW — opens org-summary, clicks Governance tab, asserts the four migrated panels are present and not present elsewhere
```

**Structure Decision**: No new directories. All edits live in three existing UI subtrees (`components/app-shell/`, `components/org-summary/`, `components/repo-input/`), the shared contract file, and the search index. Tests follow each modified file's existing co-located convention.

## Complexity Tracking

> No constitution violations. Section intentionally empty.

## Phase 0 — Research summary (see research.md)

Key questions resolved:

1. **Should the Stale Admins panel become a registry entry or stay an "extra panel" injection?** → Keep it as an injection. The panel has a different prop signature (`org`, `ownerType`, optional `sectionOverride`) from registry-driven panels (which take `panel: AggregatePanel<T>` from `view.panels[panelId]`). Promoting it would force either a registry-shape change or an awkward adapter. Keeping the injection contained to one branch in `OrgBucketContent` is the smaller, more local change — the spec only requires that the panel ends up under Governance, not how.
2. **Should `governance` be a required or optional prop on `ResultsShell`?** → Optional. The per-repo tab list does not include Governance, and per-repo callers do not pass governance content; making it optional avoids touching every per-repo ResultsShell test. Render the governance content slot only when the tab is present in `tabs`.
3. **Does adding `'governance'` to `ResultTabId` ripple into per-repo search?** → Yes — `lib/search/search-index.ts` exhaustively maps `Record<ResultTabId, Extractor>`. Add `governance: () => []` (returns nothing because per-repo search has no governance content; org-summary doesn't go through per-repo search). This keeps the type exhaustive without coupling to org-only data.
4. **Is `docs/PRODUCT.md` enumerating per-bucket panel mappings today?** → No (verified via grep: PRODUCT.md does not list panel-to-bucket assignments). FR-014 is satisfied by adding a brief note in the org-summary section that the org-summary view now exposes a Governance tab covering org-level hygiene/policy panels (Org admin activity, Maintainers, Governance file presence, License consistency).
5. **Does `OrgSummaryView.tsx` (the alternate render path used in some flows) need an edit?** → It already filters buckets by `bucketPanels.length > 0`, so the new `governance` bucket appears automatically once any of the migrated registry-driven panels (`maintainers`, `governance`, `license-consistency`) has a view-model entry. The Stale-admins extra panel does not flow through `OrgSummaryView` (only `OrgBucketContent` injects it), so no additional change is needed in `OrgSummaryView.tsx`.

## Phase 1 — Design & contracts

### Data model

This feature adds **no new entities, no new fields, no new state machines**. The only data-shape change is a UI registry (`PANEL_BUCKETS`) being extended with one entry and three other entries having a panel id removed from their `panels` array. See `data-model.md` for the registry diff.

### Contracts

This feature has no API/CLI contracts. Its "contract" is the UI surface: the tab strip, the tab content, the panel order. See `contracts/ui-contract.md` for the precise tab + bucket diff.

### Quickstart

Manual verification steps for reviewers and the PR Test Plan live in `quickstart.md`.

## Re-evaluation — post-design Constitution Check

Re-checked after Phase 0 + Phase 1 design. No design decision introduces new constitution risk:

- The `governance: () => []` extractor (decision 3) is the smallest possible exhaustive-map satisfaction — it does not add a real per-repo "governance" search surface, which would conflict with the spec's per-repo / org-summary asymmetry.
- The optional `governance` prop on `ResultsShell` (decision 2) is consistent with §IX KISS — no global sweep through unrelated tests.
- The "extra panel" injection retained (decision 1) is a deliberate YAGNI choice — promoting Stale Admins to a registry entry would be tangential to issue #303 and is the kind of speculative refactor §IX rules out.

All gates remain ✅ PASS.
