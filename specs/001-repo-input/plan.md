# Implementation Plan: Repo Input

**Branch**: `001-repo-input` | **Date**: 2026-03-31 | **Spec**: [spec.md](./spec.md)

---

## Summary

Implement the repo input form on the home page (`/`). Accepts `owner/repo` slugs (newline or comma-separated) and full GitHub URLs. Validates, trims, deduplicates, and extracts slugs client-side before passing a clean `string[]` to the data fetching layer.

---

## Technical Context

**Language/Version**: TypeScript 5+ / Next.js 14+ (App Router)
**Primary Dependencies**: React, Tailwind CSS
**Storage**: N/A — stateless, no persistence
**Testing**: Vitest + React Testing Library (unit), Playwright (E2E)
**Target Platform**: Web — Vercel
**Project Type**: Web application
**Performance Goals**: Validation feedback on submit with no perceptible delay
**Constraints**: No page reload on validation error; no API calls from this feature
**Scale/Scope**: Accepts 1–N repo slugs per submission; deduplication and validation are client-side only

---

## Constitution Check

| Rule | Status | Notes |
|------|--------|-------|
| Stack: Next.js 14+ App Router | ✅ Pass | Home page is an App Router page |
| Stack: Tailwind CSS | ✅ Pass | All styling via Tailwind |
| No tech outside approved stack | ✅ Pass | No new dependencies required |
| Analyzer module boundary | ✅ Pass | This feature is UI only — no analyzer involvement |
| Accuracy policy | ✅ Pass | No data fetching in this feature |
| TDD mandatory | ✅ Pass | Tests written before implementation |
| No secrets | ✅ Pass | No tokens or credentials involved |
| Stateless | ✅ Pass | No persistence, no database |

No violations. Proceeding to design.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-repo-input/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── repo-input.md    ← Phase 1 output
└── tasks.md             ← created by /speckit.tasks
```

### Source Code

```text
app/
├── page.tsx                        ← home page, renders RepoInputForm
└── dashboard/
    └── page.tsx                    ← receives parsed slugs (future feature)

components/
└── repo-input/
    ├── RepoInputForm.tsx           ← form component
    └── RepoInputForm.test.tsx      ← unit tests

lib/
└── parse-repos.ts                  ← pure parsing/validation/deduplication logic
    └── parse-repos.test.ts         ← unit tests for parser

e2e/
└── repo-input.spec.ts              ← Playwright E2E tests
```

**Structure Decision**: Next.js App Router. Pure parsing logic extracted to `lib/parse-repos.ts` — framework-agnostic, independently testable. UI component in `components/repo-input/`. This separation ensures the parser can be reused and tested without React.

---

## Complexity Tracking

No constitution violations — table not required.
