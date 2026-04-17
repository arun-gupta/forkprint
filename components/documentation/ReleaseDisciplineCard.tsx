'use client'

import { TagPill } from '@/components/tags/TagPill'
import type { AnalysisResult, Unavailable } from '@/lib/analyzer/analysis-result'

interface ReleaseDisciplineCardProps {
  result: AnalysisResult
  activeTag: string | null
  onTagClick: (tag: string) => void
}

/**
 * Documentation-tab card for Release Health versioning-discipline signals
 * (P2-F09 / #69). Each row carries the `release-health` pill.
 */
export function ReleaseDisciplineCard({ result, activeTag, onTagClick }: ReleaseDisciplineCardProps) {
  const rh = result.releaseHealthResult
  if (rh === undefined) return null

  const semver = rh === 'unavailable' ? 'unavailable' : rh.semverComplianceRatio
  const notes = rh === 'unavailable' ? 'unavailable' : rh.releaseNotesQualityRatio
  const promotion = rh === 'unavailable' ? 'unavailable' : rh.tagToReleaseRatio

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:bg-slate-800/60 dark:border-slate-700">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Release discipline</p>
      <div className="mt-2 space-y-2">
        <Row
          label="Semver compliance"
          value={formatRatio(semver)}
          activeTag={activeTag}
          onTagClick={onTagClick}
        />
        <Row
          label="Release notes quality"
          value={formatRatio(notes)}
          activeTag={activeTag}
          onTagClick={onTagClick}
        />
        <Row
          label="Tag-to-release promotion"
          value={formatPromotion(promotion)}
          activeTag={activeTag}
          onTagClick={onTagClick}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Versioning discipline signals complement the cadence signal on the Activity tab.
      </p>
    </div>
  )
}

function Row({
  label,
  value,
  activeTag,
  onTagClick,
}: {
  label: string
  value: string
  activeTag: string | null
  onTagClick: (tag: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{value}</p>
      </div>
      <TagPill tag="release-health" active={activeTag === 'release-health'} onClick={onTagClick} />
    </div>
  )
}

function formatRatio(value: number | Unavailable): string {
  if (value === 'unavailable') return 'unavailable'
  return `${Math.round(value * 100)}%`
}

function formatPromotion(value: number | Unavailable): string {
  if (value === 'unavailable') return 'unavailable'
  const pctOrphan = Math.round(value * 100)
  return `${100 - pctOrphan}% of tags promoted to releases`
}
