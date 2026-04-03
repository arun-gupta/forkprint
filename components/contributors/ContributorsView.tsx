'use client'

import { useState } from 'react'
import { CONTRIBUTOR_WINDOW_DAYS, type AnalysisResult, type ContributorWindowDays } from '@/lib/analyzer/analysis-result'
import { buildContributorsViewModels } from '@/lib/contributors/view-model'
import { CoreContributorsPane } from './CoreContributorsPane'
import { SustainabilityPane } from './SustainabilityPane'

interface ContributorsViewProps {
  results: AnalysisResult[]
}

export function ContributorsView({ results }: ContributorsViewProps) {
  const [includeBots, setIncludeBots] = useState(false)
  const [windowDays, setWindowDays] = useState<ContributorWindowDays>(90)
  const sections = buildContributorsViewModels(results, { includeBots, windowDays })

  return (
    <section aria-label="Contributors view" className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recent activity window</p>
            <p className="mt-1 text-sm text-slate-600">Change the local contributor-analysis window without rerunning repository analysis.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CONTRIBUTOR_WINDOW_DAYS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setWindowDays(days)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  windowDays === days
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900'
                }`}
                aria-pressed={windowDays === days}
              >
                {`${days}d`}
              </button>
            ))}
          </div>
        </div>
      </div>
      {sections.map((section) => (
        <article key={section.repo} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{section.repo}</h2>
            <p className="mt-1 text-sm text-slate-600">{`Contributor health and sustainability signals derived from verified public repository activity over the last ${section.windowDays} days.`}</p>
            <p className="mt-2 text-sm text-slate-700">
              The `Contributors` tab is the workspace for contributor analysis; the corresponding overview score category is `Sustainability`.
            </p>
          </div>
          <CoreContributorsPane
            metrics={section.coreMetrics}
            heatmap={section.heatmap}
            windowDays={section.windowDays}
            includeBots={includeBots}
            onToggleIncludeBots={() => setIncludeBots((current) => !current)}
          />
          <SustainabilityPane section={section} />
        </article>
      ))}
    </section>
  )
}
