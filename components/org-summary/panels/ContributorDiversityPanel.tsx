'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { ContributorDiversityValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props {
  panel: AggregatePanel<ContributorDiversityValue>
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

export function ContributorDiversityPanel({ panel }: Props) {
  return (
    <section
      aria-label="Contributor diversity"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Contributor diversity
        </h3>
        {panel.status === 'in-progress' ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            in progress ({panel.contributingReposCount} of {panel.totalReposInRun})
          </span>
        ) : panel.status === 'final' ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {panel.contributingReposCount} of {panel.totalReposInRun} repos
          </span>
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400">unavailable</span>
        )}
      </header>

      {panel.status === 'in-progress' && !panel.value ? (
        <EmptyState />
      ) : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Insufficient verified public data to compute project-wide contributor diversity.
        </p>
      ) : (
        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Top-20% share" value={pct(panel.value.topTwentyPercentShare)} />
          <Stat label="Elephant factor" value={String(panel.value.elephantFactor)} />
          <Stat label="Unique authors" value={String(panel.value.uniqueAuthorsAcrossOrg)} />
        </dl>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  )
}
