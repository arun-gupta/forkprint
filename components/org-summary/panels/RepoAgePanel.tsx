'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { RepoAgeValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props { panel: AggregatePanel<RepoAgeValue> }

function fmt(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(d)
}

export function RepoAgePanel({ panel }: Props) {
  return (
    <section aria-label="Repo age" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Repo age</h3>
        {panel.lastUpdatedAt ? <span className="text-xs text-slate-400 dark:text-slate-500">updated {panel.lastUpdatedAt.toLocaleTimeString()}</span> : null}
      </header>
      {panel.status === 'in-progress' && !panel.value ? <EmptyState /> : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No repo age data available.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-3">
          {panel.value.newest ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Newest</dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">{panel.value.newest.repo}</dd>
              <dd className="text-xs text-slate-500 dark:text-slate-400">{fmt(panel.value.newest.createdAt)}</dd>
            </div>
          ) : null}
          {panel.value.oldest ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Oldest</dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">{panel.value.oldest.repo}</dd>
              <dd className="text-xs text-slate-500 dark:text-slate-400">{fmt(panel.value.oldest.createdAt)}</dd>
            </div>
          ) : null}
        </dl>
      )}
    </section>
  )
}
