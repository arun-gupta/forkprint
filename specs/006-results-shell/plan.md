# Implementation Plan: Results Shell

**Branch**: `006-results-shell` | **Date**: 2026-03-31 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/006-results-shell/spec.md`

## Summary

Introduce a stable application shell for RepoPulse so analysis is submitted once and then explored through tabs instead of stacking each view vertically on the page. The shell adds a branded header with a GitHub repo link, a persistent analysis panel, and a result workspace that can host current and future views, starting with an Overview tab and an Ecosystem Map tab that will later absorb the paused `P1-F05` work.

## Technical Context

**Language/Version**: TypeScript 5, React 19, Next.js 16.2 (App Router)  
**Primary Dependencies**: Tailwind CSS 4, Vitest 4, React Testing Library 16, Playwright 1.58  
**Storage**: Stateless; no database or persistent server storage  
**Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E)  
**Target Platform**: Vercel-hosted Next.js web app, modern desktop/mobile browsers  
**Project Type**: Web application with client-side stateful analysis UI  
**Performance Goals**: Switching tabs must be instant and must not trigger additional analysis requests; shell remains usable on desktop and mobile  
**Constraints**: Preserve current analysis flow and result state; no extra API calls on tab switches; shell must host current and future views without introducing a separate route dependency yet  
**Scale/Scope**: Home page shell layout, tab state, header/banner, stable analysis panel, and placeholder result views for 1–6 analyzed repos

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| I — Phase 1 stack | PASS | Uses current Next.js/React/Tailwind stack only |
| IV — Analyzer boundary | PASS | No analyzer-module changes required |
| IX — Feature contracts | PASS | Shell is a new behavioral feature that hosts later view features without replacing them |
| X — Security & hygiene | PASS | No change to token handling or exposure rules |
| XI — TDD mandatory | PASS | Layout/tab tests will be written before implementation in tasks phase |
| XII / XIII — Manual checklist required | PASS | `checklists/manual-testing.md` is created for this feature |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/006-results-shell/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── results-shell-props.ts
│   └── tab-ui.md
├── checklists/
│   ├── requirements.md
│   └── manual-testing.md
└── tasks.md
```

### Source Code

```text
app/
└── page.tsx                                  ← MODIFIED: render app shell instead of bare page stack

components/
├── app-shell/
│   ├── ResultsShell.tsx                     ← NEW: header, analysis panel slot, tab workspace
│   ├── ResultsShell.test.tsx                ← NEW: shell and tab behavior tests
│   ├── ResultsTabs.tsx                      ← NEW: tab navigation and placeholder content
│   └── ResultsTabs.test.tsx                 ← NEW: tab-switch and placeholder tests
└── repo-input/
    ├── RepoInputClient.tsx                  ← MODIFIED: provide shell-friendly analysis state and tab content
    └── RepoInputClient.test.tsx             ← MODIFIED: shell integration coverage

lib/
└── results-shell/
    └── tabs.ts                              ← NEW: tab definitions and helper metadata

e2e/
└── results-shell.spec.ts                    ← NEW: shell/header/tab navigation scenarios
```

## Implementation Sequence

### Phase 0 — Research

1. Decide how to split responsibilities between the shell container and `RepoInputClient`
2. Decide which tabs are populated versus placeholder-only in this feature
3. Decide the header/banner layout so the GitHub repo link is clear and stable on desktop/mobile

### Phase 1 — Design

4. Define the shell layout regions: header, analysis panel, result tabs, and active view area
5. Define tab metadata and placeholder behavior for unimplemented views
6. Create the manual testing checklist for header, GitHub link, stable analysis panel, and tab switching
7. Update the product/development docs to reflect the new feature ordering

### Phase 2 — Implementation Preview

8. Add shell components and tab definitions
9. Move the current analysis flow into a stable shell layout
10. Render placeholder tabs and a populated Overview tab without changing the API contract
11. Keep the shell ready to host `Ecosystem Map` content when `P1-F05` resumes
12. Add unit and E2E coverage for tab switching and non-reloading behavior

## Complexity Tracking

No constitution violations. No complexity justification required.
