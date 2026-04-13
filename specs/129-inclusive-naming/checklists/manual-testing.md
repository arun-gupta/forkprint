# Manual Testing Checklist: Inclusive Naming Analysis

**Feature**: P2-F03 Inclusive Naming (#107)
**Branch**: `129-inclusive-naming`
**Tester**: _________________
**Date**: _________________

## Prerequisites

- [ ] Application builds successfully (`npm run build`)
- [ ] All automated tests pass (`npm test`)
- [ ] Linting is clean (`npm run lint`)

## US1: Default Branch Name Check

- [ ] Analyze a repository with `master` as default branch — Documentation tab shows failing inclusive naming check with recommendation to rename to `main`
- [ ] Analyze a repository with `main` as default branch — Documentation tab shows passing inclusive naming check
- [ ] Analyze a repository with custom branch name (e.g., `develop`) — Documentation tab shows passing check

## US2: Repo Metadata Terminology Check

- [ ] Analyze a repository whose description contains a Tier 1 term (e.g., "whitelist") — term is flagged with "Replace immediately" severity and replacement suggestions
- [ ] Analyze a repository whose description contains a Tier 0 term (e.g., "blackbox") — term is NOT flagged
- [ ] Verify whole-word matching: a description containing "mastery" does NOT trigger a flag for "master"
- [ ] Analyze a repository with no non-inclusive terms in description or topics — all metadata checks pass

## US3: Scoring Integration

- [ ] Documentation composite score reflects four-part model (35/30/25/10 weights)
- [ ] Repository with `master` branch scores lower on Documentation than equivalent repo with `main` branch
- [ ] Inclusive naming recommendations appear in the unified Recommendations tab
- [ ] Score help tooltip explains the four-part model including inclusive naming

## UI: Inclusive Naming Pane

- [ ] Inclusive Naming pane is visible in the Documentation tab
- [ ] Passing checks display with green/success styling
- [ ] Failing checks display flagged term, tier severity label, and replacement suggestions
- [ ] INI reference link (inclusivenaming.org) is present in recommendations
- [ ] Pane handles unavailable state gracefully (empty repo with no default branch)

## Cross-Cutting

- [ ] No console errors or warnings in browser dev tools
- [ ] No new TypeScript or linting errors introduced
- [ ] Existing Documentation tab functionality (file presence, README quality, licensing) still works correctly

## Sign-Off

- **All items checked**: [ ]
- **Signed off by**: _________________
- **Date**: _________________
