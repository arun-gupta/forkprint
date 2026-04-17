'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { ActivityRollupValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props {
  panel: AggregatePanel<ActivityRollupValue>
}

export function ActivityRollupPanel({ panel }: Props) {
  return (
    <section
      aria-label="Activity rollup"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Activity rollup</h3>
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
          No activity data available across this run.
        </p>
      ) : (
        <Body value={panel.value} />
      )}
    </section>
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
