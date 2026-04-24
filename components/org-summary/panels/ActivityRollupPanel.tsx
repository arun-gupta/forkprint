'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { ActivityRollupValue } from '@/lib/org-aggregation/aggregators/types'
import { PanelShell } from '../PanelShell'

interface Props {
  panel: AggregatePanel<ActivityRollupValue>
}

export function ActivityRollupPanel({ panel }: Props) {
  return (
    <PanelShell label="Activity rollup" panel={panel} noDataMessage="No activity data available across this run.">
      <Body value={panel.value!} />
    </PanelShell>
  )
}

function Body({ value }: { value: ActivityRollupValue }) {
  return (
    <>
      <dl className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Commits (90d)" value={value.totalCommits12mo.toLocaleString()} />
        <Stat label="PRs merged (90d)" value={value.totalPrsMerged12mo.toLocaleString()} />
        <Stat label="Issues closed (90d)" value={value.totalIssuesClosed12mo.toLocaleString()} />
      </dl>
      {value.mostActiveRepo || value.leastActiveRepo ? (
        <div className="grid grid-cols-2 gap-3">
          {value.mostActiveRepo ? (
            <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Most active</p>
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200 dark:text-slate-100">{value.mostActiveRepo.repo}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{value.mostActiveRepo.commits} commits</p>
            </div>
          ) : null}
          {value.leastActiveRepo ? (
            <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Least active</p>
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200 dark:text-slate-100">{value.leastActiveRepo.repo}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{value.leastActiveRepo.commits} commits</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
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
