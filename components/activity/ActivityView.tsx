'use client'

import { useState } from 'react'
import { type ActivityWindowDays, type AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildActivitySections, getActivityWindowOptions } from '@/lib/activity/view-model'

interface ActivityViewProps {
  results: AnalysisResult[]
}

export function ActivityView({ results }: ActivityViewProps) {
  const [windowDays, setWindowDays] = useState<ActivityWindowDays>(90)
  const sections = buildActivitySections(results, windowDays)
  const windowOptions = getActivityWindowOptions()

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
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{section.repo}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Recent repository activity and delivery flow derived from verified public GitHub data.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {section.metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{metric.label}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{metric.value}</p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  )
}
