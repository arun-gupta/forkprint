# Implementation Plan: Export

**Branch**: `030-export` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/030-export/spec.md`

## Summary

Users can export analysis results as a timestamped JSON file, a timestamped CHAOSS-aligned Markdown report, and a shareable URL that encodes the repo list as query params. All three exports are client-side only — no server involvement. Export controls appear in the results view and are disabled until results are available.

## Technical Context

**Language/Version**: TypeScript 5  
**Primary Dependencies**: React 19, Next.js 16.2 (App Router), Tailwind CSS 4  
**Storage**: None — all export is ephemeral browser-side (Blob download / clipboard API)  
**Testing**: Vitest 4 + React Testing Library 16 (unit), Playwright 1.58 (E2E)  
**Target Platform**: Web browser (Vercel / localhost:3000)  
**Project Type**: Web application (Next.js App Router)  
**Performance Goals**: JSON and Markdown download within 2 seconds for up to 10 repos; clipboard copy under 1 second  
**Constraints**: Token never included in URLs or exported files (constitution Rule III.7, X.4). Stateless — no server persistence.  
**Scale/Scope**: Up to 10 repos per analysis (UI constraint); URL encoding is best-effort for large lists

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Check | Status |
|------|-------|--------|
| I — Stack: Next.js App Router, TypeScript, Tailwind, Vitest, Playwright | All export logic is pure TS + browser APIs; no new dependencies needed | ✅ Pass |
| II — Accuracy: exported data originates from verified GitHub API response | JSON export mirrors `AnalyzeResponse` verbatim — no transformation | ✅ Pass |
| III.4 / III.7 — Token never in URLs, never exposed | Shareable URL encodes only repo slugs; token excluded by design | ✅ Pass |
| IV — Analyzer module boundary | Export logic is UI-layer only; analyzer module is untouched | ✅ Pass |
| IX.6 — YAGNI | Three formats explicitly required by spec; no extras | ✅ Pass |
| X.4 — Token never in shareable URLs | FR-006 explicitly requires this | ✅ Pass |
| XI — TDD mandatory | Tests written first, must fail before implementation | ✅ Required |

**Post-design re-check**: No violations. Export is purely client-side and does not touch the analyzer module or auth layer.

## Project Structure

### Documentation (this feature)

```text
specs/030-export/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── export-props.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
lib/export/
├── json-export.ts          # Pure fn: AnalyzeResponse → JSON Blob + filename
├── json-export.test.ts
├── markdown-export.ts      # Pure fn: AnalyzeResponse → Markdown string + filename
├── markdown-export.test.ts
├── shareable-url.ts        # Pure fns: encode repos → URL param; decode URL param → repos[]
└── shareable-url.test.ts

components/export/
├── ExportControls.tsx      # Client component: Download JSON, Download Markdown, Copy Link buttons
└── ExportControls.test.tsx

components/repo-input/
└── RepoInputClient.tsx     # Modified: read ?repos= param on mount; pass analysisResponse to ExportControls

e2e/
└── export.spec.ts          # E2E: download JSON, download Markdown, copy link, shareable URL round-trip
```

## Complexity Tracking

No constitution violations to justify.

---

## Phase 0: Research

See [research.md](./research.md).

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md) and [contracts/](./contracts/).
