'use client'

import { TagPill } from '@/components/tags/TagPill'
import type { ActivityWindowDays, AnalysisResult } from '@/lib/analyzer/analysis-result'
import { countDiscussionsInWindow } from '@/lib/activity/score-config'

interface DiscussionsCardProps {
  result: AnalysisResult
  activeTag: string | null
  onTagClick: (tag: string) => void
  windowDays?: ActivityWindowDays
}

/**
 * Activity-tab card for the GitHub Discussions community signal (P2-F05 / #70).
 *
 * Three visual states per `quickstart.md` Step 1 and spec FR-012:
 *   1. Enabled with activity    → "Enabled · N in last Wd"
 *   2. Enabled with zero count  → "Enabled · no activity yet"
 *   3. Not enabled              → "Not enabled"
 *
 * When `hasDiscussionsEnabled === 'unavailable'` (undetermined), the card
 * is hidden and the signal belongs in the missing-data panel. Caller is
 * responsible for that gating — this component assumes a known state.
 *
 * The `windowDays` prop selects the recomputation window (issue #194). The
 * count is derived client-side from the preserved raw `createdAt` array so
 * flipping windows does not re-run analysis.
 */
export function DiscussionsCard({ result, activeTag, onTagClick, windowDays = 90 }: DiscussionsCardProps) {
  if (result.hasDiscussionsEnabled === undefined || result.hasDiscussionsEnabled === 'unavailable') {
    return null
  }

  const enabled = result.hasDiscussionsEnabled === true
  const computed = enabled ? countDiscussionsInWindow(result, windowDays) : 'unavailable'
  const count = typeof computed === 'number' ? computed : null
  // The analyzer paginates discussions up to `MAX_DISCUSSION_PAGES` (2,000
  // within-year entries). Beyond that it signals `discussionsRecentTruncated`
  // so we can annotate the count as `N+` rather than imply an exact total —
  // see issue #194.
  const truncated = result.discussionsRecentTruncated === true
  const countLabel = count !== null ? (truncated ? `${count}+` : String(count)) : ''

  let statusLine: string
  if (!enabled) {
    statusLine = 'Not enabled'
  } else if (count !== null && count > 0) {
    statusLine = `Enabled · ${countLabel} in last ${windowDays}d`
  } else if (count === 0) {
    statusLine = 'Enabled · no activity yet'
  } else {
    statusLine = 'Enabled'
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:bg-slate-800/60 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Discussions</p>
        <TagPill tag="community" active={activeTag === 'community'} onClick={onTagClick} />
      </div>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{statusLine}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        GitHub Discussions is a forum for long-form community conversation. Presence and recent activity here signal an engaged community.
      </p>
    </div>
  )
}
