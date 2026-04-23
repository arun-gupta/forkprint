'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { ProjectFootprintValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props {
  panel: AggregatePanel<ProjectFootprintValue>
}

export function ProjectFootprintPanel({ panel }: Props) {
  return (
    <section
      aria-label="Project footprint"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Project footprint</h3>
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
          No footprint data available across this run.
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total stars" value={panel.value.totalStars} />
          <Stat label="Total forks" value={panel.value.totalForks} />
          <Stat label="Total watchers" value={panel.value.totalWatchers} />
          <Stat
            label="Unique contributors (365d)"
            value={panel.value.totalContributors}
            tooltip="Unique contributors across all analyzed repos in the last 365 days"
          />
        </dl>
      )}
    </section>
  )
}

function Stat({
  label,
  value,
  tooltip,
}: {
  label: string
  value: number | 'unavailable'
  tooltip?: string
}) {
  return (
    <div title={tooltip}>
      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        {value === 'unavailable' ? (
          <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
        ) : (
          value.toLocaleString()
        )}
      </dd>
    </div>
  )
}
