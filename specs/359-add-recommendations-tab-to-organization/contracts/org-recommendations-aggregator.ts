/**
 * Contract for the org-level Recommendations aggregator.
 *
 * This file is the authoritative TypeScript-level contract the
 * implementation must satisfy. It is imported by the implementation as a
 * compile-time shape check (via `satisfies` or a matching signature), and
 * re-exports drive the tests.
 *
 * Source of truth for spec FR-001..FR-020 (see ../spec.md). Keep in sync.
 *
 * MUST NOT import from react, next/*, or components/*.
 */

import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { AggregationContext } from '@/lib/org-aggregation/aggregators/types'

// --------------------------------------------------------------------
// Value types — mirror data-model.md §Types exactly
// --------------------------------------------------------------------

export type OrgRecommendationBucket =
  | 'Activity'
  | 'Responsiveness'
  | 'Contributors'
  | 'Documentation'
  | 'Security'

export const ORG_RECOMMENDATION_BUCKET_ORDER: readonly OrgRecommendationBucket[] = [
  'Activity',
  'Responsiveness',
  'Contributors',
  'Documentation',
  'Security',
]

export interface OrgRecommendationEntry {
  /** Catalog ID (e.g. "SEC-3") or `UNCAT:${rawKey}` for uncataloged recs. */
  id: string
  bucket: OrgRecommendationBucket
  title: string
  affectedRepoCount: number
  /** Sorted alphabetical (case-insensitive) `owner/repo` slugs. */
  affectedRepos: string[]
}

export interface OrgRecommendationsValue {
  /** Pre-sorted: [bucket-order asc, affectedRepoCount desc, id asc]. */
  items: OrgRecommendationEntry[]
  /** Count of successfully analyzed repos contributing to this panel. */
  analyzedReposCount: number
}

// --------------------------------------------------------------------
// Aggregator signature
// --------------------------------------------------------------------

/**
 * Pure function. No I/O, no mutation of inputs, no framework imports.
 *
 * Behaviour:
 *  - `results.length === 0` → `{ status: 'in-progress', value: null }`.
 *  - Otherwise → `{ status: 'final', value: OrgRecommendationsValue }`.
 *  - `value.analyzedReposCount === results.length`.
 *  - `value.items` is flat, sorted by `[bucket-order asc, count desc, id asc]`.
 *  - Each item's `affectedRepos` is alphabetical (case-insensitive).
 *  - Scorecard and direct-check aliases collapse to the same catalog entry
 *    (FR-005) via `getCatalogEntryByKey` / `DIRECT_CHECK_ALIASES`.
 *  - Uncataloged keys survive with `id = 'UNCAT:' + rawKey` (FR-019).
 */
export type OrgRecommendationsAggregator = (
  results: AnalysisResult[],
  context: AggregationContext,
) => AggregatePanel<OrgRecommendationsValue>

// --------------------------------------------------------------------
// Contract assertions (for reference — enforced by unit tests)
// --------------------------------------------------------------------

/**
 * CONTRACT-01 (FR-004): Every item in value.items carries id, bucket, title,
 *                       affectedRepoCount, affectedRepos.
 *
 * CONTRACT-02 (FR-005): If two source recommendations — one from Scorecard
 *                       (e.g. `Branch-Protection`) and one from direct-check
 *                       (`branch_protection`) — occur in two different repos,
 *                       the aggregated output has ONE item with
 *                       affectedRepoCount === 2.
 *
 * CONTRACT-03 (FR-007): For any two items in the same bucket, if
 *                       a.affectedRepoCount > b.affectedRepoCount, a comes
 *                       before b. For equal counts, the one with the
 *                       lexicographically smaller `id` comes first.
 *
 * CONTRACT-04 (FR-009/FR-010): For every item, affectedRepos is
 *                              case-insensitive alphabetically sorted AND
 *                              affectedRepos.length === affectedRepoCount.
 *
 * CONTRACT-05 (FR-011): value.analyzedReposCount ===
 *                       (AggregatePanel).contributingReposCount === results.length
 *                       (the aggregator receives only successfully-analyzed
 *                       results from the view-model).
 *
 * CONTRACT-06 (FR-019): For any per-repo recommendation whose key lookup
 *                       returns undefined from getCatalogEntryByKey, the
 *                       aggregator still emits an item with
 *                       id === 'UNCAT:' + rawKey and a non-empty title.
 *
 * CONTRACT-07 (FR-016/§IV): The aggregator imports only from
 *                           lib/analyzer/*, lib/org-aggregation/*,
 *                           lib/recommendations/*, lib/scoring/*, and
 *                           lib/security/*. It does not import from
 *                           next/*, react, or components/*.
 */
