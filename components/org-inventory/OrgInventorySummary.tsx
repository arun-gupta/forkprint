'use client'

import { useState } from 'react'
import type { OrgInventorySummary as OrgInventorySummaryModel } from '@/lib/analyzer/org-inventory'

interface OrgInventorySummaryProps {
  summary: OrgInventorySummaryModel
}

export function OrgInventorySummary({ summary }: OrgInventorySummaryProps) {
  return (
    <section aria-label="Org inventory summary" className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard label="Total public repos" value={String(summary.totalPublicRepos)} />
        <SummaryCard
          label="Total stars"
          value={typeof summary.totalStars === 'number' ? new Intl.NumberFormat('en-US').format(summary.totalStars) : 'unavailable'}
        />
        <SummaryCard label="Active repos" value={String(summary.activeRepoCount)} />
        <SummaryCard label="Archived repos" value={String(summary.archivedRepoCount)} />
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        High-level stats from GitHub metadata. Run <strong>Analyze all active repos</strong> for deeper org-level insights — contributor diversity, maintainers, security rollup, and more.
      </p>

      <div className="grid gap-2 lg:grid-cols-3">
        <SummaryListCard
          title="Most starred repos"
          items={summary.mostStarredRepos.map((repo) => ({
            label: repo.repo,
            value: typeof repo.stars === 'number' ? new Intl.NumberFormat('en-US').format(repo.stars) : 'unavailable',
          }))}
          emptyLabel="No starred repositories available."
        />
        <SummaryListCard
          title="Most recently active"
          items={summary.mostRecentlyActiveRepos.map((repo) => ({
            label: repo.repo,
            value: formatDate(repo.pushedAt),
          }))}
          emptyLabel="No recent activity available."
        />
        <SummaryListCard
          title="Language distribution"
          items={summary.languageDistribution.map((language) => ({
            label: language.language,
            value: new Intl.NumberFormat('en-US').format(language.repoCount),
          }))}
          emptyLabel="No primary languages available."
          collapsedItemCount={5}
          collapsedLabel="Show more languages"
          expandedLabel="Show fewer languages"
        />
      </div>
    </section>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  )
}

function SummaryListCard({
  title,
  items,
  emptyLabel,
  collapsedItemCount,
  collapsedLabel,
  expandedLabel,
}: {
  title: string
  items: Array<{ label: string; value: string }>
  emptyLabel: string
  collapsedItemCount?: number
  collapsedLabel?: string
  expandedLabel?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const shouldCollapse = typeof collapsedItemCount === 'number' && items.length > collapsedItemCount
  const visibleItems = shouldCollapse && !expanded ? items.slice(0, collapsedItemCount) : items
  const remainingCount = shouldCollapse ? items.length - collapsedItemCount : 0

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{emptyLabel}</p>
      ) : (
        <>
          <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
            {visibleItems.map((item) => (
              <li key={`${title}-${item.label}`} className="flex items-center justify-between gap-3">
                <span className="truncate text-slate-900 dark:text-slate-100">{item.label}</span>
                <span className="shrink-0 text-slate-600 dark:text-slate-400">{item.value}</span>
              </li>
            ))}
          </ul>
          {shouldCollapse ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {expanded ? `Showing all ${items.length} languages` : `${remainingCount} more languages hidden`}
              </p>
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                onClick={() => setExpanded((current) => !current)}
              >
                {expanded ? expandedLabel ?? 'Show less' : collapsedLabel ?? 'Show more'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function formatDate(value: string | 'unavailable') {
  if (value === 'unavailable') {
    return value
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}
