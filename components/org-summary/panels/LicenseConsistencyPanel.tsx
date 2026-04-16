'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { LicenseConsistencyValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props { panel: AggregatePanel<LicenseConsistencyValue> }

export function LicenseConsistencyPanel({ panel }: Props) {
  return (
    <section aria-label="License consistency" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">License consistency</h3>
        {panel.lastUpdatedAt ? <span className="text-xs text-slate-400 dark:text-slate-500">updated {panel.lastUpdatedAt.toLocaleTimeString()}</span> : null}
      </header>
      {panel.status === 'in-progress' && !panel.value ? <EmptyState /> : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No licensing data available.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">{panel.value.nonOsiCount > 0 ? <span className="text-amber-700 dark:text-amber-400">{panel.value.nonOsiCount} repo(s) use non-OSI-approved licenses</span> : <span className="text-emerald-700 dark:text-emerald-400">All repos use OSI-approved licenses</span>}</p>
          <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
            {panel.value.perLicense.map((l) => (
              <li key={l.spdxId} className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-slate-800 dark:text-slate-200">{l.spdxId}{!l.osiApproved ? <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">non-OSI</span> : null}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{l.count} {l.count === 1 ? 'repo' : 'repos'}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
