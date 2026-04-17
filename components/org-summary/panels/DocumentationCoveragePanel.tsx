'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { DocumentationCoverageValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props { panel: AggregatePanel<DocumentationCoverageValue> }

export function DocumentationCoveragePanel({ panel }: Props) {
  return (
    <section aria-label="Documentation coverage" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Documentation coverage</h3>
        {panel.lastUpdatedAt ? <span className="text-xs text-slate-400 dark:text-slate-500">updated {panel.lastUpdatedAt.toLocaleTimeString()}</span> : null}
      </header>
      {panel.status === 'in-progress' && !panel.value ? <EmptyState /> : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No documentation data available.</p>
      ) : (
        <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
          {panel.value.perCheck.map((c) => (
            <li key={c.name} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-slate-800 dark:text-slate-200 capitalize dark:text-slate-100">{c.name.replace(/_/g, ' ')}</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full bg-sky-600 dark:bg-sky-500" style={{ width: `${Math.min(c.presentInPercent, 100)}%` }} />
                </div>
                <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{Math.round(c.presentInPercent)}%</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">({c.presentReposCount})</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
