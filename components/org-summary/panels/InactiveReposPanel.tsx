'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { InactiveReposValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props { panel: AggregatePanel<InactiveReposValue> }

export function InactiveReposPanel({ panel }: Props) {
  return (
    <section aria-label="Inactive repos" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Inactive repos</h3>
        {panel.lastUpdatedAt ? <span className="text-xs text-slate-400 dark:text-slate-500">updated {panel.lastUpdatedAt.toLocaleTimeString()}</span> : null}
      </header>
      {panel.status === 'in-progress' && !panel.value ? <EmptyState /> : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No activity data available.</p>
      ) : panel.value.repos.length === 0 ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">All repos have recent commit activity.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">{panel.value.repos.length} repo(s) with no commits in 90 days</p>
          <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
            {panel.value.repos.map((r) => (
              <li key={r.repo} className="py-2 text-sm text-slate-800 dark:text-slate-200">{r.repo}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
