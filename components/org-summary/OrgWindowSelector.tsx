'use client'

import type { ContributorDiversityWindow } from '@/lib/org-aggregation/aggregators/types'
import { CONTRIBUTOR_DIVERSITY_WINDOWS } from '@/lib/org-aggregation/aggregators/types'

const WINDOW_LABEL: Record<ContributorDiversityWindow, string> = {
  30: '30d',
  60: '60d',
  90: '90d',
  180: '180d',
  365: '12m',
}

interface Props {
  selected: ContributorDiversityWindow
  onChange: (w: ContributorDiversityWindow) => void
}

export function OrgWindowSelector({ selected, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400">Time window:</span>
      <div
        className="inline-flex overflow-hidden rounded border border-slate-300 dark:border-slate-700"
        role="tablist"
        aria-label="Analysis time window"
      >
        {CONTRIBUTOR_DIVERSITY_WINDOWS.map((w) => {
          const isActive = w === selected
          return (
            <button
              key={w}
              type="button"
              role="tab"
              aria-selected={isActive}
              title={`Last ${w} days`}
              onClick={() => onChange(w)}
              className={
                isActive
                  ? 'bg-sky-600 px-2 py-0.5 text-xs font-medium text-white dark:bg-sky-500'
                  : 'bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }
            >
              {WINDOW_LABEL[w]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
