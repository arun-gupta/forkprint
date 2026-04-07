'use client'

import { useMemo, useState, type ReactNode } from 'react'
import type { ContributorHeatmapCell } from '@/lib/contributors/view-model'

interface ContributionBarChartProps {
  title: string
  description: string
  items: ContributorHeatmapCell[]
  ariaLabel: string
  emptyText: string
  tone?: 'cyan' | 'amber'
  defaultVisibleCount?: number
  entityLabel: string
  actions?: ReactNode
  collapsed?: boolean
  showLabels?: boolean
  showValues?: boolean
}

export function ContributionBarChart({
  title,
  description,
  items,
  ariaLabel,
  emptyText,
  tone = 'cyan',
  defaultVisibleCount = 12,
  entityLabel,
  actions,
  collapsed = false,
  showLabels = true,
  showValues = true,
}: ContributionBarChartProps) {
  const [expanded, setExpanded] = useState(false)
  const visibleItems = useMemo(() => {
    if (expanded || items.length <= defaultVisibleCount) {
      return items
    }

    return items.slice(0, defaultVisibleCount)
  }, [defaultVisibleCount, expanded, items])

  const maxCommits = items[0]?.commits ?? 0
  const showToggle = items.length > defaultVisibleCount
  const barToneClass =
    tone === 'amber'
      ? 'bg-gradient-to-r from-amber-200 via-amber-400 to-amber-700'
      : 'bg-gradient-to-r from-cyan-200 via-cyan-400 to-cyan-700'

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 sm:max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        {actions ? <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">{actions}</div> : null}
      </div>

      {collapsed ? null : items.length > 0 ? (
        <>
          <div className="mt-3 space-y-3" role="list" aria-label={ariaLabel}>
            {visibleItems.map((item) => {
              const barWidth = maxCommits > 0 ? (item.commits / maxCommits) * 100 : 0

              return (
                <div key={`${item.contributor}-${item.commitsLabel}`} role="listitem" className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    {showLabels ? (
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">{item.contributor}</p>
                    ) : (
                      <span className="min-w-0 flex-1" aria-hidden="true" />
                    )}
                    {showValues ? <p className="shrink-0 text-xs text-slate-500">{item.commitsLabel}</p> : null}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${item.contributor} ${item.commitsLabel}`}>
                    <div className={`h-full rounded-full ${barToneClass}`} style={{ width: `${barWidth}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {showToggle ? (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                aria-pressed={expanded}
              >
                {expanded ? `Show fewer ${entityLabel}` : `Show all ${items.length} ${entityLabel}`}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-sm text-slate-400">{emptyText}</p>
      )}
    </div>
  )
}
