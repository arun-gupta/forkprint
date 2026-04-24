'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import { EmptyState } from './EmptyState'

interface Props {
  label: string
  ariaLabel?: string
  panel: AggregatePanel<unknown>
  noDataMessage: string
  children: React.ReactNode
}

export function PanelShell({ label, ariaLabel, panel, noDataMessage, children }: Props) {
  return (
    <section
      aria-label={ariaLabel ?? label}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</h3>
        {panel.lastUpdatedAt ? (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            updated {panel.lastUpdatedAt.toLocaleTimeString()}
          </span>
        ) : null}
      </header>

      {panel.status === 'in-progress' && !panel.value ? (
        <EmptyState />
      ) : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{noDataMessage}</p>
      ) : (
        children
      )}
    </section>
  )
}
