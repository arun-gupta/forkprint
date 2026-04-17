'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { OrgAffiliationsValue } from '@/lib/org-aggregation/aggregators/types'
import { HelpLabel } from '@/components/shared/HelpLabel'
import { EmptyState } from '../EmptyState'

interface Props {
  panel: AggregatePanel<OrgAffiliationsValue>
}

const TOP_N = 10

export function OrgAffiliationsPanel({ panel }: Props) {
  return (
    <section
      aria-label="Org affiliations"
      className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-800 dark:bg-slate-900 dark:border-amber-800/60"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Org affiliations
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 dark:text-amber-200">
            Experimental
          </span>
        </h3>
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
          No org-affiliation data available across this run.
        </p>
      ) : (
        <Body value={panel.value} />
      )}
    </section>
  )
}

function Body({ value }: { value: OrgAffiliationsValue }) {
  const topOrgs = value.perOrg.slice(0, TOP_N)
  const remaining = value.perOrg.length - topOrgs.length

  return (
    <>
      <p className="mb-3 text-xs text-amber-700 dark:text-amber-400 dark:text-amber-300">
        Derived from publicly visible GitHub profile org membership. Not all contributors have public affiliations.
      </p>
      <dl className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="Attributed authors" value={String(value.attributedAuthorCount)} />
        <Stat label="Unattributed authors" value={String(value.unattributedAuthorCount)} />
      </dl>

      {topOrgs.length > 0 ? (
        <>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <HelpLabel label={`Top ${Math.min(TOP_N, value.perOrg.length)} orgs by commits`} helpText="Organizations ranked by total commits from their affiliated authors across the repo set." />
          </h4>
          <ul role="list" className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
            {topOrgs.map((o) => (
              <li key={o.org} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate text-sm font-mono text-slate-800 dark:text-slate-200 dark:text-slate-100">{o.org}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {o.commits.toLocaleString()} commits
                </span>
              </li>
            ))}
          </ul>
          {remaining > 0 ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">…and {remaining} more.</p>
          ) : null}
        </>
      ) : null}
    </>
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
