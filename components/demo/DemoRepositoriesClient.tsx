'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ResultsShell } from '@/components/app-shell/ResultsShell'
import { ActivityView } from '@/components/activity/ActivityView'
import { ContributorsView } from '@/components/contributors/ContributorsView'
import { ComparisonView } from '@/components/comparison/ComparisonView'
import { DocumentationView } from '@/components/documentation/DocumentationView'
import { SecurityView } from '@/components/security/SecurityView'
import { RecommendationsView } from '@/components/recommendations/RecommendationsView'
import { MetricCardsOverview } from '@/components/metric-cards/MetricCardsOverview'
import { ResponsivenessView } from '@/components/responsiveness/ResponsivenessView'
import { ExportControls } from '@/components/export/ExportControls'
import { ReportSearchBar } from '@/components/search/ReportSearchBar'
import { SearchProvider } from '@/components/search/SearchContext'
import { computeTabTagCounts } from '@/lib/tags/tab-counts'
import type { TabMatchCounts } from '@/lib/search/types'
import type { AnalyzeResponse } from '@/lib/analyzer/analysis-result'
import { resultTabs } from '@/lib/results-shell/tabs'

interface DemoRepositoriesClientProps {
  response: AnalyzeResponse
}

export function DemoRepositoriesClient({ response }: DemoRepositoriesClientProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [domTotalMatches, setDomTotalMatches] = useState(0)
  const [domMatchedTabCount, setDomMatchedTabCount] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      if (!searchQuery) {
        setDomTotalMatches(0)
        setDomMatchedTabCount(0)
      }
    }, searchQuery ? 300 : 0)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  const handleDomMatchCounts = useCallback(
    (counts: { domMatchCounts: TabMatchCounts; domTotalMatches: number; domMatchedTabCount: number }) => {
      setDomTotalMatches(counts.domTotalMatches)
      setDomMatchedTabCount(counts.domMatchedTabCount)
    },
    [],
  )

  const analyzedRepos = response.results.map((result) => result.repo)

  const overviewContent = (
    <MetricCardsOverview
      results={response.results}
      activeTag={activeTag}
      onTagChange={setActiveTag}
    />
  )

  return (
    <SearchProvider query={debouncedQuery}>
      <ResultsShell
        initialActiveTab="overview"
        analysisPanel={<DemoAnalysisPanel />}
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <ReportSearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
              totalMatches={domTotalMatches}
              matchedTabCount={domMatchedTabCount}
            />
            <ExportControls analysisResponse={response} analyzedRepos={analyzedRepos} />
          </div>
        }
        tabs={resultTabs}
        searchQuery={debouncedQuery}
        onDomMatchCounts={handleDomMatchCounts}
        tagMatchCounts={computeTabTagCounts(response.results, activeTag)}
        slots={{
          overview: overviewContent,
          contributors: (
            <ContributorsView
              results={response.results}
              activeTag={activeTag}
              onTagChange={setActiveTag}
            />
          ),
          activity: (
            <ActivityView
              results={response.results}
              activeTag={activeTag}
              onTagChange={setActiveTag}
            />
          ),
          responsiveness: (
            <ResponsivenessView
              results={response.results}
              activeTag={activeTag}
              onTagChange={setActiveTag}
            />
          ),
          documentation: (
            <DocumentationView
              results={response.results}
              activeTag={activeTag}
              onTagChange={setActiveTag}
            />
          ),
          security: (
            <SecurityView
              results={response.results}
              activeTag={activeTag}
              onTagChange={setActiveTag}
            />
          ),
          recommendations: (
            <RecommendationsView
              results={response.results}
              activeTag={activeTag}
              onTagChange={setActiveTag}
            />
          ),
          comparison: (
            <ComparisonView results={response.results} rateLimit={response.rateLimit} />
          ),
        }}
      />
    </SearchProvider>
  )
}

function DemoAnalysisPanel() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Pre-analyzed demo
        </h2>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          Six curated repositories. All tabs, filters, search, and exports work
          against this fixture.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          disabled
          title="Sign in with GitHub to analyze your own repositories"
          aria-label="Analyze is disabled in demo mode — sign in with GitHub to run a live analysis"
          className="cursor-not-allowed whitespace-nowrap rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
        >
          Analyze (demo)
        </button>
        <Link
          href="/"
          className="whitespace-nowrap rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
        >
          Sign in to analyze →
        </Link>
      </div>
    </div>
  )
}
