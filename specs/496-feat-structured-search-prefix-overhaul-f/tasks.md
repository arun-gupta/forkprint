# Tasks: Structured Search Prefix Overhaul for Repos

**Input**: Design documents from `/specs/496-feat-structured-search-prefix-overhaul-f/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Parser + Filter Foundation

- [x] T001 Add structured query parsing and matching in `lib/org-inventory/structured-search.ts`
- [x] T002 Add parser coverage in `lib/org-inventory/structured-search.test.ts`
- [x] T003 Update `lib/org-inventory/filters.ts` to use the structured parser
- [x] T004 Expand `lib/org-inventory/filters.test.ts` for prefix filtering semantics

## Phase 2: Metadata Fetch Expansion

- [x] T005 Extend `lib/analyzer/org-inventory.ts` to fetch topics, size, visibility, and license metadata
- [x] T006 Update `lib/analyzer/org-inventory.test.ts` for the expanded summary shape

## Phase 3: UI Migration

- [x] T007 Replace the old language/archived/fork controls in `components/org-inventory/OrgInventoryView.tsx` with a single structured search input and inline help
- [x] T008 Preserve Analyze All default archived/fork exclusions unless overridden by query tokens
- [x] T009 Update `components/org-inventory/OrgInventoryView.test.tsx` for the new search UX, override behavior, and invalid-token feedback

## Phase 4: Verification

- [x] T010 Run focused Vitest coverage for org inventory structured search
- [x] T011 Run project verification: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`
- [x] T012 Update user-facing docs where the structured-search capability is surfaced (`README.md`)
