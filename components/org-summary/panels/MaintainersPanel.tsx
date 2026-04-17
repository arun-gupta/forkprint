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
  const [expanded, setExpanded] = useState(true)
  const partialCoverageLabel =
    panel.value && panel.contributingReposCount < panel.totalReposInRun
      ? `${panel.contributingReposCount} of ${panel.totalReposInRun} repos`
      : null
  const summary = buildSummary(panel.value)

  return (
    <section
      aria-label="Maintainers"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="maintainers-panel"
    >
      <header className={`flex flex-wrap items-center justify-between gap-2 ${expanded ? 'mb-3' : ''}`}>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? 'Collapse Maintainers' : 'Expand Maintainers'}
            aria-expanded={expanded}
            title={expanded ? 'Collapse' : 'Expand'}
            data-testid="maintainers-panel-toggle"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <PanelChevron expanded={expanded} />
          </button>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Maintainers</h3>
          {summary ? (
            <span
              className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              data-testid="maintainers-panel-summary"
            >
              {summary}
            </span>
          ) : null}
        </div>
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

      {expanded ? (
        panel.status === 'in-progress' && !panel.value ? (
          <EmptyState />
        ) : panel.status === 'unavailable' || !panel.value ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No OWNERS / MAINTAINERS / CODEOWNERS files were verified across this run.
          </p>
        ) : (
          <Body value={panel.value} />
        )
      ) : null}
    </section>
  )
}

function buildSummary(value: MaintainersValue | null): string | null {
  if (!value) return null
  const unique = value.projectWide.length
  if (unique === 0) return null
  const teams = value.projectWide.filter((e) => e.kind === 'team').length
  const uniqueLabel = `${unique} maintainer${unique === 1 ? '' : 's'}`
  if (teams === 0) return uniqueLabel
  const teamsLabel = `${teams} team${teams === 1 ? '' : 's'}`
  return `${uniqueLabel} · ${teamsLabel}`
}

function PanelChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 transition-transform ${expanded ? '' : '-rotate-90'}`}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
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
