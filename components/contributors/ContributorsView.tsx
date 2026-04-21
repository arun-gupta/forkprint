'use client'

import { useState } from 'react'
import { CollapseChevron } from '@/components/shared/CollapseChevron'
import { CONTRIBUTOR_WINDOW_DAYS, type AnalysisResult, type ContributorWindowDays } from '@/lib/analyzer/analysis-result'
import { buildContributorsViewModels } from '@/lib/contributors/view-model'
import { CoreContributorsPane } from './CoreContributorsPane'
import { ContributorsScorePane } from './ContributorsScorePane'
import { OnboardingPane } from './OnboardingPane'

interface ContributorsViewProps {
  results: AnalysisResult[]
  activeTag?: string | null
  onTagChange?: (tag: string | null) => void
}

export function ContributorsView({ results, activeTag, onTagChange }: ContributorsViewProps) {
  const [includeBots, setIncludeBots] = useState(false)
  const [windowDays, setWindowDays] = useState<ContributorWindowDays>(90)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const sections = buildContributorsViewModels(results, { includeBots, windowDays })

  return (
    <section aria-label="Contributors view" className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Recent activity window</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Change the local contributor-analysis window without rerunning repository analysis.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CONTRIBUTOR_WINDOW_DAYS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setWindowDays(days)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${ windowDays === days ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900' : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white' }`}
                aria-pressed={windowDays === days}
              >
                {`${days}d`}
              </button>
            ))}
          </div>
        </div>
      </div>
      {sections.map((section, idx) => {
        const isCollapsed = collapsed.has(section.repo)
        const result = results[idx]
        const showOnboarding = !activeTag || activeTag === 'onboarding'
        const showCoreAndScore = !activeTag || activeTag !== 'onboarding'
        return (
          <article key={section.repo} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => { const next = new Set(prev); if (next.has(section.repo)) next.delete(section.repo); else next.add(section.repo); return next })}
              className="flex w-full items-center gap-2 text-left"
              aria-expanded={!isCollapsed}
            >
              <CollapseChevron expanded={!isCollapsed} />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{section.repo}</h2>
            </button>
            {!isCollapsed ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">{`Contributor health and diversity signals derived from verified public repository activity over the last ${section.windowDays} days.`}</p>
                {showCoreAndScore && (
                  <>
                    <CoreContributorsPane
                      metrics={section.coreMetrics}
                      heatmap={section.heatmap}
                      windowDays={section.windowDays}
                      includeBots={includeBots}
                      onToggleIncludeBots={() => setIncludeBots((current) => !current)}
                    />
                    <ContributorsScorePane section={section} activeTag={activeTag} onTagChange={onTagChange} />
                  </>
                )}
                {showOnboarding && result && (
                  <OnboardingPane
                    goodFirstIssueCount={result.goodFirstIssueCount ?? 'unavailable'}
                    devEnvironmentSetup={result.devEnvironmentSetup ?? 'unavailable'}
                    gitpodPresent={result.gitpodPresent ?? 'unavailable'}
                    newContributorPRAcceptanceRate={result.newContributorPRAcceptanceRate ?? 'unavailable'}
                    activeTag={activeTag}
                    onTagChange={onTagChange}
                  />
                )}
              </div>
            ) : null}
          </article>
        )
      })}
    </section>
  )
}
