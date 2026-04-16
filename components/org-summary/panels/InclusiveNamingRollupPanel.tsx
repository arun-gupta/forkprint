'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { InclusiveNamingRollupValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props { panel: AggregatePanel<InclusiveNamingRollupValue> }

export function InclusiveNamingRollupPanel({ panel }: Props) {
  return (
    <section aria-label="Inclusive naming" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Inclusive naming</h3>
        {panel.lastUpdatedAt ? <span className="text-xs text-slate-400 dark:text-slate-500">updated {panel.lastUpdatedAt.toLocaleTimeString()}</span> : null}
      </header>
      {panel.status === 'in-progress' && !panel.value ? <EmptyState /> : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No inclusive naming data available.</p>
      ) : (
        <>
          <dl className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Tier 1" value={panel.value.tier1} tone={panel.value.tier1 > 0 ? 'bad' : 'good'} />
            <Stat label="Tier 2" value={panel.value.tier2} tone={panel.value.tier2 > 0 ? 'warn' : 'good'} />
            <Stat label="Tier 3" value={panel.value.tier3} tone="neutral" />
            <Stat label="Repos with violations" value={panel.value.reposWithAnyViolation} tone={panel.value.reposWithAnyViolation > 0 ? 'warn' : 'good'} />
          </dl>
        </>
      )}
    </section>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'good' | 'warn' | 'bad' | 'neutral' }) {
  const toneClass = tone === 'good' ? 'text-emerald-700 dark:text-emerald-400' : tone === 'bad' ? 'text-rose-700 dark:text-rose-400' : tone === 'warn' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-lg font-semibold ${toneClass}`}>{value}</dd>
    </div>
  )
}
