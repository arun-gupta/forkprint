'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { ReleaseCadenceValue } from '@/lib/org-aggregation/aggregators/types'
import { PanelShell } from '../PanelShell'

interface Props {
  panel: AggregatePanel<ReleaseCadenceValue>
}

export function ReleaseCadencePanel({ panel }: Props) {
  return (
    <PanelShell label="Release cadence" panel={panel} noDataMessage="No release data available across this run.">
      <Body value={panel.value!} />
    </PanelShell>
  )
}

function Body({ value }: { value: ReleaseCadenceValue }) {
  return (
    <>
      <dl className="mb-4">
        <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total releases (12 months)</dt>
        <dd className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value.totalReleases12mo.toLocaleString()}</dd>
      </dl>

      {value.perFlagship.length > 0 ? (
        <>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Flagship repos</h4>
          <ul role="list" className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
            {value.perFlagship.map((f) => (
              <li key={f.repo} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate text-sm text-slate-800 dark:text-slate-200 dark:text-slate-100">{f.repo}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {f.releases12mo} releases
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  )
}
