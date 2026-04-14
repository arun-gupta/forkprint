'use client'

import { useState } from 'react'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { getHealthScore } from '@/lib/scoring/health-score'
import { getSecurityScore } from '@/lib/security/score-config'
import type { SecurityRecommendation } from '@/lib/security/analysis-result'
import { CATEGORY_DEFINITIONS } from '@/lib/security/recommendation-catalog'
import { assignReferenceIds, resolveReferenceId } from '@/lib/recommendations/reference-id'
import { getCatalogEntryByKey } from '@/lib/recommendations/catalog'
import { getCatalogEntry as getSecurityCatalogEntry } from '@/lib/security/recommendation-catalog'
import { TagPill, ActiveFilterBar } from '@/components/tags/TagPill'

interface RecommendationsViewProps {
  results: AnalysisResult[]
  activeTag?: string | null
  onTagChange?: (tag: string | null) => void
}

const BUCKET_COLORS: Record<string, string> = {
  Activity: 'bg-blue-100 text-blue-800',
  Responsiveness: 'bg-purple-100 text-purple-800',
  Sustainability: 'bg-emerald-100 text-emerald-800',
  Documentation: 'bg-amber-100 text-amber-800',
  Security: 'bg-red-100 text-red-800',
}

const RISK_COLORS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-800',
  High: 'bg-orange-100 text-orange-800',
  Medium: 'bg-amber-100 text-amber-800',
  Low: 'bg-slate-100 text-slate-700',
}

const SOURCE_LABELS: Record<string, string> = {
  scorecard: 'OpenSSF Scorecard',
  direct_check: 'Direct check',
}

function getTagsForKey(key: string, isSecurityRec: boolean): string[] {
  const unified = getCatalogEntryByKey(key)?.tags ?? []
  if (isSecurityRec) {
    const sec = getSecurityCatalogEntry(key)?.tags ?? []
    if (sec.length > 0 && unified.length === 0) return sec
    if (sec.length > 0) return [...new Set([...unified, ...sec])]
  }
  return unified
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  )
}

function SecurityRecommendationCard({ rec, referenceId, activeTag, onTagClick }: { rec: SecurityRecommendation; referenceId?: string; activeTag: string | null; onTagClick: (tag: string) => void }) {
  const tags = getTagsForKey(rec.item, true)
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">
          {referenceId ? (
            <span className="mr-1.5 inline-flex rounded bg-slate-200 px-1.5 py-0.5 text-xs font-mono font-medium text-slate-500">{referenceId}</span>
          ) : null}
          {rec.title ?? rec.text}
        </h4>
        <div className="flex shrink-0 gap-1.5">
          {tags.map((tag) => (
            <TagPill key={tag} tag={tag} active={activeTag === tag} onClick={onTagClick} />
          ))}
          {rec.riskLevel ? (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${RISK_COLORS[rec.riskLevel] ?? ''}`}>
              {rec.riskLevel}
            </span>
          ) : null}
          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {SOURCE_LABELS[rec.category] ?? rec.category}
          </span>
        </div>
      </div>
      {rec.evidence ? (
        <p className="mt-1.5 text-xs text-slate-500">{rec.evidence}</p>
      ) : null}
      {rec.explanation ? (
        <p className="mt-2 text-sm text-slate-600">{rec.explanation}</p>
      ) : null}
      {rec.remediationHint ? (
        <div className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
          {rec.remediationHint}
        </div>
      ) : null}
      {rec.docsUrl ? (
        <a
          href={rec.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-blue-600 underline hover:text-blue-800"
        >
          OpenSSF Scorecard docs
        </a>
      ) : null}
    </div>
  )
}

function SecurityRecommendationsGroup({
  recommendations,
  expanded,
  onToggle,
  categoryCollapsed,
  onCategoryToggle,
  activeTag,
  onTagClick,
}: {
  recommendations: SecurityRecommendation[]
  expanded: boolean
  onToggle: () => void
  categoryCollapsed: Record<string, boolean>
  onCategoryToggle: (key: string) => void
  activeTag: string | null
  onTagClick: (tag: string) => void
}) {
  // Resolve catalog IDs — each rec's `item` field is the catalog key
  const withIds = recommendations.map((rec, i) => ({
    rec,
    referenceId: resolveReferenceId(rec.item, 'Security', i + 1),
    tags: getTagsForKey(rec.item, true),
  }))

  // Filter by active tag
  const filtered = activeTag
    ? withIds.filter((entry) => entry.tags.includes(activeTag))
    : withIds

  if (filtered.length === 0) return null

  // Group by category
  const groups = new Map<string, typeof filtered>()
  for (const entry of filtered) {
    const key = entry.rec.groupCategory ?? 'best_practices'
    const group = groups.get(key) ?? []
    group.push(entry)
    groups.set(key, group)
  }

  // Sort groups by CATEGORY_DEFINITIONS order
  const sortedGroups = CATEGORY_DEFINITIONS
    .filter((cat) => groups.has(cat.key))
    .map((cat) => ({ category: cat, entries: groups.get(cat.key)! }))

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={expanded}
      >
        <ChevronIcon expanded={expanded} />
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${BUCKET_COLORS.Security}`}>
          Security
        </span>
        <span className="text-xs text-slate-400">{filtered.length} recommendation{filtered.length !== 1 ? 's' : ''}</span>
      </button>
      {expanded ? (
        <div className="mt-3 space-y-4">
          {sortedGroups.map(({ category, entries }) => {
            const collapsed = categoryCollapsed[category.key] ?? false
            return (
              <div key={category.key}>
                <button
                  type="button"
                  onClick={() => onCategoryToggle(category.key)}
                  className="mb-2 flex items-center gap-1.5 text-left"
                  aria-expanded={!collapsed}
                >
                  <ChevronIcon expanded={!collapsed} />
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{category.label}</span>
                  <span className="text-xs text-slate-400">{entries.length}</span>
                </button>
                {!collapsed ? (
                  <div className="space-y-2">
                    {entries.map(({ rec, referenceId }) => (
                      <SecurityRecommendationCard key={`${rec.item}-${referenceId}`} rec={rec} referenceId={referenceId} activeTag={activeTag} onTagClick={onTagClick} />
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function RecommendationsView({ results, activeTag: externalTag, onTagChange }: RecommendationsViewProps) {
  const [collapsedBuckets, setCollapsedBuckets] = useState<Record<string, boolean>>({})
  const [categoryCollapsed, setCategoryCollapsed] = useState<Record<string, boolean>>({})
  const [localTag, setLocalTag] = useState<string | null>(null)
  const activeTag = externalTag !== undefined ? externalTag : localTag

  const handleTagClick = (tag: string) => {
    const next = activeTag === tag ? null : tag
    if (onTagChange) onTagChange(next)
    else setLocalTag(next)
  }

  return (
    <section aria-label="Recommendations view" className="space-y-6">
      {results.map((result) => {
        const healthScore = getHealthScore(result)

        // Get enriched security recommendations directly
        const securityRecs = result.securityResult !== 'unavailable'
          ? getSecurityScore(result.securityResult, result.stars).recommendations
          : []

        // Non-security recommendations from health score
        const nonSecurityRecs = healthScore.recommendations.filter((r) => r.tab !== 'security')

        const totalCount = nonSecurityRecs.length + securityRecs.length
        if (totalCount === 0) {
          return (
            <div key={result.repo} className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">{result.repo}</h2>
              <p className="mt-2 text-sm text-slate-500">No recommendations — this project scores well across all dimensions.</p>
            </div>
          )
        }

        // Assign reference IDs and resolve tags for non-security recs
        const nonSecurityWithIds = assignReferenceIds(nonSecurityRecs).map((rec) => ({
          ...rec,
          tags: getTagsForKey(rec.key, false),
        }))

        // Filter by active tag
        const filteredNonSecurity = activeTag
          ? nonSecurityWithIds.filter((rec) => rec.tags.includes(activeTag))
          : nonSecurityWithIds
        const filteredSecurityRecs = activeTag
          ? securityRecs.filter((rec) => getTagsForKey(rec.item, true).includes(activeTag))
          : securityRecs

        // Group non-security recs by bucket
        const bucketGroups = new Map<string, typeof filteredNonSecurity>()
        for (const rec of filteredNonSecurity) {
          const group = bucketGroups.get(rec.bucket) ?? []
          group.push(rec)
          bucketGroups.set(rec.bucket, group)
        }

        const filteredTotal = filteredNonSecurity.length + filteredSecurityRecs.length
        const bucketCount = bucketGroups.size + (filteredSecurityRecs.length > 0 ? 1 : 0)

        // Collect all bucket keys for expand/collapse all
        const allBucketKeys = [...Array.from(bucketGroups.keys()), ...(securityRecs.length > 0 ? ['Security'] : [])]
        const allExpanded = allBucketKeys.every((key) => !collapsedBuckets[key])

        const handleToggleAll = () => {
          if (allExpanded) {
            // Collapse all buckets and categories
            const collapsed: Record<string, boolean> = {}
            for (const key of allBucketKeys) {
              collapsed[key] = true
            }
            setCollapsedBuckets(collapsed)
            // Also collapse all security categories
            const catCollapsed: Record<string, boolean> = {}
            for (const cat of CATEGORY_DEFINITIONS) {
              catCollapsed[cat.key] = true
            }
            setCategoryCollapsed(catCollapsed)
          } else {
            // Expand all
            setCollapsedBuckets({})
            setCategoryCollapsed({})
          }
        }

        return (
          <div key={result.repo} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{result.repo}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {activeTag
                    ? `${filteredTotal} of ${totalCount} recommendation${totalCount !== 1 ? 's' : ''} matching "${activeTag}"`
                    : `${totalCount} recommendation${totalCount !== 1 ? 's' : ''} across ${bucketCount} dimension${bucketCount !== 1 ? 's' : ''}`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleAll}
                className="shrink-0 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {allExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            </div>

            {activeTag ? (
              <div className="mt-3">
                <ActiveFilterBar tag={activeTag} onClear={() => handleTagClick(activeTag)} />
              </div>
            ) : null}

            {filteredTotal === 0 && activeTag ? (
              <p className="mt-4 text-center text-sm text-slate-400">No recommendations match the "{activeTag}" tag.</p>
            ) : null}

            <div className="mt-4 space-y-4">
              {Array.from(bucketGroups.entries()).map(([bucket, recs]) => {
                const isExpanded = !collapsedBuckets[bucket]
                return (
                  <div key={bucket} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <button
                      type="button"
                      onClick={() => setCollapsedBuckets((prev) => ({ ...prev, [bucket]: !prev[bucket] }))}
                      className="flex w-full items-center gap-2 text-left"
                      aria-expanded={isExpanded}
                    >
                      <ChevronIcon expanded={isExpanded} />
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${BUCKET_COLORS[bucket] ?? 'bg-slate-100 text-slate-800'}`}>
                        {bucket}
                      </span>
                      <span className="text-xs text-slate-400">{recs.length} recommendation{recs.length !== 1 ? 's' : ''}</span>
                    </button>
                    {isExpanded ? (
                      <ul className="mt-3 space-y-2">
                        {recs.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-mono font-medium text-slate-500">{rec.referenceId}</span>
                            <p className="flex-1 text-sm text-slate-700">{rec.message}</p>
                            {rec.tags.map((tag) => (
                              <TagPill key={tag} tag={tag} active={activeTag === tag} onClick={handleTagClick} />
                            ))}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )
              })}

              {filteredSecurityRecs.length > 0 ? (
                <SecurityRecommendationsGroup
                  recommendations={filteredSecurityRecs}
                  expanded={!collapsedBuckets['Security']}
                  onToggle={() => setCollapsedBuckets((prev) => ({ ...prev, Security: !prev.Security }))}
                  categoryCollapsed={categoryCollapsed}
                  onCategoryToggle={(key) => setCategoryCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))}
                  activeTag={activeTag}
                  onTagClick={handleTagClick}
                />
              ) : null}
            </div>
          </div>
        )
      })}
    </section>
  )
}
