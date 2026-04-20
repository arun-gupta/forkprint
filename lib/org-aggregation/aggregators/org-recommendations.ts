import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getHealthScore } from '@/lib/scoring/health-score'
import { getSecurityScore } from '@/lib/security/score-config'
import { getCatalogEntryByKey } from '@/lib/recommendations/catalog'
import type { AggregatePanel } from '../types'
import {
  ORG_RECOMMENDATION_BUCKET_ORDER,
  type Aggregator,
  type OrgRecommendationBucket,
  type OrgRecommendationEntry,
  type OrgRecommendationsValue,
} from './types'

// Normalized flat shape consumed by aggregateRecommendationEntries.
// Exported only so tests can exercise the dedup/sort/group logic without
// building full AnalysisResult fixtures.
export interface FlatRepoRecommendation {
  repo: string
  rawKey: string
  // Bucket the source recommendation reports. Used as a fallback when the
  // catalog lookup returns undefined (FR-019).
  sourceBucket: OrgRecommendationBucket
  // Fallback title for uncataloged keys. Ignored when the catalog has an entry.
  sourceTitle: string
}

const BUCKET_ORDER_INDEX: Record<OrgRecommendationBucket, number> =
  ORG_RECOMMENDATION_BUCKET_ORDER.reduce<Record<OrgRecommendationBucket, number>>(
    (acc, bucket, idx) => {
      acc[bucket] = idx
      return acc
    },
    { Activity: 0, Responsiveness: 0, Contributors: 0, Documentation: 0, Security: 0 },
  )

function caseInsensitiveCompare(a: string, b: string): number {
  return a.localeCompare(b, 'en', { sensitivity: 'base' })
}

// Pure: given normalized per-repo recommendations, return the flat,
// deduped, sorted value for the panel. Exported for unit testing.
export function aggregateRecommendationEntries(
  flat: FlatRepoRecommendation[],
  analyzedReposCount: number,
): OrgRecommendationsValue {
  const byId = new Map<
    string,
    {
      bucket: OrgRecommendationBucket
      title: string
      repos: Set<string>
    }
  >()

  for (const rec of flat) {
    const catalogEntry = getCatalogEntryByKey(rec.rawKey)
    const id = catalogEntry?.id ?? `UNCAT:${rec.rawKey}`
    const bucket = (catalogEntry?.bucket as OrgRecommendationBucket | undefined) ?? rec.sourceBucket
    const title = catalogEntry?.title ?? rec.sourceTitle

    const existing = byId.get(id)
    if (existing) {
      existing.repos.add(rec.repo)
    } else {
      byId.set(id, { bucket, title, repos: new Set([rec.repo]) })
    }
  }

  const items: OrgRecommendationEntry[] = []
  for (const [id, entry] of byId) {
    const affectedRepos = Array.from(entry.repos).sort(caseInsensitiveCompare)
    items.push({
      id,
      bucket: entry.bucket,
      title: entry.title,
      affectedRepoCount: affectedRepos.length,
      affectedRepos,
    })
  }

  items.sort((a, b) => {
    const bucketDiff = BUCKET_ORDER_INDEX[a.bucket] - BUCKET_ORDER_INDEX[b.bucket]
    if (bucketDiff !== 0) return bucketDiff
    const countDiff = b.affectedRepoCount - a.affectedRepoCount
    if (countDiff !== 0) return countDiff
    // Numeric-aware so SEC-3 sorts before SEC-14.
    return a.id.localeCompare(b.id, 'en', { numeric: true })
  })

  return { items, analyzedReposCount }
}

function extractRepoRecommendations(result: AnalysisResult): FlatRepoRecommendation[] {
  const out: FlatRepoRecommendation[] = []

  // Non-security recommendations from the health score. Mirrors the filter
  // in components/recommendations/RecommendationsView.tsx, which drops
  // security recs here and sources them directly from getSecurityScore.
  const healthRecs = getHealthScore(result).recommendations
  for (const rec of healthRecs) {
    if (rec.tab === 'security') continue
    out.push({
      repo: result.repo,
      rawKey: rec.key,
      sourceBucket: rec.bucket as OrgRecommendationBucket,
      sourceTitle: rec.message,
    })
  }

  // Security recommendations — full stream from getSecurityScore when
  // available. Matches the per-repo Recommendations view's source.
  if (result.securityResult !== 'unavailable') {
    const securityDefinition = getSecurityScore(result.securityResult, result.stars)
    for (const rec of securityDefinition.recommendations) {
      out.push({
        repo: result.repo,
        rawKey: rec.item,
        sourceBucket: 'Security',
        sourceTitle: rec.title ?? rec.text,
      })
    }
  }

  return out
}

// Issue #359 — org-level Recommendations aggregator.
//
// Pure function over the completed AnalysisResult[]. Consumes the same
// per-repo recommendation streams the single-repo Recommendations view
// already renders, dedups by unified-catalog identity, counts distinct
// affected repos, and groups by CHAOSS dimension.
//
// No new data fetches, no new scoring, no new catalog entries.
export const orgRecommendationsAggregator: Aggregator<OrgRecommendationsValue> = (
  results,
  context,
): AggregatePanel<OrgRecommendationsValue> => {
  if (results.length === 0) {
    return {
      panelId: 'org-recommendations',
      contributingReposCount: 0,
      totalReposInRun: context.totalReposInRun,
      status: 'in-progress',
      value: null,
    }
  }

  const flat: FlatRepoRecommendation[] = []
  for (const result of results) {
    flat.push(...extractRepoRecommendations(result))
  }

  return {
    panelId: 'org-recommendations',
    contributingReposCount: results.length,
    totalReposInRun: context.totalReposInRun,
    status: 'final',
    value: aggregateRecommendationEntries(flat, results.length),
  }
}
