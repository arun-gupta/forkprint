'use client'

import { useEffect, useMemo, useState } from 'react'
import { resultTabs } from '@/lib/results-shell/tabs'
import type { ResultTabId } from '@/specs/006-results-shell/contracts/results-shell-props'
import type { ResultTabDefinition } from '@/specs/006-results-shell/contracts/results-shell-props'
import { ResultsTabs } from './ResultsTabs'

interface ResultsShellProps {
  analysisPanel: React.ReactNode
  overview: React.ReactNode
  contributors: React.ReactNode
  activity: React.ReactNode
  responsiveness: React.ReactNode
  healthRatios: React.ReactNode
  comparison: React.ReactNode
  tabs?: ResultTabDefinition[]
  initialActiveTab?: ResultTabId
  resetKey?: number
  toolbar?: React.ReactNode
  onReset?: () => void
}

export function ResultsShell({
  analysisPanel,
  overview,
  contributors,
  activity,
  responsiveness,
  healthRatios,
  comparison,
  tabs = resultTabs,
  initialActiveTab = 'overview',
  resetKey,
  toolbar,
  onReset,
}: ResultsShellProps) {
  const [activeTab, setActiveTab] = useState<ResultTabId>(initialActiveTab)

  useEffect(() => {
    setActiveTab(initialActiveTab)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  const currentActiveTab = useMemo(
    () => (tabs.some((tab) => tab.id === activeTab) ? activeTab : tabs[0]?.id ?? 'overview'),
    [activeTab, tabs],
  )

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="w-full bg-sky-900 text-white">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-4 px-4 py-5">
          <div>
            <button
              type="button"
              onClick={onReset}
              aria-label="RepoPulse — return to home"
              className="text-left hover:opacity-80 transition-opacity disabled:cursor-default"
              disabled={!onReset}
            >
              <h1 className="text-2xl font-semibold tracking-tight text-white">RepoPulse</h1>
            </button>
            <p className="mt-1 text-sm text-sky-100 md:text-base">
              CHAOSS-aligned GitHub health analyzer for repository analysis and organization inventory browsing.
            </p>
          </div>
          <a
            href="https://github.com/arun-gupta/repo-pulse"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-700 bg-sky-950/25 text-sky-50 transition hover:border-sky-400 hover:bg-sky-950/40 hover:text-white"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.47c.53.1.72-.23.72-.52v-1.85c-2.94.64-3.56-1.25-3.56-1.25-.48-1.2-1.16-1.52-1.16-1.52-.95-.65.07-.64.07-.64 1.06.08 1.62 1.08 1.62 1.08.94 1.61 2.46 1.15 3.06.88.1-.68.37-1.15.67-1.42-2.35-.27-4.82-1.17-4.82-5.2 0-1.15.41-2.1 1.08-2.84-.11-.27-.47-1.37.1-2.86 0 0 .88-.28 2.89 1.08a9.98 9.98 0 0 1 5.26 0c2.01-1.36 2.89-1.08 2.89-1.08.57 1.49.21 2.59.1 2.86.67.74 1.08 1.69 1.08 2.84 0 4.04-2.48 4.93-4.84 5.19.38.33.72.98.72 1.98v2.93c0 .29.19.63.73.52A10.5 10.5 0 0 0 12 1.5Z" />
            </svg>
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <section className="space-y-6">
          <section aria-label="Analysis panel" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {analysisPanel}
          </section>

          <section aria-label="Result workspace" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {toolbar ? <div className="mb-4">{toolbar}</div> : null}
            <ResultsTabs tabs={tabs} activeTab={currentActiveTab} onChange={setActiveTab} />
            <div className="mt-6">
              {currentActiveTab === 'overview' ? overview : null}
              {currentActiveTab === 'contributors' ? contributors : null}
              {currentActiveTab === 'activity' ? activity : null}
              {currentActiveTab === 'responsiveness' ? responsiveness : null}
              {currentActiveTab === 'health-ratios' ? healthRatios : null}
              {currentActiveTab === 'comparison' ? comparison : null}
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}
