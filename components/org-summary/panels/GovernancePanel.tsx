'use client'

import { useState } from 'react'
import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { GovernanceValue } from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props {
  panel: AggregatePanel<GovernanceValue>
}

export function GovernancePanel({ panel }: Props) {
  const [expanded, setExpanded] = useState(true)
  const summary = buildSummary(panel.value)
  return (
    <section
      aria-label="GOVERNANCE.md coverage"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="governance-panel"
    >
      <header className={`flex flex-wrap items-center justify-between gap-2 ${expanded ? 'mb-3' : ''}`}>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? 'Collapse GOVERNANCE.md coverage' : 'Expand GOVERNANCE.md coverage'}
            aria-expanded={expanded}
            title={expanded ? 'Collapse' : 'Expand'}
            data-testid="governance-panel-toggle"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <PanelChevron expanded={expanded} />
          </button>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">GOVERNANCE.md coverage</h3>
          {summary ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${summary.className}`}
              data-testid="governance-panel-summary"
            >
              {summary.label}
            </span>
          ) : null}
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
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No governance data available across this run.
          </p>
        ) : (
          <Body value={panel.value} />
        )
      ) : null}
    </section>
  )
}

function buildSummary(value: GovernanceValue | null): { label: string; className: string } | null {
  if (!value) return null
  const total = value.perRepo.length
  if (total === 0) return null
  const withGovernance = value.perRepo.filter((r) => r.present).length
  const label = `${withGovernance} of ${total} repos`
  const className =
    withGovernance === total
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  return { label, className }
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

function Body({ value }: { value: GovernanceValue }) {
  const withGovernance = value.perRepo.filter((r) => r.present).length

  return (
    <>
      <dl className="mb-4 grid grid-cols-2 gap-3">
        {value.orgLevel ? (
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Org-level (.github)</dt>
            <dd className="text-lg font-semibold">
              {value.orgLevel.present ? (
                <span className="text-emerald-700 dark:text-emerald-400 dark:text-emerald-300">Present</span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">Not found</span>
              )}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Repos with GOVERNANCE.md</dt>
          <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {withGovernance} of {value.perRepo.length}
          </dd>
        </div>
      </dl>

      <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
        {value.perRepo.map((r) => (
          <li key={r.repo} className="flex items-center justify-between gap-3 py-2">
            <span className="truncate text-sm text-slate-800 dark:text-slate-200 dark:text-slate-100">{r.repo}</span>
            {r.present ? (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 dark:text-emerald-200">
                present
              </span>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
