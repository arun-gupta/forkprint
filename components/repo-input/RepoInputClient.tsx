'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ResultsShell } from '@/components/app-shell/ResultsShell'
import { ActivityView } from '@/components/activity/ActivityView'
import { ContributorsView } from '@/components/contributors/ContributorsView'
import { ComparisonView } from '@/components/comparison/ComparisonView'
import { DocumentationView } from '@/components/documentation/DocumentationView'
import { SecurityView } from '@/components/security/SecurityView'
import { RecommendationsView } from '@/components/recommendations/RecommendationsView'
import { MetricCardsOverview } from '@/components/metric-cards/MetricCardsOverview'
import { OrgInventoryView } from '@/components/org-inventory/OrgInventoryView'
import { ResponsivenessView } from '@/components/responsiveness/ResponsivenessView'
import { ExportControls } from '@/components/export/ExportControls'
import { ReportSearchBar } from '@/components/search/ReportSearchBar'
import { SearchProvider } from '@/components/search/SearchContext'
import type { TabMatchCounts } from '@/lib/search/types'
import { computeTabTagCounts } from '@/lib/tags/tab-counts'
import { useAuth } from '@/components/auth/AuthContext'
import { OrgSummaryView } from '@/components/org-summary/OrgSummaryView'
import { OrgBucketContent } from '@/components/org-summary/OrgBucketContent'
import { useOrgAggregation } from '@/components/shared/hooks/useOrgAggregation'
import type { AnalysisResult, AnalyzeResponse } from '@/lib/analyzer/analysis-result'
import type { OrgInventoryResponse } from '@/lib/analyzer/org-inventory'
import type { ResultTabDefinition } from '@/specs/006-results-shell/contracts/results-shell-props'
import { resultTabs } from '@/lib/results-shell/tabs'
import { decodeRepos } from '@/lib/export/shareable-url'
import { LOADING_QUOTES, getRandomQuoteIndex } from '@/lib/loading-quotes'
import { RepoInputForm } from './RepoInputForm'

interface RepoInputClientProps {
  onAnalyze?: (repos: string[], token: string) => Promise<AnalyzeResponse> | AnalyzeResponse | void
  onAnalyzeOrg?: (org: string, token: string) => Promise<OrgInventoryResponse> | OrgInventoryResponse | void
}

export function RepoInputClient({ onAnalyze, onAnalyzeOrg }: RepoInputClientProps) {
  const { session } = useAuth()
  const searchParams = useSearchParams()
  const initialRepoValue = decodeRepos(searchParams.toString()).join('\n')
  const [analysisResponse, setAnalysisResponse] = useState<AnalyzeResponse | null>(null)
  const [analyzedRepos, setAnalyzedRepos] = useState<string[]>([])
  const [orgInventoryResponse, setOrgInventoryResponse] = useState<OrgInventoryResponse | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [loadingRepos, setLoadingRepos] = useState<string[]>([])
  const [loadingOrg, setLoadingOrg] = useState<string | null>(null)
  const [resultsResetKey, setResultsResetKey] = useState(0)
  const [inputMode, setInputMode] = useState<'repos' | 'org'>('repos')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [quoteIndex, setQuoteIndex] = useState<number | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const quoteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isLoading = loadingRepos.length > 0 || !!loadingOrg

  useEffect(() => {
    if (isLoading) {
      setElapsedSeconds(0)
      setQuoteIndex(emptyQuoteIndex)
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1)
      }, 1000)

      // Rotate quote every 10 seconds
      quoteTimerRef.current = setInterval(() => {
        setQuoteIndex((current) => getRandomQuoteIndex(current))
      }, 10000)

      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (quoteTimerRef.current) clearInterval(quoteTimerRef.current)
      }
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (quoteTimerRef.current) {
      clearInterval(quoteTimerRef.current)
      quoteTimerRef.current = null
    }
    setElapsedSeconds(0)
    setQuoteIndex(null)

    return undefined
  }, [isLoading])

  const currentQuote = quoteIndex !== null ? LOADING_QUOTES[quoteIndex] : null

  const isEmptyState = !submissionError && !loadingRepos.length && !loadingOrg && !analysisResponse && !orgInventoryResponse
  const [emptyQuoteIndex, setEmptyQuoteIndex] = useState(() => getRandomQuoteIndex(null))

  useEffect(() => {
    if (!isEmptyState) return

    const interval = setInterval(() => {
      setEmptyQuoteIndex((current) => getRandomQuoteIndex(current))
    }, 10000)

    return () => clearInterval(interval)
  }, [isEmptyState])

  const emptyQuote = LOADING_QUOTES[emptyQuoteIndex]

  // Search: DOM-based match counts (populated by ResultsShell after highlighting)
  const [domTotalMatches, setDomTotalMatches] = useState(0)
  const [domMatchedTabCount, setDomMatchedTabCount] = useState(0)
  const orgSummaryRef = useRef<HTMLDivElement>(null)
  const hasScrolledToSummary = useRef(false)

  const orgAggregation = useOrgAggregation({
    dispatch: async (repo) => {
      if (!session?.token) {
        return {
          kind: 'error',
          error: { reason: 'Authentication required.', kind: 'other' },
        }
      }

      try {
        const response = onAnalyze
          ? await onAnalyze([repo], session.token)
          : await submitAnalysisRequest([repo], session.token)
        const first = response?.results?.[0]
        if (!first) {
          return {
            kind: 'error',
            error: { reason: 'Repository could not be analyzed.', kind: 'other' },
          }
        }
        return { kind: 'ok', result: first }
      } catch (error) {
        return {
          kind: 'error',
          error: {
            reason: error instanceof Error ? error.message : 'Analysis request failed.',
            kind: 'transient',
          },
        }
      }
    },
    fetchPinned: async (org) => {
      if (!session?.token) return []
      const response = await fetch(`/api/org/pinned?org=${encodeURIComponent(org)}`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      })
      if (!response.ok) return []
      const payload = (await response.json()) as { pinned?: Array<{ owner: string; name: string; stars: number | 'unavailable'; rank: number }> }
      return payload.pinned ?? []
    },
    starsForRepo: (repo) =>
      orgInventoryResponse?.results.find((result) => result.repo === repo)?.stars ?? 'unavailable',
  })
  useEffect(() => {
    if (orgAggregation.view && !hasScrolledToSummary.current) {
      hasScrolledToSummary.current = true
      setTimeout(() => {
        orgSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
    if (!orgAggregation.view) {
      hasScrolledToSummary.current = false
    }
  }, [orgAggregation.view])


  // Sync org aggregation state into the Repositories tab:
  // - loadingRepos: shows "Analyzing repositories..." UI during the run
  // - analysisResponse: populates per-repo detail tabs when run completes
  useEffect(() => {
    if (!orgAggregation.run) return
    const run = orgAggregation.run
    const status = run.status

    if (status === 'in-progress' || status === 'paused') {
      const active: string[] = []
      for (const [, s] of run.perRepo) {
        if (s.status === 'in-progress' || s.status === 'queued') active.push(s.repo)
      }
      setLoadingRepos(active)

      const completed: AnalysisResult[] = []
      for (const [, s] of run.perRepo) {
        if (s.status === 'done' && s.result) completed.push(s.result)
      }
      if (completed.length > 0) {
        setAnalysisResponse({ results: completed, failures: [], rateLimit: null })
      }
    }

    if (status === 'complete' || status === 'cancelled') {
      setLoadingRepos([])
      const completed: AnalysisResult[] = []
      for (const [, s] of run.perRepo) {
        if (s.status === 'done' && s.result) completed.push(s.result)
      }
      if (completed.length > 0) {
        setAnalysisResponse({ results: completed, failures: [], rateLimit: null })
      }
    }
  }, [orgAggregation.run, orgAggregation.run?.status])

  const handleDomMatchCounts = useRef((counts: { domMatchCounts: TabMatchCounts; domTotalMatches: number; domMatchedTabCount: number }) => {
    setDomTotalMatches(counts.domTotalMatches)
    setDomMatchedTabCount(counts.domMatchedTabCount)
  }).current

  // Search: debounce query
  useEffect(() => {
    if (!searchQuery) {
      setDebouncedQuery('')
      setDomTotalMatches(0)
      setDomMatchedTabCount(0)
      return
    }
    const timeout = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(timeout)
  }, [searchQuery])

  function handleModeChange(mode: 'repos' | 'org') {
    setInputMode(mode)
  }

  function handleReset() {
    setAnalysisResponse(null)
    setAnalyzedRepos([])
    setOrgInventoryResponse(null)
    setSubmissionError(null)
    setResultsResetKey((k) => k + 1)
    setSearchQuery('')
    setDebouncedQuery('')
  }

  useEffect(() => {
    if (!analysisResponse?.diagnostics?.length) {
      return
    }

    for (const diagnostic of analysisResponse.diagnostics) {
      const log = diagnostic.level === 'error' ? console.error : console.warn
      log('[RepoPulse GitHub diagnostic]', {
        repo: diagnostic.repo,
        source: diagnostic.source,
        message: diagnostic.message,
        status: diagnostic.status,
        retryAfter: diagnostic.retryAfter,
      })
    }
  }, [analysisResponse])

  async function handleSubmit(repos: string[]) {
    if (!session?.token) return

    setSubmissionError(null)
    setAnalysisResponse(null)
    setOrgInventoryResponse(null)
    setResultsResetKey((current) => current + 1)
    setInputMode('repos')
    setLoadingRepos(repos)
    setLoadingOrg(null)

    try {
      const response = onAnalyze
        ? await onAnalyze(repos, session.token)
        : await submitAnalysisRequest(repos, session.token)

      if (response) {
        setAnalysisResponse(response)
        setAnalyzedRepos(repos)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis request failed.'
      setSubmissionError(message)
    } finally {
      setLoadingRepos([])
    }
  }

  async function handleOrgSubmit(org: string) {
    if (!session?.token) return

    setSubmissionError(null)
    setAnalysisResponse(null)
    setOrgInventoryResponse(null)
    setResultsResetKey((current) => current + 1)
    setInputMode('org')
    setLoadingRepos([])
    setLoadingOrg(org)
    orgAggregation.reset()

    try {
      const response = onAnalyzeOrg
        ? await onAnalyzeOrg(org, session.token)
        : await submitOrgInventoryRequest(org, session.token)

      if (response) {
        setOrgInventoryResponse(response)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Organization inventory request failed.'
      setSubmissionError(message)
    } finally {
      setLoadingOrg(null)
    }
  }

  const analysisPanel = (
    <RepoInputForm
      mode={inputMode}
      onModeChange={handleModeChange}
      onSubmitRepos={handleSubmit}
      onSubmitOrg={handleOrgSubmit}
      initialRepoValue={initialRepoValue}
    />
  )

  const exportToolbar = analysisResponse ? (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <ReportSearchBar
        query={searchQuery}
        onQueryChange={setSearchQuery}
        totalMatches={domTotalMatches}
        matchedTabCount={domMatchedTabCount}
      />
      <ExportControls analysisResponse={analysisResponse} analyzedRepos={analyzedRepos} />
    </div>
  ) : null

  const orgAnalysisComplete = orgAggregation.view && (orgAggregation.view.status.status === 'complete' || orgAggregation.view.status.status === 'cancelled')

  const orgInventoryTabs: ResultTabDefinition[] = orgAnalysisComplete
    ? [
        { id: 'overview', label: 'Overview', status: 'implemented', description: 'Organization inventory and footprint.' },
        { id: 'contributors', label: 'Contributors', status: 'implemented', description: 'Org-level contributor diversity, maintainers, and affiliations.' },
        { id: 'activity', label: 'Activity', status: 'implemented', description: 'Org-level activity, release cadence, and stale work.' },
        { id: 'responsiveness', label: 'Responsiveness', status: 'implemented', description: 'Org-level responsiveness metrics.' },
        { id: 'documentation', label: 'Documentation', status: 'implemented', description: 'Org-level documentation coverage, governance, and adopters.' },
        { id: 'security', label: 'Security', status: 'implemented', description: 'Org-level OpenSSF Scorecard rollup.' },
      ]
    : [
        { id: 'overview', label: 'Overview', status: 'implemented', description: 'Organization inventory summary and lightweight public repository metadata.' },
      ]

  const showOrgWorkspace = inputMode === 'org'
  const successfulRepoCount = analysisResponse?.results.length ?? 0
  const repoTabs: ResultTabDefinition[] = resultTabs

  const overviewContent = (
    <div className="space-y-4">
      {isEmptyState && inputMode === 'repos' ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Enter repositories and click <span className="font-medium text-slate-700">Analyze</span> to get started.
          </p>
          {emptyQuote ? (
            <p className="text-xs italic text-slate-400">
              &ldquo;{emptyQuote.text}&rdquo; — {emptyQuote.author}{emptyQuote.context ? `, ${emptyQuote.context}` : ''}
            </p>
          ) : null}
        </div>
      ) : null}
      {submissionError ? (
        <p role="alert" data-testid="analysis-error" className="text-sm text-red-600">
          {submissionError}
        </p>
      ) : null}
      {loadingRepos.length > 0 && inputMode === 'repos' ? (
        <section aria-label="Analysis loading state" className="rounded border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-blue-900">Analyzing repositories...</h2>
            <span className="text-xs tabular-nums text-blue-700">{formatElapsedTime(elapsedSeconds)}</span>
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm text-blue-900">
            {loadingRepos.map((repo) => (
              <li key={repo}>{repo}</li>
            ))}
          </ul>
          {elapsedSeconds >= 10 ? (
            <p className="mt-3 text-xs text-blue-700">
              Large repositories with extensive commit history may take longer to analyze.
            </p>
          ) : null}
          {elapsedSeconds >= 30 ? (
            <p className="mt-1 text-xs text-blue-700">
              Still working — fetching commit history and computing contributor metrics.
            </p>
          ) : null}
          {currentQuote ? (
            <p className="mt-3 border-t border-blue-200 pt-3 text-xs italic text-blue-600">
              &ldquo;{currentQuote.text}&rdquo; — {currentQuote.author}{currentQuote.context ? `, ${currentQuote.context}` : ''}
            </p>
          ) : null}
        </section>
      ) : null}
      {loadingOrg ? (
        <section aria-label="Org inventory loading state" className="rounded border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-blue-900">Loading org inventory for:</h2>
            <span className="text-xs tabular-nums text-blue-700">{formatElapsedTime(elapsedSeconds)}</span>
          </div>
          <p className="mt-2 text-sm text-blue-900">{loadingOrg}</p>
          {elapsedSeconds >= 10 ? (
            <p className="mt-3 text-xs text-blue-700">
              Large organizations with many repositories may take longer to load.
            </p>
          ) : null}
          {currentQuote ? (
            <p className="mt-3 border-t border-blue-200 pt-3 text-xs italic text-blue-600">
              &ldquo;{currentQuote.text}&rdquo; — {currentQuote.author}{currentQuote.context ? `, ${currentQuote.context}` : ''}
            </p>
          ) : null}
        </section>
      ) : null}
      {inputMode === 'repos' && analysisResponse ? (
        <section aria-label="Analysis results" className="space-y-4">
          <MetricCardsOverview results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} />
          {analysisResponse.failures.length > 0 ? (
            <section className="rounded border border-amber-200 bg-amber-50 p-4">
              <h2 className="font-semibold text-amber-900">Failed repositories</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
                {analysisResponse.failures.map((failure) => (
                  <li key={failure.repo}>
                    {failure.repo}: {failure.reason}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {analysisResponse.rateLimit ? (
            <section className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p>Remaining API calls: {formatDisplayValue(analysisResponse.rateLimit.remaining)}</p>
              <p>Rate limit resets at: {formatRateLimitReset(analysisResponse.rateLimit.resetAt)}</p>
              {analysisResponse.rateLimit.retryAfter !== 'unavailable' ? (
                <p>Retry after: {formatRetryAfter(analysisResponse.rateLimit.retryAfter)}</p>
              ) : null}
            </section>
          ) : null}
        </section>
      ) : null}
      {inputMode === 'org' && orgInventoryResponse ? (
        <section aria-label="Org inventory results" className="space-y-4">
          {orgInventoryResponse.failure ? (
            <section className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p>{orgInventoryResponse.failure.message}</p>
            </section>
          ) : (
            <>
              <OrgInventoryView
                org={orgInventoryResponse.org}
                summary={orgInventoryResponse.summary}
                results={orgInventoryResponse.results}
                rateLimit={orgInventoryResponse.rateLimit}
                onAnalyzeRepo={(repo) => {
                  void handleSubmit([repo])
                }}
                onAnalyzeSelected={(repos) => {
                  void handleSubmit(repos)
                }}
                onAnalyzeAllActive={(repos) => {
                  void orgAggregation.start({
                    org: orgInventoryResponse.org,
                    repos,
                  })
                }}
              />
              {orgAggregation.view && orgAggregation.view.status.status !== 'complete' && orgAggregation.view.status.status !== 'cancelled' ? (
                <section className="flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 flex-shrink-0 text-sky-600 dark:text-sky-400">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                  </svg>
                  <span>
                    Analyzing {orgAggregation.view.status.total} repos — detailed per-repo analysis is available in the <strong>Repositories</strong> tab.
                  </span>
                </section>
              ) : null}
            </>
          )}
        </section>
      ) : null}
      {showOrgWorkspace && !loadingOrg && !orgInventoryResponse && !submissionError ? (
        <section className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <h2 className="font-semibold text-slate-900">Organization inventory</h2>
          <p className="mt-2">
            Enter a GitHub organization slug or org URL above to browse its public repository inventory.
          </p>
        </section>
      ) : null}
    </div>
  )

  return (
    <SearchProvider query={debouncedQuery}>
    <ResultsShell
      resetKey={resultsResetKey}
      initialActiveTab="overview"
      onReset={handleReset}
      analysisPanel={analysisPanel}
      toolbar={exportToolbar}
      tabs={showOrgWorkspace ? orgInventoryTabs : repoTabs}
      searchQuery={debouncedQuery}
      onDomMatchCounts={handleDomMatchCounts}
      tagMatchCounts={analysisResponse ? computeTabTagCounts(analysisResponse.results, activeTag) : undefined}
      overview={overviewContent}
      contributors={
        orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="contributors" view={orgAggregation.view} />
        ) : analysisResponse ? (
          <ContributorsView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} />
        ) : (
          <p className="text-sm text-slate-500">
            Enter repositories and click <span className="font-medium text-slate-700">Analyze</span> to get started.
          </p>
        )
      }
      activity={
        orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="activity" view={orgAggregation.view} />
        ) : analysisResponse ? (
          <ActivityView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} />
        ) : (
          <p className="text-sm text-slate-500">
            Enter repositories and click <span className="font-medium text-slate-700">Analyze</span> to get started.
          </p>
        )
      }
      responsiveness={
        orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="responsiveness" view={orgAggregation.view} />
        ) : analysisResponse ? (
          <ResponsivenessView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} />
        ) : (
          <p className="text-sm text-slate-500">
            Enter repositories and click <span className="font-medium text-slate-700">Analyze</span> to get started.
          </p>
        )
      }
      documentation={
        orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="documentation" view={orgAggregation.view} />
        ) : analysisResponse ? (
          <DocumentationView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} />
        ) : (
          <p className="text-sm text-slate-500">
            Enter repositories and click <span className="font-medium text-slate-700">Analyze</span> to get started.
          </p>
        )
      }
      security={
        orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="security" view={orgAggregation.view} />
        ) : analysisResponse ? (
          <SecurityView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} />
        ) : (
          <p className="text-sm text-slate-500">
            Enter repositories and click <span className="font-medium text-slate-700">Analyze</span> to get started.
          </p>
        )
      }
      recommendations={
        analysisResponse ? (
          <RecommendationsView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} />
        ) : (
          <p className="text-sm text-slate-500">
            Enter repositories and click <span className="font-medium text-slate-700">Analyze</span> to get started.
          </p>
        )
      }
      comparison={
        analysisResponse && successfulRepoCount >= 2 ? (
          <ComparisonView results={analysisResponse.results} rateLimit={analysisResponse.rateLimit} />
        ) : loadingRepos.length >= 2 ? (
          <p className="text-sm text-slate-600">
            {loadingRepos.length > 4
              ? <>Preparing comparison for the first 4 of {loadingRepos.length}:{' '}</>
              : <>Preparing comparison for{' '}</>}
            {loadingRepos.slice(0, 4).map((repo, i, arr) => (
              <span key={repo}>
                <span className="font-medium text-slate-800">{repo}</span>
                {i < arr.length - 1 ? ', ' : ''}
              </span>
            ))}
            …
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            Enter 2 or more repositories and click <span className="font-medium text-slate-700">Analyze</span> to get started.
          </p>
        )
      }
    />
    </SearchProvider>
  )
}

function formatDisplayValue(value: number | string) {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value)
  }
  return value
}

function formatRateLimitReset(value: string) {
  if (value === 'unavailable') return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatRetryAfter(value: number | string) {
  if (typeof value !== 'number') return value
  return `${new Intl.NumberFormat('en-US').format(value)}s`
}

function formatElapsedTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) {
    return `${minutes}m ${String(remainingSeconds).padStart(2, '0')}s`
  }
  return `${seconds}s`
}

async function submitAnalysisRequest(repos: string[], token: string): Promise<AnalyzeResponse> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repos, token }),
  })
  const payload = (await response.json()) as AnalyzeResponse & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? 'Analysis request failed.')
  return payload
}

async function submitOrgInventoryRequest(org: string, token: string): Promise<OrgInventoryResponse> {
  const response = await fetch('/api/analyze-org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org, token }),
  })
  const payload = (await response.json()) as OrgInventoryResponse & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? 'Organization inventory request failed.')
  return payload
}
