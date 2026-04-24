'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { ProjectFootprintValue } from '@/lib/org-aggregation/aggregators/types'
import type { Unavailable } from '@/lib/analyzer/analysis-result'
import { PanelShell } from '../PanelShell'

interface Props {
  panel: AggregatePanel<ProjectFootprintValue>
}

export function ProjectFootprintPanel({ panel }: Props) {
  return (
    <PanelShell label="Project footprint" panel={panel} noDataMessage="No footprint data available across this run.">
      {panel.value ? (
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
      ) : null}
    </PanelShell>
  )
}

function Stat({
  label,
  value,
  tooltip,
}: {
  label: string
  value: number | Unavailable
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
