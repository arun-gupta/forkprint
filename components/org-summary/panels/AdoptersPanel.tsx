'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { AdoptersValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props {
  panel: AggregatePanel<AdoptersValue>
}

export function AdoptersPanel({ panel }: Props) {
  return (
    <section
      aria-label="Adopters"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Adopters</h3>
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
          No ADOPTERS.md found across this run.
        </p>
      ) : (
        <div>
          <p className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-200">
            ADOPTERS.md found in <span className="font-medium">{panel.value.flagshipUsed}</span>
          </p>
          {panel.value.entries.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-300">
              {panel.value.entries.map((entry, i) => (
                <li key={i}>{entry}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Full adopter parsing deferred to a future issue.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
