'use client'

import { useState } from 'react'
import type { AggregatePanel } from '@/lib/org-aggregation/types'
import {
  ORG_RECOMMENDATION_BUCKET_ORDER,
  type OrgRecommendationBucket,
  type OrgRecommendationEntry,
  type OrgRecommendationsValue,
} from '@/lib/org-aggregation/aggregators/types'
import { EmptyState } from '../EmptyState'

interface Props {
  panel: AggregatePanel<OrgRecommendationsValue>
}

const BUCKET_COLORS: Record<OrgRecommendationBucket, string> = {
  Activity: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  Responsiveness: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  Contributors: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  Documentation: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  Security: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
}

export function OrgRecommendationsPanel({ panel }: Props) {
  const [expanded, setExpanded] = useState(true)

  return (
    <section
      aria-label="Top systemic issues across the analyzed repos"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="org-recommendations-panel"
    >
      <header className={`flex flex-wrap items-center justify-between gap-2 ${expanded ? 'mb-3' : ''}`}>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? 'Collapse recommendations' : 'Expand recommendations'}
            aria-expanded={expanded}
            title={expanded ? 'Collapse' : 'Expand'}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <PanelChevron expanded={expanded} />
          </button>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Top systemic issues
          </h3>
          {panel.value && panel.value.items.length > 0 ? (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {panel.value.items.length} recommendation{panel.value.items.length === 1 ? '' : 's'}
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
            No recommendation data available across this run.
          </p>
        ) : panel.value.items.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No systemic issues found across the {panel.value.analyzedReposCount} analyzed repos.
          </p>
        ) : (
          <Body value={panel.value} />
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

function Body({ value }: { value: OrgRecommendationsValue }) {
  const grouped = new Map<OrgRecommendationBucket, OrgRecommendationEntry[]>()
  for (const entry of value.items) {
    const arr = grouped.get(entry.bucket) ?? []
    arr.push(entry)
    grouped.set(entry.bucket, arr)
  }

  return (
    <div className="space-y-4">
      {ORG_RECOMMENDATION_BUCKET_ORDER.filter((b) => grouped.has(b)).map((bucket) => {
        const entries = grouped.get(bucket)!
        return (
          <div key={bucket}>
            <div className="mb-2 flex items-center gap-2">
              <h4
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${BUCKET_COLORS[bucket]}`}
              >
                {bucket}
              </h4>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {entries.length}
              </span>
            </div>
            <ul role="list" className="space-y-2">
              {entries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  analyzedReposCount={value.analyzedReposCount}
                />
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function EntryCard({
  entry,
  analyzedReposCount,
}: {
  entry: OrgRecommendationEntry
  analyzedReposCount: number
}) {
  const [drillOpen, setDrillOpen] = useState(false)
  return (
    <li className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex flex-wrap items-start gap-2">
        <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-mono font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {entry.id}
        </span>
        <p className="min-w-0 flex-1 text-sm text-slate-800 dark:text-slate-100">{entry.title}</p>
        <span className="shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">
          {entry.affectedRepoCount} of {analyzedReposCount} repos
        </span>
      </div>
      <button
        type="button"
        onClick={() => setDrillOpen((d) => !d)}
        aria-expanded={drillOpen}
        aria-label={
          drillOpen
            ? `Hide affected repos for ${entry.id}`
            : `Show affected repos for ${entry.id}`
        }
        className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <PanelChevron expanded={drillOpen} />
        {drillOpen ? 'Hide repos' : 'Show repos'}
      </button>
      {drillOpen ? (
        <ul
          role="list"
          data-testid={`org-recommendations-drill-${entry.id}`}
          className="mt-2 space-y-1 pl-5"
        >
          {entry.affectedRepos.map((repo) => (
            <li
              key={repo}
              className="text-xs text-slate-600 dark:text-slate-300"
            >
              {repo}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}
