'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { StaleWorkValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props { panel: AggregatePanel<StaleWorkValue> }

export function StaleWorkPanel({ panel }: Props) {
  return (
    <section aria-label="Stale work" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Stale work</h3>
        {panel.lastUpdatedAt ? <span className="text-xs text-slate-400 dark:text-slate-500">updated {panel.lastUpdatedAt.toLocaleTimeString()}</span> : null}
      </header>
      {panel.status === 'in-progress' && !panel.value ? <EmptyState /> : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No stale work data available.</p>
      ) : (
        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Open issues" value={panel.value.totalOpenIssues.toLocaleString()} />
          <Stat label="Open PRs (90d)" value={panel.value.totalOpenPullRequests.toLocaleString()} />
          <Stat label="Stale issue ratio" value={panel.value.weightedStaleIssueRatio !== null ? `${(panel.value.weightedStaleIssueRatio * 100).toFixed(1)}%` : '—'} />
        </dl>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (<div><dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt><dd className="text-xl font-semibold text-slate-900 dark:text-slate-100">{value}</dd></div>)
}
