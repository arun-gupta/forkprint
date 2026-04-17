'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { LanguagesValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props { panel: AggregatePanel<LanguagesValue> }

export function LanguagesPanel({ panel }: Props) {
  return (
    <section aria-label="Languages" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Languages</h3>
        {panel.lastUpdatedAt ? <span className="text-xs text-slate-400 dark:text-slate-500">updated {panel.lastUpdatedAt.toLocaleTimeString()}</span> : null}
      </header>
      {panel.status === 'in-progress' && !panel.value ? <EmptyState /> : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No language data available.</p>
      ) : (
        <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
          {panel.value.perLanguage.map((l) => (
            <li key={l.language} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-slate-800 dark:text-slate-200 dark:text-slate-100">{l.language}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{l.repoCount} {l.repoCount === 1 ? 'repo' : 'repos'}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
