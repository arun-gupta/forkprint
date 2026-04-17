'use client'

import { TagPill } from '@/components/tags/TagPill'
import type { AnalysisResult, Unavailable } from '@/lib/analyzer/analysis-result'

interface ReleaseCadenceCardProps {
  result: AnalysisResult
  activeTag: string | null
  onTagClick: (tag: string) => void
}

/**
 * Activity-tab card for Release Health cadence signals (P2-F09 / #69).
 *
 * Shows:
 *   1. Releases per year (releaseFrequency)
 *   2. Time since last release (daysSinceLastRelease)
 *   3. Pre-release usage (preReleaseRatio) — informational
 *
 * When the analyzer could not retrieve releases at all, `releaseHealthResult`
 * is `'unavailable'` and per-field `"unavailable"` placeholders render — never
 * zeroed, per Constitution §II.
 */
export function ReleaseCadenceCard({ result, activeTag, onTagClick }: ReleaseCadenceCardProps) {
  const rh = result.releaseHealthResult
  if (rh === undefined) return null

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:bg-slate-800/60 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Release cadence</p>
        <TagPill tag="release-health" active={activeTag === 'release-health'} onClick={onTagClick} />
      </div>
      <dl className="mt-2 grid grid-cols-1 gap-1 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-3">
        <Row label="Frequency" value={formatFrequency(rh === 'unavailable' ? 'unavailable' : rh.releaseFrequency)} />
        <Row label="Last release" value={formatRecency(rh === 'unavailable' ? 'unavailable' : rh.daysSinceLastRelease)} />
        <Row label="Pre-releases" value={formatRatio(rh === 'unavailable' ? 'unavailable' : rh.preReleaseRatio)} />
      </dl>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Release cadence reflects how actively the project ships. Pre-release usage is informational only.
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function formatFrequency(value: number | Unavailable): string {
  if (value === 'unavailable') return 'unavailable'
  return `${value} per year`
}

function formatRecency(value: number | Unavailable): string {
  if (value === 'unavailable') return 'unavailable'
  if (value === 0) return 'today'
  if (value === 1) return '1 day ago'
  return `${value} days ago`
}

function formatRatio(value: number | Unavailable): string {
  if (value === 'unavailable') return 'unavailable'
  return `${Math.round(value * 100)}%`
}
