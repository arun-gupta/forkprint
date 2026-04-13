/**
 * Resolves stable reference IDs for recommendations using the unified catalog.
 *
 * Each recommendation carries a `key` field that maps to a catalog entry with
 * a fixed ID (e.g. "pr_flow" → ACT-1, "Branch-Protection" → SEC-3). This means
 * the same recommendation always has the same ID across all repos.
 *
 * For dynamic recommendations not in the catalog (e.g. inclusive naming findings),
 * a sequential fallback ID is assigned using the bucket prefix.
 */

import { getCatalogId } from './catalog'

const BUCKET_PREFIX: Record<string, string> = {
  Security: 'SEC',
  Activity: 'ACT',
  Responsiveness: 'RSP',
  Sustainability: 'SUS',
  Documentation: 'DOC',
}

export function getBucketPrefix(bucket: string): string {
  return BUCKET_PREFIX[bucket] ?? bucket.substring(0, 3).toUpperCase()
}

export interface WithReferenceId {
  referenceId: string
}

/**
 * Resolves the stable reference ID for a single recommendation.
 * Falls back to a sequential ID if the key is not in the catalog.
 */
export function resolveReferenceId(key: string, bucket: string, fallbackIndex: number): string {
  return getCatalogId(key) ?? `${getBucketPrefix(bucket)}-${fallbackIndex}`
}

/**
 * Assigns reference IDs to a list of recommendations.
 * Uses the catalog for stable IDs; falls back to sequential numbering
 * for dynamic entries not in the catalog.
 */
export function assignReferenceIds<T extends { bucket: string; key: string }>(
  items: readonly T[],
): Array<T & WithReferenceId> {
  const fallbackCounters = new Map<string, number>()
  return items.map((item) => {
    const catalogId = getCatalogId(item.key)
    let referenceId: string
    if (catalogId) {
      referenceId = catalogId
    } else {
      const prefix = getBucketPrefix(item.bucket)
      const count = (fallbackCounters.get(prefix) ?? 100) + 1
      fallbackCounters.set(prefix, count)
      referenceId = `${prefix}-${count}`
    }
    return { ...item, referenceId }
  })
}
