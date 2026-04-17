'use client'

import type { AggregatePanel, PanelId } from '@/lib/org-aggregation/types'
import { EmptyState } from '../EmptyState'

interface Props {
  panelId: PanelId
  label: string
  panel: AggregatePanel<unknown>
}

export function PlaceholderPanel({ panelId, label, panel }: Props) {
  const partialCoverageLabel =
    panel.value && panel.contributingReposCount < panel.totalReposInRun
      ? `${panel.contributingReposCount} of ${panel.totalReposInRun} repos`
      : null

  return (
    <section
      aria-label={label}
      data-panel-id={panelId}
      className="rounded-lg border border-dashed border-slate-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:border-slate-600"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</h3>
        <div className="flex items-center gap-3">
          {panel.lastUpdatedAt ? (
            <span
              className="text-xs text-slate-400 dark:text-slate-500"
              title={`Last updated ${panel.lastUpdatedAt.toLocaleTimeString()}`}
            >
              updated {panel.lastUpdatedAt.toLocaleTimeString()}
            </span>
          ) : null}
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            not yet implemented
          </span>
        </div>
      </header>
      {panel.status === 'in-progress' && !panel.value ? (
        <EmptyState />
      ) : panel.status === 'unavailable' ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">unavailable</p>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Placeholder. Renders once the aggregator + panel land.
          {partialCoverageLabel ? <span className="ml-1">({partialCoverageLabel})</span> : null}
        </p>
      )}
    </section>
  )
}
