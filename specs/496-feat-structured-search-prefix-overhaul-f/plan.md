# Implementation Plan: Structured Search Prefix Overhaul for Repos

**Branch**: `496-feat-structured-search-prefix-overhaul-f` | **Date**: 2026-04-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/496-feat-structured-search-prefix-overhaul-f/spec.md`

## Summary

Replace the org inventory repo-filter control cluster with a single structured search input. Preserve the existing free-text repo-name search, add composable `key:value` prefixes, extend the lightweight org inventory GraphQL payload for `topic/size/visibility/license`, and keep Analyze All’s default archived/fork exclusions unless the search query explicitly overrides them.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: Next.js App Router, React 19, Vitest, React Testing Library  
**Storage**: N/A  
**Testing**: Vitest + React Testing Library  
**Target Platform**: Next.js web app in browser + server-side org inventory API route  
**Project Type**: Web application  
**Performance Goals**: Local filtering remains immediate for already-fetched org inventory rows  
**Constraints**: Verified GitHub metadata only; no new persistence; no fabricated fallback values; keep org aggregation default prefilters intact  
**Scale/Scope**: Org inventory repo table and its supporting lightweight GraphQL fetch only

## Constitution Check

- Verified GitHub metadata only: `topic`, `diskUsage`, `visibility`, and `licenseInfo` come from GitHub GraphQL.
- No new technology introduced.
- TDD required: add/adjust targeted tests before broader verification.
- No persistence added; feature remains stateless.
- Simpler-than-necessary approach avoided: parser is a small local utility, not a generic query language framework.

## Project Structure

### Documentation (this feature)

```text
specs/496-feat-structured-search-prefix-overhaul-f/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code

```text
components/org-inventory/
├── OrgInventoryView.tsx
└── OrgInventoryView.test.tsx

lib/analyzer/
├── org-inventory.ts
└── org-inventory.test.ts

lib/org-inventory/
├── filters.ts
├── filters.test.ts
├── structured-search.ts
└── structured-search.test.ts
```

**Structure Decision**: Keep the parser local to `lib/org-inventory/` because the feature only affects org inventory repo filtering today. Reuse that parser from `filters.ts` and keep UI concerns in `OrgInventoryView.tsx`.

## Implementation Notes

1. Add a parser that splits free-text terms from validated structured tokens and reports invalid tokens deterministically.
2. Replace `language` / `archived` filter state with a single query string in the filter model.
3. Extend `OrgRepoSummary` with the lightweight metadata needed for the low-lift prefixes.
4. Remove the superseded controls from the org inventory UI and add inline prefix help plus invalid-token feedback.
5. Preserve Analyze All’s default archived/fork exclusions unless `archived:` or `fork:` appears in the query.
