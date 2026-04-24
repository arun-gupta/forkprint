'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { LanguagesValue } from '@/lib/org-aggregation/aggregators/types'
import { PanelShell } from '../PanelShell'

interface Props { panel: AggregatePanel<LanguagesValue> }

export function LanguagesPanel({ panel }: Props) {
  return (
    <PanelShell label="Languages" panel={panel} noDataMessage="No language data available.">
      {panel.value ? (
        <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
          {panel.value.perLanguage.map((l) => (
            <li key={l.language} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-slate-800 dark:text-slate-200 dark:text-slate-100">{l.language}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{l.repoCount} {l.repoCount === 1 ? 'repo' : 'repos'}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </PanelShell>
  )
}
