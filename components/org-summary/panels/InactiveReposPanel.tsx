'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { InactiveReposValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props { panel: AggregatePanel<InactiveReposValue> }

export function InactiveReposPanel({ panel }: Props) {
  return (
    <section aria-label="Inactive repos" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Inactive repos</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Repos with no commits on the default branch in the last 90 days. Pushes to other branches (release tags, maintenance branches, dependabot PRs) are not counted, so a repo flagged here may still show a recent <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] dark:bg-slate-800">Last pushed</code> date in the inventory.
          </p>
        </div>
        {panel.lastUpdatedAt ? <span className="text-xs text-slate-400 dark:text-slate-500">updated {panel.lastUpdatedAt.toLocaleTimeString()}</span> : null}
      </header>
      {panel.status === 'in-progress' && !panel.value ? <EmptyState /> : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No activity data available.</p>
      ) : panel.value.repos.length === 0 ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400 dark:text-emerald-300">All repos have recent default-branch commit activity.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-amber-700 dark:text-amber-400 dark:text-amber-300">
            {panel.value.repos.length} repo(s) with no commits on the default branch in the last 90 days
          </p>
          <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
            {panel.value.repos.map((r) => (
              <li key={r.repo} className="py-2 text-sm text-slate-800 dark:text-slate-200 dark:text-slate-100">{r.repo}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
