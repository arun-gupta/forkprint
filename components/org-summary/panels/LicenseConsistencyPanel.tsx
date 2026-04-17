'use client'

import { useState } from 'react'
import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { LicenseConsistencyValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props { panel: AggregatePanel<LicenseConsistencyValue> }

type OsiClassification = 'non-osi' | 'osi'

const GROUP_ORDER: OsiClassification[] = ['non-osi', 'osi']

const DEFAULT_OPEN: Record<OsiClassification, boolean> = {
  'non-osi': true,
  osi: false,
}

const GROUP_CONFIG: Record<
  OsiClassification,
  { label: string; icon: string; pillClassName: string; groupAriaLabel: string; headerBorderClassName: string }
> = {
  'non-osi': {
    label: 'Non-OSI-approved',
    icon: '⚠',
    pillClassName: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    groupAriaLabel: 'Repos using non-OSI-approved licenses',
    headerBorderClassName: 'border-l-4 border-amber-500',
  },
  osi: {
    label: 'OSI-approved',
    icon: '✓',
    pillClassName: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
    groupAriaLabel: 'Repos using OSI-approved licenses',
    headerBorderClassName: 'border-l-4 border-emerald-500',
  },
}

export function LicenseConsistencyPanel({ panel }: Props) {
  const [expanded, setExpanded] = useState(true)
  return (
    <section
      aria-label="License consistency"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="license-consistency-panel"
    >
      <header className={`flex flex-wrap items-center justify-between gap-2 ${expanded ? 'mb-3' : ''}`}>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? 'Collapse License consistency' : 'Expand License consistency'}
            aria-expanded={expanded}
            title={expanded ? 'Collapse' : 'Expand'}
            data-testid="license-consistency-panel-toggle"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <PanelChevron expanded={expanded} />
          </button>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">License consistency</h3>
        </div>
        {panel.lastUpdatedAt ? (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            updated {panel.lastUpdatedAt.toLocaleTimeString()}
          </span>
        ) : null}
      </header>
      {expanded ? (
        panel.status === 'in-progress' && !panel.value ? (
          <EmptyState />
        ) : panel.status === 'unavailable' || !panel.value ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No licensing data available.</p>
        ) : (
          <PanelBody value={panel.value} contributingReposCount={panel.contributingReposCount} totalReposInRun={panel.totalReposInRun} />
        )
      ) : null}
    </section>
  )
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

function PanelBody({
  value,
  contributingReposCount,
  totalReposInRun,
}: {
  value: LicenseConsistencyValue
  contributingReposCount: number
  totalReposInRun: number
}) {
  const grouped = groupByOsi(value.perRepo)
  const counts: Record<OsiClassification, number> = {
    'non-osi': grouped['non-osi'].length,
    osi: grouped.osi.length,
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700 dark:text-slate-300 dark:text-slate-200">
        {contributingReposCount} of {totalReposInRun} repos contributed
        {value.nonOsiCount > 0 ? (
          <>
            {' · '}
            <span className="text-amber-700 dark:text-amber-400 dark:text-amber-300">
              {value.nonOsiCount} use non-OSI-approved licenses
            </span>
          </>
        ) : (
          <>
            {' · '}
            <span className="text-emerald-700 dark:text-emerald-400 dark:text-emerald-300">All use OSI-approved licenses</span>
          </>
        )}
      </p>
      {GROUP_ORDER.filter((c) => grouped[c].length > 0).map((classification) => (
        <GroupSection
          key={classification}
          classification={classification}
          repos={grouped[classification]}
          defaultOpen={DEFAULT_OPEN[classification]}
          count={counts[classification]}
        />
      ))}
    </div>
  )
}

function GroupSection({
  classification,
  repos,
  defaultOpen,
  count,
}: {
  classification: OsiClassification
  repos: { repo: string; spdxId: string; osiApproved: boolean }[]
  defaultOpen: boolean
  count: number
}) {
  const config = GROUP_CONFIG[classification]
  return (
    <details
      open={defaultOpen}
      className={`group rounded-md bg-slate-50 dark:bg-slate-800/40 ${config.headerBorderClassName} dark:bg-slate-800/60 `}
      data-testid={`license-consistency-group-${classification}`}
    >
      <summary
        className="flex cursor-pointer select-none items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-800 list-none dark:text-slate-100 [&::-webkit-details-marker]:hidden"
        aria-label={config.groupAriaLabel}
      >
        <GroupChevron />
        <span aria-hidden="true">{config.icon}</span>
        <span>{config.label}</span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${config.pillClassName}`}>
          {count}
        </span>
      </summary>
      <ul role="list" className="divide-y divide-slate-200 px-3 pb-1.5 dark:divide-slate-700">
        {repos.map((r) => (
          <RepoRow key={r.repo} repo={r.repo} spdxId={r.spdxId} classification={classification} />
        ))}
      </ul>
    </details>
  )
}

function GroupChevron() {
  return (
    <svg
      aria-hidden="true"
      data-testid="group-chevron"
      className="h-4 w-4 shrink-0 -rotate-90 text-slate-400 transition-transform group-open:rotate-0 dark:text-slate-500"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function RepoRow({
  repo,
  spdxId,
  classification,
}: {
  repo: string
  spdxId: string
  classification: OsiClassification
}) {
  return (
    <li
      className="flex flex-wrap items-baseline justify-between gap-2 py-1"
      data-testid={`license-consistency-row-${classification}`}
    >
      <a
        href={`https://github.com/${repo}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-slate-900 hover:underline dark:text-slate-100"
      >
        {repo}
      </a>
      <span className="text-xs text-slate-500 dark:text-slate-400">{spdxId}</span>
    </li>
  )
}

function groupByOsi(
  perRepo: { repo: string; spdxId: string; osiApproved: boolean }[],
): Record<OsiClassification, { repo: string; spdxId: string; osiApproved: boolean }[]> {
  const groups: Record<OsiClassification, { repo: string; spdxId: string; osiApproved: boolean }[]> = {
    'non-osi': [],
    osi: [],
  }
  for (const r of perRepo) {
    groups[r.osiApproved ? 'osi' : 'non-osi'].push(r)
  }
  return groups
}
