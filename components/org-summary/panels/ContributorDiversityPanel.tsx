'use client'

import { useState } from 'react'
import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type {
  ContributorDiversityValue,
  ContributorDiversityWindow,
  ContributorDiversityWindowValue,
} from '@/lib/org-aggregation/aggregators/types'
import { CONTRIBUTOR_DIVERSITY_WINDOWS } from '@/lib/org-aggregation/aggregators/types'
import { HelpLabel } from '@/components/shared/HelpLabel'
import { EmptyState } from '../EmptyState'

const TOOLTIP = {
  topTwentyPercentShare:
    'Share of commits produced by the top 20% of distinct commit authors across the project in the selected window. Higher values indicate concentrated contribution.',
  elephantFactor:
    'Minimum number of distinct commit authors whose combined contributions exceed 50% of all commits across the project in the selected window. Lower values indicate higher bus-factor risk.',
  uniqueAuthors:
    'Count of distinct commit authors across all successfully-analyzed repos in the selected window. Same author across multiple repos counts once. Equals Repeat + One-time.',
  window:
    'Time window used for all metrics in this panel. Data is drawn from the per-repo analyzer\u2019s windowed contributor metrics.',
} as const

const WINDOW_LABEL: Record<ContributorDiversityWindow, string> = {
  30: '30d',
  60: '60d',
  90: '90d',
  180: '180d',
  365: '12m',
}

interface Props {
  panel: AggregatePanel<ContributorDiversityValue>
  externalWindow?: ContributorDiversityWindow
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

export function ContributorDiversityPanel({ panel, externalWindow }: Props) {
  const defaultWindow: ContributorDiversityWindow = panel.value?.defaultWindow ?? 90
  const [internalWindow, setInternalWindow] = useState<ContributorDiversityWindow>(defaultWindow)
  const selectedWindow = externalWindow ?? internalWindow
  const partialCoverageLabel =
    panel.value && panel.contributingReposCount < panel.totalReposInRun
      ? `${panel.contributingReposCount} of ${panel.totalReposInRun} repos`
      : null

  return (
    <section
      aria-label="Contributor diversity"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Contributor diversity
        </h3>
        <div className="flex items-center gap-3">
          {panel.value && !externalWindow ? (
            <WindowSelector selected={selectedWindow} onChange={setInternalWindow} />
          ) : null}
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
          Insufficient verified public data to compute project-wide contributor diversity.
        </p>
      ) : (
        <WindowBody value={panel.value.byWindow[selectedWindow]} window={selectedWindow} />
      )}
    </section>
  )
}

function WindowSelector({
  selected,
  onChange,
}: {
  selected: ContributorDiversityWindow
  onChange: (w: ContributorDiversityWindow) => void
}) {
  return (
    <div
      className="inline-flex overflow-hidden rounded border border-slate-300 dark:border-slate-700 dark:border-slate-600"
      role="tablist"
      aria-label="Contributor diversity window"
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
  )
}

function WindowBody({
  value,
  window: _window,
}: {
  value: ContributorDiversityWindowValue
  window: ContributorDiversityWindow
}) {
  if (!value || value.contributingReposCount === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No contributor data for the selected window.
      </p>
    )
  }
  return (
    <>
      <dl className="grid grid-cols-3 gap-3">
        <Stat
          label="Top-20% share"
          value={value.topTwentyPercentShare !== null ? pct(value.topTwentyPercentShare) : 'unavailable'}
          helpText={TOOLTIP.topTwentyPercentShare}
        />
        <Stat
          label="Elephant factor"
          value={value.elephantFactor !== null ? String(value.elephantFactor) : 'unavailable'}
          helpText={TOOLTIP.elephantFactor}
        />
        <Stat
          label="Unique commit authors"
          value={value.uniqueAuthorsAcrossOrg !== null ? String(value.uniqueAuthorsAcrossOrg) : 'unavailable'}
          helpText={TOOLTIP.uniqueAuthors}
        />
      </dl>
      <CompositionBar composition={value.composition} windowDays={_window} />
    </>
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

function CompositionBar({
  composition,
  windowDays,
}: {
  composition: ContributorDiversityWindowValue['composition']
  windowDays: ContributorDiversityWindow
}) {
  if (!composition) return null
  const { repeatContributors, oneTimeContributors, total } = composition
  if (repeatContributors === null || oneTimeContributors === null || total === null || total === 0) {
    return null
  }

  const repeatPct = (repeatContributors / total) * 100
  const oneTimePct = (oneTimeContributors / total) * 100

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Contributor composition
        </h4>
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {total.toLocaleString()}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {repeatContributors} repeat, {oneTimeContributors} one-time
        <span className="ml-1 text-slate-400 dark:text-slate-500">(last {windowDays} days)</span>
      </p>
      <div
        className="mt-2 flex h-2 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-800 dark:bg-slate-700"
        role="img"
        aria-label={`Contributor composition: ${repeatContributors} repeat, ${oneTimeContributors} one-time, ${total} total over ${windowDays} days`}
      >
        {repeatPct > 0 ? (
          <div
            className="h-full bg-sky-600 dark:bg-sky-500"
            style={{ width: `${repeatPct}%` }}
            title={`Repeat: ${repeatContributors}`}
          />
        ) : null}
        {oneTimePct > 0 ? (
          <div
            className="h-full bg-sky-300 dark:bg-sky-700"
            style={{ width: `${oneTimePct}%` }}
            title={`One-time: ${oneTimeContributors}`}
          />
        ) : null}
      </div>
      <ul className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-300">
        <LegendDot colorClass="bg-sky-600 dark:bg-sky-500" label={`Repeat ${repeatContributors}`} />
        <LegendDot colorClass="bg-sky-300 dark:bg-sky-700" label={`One-time ${oneTimeContributors}`} />
      </ul>
    </div>
  )
}

function LegendDot({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorClass}`} aria-hidden="true" />
      <span>{label}</span>
    </li>
  )
}
