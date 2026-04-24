'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { BusFactorValue } from '@/lib/org-aggregation/aggregators/types'
import { PanelShell } from '../PanelShell'

interface Props { panel: AggregatePanel<BusFactorValue> }

export function BusFactorPanel({ panel }: Props) {
  return (
    <PanelShell label="Bus factor" panel={panel} noDataMessage="No commit author data available.">
      {panel.value!.highConcentrationRepos.length === 0 ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400 dark:text-emerald-300">No repos have a single author contributing &gt;{(panel.value!.threshold * 100).toFixed(0)}% of commits.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-amber-700 dark:text-amber-400 dark:text-amber-300">{panel.value!.highConcentrationRepos.length} repo(s) have a single author contributing &gt;{(panel.value!.threshold * 100).toFixed(0)}% of commits</p>
          <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
            {panel.value!.highConcentrationRepos.map((r) => (
              <li key={r.repo} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate text-sm text-slate-800 dark:text-slate-200 dark:text-slate-100">{r.repo}</span>
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400 dark:text-amber-300">{(r.topAuthorShare * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </PanelShell>
  )
}
