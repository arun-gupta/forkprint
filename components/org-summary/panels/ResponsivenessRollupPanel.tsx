'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { ResponsivenessRollupValue } from '@/lib/org-aggregation/aggregators/types'
import { HelpLabel } from '@/components/shared/HelpLabel'
import { PanelShell } from '../PanelShell'

interface Props {
  panel: AggregatePanel<ResponsivenessRollupValue>
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${hours.toFixed(1)}h`
  const days = hours / 24
  return `${days.toFixed(1)}d`
}

export function ResponsivenessRollupPanel({ panel }: Props) {
  return (
    <PanelShell
      label="Responsiveness"
      ariaLabel="Responsiveness rollup"
      panel={panel}
      noDataMessage="No responsiveness data available across this run."
    >
      {panel.value ? (
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <HelpLabel
                label="First response (median)"
                helpText="Weighted median time to first response on issues across the org. Weighted by each repo's open issue count."
              />
            </dt>
            <dd className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {panel.value.weightedMedianFirstResponseHours !== null
                ? formatHours(panel.value.weightedMedianFirstResponseHours)
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <HelpLabel
                label="PR merge (median)"
                helpText="Weighted median time to merge pull requests across the org. Weighted by each repo's merged PR count."
              />
            </dt>
            <dd className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {panel.value.weightedMedianPrMergeHours !== null
                ? formatHours(panel.value.weightedMedianPrMergeHours)
                : '—'}
            </dd>
          </div>
        </dl>
      ) : null}
    </PanelShell>
  )
}
