'use client'

import type { ContributorWindowDays } from '@/lib/analyzer/analysis-result'
import { useState } from 'react'
import { HelpLabel } from '@/components/shared/HelpLabel'
import type { ContributorHeatmapCell, ContributorMetricRow } from '@/lib/contributors/view-model'
import { ContributionBarChart } from './ContributionBarChart'

interface CoreContributorsPaneProps {
  metrics: ContributorMetricRow[]
  heatmap: ContributorHeatmapCell[]
  windowDays: ContributorWindowDays
  includeBots: boolean
  onToggleIncludeBots: () => void
}

export function CoreContributorsPane({ metrics, heatmap, windowDays, includeBots, onToggleIncludeBots }: CoreContributorsPaneProps) {
  const [showNames, setShowNames] = useState(true)
  const [showNumbers, setShowNumbers] = useState(false)

  return (
    <section aria-label="Core contributors pane" className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Core</h3>
        <p className="mt-1 text-sm text-slate-600">{`Contributor metrics from verified public data for the last ${windowDays} days.`}</p>
      </div>
      <dl className="grid gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-slate-200 bg-white p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              <HelpLabel label={metric.label} helpText={metric.hoverText} />
            </dt>
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
      <ContributionBarChart
        title="Contribution chart"
        description={`Longer bars indicate contributor activity in the last ${windowDays} days. Detected bot accounts like dependabot[bot] or k8s-ci-robot can be included here when needed.`}
        items={heatmap}
        ariaLabel="Contribution activity bars"
        emptyText="—"
        tone="cyan"
        entityLabel="contributors"
        showLabels={showNames}
        showValues={showNumbers}
        actions={
          <>
            <button
              type="button"
              onClick={onToggleIncludeBots}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 sm:w-auto"
              aria-pressed={includeBots}
            >
              {includeBots ? 'Exclude bots from chart' : 'Include bots in chart'}
            </button>
            <button
              type="button"
              onClick={() => setShowNames((current) => !current)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 sm:w-auto"
              aria-pressed={showNames}
            >
              {showNames ? 'Hide names' : 'Show names'}
            </button>
            <button
              type="button"
              onClick={() => setShowNumbers((current) => !current)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 sm:w-auto"
              aria-pressed={showNumbers}
            >
              {showNumbers ? 'Hide numbers' : 'Show numbers'}
            </button>
          </>
        }
      />
    </section>
  )
}
