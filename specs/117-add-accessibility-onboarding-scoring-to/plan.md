# Implementation Plan: P2-F08 Accessibility & Onboarding Scoring

**Branch**: `117-add-accessibility-onboarding-scoring-to` | **Date**: 2026-04-20 | **Spec**: [spec.md](./spec.md)

## Summary

Add an `onboarding` tag pill that cross-cuts the Documentation and Contributors tabs, surfacing nine signals (five net-new) that describe how welcoming a repo is to newcomers. The three Contributors-tab signals (good first issues, dev environment setup, new contributor PR acceptance rate) feed into the Community completeness score as new signal keys. The two Documentation-tab signals (issue template, PR template) already exist in `FILE_WEIGHTS` — only their `onboarding` tag membership is new. No new top-level score badge or composite weight is introduced.

## Technical Context

**Language/Version**: TypeScript 5, Next.js 14 (App Router)  
**Primary Dependencies**: GitHub GraphQL API, Vitest, React Testing Library, Playwright  
**Storage**: N/A (stateless)  
**Testing**: Vitest (unit/integration), Playwright (E2E)  
**Target Platform**: Vercel (Next.js serverless)  
**Project Type**: Web application  
**Performance Goals**: No additional API requests beyond the existing 1–3 per repo  
**Constraints**: All new GraphQL fields must fit within existing query budget; no new top-level API call allowed  
**Scale/Scope**: Extends existing per-repo analysis pipeline

## Constitution Check

| Rule | Status | Notes |
|---|---|---|
| §II Accuracy — no estimation | PASS | `authorAssociation` is GitHub-native; file probes return binary present/absent; acceptance rate uses real PR counts |
| §II Missing data marked unavailable | PASS | All four new fields typed as `T \| Unavailable`; sample floor enforced for acceptance rate |
| §IV Analyzer module boundary | PASS | All extraction logic in `lib/analyzer/analyze.ts`; no Next.js imports |
| §VI Thresholds in config | PASS | `newContributorAcceptanceFloor` and `newContributorMinSampleSize` in `lib/community/score-config.ts` |
| §IX YAGNI | PASS | No abstractions beyond what FR-001–FR-020 require; Gitpod is bonus-only (no separate score) |
| §X Security | PASS | No secrets; token handling unchanged |
| §XI TDD | REQUIRED | Tests written before implementation in each task |

## Project Structure

### Documentation (this feature)

```text
specs/117-add-accessibility-onboarding-scoring-to/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── onboarding-signals.ts
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (touch points in implementation order)

```text
lib/
├── analyzer/
│   ├── queries.ts                    # new GraphQL probes + search vars
│   ├── analysis-result.ts            # 4 new fields
│   └── analyze.ts                    # signal extraction
├── community/
│   ├── completeness.ts               # 3 new CommunitySignalKey entries + Gitpod bonus
│   └── score-config.ts               # newContributorAcceptanceFloor threshold
├── tags/
│   ├── onboarding.ts                 # new file — ONBOARDING_* sets + isOnboardingItem()
│   └── tab-counts.ts                 # onboarding branch in matching functions
├── recommendations/
│   └── catalog.ts                    # CTR-8, CTR-9, CTR-10
├── comparison/
│   └── sections.ts                   # 3 new rows in contributors section
└── export/
    ├── json-export.ts                # onboarding block
    └── markdown-export.ts            # onboarding signals table

components/
└── contributors/
    ├── OnboardingPane.tsx            # new component
    ├── OnboardingPane.test.tsx       # new test
    └── ContributorsView.tsx          # wire OnboardingPane in
```
