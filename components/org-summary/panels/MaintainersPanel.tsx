'use client'

import { useRef, useState } from 'react'
import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { MaintainersValue } from '@/lib/org-aggregation/aggregators/types'
import { HelpLabel } from '@/components/shared/HelpLabel'
import { EmptyState } from '../EmptyState'

const TOOLTIP = {
  unique:
    'Count of distinct maintainer tokens across OWNERS / MAINTAINERS / CODEOWNERS / GOVERNANCE.md files, deduplicated across the repo set. Team handles (`@org/team`) count as one token and are not expanded to member logins.',
  top:
    'Maintainers ranked by the number of repos that list them. Ties break alphabetically.',
} as const

const TOP_N = 10

interface Props {
  panel: AggregatePanel<MaintainersValue>
}

export function MaintainersPanel({ panel }: Props) {
  const partialCoverageLabel =
    panel.value && panel.contributingReposCount < panel.totalReposInRun
      ? `${panel.contributingReposCount} of ${panel.totalReposInRun} repos`
      : null

  return (
    <section
      aria-label="Maintainers"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Maintainers</h3>
        <div className="flex items-center gap-3">
          {panel.status === 'unavailable' ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">unavailable</span>
          ) : partialCoverageLabel ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">{partialCoverageLabel}</span>
          ) : null}
          {panel.lastUpdatedAt ? (
            <span
              className="text-xs text-slate-400 dark:text-slate-500"
              title={`Last updated ${panel.lastUpdatedAt.toLocaleTimeString()}`}
            >
              updated {panel.lastUpdatedAt.toLocaleTimeString()}
            </span>
          ) : null}
        </div>
      </header>

      {panel.status === 'in-progress' && !panel.value ? (
        <EmptyState />
      ) : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No OWNERS / MAINTAINERS / CODEOWNERS files were verified across this run.
        </p>
      ) : (
        <Body value={panel.value} />
      )}
    </section>
  )
}

function Body({ value }: { value: MaintainersValue }) {
  const unique = value.projectWide.length
  const teams = value.projectWide.filter((e) => e.kind === 'team').length
  const topEntries = value.projectWide.slice(0, TOP_N)
  const remaining = unique - topEntries.length

  return (
    <>
      <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Unique maintainers" value={String(unique)} helpText={TOOLTIP.unique} />
        <Stat label="Users" value={String(unique - teams)} />
        <Stat label="Team handles" value={String(teams)} />
      </dl>

      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <HelpLabel label={`Top ${Math.min(TOP_N, unique)} by repo coverage`} helpText={TOOLTIP.top} />
      </h4>
      <ul role="list" className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
        {topEntries.map((e) => (
          <MaintainerRow key={e.token} entry={e} />
        ))}
      </ul>
      {remaining > 0 ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          …and {remaining} more.
        </p>
      ) : null}
    </>
  )
}

function MaintainerRow({
  entry,
}: {
  entry: MaintainersValue['projectWide'][number]
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLLIElement>(null)

  return (
    <li ref={wrapperRef} className="relative py-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded px-1 -mx-1 hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <span className="flex items-center gap-2 truncate text-sm text-slate-800 dark:text-slate-200 dark:text-slate-100">
          <span className="truncate font-mono">{entry.token}</span>
          {entry.kind === 'team' ? (
            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 dark:text-sky-200">
              team
            </span>
          ) : null}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          {entry.reposListed.length} {entry.reposListed.length === 1 ? 'repo' : 'repos'}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3 w-3 transition-transform ${open ? '' : '-rotate-90'}`}
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
      </button>
      {open ? (
        <div className="mt-1.5 ml-1 rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/60">
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Listed in
          </p>
          <ul className="space-y-1">
            {entry.reposListed.map((repo) => (
              <li key={repo} className="text-xs text-slate-700 dark:text-slate-300 font-mono dark:text-slate-200">
                {repo}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  )
}

function Stat({ label, value, helpText }: { label: string; value: string; helpText?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <HelpLabel label={label} helpText={helpText} />
      </dt>
      <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  )
}
