'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { ReleaseCadenceValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props {
  panel: AggregatePanel<ReleaseCadenceValue>
}

export function ReleaseCadencePanel({ panel }: Props) {
  return (
    <section
      aria-label="Release cadence"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Release cadence</h3>
        {panel.lastUpdatedAt ? (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            updated {panel.lastUpdatedAt.toLocaleTimeString()}
          </span>
        ) : null}
      </header>

      {panel.status === 'in-progress' && !panel.value ? (
        <EmptyState />
      ) : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No release data available across this run.
        </p>
      ) : (
        <Body value={panel.value} />
      )}
    </section>
  )
}

function Body({ value }: { value: ReleaseCadenceValue }) {
  return (
    <>
      <dl className="mb-4">
        <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total releases (12 months)</dt>
        <dd className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value.totalReleases12mo.toLocaleString()}</dd>
      </dl>

      {value.perFlagship.length > 0 ? (
        <>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Flagship repos</h4>
          <ul role="list" className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
            {value.perFlagship.map((f) => (
              <li key={f.repo} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate text-sm text-slate-800 dark:text-slate-200 dark:text-slate-100">{f.repo}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {f.releases12mo} releases
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  )
}
