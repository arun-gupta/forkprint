'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { AdoptersValue } from '@/lib/org-aggregation/aggregators/types'
import { PanelShell } from '../PanelShell'

interface Props {
  panel: AggregatePanel<AdoptersValue>
}

export function AdoptersPanel({ panel }: Props) {
  return (
    <PanelShell label="Adopters" panel={panel} noDataMessage="No ADOPTERS.md found across this run.">
      <div>
        <p className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-200">
          ADOPTERS.md found in <span className="font-medium">{panel.value!.flagshipUsed}</span>
        </p>
        {panel.value!.entries.length > 0 ? (
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-300">
            {panel.value!.entries.map((entry, i) => (
              <li key={i}>{entry}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Full adopter parsing deferred to a future issue.
          </p>
        )}
      </div>
    </PanelShell>
  )
}
