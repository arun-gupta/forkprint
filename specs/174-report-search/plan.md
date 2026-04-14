# Implementation Plan: Report Search

**Branch**: `174-report-search` | **Date**: 2026-04-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/174-report-search/spec.md`

## Summary

Add a free-text search bar to the report toolbar that searches across all 8 tab contents, shows match count badges on tab buttons, highlights matching text in the active tab with `<mark>` styling, and displays a summary of total matches. The search is data-driven — it builds a searchable index from the analysis results rather than DOM-scanning, using case-insensitive substring matching with 300ms debounce.

## Technical Context

**Language/Version**: TypeScript 5.x (Next.js 16+)
**Primary Dependencies**: React, Tailwind CSS
**Storage**: N/A (stateless, in-memory only)
**Testing**: Vitest + React Testing Library
**Target Platform**: Web (desktop + mobile)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Search results render within 300ms of debounce completion
**Constraints**: No new dependencies; purely client-side feature
**Scale/Scope**: 8 tabs, typically 1-10 repos per analysis

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| I. Technology Stack | PASS | No new dependencies; uses React, TypeScript, Tailwind CSS |
| II. Accuracy Policy | PASS | Search is a UI feature — does not affect data display or metrics |
| IV. Analyzer Module Boundary | PASS | Search is purely a UI component; does not touch the analyzer module |
| IX.6 YAGNI | PASS | Feature is explicitly requested via issue #172 |
| IX.7 Keep It Simple | PASS | Data-driven text index approach is the simplest viable solution |
| IX.8 No over-engineering | PASS | No speculative abstractions |
| X. Security & Hygiene | PASS | No credentials, no external API calls |
| XI. Testing (TDD) | MUST FOLLOW | Tests written first, then implementation |

## Project Structure

### Documentation (this feature)

```text
specs/174-report-search/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── report-search-props.ts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
components/
├── search/
│   ├── ReportSearchBar.tsx      # Search input + summary display
│   └── SearchHighlighter.tsx    # Text highlighting wrapper component
├── app-shell/
│   ├── ResultsShell.tsx         # Modified: pass search state to tabs
│   └── ResultsTabs.tsx          # Modified: show badge counts on tab buttons
└── repo-input/
    └── RepoInputClient.tsx      # Modified: wire up search state + toolbar

lib/
└── search/
    ├── search-index.ts          # Build searchable text index from AnalysisResult[]
    └── search-engine.ts         # Case-insensitive substring match + count per tab

__tests__/
└── components/
    └── search/
        ├── ReportSearchBar.test.tsx
        ├── SearchHighlighter.test.tsx
        ├── search-index.test.ts
        └── search-engine.test.ts
```

**Structure Decision**: New `components/search/` and `lib/search/` directories for search-specific components and logic. This follows the existing project pattern (e.g., `components/export/`, `lib/export/`). Modifications to existing files in `components/app-shell/` and `components/repo-input/`.

## Complexity Tracking

> No constitution violations — table not needed.
