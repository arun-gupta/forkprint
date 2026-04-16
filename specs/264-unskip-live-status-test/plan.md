# Implementation Plan: Unskip the FR-016a "live per-repo status list" test

**Branch**: `264-investigate-skipped-test-per-repo-status` | **Date**: 2026-04-16 | **Spec**: [spec.md](./spec.md)
**Issue**: #264
**Input**: Feature specification from `./spec.md`

## Summary

Replace the `it.skip(...)` block at `components/shared/hooks/useOrgAggregation.test.tsx:45` with an `it(...)` that reliably asserts FR-016a's live-status contract (first repo `in-progress` while second is still `queued` under `concurrency: 1`), without changing `useOrgAggregation` production behavior. Fix is test-side only: restructure the async flow around `renderHook` + deferred promises so React Testing Library can observe the intermediate reducer state between two dispatch boundaries.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 20+ (Next.js 16+, App Router)
**Primary Dependencies**: React, `@testing-library/react` (`renderHook`, `act`, `waitFor`), Vitest — all already in `package.json`
**Storage**: N/A (stateless hook; test uses injected deferred promises)
**Testing**: Vitest with React Testing Library — `npm test components/shared/hooks/useOrgAggregation.test.tsx`
**Target Platform**: Node test runtime (jsdom environment)
**Project Type**: Web application — Next.js frontend; this change lives in the shared React hooks test surface
**Performance Goals**: Test completes in under 2 seconds; zero flakes in a 20× loop (SC-002)
**Constraints**: No new dependencies (FR-004); no production-code change unless proven necessary (FR-002); no changes to the two existing non-skipped tests in the same file (FR-005)
**Scale/Scope**: One `it(...)` block, one test file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **§I Technology Stack** — no new tech. Uses Vitest + RTL already in the stack. ✅
- **§II Accuracy Policy** — not applicable; this is a test-infrastructure change with no user-facing metrics. ✅
- **§III Data Source Rules** — not applicable; test injects its own dispatcher stub. No GraphQL/REST calls. ✅
- **§IV Analyzer Module Boundary** — not applicable; `useOrgAggregation` is a Phase 1 React hook, not the analyzer module. No analyzer code touched. ✅
- **§IX Feature Scope (YAGNI, KISS)** — the fix is a narrow test-side restructure; no new abstractions, no generalization. ✅
- **§X Security & Hygiene** — no secrets, no tokens. ✅
- **§XI Testing** — this PR *increases* test coverage by un-skipping a test. TDD applies in the sense that we are asserting existing behavior; no production-code change is planned. ✅
- **§XII Definition of Done** — tests pass, lint clean, no TODOs. README/docs/DEVELOPMENT.md do not need updates (no user-facing or setup change). PR Test Plan is the signoff surface. ✅

No violations. Proceed.

## Project Structure

### Documentation (this feature)

```text
specs/264-unskip-live-status-test/
├── plan.md                   # This file
├── spec.md                   # Phase -1 — approved
├── research.md               # Phase 0 — root-cause investigation
├── quickstart.md             # Phase 1 — how to run the fixed test locally
├── checklists/
│   └── requirements.md       # Spec-quality checklist (created by /speckit.specify)
└── tasks.md                  # Phase 2 — will be created by /speckit.tasks
```

No `data-model.md` or `contracts/` files: this feature introduces no new entities and exposes no new public interface. Per `/speckit.plan` guidance ("Skip if project is purely internal"), those artifacts are omitted.

### Source Code (repository root)

```text
components/shared/hooks/
├── useOrgAggregation.ts              # Hook under test — NOT modified (test-side fix)
└── useOrgAggregation.test.tsx        # SINGLE file modified:
                                      #   line 45 `it.skip(...)` → `it(...)` with restructured async flow
```

**Structure Decision**: Single-file test change. The investigation in Phase 0 confirmed the fix is test-side; no other files change. Adjacent fixtures (`lib/org-aggregation/queue.ts`, `lib/org-aggregation/view-model.ts`, `lib/config/org-aggregation.ts`) are read to understand behavior but not modified.

## Complexity Tracking

> No constitutional violations. Table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| —         | —          | —                                   |
