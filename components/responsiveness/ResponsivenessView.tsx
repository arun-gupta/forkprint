'use client'

import { useState } from 'react'
import { ScoreBadge } from '@/components/metric-cards/ScoreBadge'
import { HelpLabel } from '@/components/shared/HelpLabel'
import { MetricValue } from '@/components/shared/MetricValue'
import { type ActivityWindowDays, type AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildResponsivenessSections, getResponsivenessWindowOptions } from '@/lib/responsiveness/view-model'
import { ResponsivenessScoreHelp } from './ResponsivenessScoreHelp'

interface ResponsivenessViewProps {
  results: AnalysisResult[]
}

export function ResponsivenessView({ results }: ResponsivenessViewProps) {
  const [windowDays, setWindowDays] = useState<ActivityWindowDays>(90)
  const sections = buildResponsivenessSections(results, windowDays)
  const windowOptions = getResponsivenessWindowOptions()

  if (sections.length === 0) {
    return null
  }

  return (
    <section aria-label="Responsiveness view" className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recent responsiveness window</p>
            <p className="mt-1 text-sm text-slate-600">Change the local responsiveness window without rerunning repository analysis.</p>
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
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{section.repo}</h2>
              <p className="mt-1 text-sm text-slate-600">
                Public GitHub issue and pull-request event history summarized into responsiveness signals.
              </p>
              <p className="mt-2 text-sm text-slate-700">{section.score.description}</p>
            </div>
            <div className="w-full md:max-w-xs">
              <ScoreBadge category="Responsiveness" value={section.score.value} tone={section.score.tone} />
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {section.panes.map((pane) => (
              <div key={pane.title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{pane.title}</p>
                <dl className="mt-3 space-y-2">
                  {pane.metrics.map((metric) => (
                    <div key={metric.label} className="flex items-baseline justify-between gap-4">
                      <dt className="text-sm text-slate-600">
                        <HelpLabel label={metric.label} helpText={metric.helpText} />
                      </dt>
                      <dd className="text-base"><MetricValue value={metric.value} /></dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <ResponsivenessScoreHelp score={section.score} />
        </article>
      ))}
    </section>
  )
}
