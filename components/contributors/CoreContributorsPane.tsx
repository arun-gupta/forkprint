'use client'

import type { ContributorWindowDays } from '@/lib/analyzer/analysis-result'
import { useState } from 'react'
import type { ContributorHeatmapCell, ContributorMetricRow } from '@/lib/contributors/view-model'

interface CoreContributorsPaneProps {
  metrics: ContributorMetricRow[]
  heatmap: ContributorHeatmapCell[]
  windowDays: ContributorWindowDays
  includeBots: boolean
  onToggleIncludeBots: () => void
}

export function CoreContributorsPane({ metrics, heatmap, windowDays, includeBots, onToggleIncludeBots }: CoreContributorsPaneProps) {
  const [showNames, setShowNames] = useState(false)
  const [showNumbers, setShowNumbers] = useState(false)
  const compactMode = !showNames && !showNumbers

  return (
    <section aria-label="Core contributors pane" className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Core</h3>
        <p className="mt-1 text-sm text-slate-600">{`Contributor metrics from verified public data for the last ${windowDays} days.`}</p>
      </div>
      <dl className="grid gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-slate-200 bg-white p-3"
            title={metric.hoverText}
            aria-label={metric.hoverText ? `${metric.label}. ${metric.hoverText}` : metric.label}
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{metric.label}</dt>
            {metric.secondaryValue ? <p className="mt-1 text-xs text-slate-500">{metric.secondaryValue}</p> : null}
            <dd className="mt-1 text-base font-semibold text-slate-900">{metric.value}</dd>
            {metric.supportingText ? <p className="mt-1 text-xs text-slate-500">{metric.supportingText}</p> : null}
            {metric.breakdown ? (
              (() => {
                const segments = metric.breakdown.segments
                const total = Math.max(
                  segments.reduce((sum, current) => sum + current.value, 0),
                  1,
                )

                return (
                  <div className="mt-3 space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-cyan-100">
                      <div className="flex h-full w-full overflow-hidden rounded-full">
                        {segments.map((segment) => (
                          <div
                            key={segment.label}
                            className={
                              segment.tone === 'strong'
                                ? 'bg-cyan-800'
                                : segment.tone === 'medium'
                                  ? 'bg-cyan-500'
                                  : 'bg-cyan-200'
                            }
                            style={{
                              width: `${(segment.value / total) * 100}%`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                      {segments.map((segment) => (
                        <span key={segment.label}>{`${segment.label} ${segment.value}`}</span>
                      ))}
                    </div>
                  </div>
                )
              })()
            ) : null}
          </div>
        ))}
      </dl>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Contribution heatmap</p>
            <p className="mt-1 text-xs text-slate-500">
              {`Darker bubbles indicate contributor activity in the last ${windowDays} days. Detected bot accounts like `}
              <code>dependabot[bot]</code>
              {' or '}
              <code>k8s-ci-robot</code>
              {' can be included here when needed.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onToggleIncludeBots}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              aria-pressed={includeBots}
            >
              {includeBots ? 'Exclude bots from heatmap' : 'Include bots in heatmap'}
            </button>
            <button
              type="button"
              onClick={() => setShowNames((current) => !current)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              aria-pressed={showNames}
            >
              {showNames ? 'Hide names' : 'Show names'}
            </button>
            <button
              type="button"
              onClick={() => setShowNumbers((current) => !current)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              aria-pressed={showNumbers}
            >
              {showNumbers ? 'Hide numbers' : 'Show numbers'}
            </button>
          </div>
        </div>
        {heatmap.length > 0 ? (
          <div
            className={
              compactMode
                ? 'mt-3 flex flex-wrap gap-1'
                : 'mt-3 grid grid-cols-5 gap-x-1.5 gap-y-2 sm:grid-cols-7 lg:grid-cols-9 xl:grid-cols-11'
            }
            role="list"
            aria-label="Contribution heatmap tiles"
          >
            {heatmap.map((cell) => (
              <div
                key={`${cell.contributor}-${cell.commitsLabel}`}
                role="listitem"
                className={compactMode ? '' : 'flex flex-col items-center gap-1'}
                title={`${cell.contributor}: ${cell.commitsLabel}`}
              >
                <div
                  aria-label={`${cell.contributor} ${cell.commitsLabel}`}
                  className={`rounded-full border transition ${
                    compactMode ? 'h-[18px] w-[18px]' : 'h-5 w-5'
                  } ${
                    cell.intensity === 'max'
                      ? 'border-cyan-950 bg-cyan-950'
                      : cell.intensity === 'higher'
                        ? 'border-cyan-800 bg-cyan-800'
                        : cell.intensity === 'high'
                          ? 'border-cyan-600 bg-cyan-600'
                          : cell.intensity === 'medium'
                            ? 'border-cyan-400 bg-cyan-400'
                            : cell.intensity === 'low'
                              ? 'border-cyan-200 bg-cyan-200'
                              : 'border-cyan-100 bg-cyan-100'
                  }`}
                />
                {showNames ? (
                  <p className="max-w-16 text-center text-[10px] font-medium leading-tight text-slate-700">{cell.contributor}</p>
                ) : null}
                {showNumbers ? <p className="text-[10px] leading-tight text-slate-500">{cell.commitsLabel}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">unavailable</p>
        )}
      </div>
    </section>
  )
}
