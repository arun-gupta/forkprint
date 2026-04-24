'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { RepoAgeValue } from '@/lib/org-aggregation/aggregators/types'
import { PanelShell } from '../PanelShell'

interface Props { panel: AggregatePanel<RepoAgeValue> }

function fmt(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(d)
}

export function RepoAgePanel({ panel }: Props) {
  return (
    <PanelShell label="Repo age" panel={panel} noDataMessage="No repo age data available.">
      {panel.value ? (
        <dl className="grid grid-cols-2 gap-3">
          {panel.value.newest ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Newest</dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">{panel.value.newest.repo}</dd>
              <dd className="text-xs text-slate-500 dark:text-slate-400">{fmt(panel.value.newest.createdAt)}</dd>
            </div>
          ) : null}
          {panel.value.oldest ? (
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Oldest</dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-slate-100">{panel.value.oldest.repo}</dd>
              <dd className="text-xs text-slate-500 dark:text-slate-400">{fmt(panel.value.oldest.createdAt)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </PanelShell>
  )
}
