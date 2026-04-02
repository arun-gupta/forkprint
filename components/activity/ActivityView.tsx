'use client'

import { useState } from 'react'
import { ScoreBadge } from '@/components/metric-cards/ScoreBadge'
import { getActivityScore, formatHours, formatPercentage } from '@/lib/activity/score-config'
import { type ActivityWindowDays, type AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildActivitySections, getActivityWindowOptions } from '@/lib/activity/view-model'
import { ActivityScoreHelp } from './ActivityScoreHelp'

interface ActivityViewProps {
  results: AnalysisResult[]
}

export function ActivityView({ results }: ActivityViewProps) {
  const [windowDays, setWindowDays] = useState<ActivityWindowDays>(90)
  const sections = buildActivitySections(results, windowDays)
  const windowOptions = getActivityWindowOptions()
  const staleIssueTooltip = `Share of currently open issues that were created more than ${windowDays === 365 ? '12 months' : `${windowDays} days`} ago. Lower is generally healthier.`

  if (sections.length === 0) {
    return null
  }

  return (
    <section aria-label="Activity view" className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recent activity window</p>
            <p className="mt-1 text-sm text-slate-600">Change the local activity window without rerunning repository analysis.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {windowOptions.map((option) => (
              <button
                key={option.days}
                type="button"
                onClick={() => setWindowDays(option.days)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  windowDays === option.days
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900'
                }`}
                aria-pressed={windowDays === option.days}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {sections.map((section) => (
        <article key={section.repo} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {(() => {
            const result = results.find((candidate) => candidate.repo === section.repo)
            if (!result) {
              return null
            }

            const score = getActivityScore(result, windowDays)

            return (
              <>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{section.repo}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Recent repository activity and delivery flow derived from verified public GitHub data.
                    </p>
                    <p className="mt-2 text-sm text-slate-700">{score.description}</p>
                  </div>
                  <div className="w-full md:max-w-xs">
                    <ScoreBadge category="Activity" value={score.value} tone={score.tone} />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {section.cards.map((card) => (
                    <div key={card.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.title}</p>
                      {card.value ? <p className="mt-1 text-lg font-semibold text-slate-900">{card.value}</p> : null}
                      {card.lines ? (
                        <dl className="mt-3 space-y-2">
                          {card.lines.map((line) => (
                            <div key={line.label} className="flex items-baseline justify-between gap-4">
                              <dt className="text-sm text-slate-600">{line.label}</dt>
                              <dd className="text-base font-semibold text-slate-900">{line.value}</dd>
                            </div>
                          ))}
                          {card.title === 'Pull requests' ? (
                            <div className="flex items-baseline justify-between gap-4 border-t border-slate-200 pt-2">
                              <dt className="text-sm text-slate-600">Median time to merge</dt>
                              <dd className="text-base font-semibold text-slate-900">{formatHours(section.metrics.medianTimeToMergeHours)}</dd>
                            </div>
                          ) : null}
                          {card.title === 'Issues' ? (
                            <>
                              <div
                                className="flex items-baseline justify-between gap-4 border-t border-slate-200 pt-2"
                                title={staleIssueTooltip}
                                aria-label={`Stale issue ratio. ${staleIssueTooltip}`}
                              >
                                <dt className="text-sm text-slate-600">Stale issue ratio</dt>
                                <dd className="text-base font-semibold text-slate-900">{formatPercentage(section.metrics.staleIssueRatio)}</dd>
                              </div>
                              <div className="flex items-baseline justify-between gap-4">
                                <dt className="text-sm text-slate-600">Median time to close</dt>
                                <dd className="text-base font-semibold text-slate-900">{formatHours(section.metrics.medianTimeToCloseHours)}</dd>
                              </div>
                            </>
                          ) : null}
                        </dl>
                      ) : null}
                    </div>
                  ))}
                </div>
                {section.missingDataCallout ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-800">{section.missingDataCallout.title}</p>
                    {section.missingDataCallout.details.map((detail) => (
                      <p key={detail} className="mt-1 text-sm text-amber-900">
                        {detail}
                      </p>
                    ))}
                    {score.missingInputs.length > 0 ? (
                      <p className="mt-2 text-sm text-amber-900">
                        Activity score is waiting on: {score.missingInputs.join(', ')}.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <ActivityScoreHelp score={score} />
              </>
            )
          })()}
        </article>
      ))}
    </section>
  )
}
