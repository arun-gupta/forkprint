'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { GovernanceValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props {
  panel: AggregatePanel<GovernanceValue>
}

export function GovernancePanel({ panel }: Props) {
  return (
    <section
      aria-label="Governance"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Governance</h3>
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
          No governance data available across this run.
        </p>
      ) : (
        <Body value={panel.value} />
      )}
    </section>
  )
}

function Body({ value }: { value: GovernanceValue }) {
  const withGovernance = value.perRepo.filter((r) => r.present).length

  return (
    <>
      <dl className="mb-4 grid grid-cols-2 gap-3">
        {value.orgLevel ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Org-level (.github)</dt>
            <dd className="text-lg font-semibold">
              {value.orgLevel.present ? (
                <span className="text-emerald-700 dark:text-emerald-400 dark:text-emerald-300">Present</span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">Not found</span>
              )}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Repos with GOVERNANCE.md</dt>
          <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {withGovernance} of {value.perRepo.length}
          </dd>
        </div>
      </dl>

      <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
        {value.perRepo.map((r) => (
          <li key={r.repo} className="flex items-center justify-between gap-3 py-2">
            <span className="truncate text-sm text-slate-800 dark:text-slate-200 dark:text-slate-100">{r.repo}</span>
            {r.present ? (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 dark:text-emerald-200">
                present
              </span>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
