# Feature Specification: Per-tab match-count badge for active lens filter

**Feature Branch**: `204-show-per-tab-match-count-badge-when-a-le`
**Created**: 2026-04-14
**Status**: Draft
**Input**: GitHub issue [#204](https://github.com/arun-gupta/forkprint/issues/204)

## Overview

When a Community or Governance lens is active (`activeTag !== null`), each tab in the result tab strip should display a count badge showing how many tag-matching rows it contains, mirroring the existing search-match badge UX.

## Acceptance Criteria

- AC1: Activating the **Community** lens displays count badges on Documentation, Contributors, and Activity tabs reflecting tagged-row counts across all analyzed repos.
- AC2: Activating the **Governance** lens displays count badges on Documentation, Contributors, and Security tabs reflecting tagged-row counts.
- AC3: Clearing the lens filter removes the lens badges.
- AC4: When a search query is active, search-match badges remain authoritative — lens badges are suppressed.
- AC5: Tabs with zero matching rows render no badge (matching existing search-badge convention).
- AC6: A new helper computes per-tab counts from `AnalysisResult[]` and is unit-tested across all five tag domains (doc files, contributors metrics, activity items/cards, responsiveness panes, security checks).

## Out of Scope

- Per-row highlight animations.
- Badges for non-tag filters (e.g., compliance/quick-win/supply-chain/contrib-ex are computed by the helper but the lens-pill UI today only surfaces community/governance).
- Changes to the existing search-match badge styling.

## Constitutional Compliance

- §IX.6/IX.7 (YAGNI / KISS): the helper is data-driven from existing tag mapping sets — no new tag taxonomy.
- §II Accuracy: counts come directly from verified `AnalysisResult` fields. Items marked `'unavailable'` contribute zero.
- §XI Testing: helper has Vitest unit tests for all tab/tag domains.
