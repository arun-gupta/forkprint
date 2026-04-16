'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { BusFactorValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props { panel: AggregatePanel<BusFactorValue> }

export function BusFactorPanel({ panel }: Props) {
  return (
    <section aria-label="Bus factor" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Bus factor</h3>
        {panel.lastUpdatedAt ? <span className="text-xs text-slate-400 dark:text-slate-500">updated {panel.lastUpdatedAt.toLocaleTimeString()}</span> : null}
      </header>
      {panel.status === 'in-progress' && !panel.value ? <EmptyState /> : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No commit author data available.</p>
      ) : panel.value.highConcentrationRepos.length === 0 ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">No repos have a single author contributing &gt;{(panel.value.threshold * 100).toFixed(0)}% of commits.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">{panel.value.highConcentrationRepos.length} repo(s) have a single author contributing &gt;{(panel.value.threshold * 100).toFixed(0)}% of commits</p>
          <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
            {panel.value.highConcentrationRepos.map((r) => (
              <li key={r.repo} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate text-sm text-slate-800 dark:text-slate-200">{r.repo}</span>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{(r.topAuthorShare * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
