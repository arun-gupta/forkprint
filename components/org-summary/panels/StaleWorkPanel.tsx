'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { StaleWorkValue } from '@/lib/org-aggregation/aggregators/types'
import { PanelShell } from '../PanelShell'

interface Props { panel: AggregatePanel<StaleWorkValue> }

export function StaleWorkPanel({ panel }: Props) {
  return (
    <PanelShell label="Stale work" panel={panel} noDataMessage="No stale work data available.">
      {panel.value ? (
        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Open issues" value={panel.value.totalOpenIssues.toLocaleString()} />
          <Stat label="Open PRs (90d)" value={panel.value.totalOpenPullRequests.toLocaleString()} />
          <Stat label="Stale issue ratio" value={panel.value.weightedStaleIssueRatio !== null ? `${(panel.value.weightedStaleIssueRatio * 100).toFixed(1)}%` : '—'} />
        </dl>
      ) : null}
    </PanelShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-xl font-semibold text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  )
}
