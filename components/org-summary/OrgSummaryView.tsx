'use client'

import type {
  OrgSummaryViewModel,
} from '@/lib/org-aggregation/types'
import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { ContributorDiversityValue } from '@/lib/org-aggregation/aggregators/types'
import { ContributorDiversityPanel } from './panels/ContributorDiversityPanel'
import { PerRepoStatusList } from './PerRepoStatusList'
import { RunStatusHeader } from './RunStatusHeader'

interface Props {
  org: string
  view: OrgSummaryViewModel
  onCancel?: () => void
  onRetry?: (repo: string) => void
  notificationToggle?: React.ReactNode
}

export function OrgSummaryView({ org, view, onCancel, onRetry, notificationToggle }: Props) {
  const contributorDiversity = view.panels['contributor-diversity'] as
    | AggregatePanel<ContributorDiversityValue>
    | undefined

  return (
    <div className="space-y-4">
      <RunStatusHeader
        org={org}
        header={view.status}
        onCancel={onCancel}
        notificationToggle={notificationToggle}
      />

      {contributorDiversity ? <ContributorDiversityPanel panel={contributorDiversity} /> : null}

      <PerRepoStatusList entries={view.perRepoStatusList} onRetry={onRetry} />

      {view.missingData.length > 0 ? (
        <section
          aria-label="Missing data"
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Missing data ({view.missingData.length})
          </h3>
          <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
            {view.missingData.map((m) => (
              <li key={`${m.repo}:${m.signalKey}`} className="py-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="font-medium">{m.repo}</span>{' '}
                <span className="text-slate-500 dark:text-slate-400">· {m.signalKey}</span>{' '}
                <span className="text-slate-500 dark:text-slate-400">— {m.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
