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
import { NotificationToggle } from '@/components/org-summary/NotificationToggle'
import { OrgSummaryView } from '@/components/org-summary/OrgSummaryView'
import { OrgBucketContent } from '@/components/org-summary/OrgBucketContent'
import { OrgWindowSelector } from '@/components/org-summary/OrgWindowSelector'
import { PreRunWarningDialog } from '@/components/org-summary/PreRunWarningDialog'
import type { ContributorDiversityWindow } from '@/lib/org-aggregation/aggregators/types'
import { useOrgAggregation } from '@/components/shared/hooks/useOrgAggregation'
import { isRateLimitLow, type AnalysisResult, type AnalyzeResponse } from '@/lib/analyzer/analysis-result'
import type { AspirantReadinessResult, CNCFFieldBadge, FoundationTarget } from '@/lib/cncf-sandbox/types'
import type { OrgInventoryResponse } from '@/lib/analyzer/org-inventory'
import type { ResultTabDefinition, ResultTabId } from '@/specs/006-results-shell/contracts/results-shell-props'
import { resultTabs } from '@/lib/results-shell/tabs'
import { decodeRepos, decodeFoundationUrl } from '@/lib/export/shareable-url'
import { parseRepos } from '@/lib/parse-repos'
import { parseFoundationInput } from '@/lib/foundation/parse-foundation-input'
import { LOADING_QUOTES, getRandomQuoteIndex } from '@/lib/loading-quotes'
import { RepoInputForm } from './RepoInputForm'
import { FoundationResultsView, type FoundationResult } from '@/components/foundation/FoundationResultsView'
import { FoundationNudge } from '@/components/foundation/FoundationNudge'

interface RepoInputClientProps {
  onAnalyze?: (repos: string[], token: string) => Promise<AnalyzeResponse> | AnalyzeResponse | void
  onAnalyzeOrg?: (org: string, token: string) => Promise<OrgInventoryResponse> | OrgInventoryResponse | void
}

export function RepoInputClient({ onAnalyze, onAnalyzeOrg }: RepoInputClientProps) {
  const { session } = useAuth()
  const searchParams = useSearchParams()
  const initialRepos = decodeRepos(searchParams.toString())
  const initialRepoValue = initialRepos.join('\n')
  const initialFoundationState = decodeFoundationUrl(searchParams.toString())
  const initialFoundationTarget = (initialFoundationState?.foundation ?? 'cncf-sandbox') as FoundationTarget
  const initialTab = (searchParams.get('tab') ?? 'overview') as ResultTabId
  const autoTriggeredRef = useRef(false)
  const foundationAutoTriggeredRef = useRef(false)
  const [analysisResponse, setAnalysisResponse] = useState<AnalyzeResponse | null>(null)
  const [analyzedRepos, setAnalyzedRepos] = useState<string[]>([])
  const [orgInventoryResponse, setOrgInventoryResponse] = useState<OrgInventoryResponse | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [loadingRepos, setLoadingRepos] = useState<string[]>([])
  const [loadingOrg, setLoadingOrg] = useState<string | null>(null)
  const [resultsResetKey, setResultsResetKey] = useState(0)
  const [inputMode, setInputMode] = useState<'repos' | 'org' | 'foundation'>('repos')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [emptyQuoteIndex, setEmptyQuoteIndex] = useState(() => getRandomQuoteIndex(null))
  const [quoteIndex, setQuoteIndex] = useState<number | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [foundationTarget, setFoundationTarget] = useState<FoundationTarget>(initialFoundationTarget)
  const [aspirantResult, setAspirantResult] = useState<AspirantReadinessResult | null>(null)
  // Foundation mode state
  const [foundationInput, setFoundationInput] = useState('')
  const [foundationResult, setFoundationResult] = useState<FoundationResult | null>(null)
  const [loadingFoundation, setLoadingFoundation] = useState(false)
  const [foundationError, setFoundationError] = useState<string | null>(null)
  const cncfBadges: CNCFFieldBadge[] = aspirantResult
    ? aspirantResult.autoFields.map((field) => ({ fieldId: field.id, label: field.label, status: field.status }))
    : []
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [preRunDialogRepos, setPreRunDialogRepos] = useState<string[] | null>(null)
  const [notificationOptIn, setNotificationOptIn] = useState(false)
  const repoFetchAbortRef = useRef<AbortController | null>(null)
  const orgFetchAbortRef = useRef<AbortController | null>(null)
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
  }, [isLoading, emptyQuoteIndex])

  const currentQuote = quoteIndex !== null ? LOADING_QUOTES[quoteIndex] : null

  const isEmptyState = !submissionError && !loadingRepos.length && !loadingOrg && !analysisResponse && !orgInventoryResponse

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
  const [orgWindow, setOrgWindow] = useState<ContributorDiversityWindow>(90)

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
          : await submitAnalysisRequest([repo], session.token, 'none')
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

  function handleModeChange(mode: 'repos' | 'org' | 'foundation') {
    setInputMode(mode)
    if (mode === 'org') {
      setAspirantResult(null)
    }
  }

  function handleReset() {
    setAnalysisResponse(null)
    setAnalyzedRepos([])
    setOrgInventoryResponse(null)
    setSubmissionError(null)
    setResultsResetKey((k) => k + 1)
    setSearchQuery('')
    setDebouncedQuery('')
    setAspirantResult(null)
    setFoundationResult(null)
    setFoundationError(null)
  }

  async function handleFoundationSubmit(input: string) {
    if (!session?.token) return

    const parsed = parseFoundationInput(input)

    if (parsed.kind === 'invalid') {
      setFoundationError(parsed.error)
      return
    }

    if (parsed.kind === 'projects-board') {
      setFoundationResult({ kind: 'projects-board', url: parsed.url })
      return
    }

    setFoundationError(null)
    setFoundationResult(null)
    setLoadingFoundation(true)

    try {
      if (parsed.kind === 'repos') {
        // Reuse existing submitAnalysisRequest — same endpoint, same pattern as Repos mode
        const response = onAnalyze
          ? await onAnalyze(parsed.repos, session.token)
          : await submitAnalysisRequest(parsed.repos, session.token, foundationTarget)
        if (response) {
          setFoundationResult({ kind: 'repos', results: response })
        }
      } else {
        // Reuse existing submitOrgInventoryRequest — same endpoint as Org mode
        const response = onAnalyzeOrg
          ? await onAnalyzeOrg(parsed.org, session.token)
          : await submitOrgInventoryRequest(parsed.org, session.token)
        if (response) {
          setFoundationResult({ kind: 'org', inventory: response })
        }
      }
    } catch (error) {
      setFoundationError(error instanceof Error ? error.message : 'Foundation scan failed.')
    } finally {
      setLoadingFoundation(false)
    }
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

  useEffect(() => {
    if (autoTriggeredRef.current) return
    if (!session?.token) return
    if (initialRepos.length === 0) return

    autoTriggeredRef.current = true
    const parsed = parseRepos(initialRepoValue)
    if (!parsed.valid) return
    void handleSubmit(parsed.repos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token])

  // Auto-trigger Foundation scan when URL has mode=foundation params
  useEffect(() => {
    if (foundationAutoTriggeredRef.current) return
    if (!session?.token) return
    if (!initialFoundationState) return

    foundationAutoTriggeredRef.current = true
    setInputMode('foundation')
    setFoundationTarget(initialFoundationState.foundation)
    setFoundationInput(initialFoundationState.input)
    void handleFoundationSubmit(initialFoundationState.input)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token])

  async function handleSubmit(repos: string[]) {
    if (!session?.token) return

    repoFetchAbortRef.current?.abort()
    const controller = new AbortController()
    repoFetchAbortRef.current = controller

    setSubmissionError(null)
    setAnalysisResponse(null)
    setOrgInventoryResponse(null)
    setAspirantResult(null)
    setResultsResetKey((current) => current + 1)
    setInputMode('repos')
    setLoadingRepos(repos)
    setLoadingOrg(null)

    try {
      const response = onAnalyze
        ? await onAnalyze(repos, session.token)
        : await submitAnalysisRequest(repos, session.token, foundationTarget, controller.signal)

      if (response && !controller.signal.aborted) {
        setAnalysisResponse(response)
        setAnalyzedRepos(repos)
        const firstResult = response.results[0]
        if (firstResult?.aspirantResult && !firstResult?.landscapeOverride) {
          setAspirantResult(firstResult.aspirantResult)
        } else {
          setAspirantResult(null)
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : 'Analysis request failed.'
      setSubmissionError(message)
    } finally {
      if (!controller.signal.aborted) setLoadingRepos([])
      repoFetchAbortRef.current = null
    }
  }

  function handleCancelRepoFetch() {
    repoFetchAbortRef.current?.abort()
    repoFetchAbortRef.current = null
    setLoadingRepos([])
  }

  async function handleOrgSubmit(org: string) {
    if (!session?.token) return

    orgFetchAbortRef.current?.abort()
    const controller = new AbortController()
    orgFetchAbortRef.current = controller

    setSubmissionError(null)
    setAnalysisResponse(null)
    setOrgInventoryResponse(null)
    setAspirantResult(null)
    setResultsResetKey((current) => current + 1)
    setInputMode('org')
    setLoadingRepos([])
    setLoadingOrg(org)
    orgAggregation.reset()

    try {
      const response = onAnalyzeOrg
        ? await onAnalyzeOrg(org, session.token)
        : await submitOrgInventoryRequest(org, session.token, controller.signal)

      if (response && !controller.signal.aborted) {
        setOrgInventoryResponse(response)
      }
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : 'Organization inventory request failed.'
      setSubmissionError(message)
    } finally {
      if (!controller.signal.aborted) setLoadingOrg(null)
      orgFetchAbortRef.current = null
    }
  }

  function handleCancelOrgFetch() {
    orgFetchAbortRef.current?.abort()
    orgFetchAbortRef.current = null
    setLoadingOrg(null)
  }

  const analysisPanel = (
    <RepoInputForm
      mode={inputMode}
      onModeChange={handleModeChange}
      onSubmitRepos={handleSubmit}
      onSubmitOrg={handleOrgSubmit}
      onSubmitFoundation={handleFoundationSubmit}
      initialRepoValue={initialRepoValue}
      foundationTarget={foundationTarget}
      onFoundationTargetChange={setFoundationTarget}
      foundationInputValue={foundationInput}
      onFoundationInputChange={setFoundationInput}
      foundationError={foundationError}
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
        { id: 'contributors', label: 'Contributors', status: 'implemented', description: 'Org-level contributor diversity and affiliations.' },
        { id: 'activity', label: 'Activity', status: 'implemented', description: 'Org-level activity, release cadence, and stale work.' },
        { id: 'responsiveness', label: 'Responsiveness', status: 'implemented', description: 'Org-level responsiveness metrics.' },
        { id: 'documentation', label: 'Documentation', status: 'implemented', description: 'Org-level documentation coverage, inclusive naming, and adopters.' },
        { id: 'governance', label: 'Governance', status: 'implemented', description: 'Org-level hygiene and policy — account activity, maintainers, governance files, license consistency.' },
        { id: 'security', label: 'Security', status: 'implemented', description: 'Org-level OpenSSF Scorecard rollup.' },
        { id: 'recommendations', label: 'Recommendations', status: 'implemented', description: 'Top systemic issues across the analyzed repos, grouped by CHAOSS dimension.' },
      ]
    : orgInventoryResponse?.org
      ? [
          { id: 'overview', label: 'Overview', status: 'implemented', description: 'Organization inventory summary and lightweight public repository metadata.' },
          { id: 'governance', label: 'Governance', status: 'implemented', description: 'Org-level security signals available without analyzing individual repos — 2FA enforcement, admin activity.' },
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
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter repositories and click <span className="font-medium text-slate-700 dark:text-slate-200">Analyze</span> to get started.
          </p>
          {emptyQuote ? (
            <p className="text-xs italic text-slate-400 dark:text-slate-500">
              &ldquo;{emptyQuote.text}&rdquo; — {emptyQuote.author}{emptyQuote.context ? `, ${emptyQuote.context}` : ''}
            </p>
          ) : null}
        </div>
      ) : null}
      {submissionError ? (
        <p role="alert" data-testid="analysis-error" className="text-sm text-red-600 dark:text-red-300">
          {submissionError}
        </p>
      ) : null}
      {loadingRepos.length > 0 && inputMode === 'repos' ? (
        <section aria-label="Analysis loading state" className="rounded border border-blue-200 bg-blue-50 p-4 dark:bg-blue-900/20 dark:border-blue-800/60">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-blue-900 dark:text-blue-200">Analyzing repositories...</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs tabular-nums text-blue-700 dark:text-blue-300">{formatElapsedTime(elapsedSeconds)}</span>
              <button
                type="button"
                onClick={handleCancelRepoFetch}
                aria-label="Cancel"
                title="Cancel"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700 dark:bg-slate-900"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                  <rect x="3.5" y="3.5" width="9" height="9" rx="1" />
                </svg>
              </button>
            </div>
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm text-blue-900 dark:text-blue-200">
            {loadingRepos.map((repo) => (
              <li key={repo}>{repo}</li>
            ))}
          </ul>
          {elapsedSeconds >= 10 ? (
            <p className="mt-3 text-xs text-blue-700 dark:text-blue-300">
              Large repositories with extensive commit history may take longer to analyze.
            </p>
          ) : null}
          {elapsedSeconds >= 30 ? (
            <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
              Still working — fetching commit history and computing contributor metrics.
            </p>
          ) : null}
          {currentQuote ? (
            <p className="mt-3 border-t border-blue-200 pt-3 text-xs italic text-blue-600 dark:border-blue-800/60 dark:text-blue-400">
              &ldquo;{currentQuote.text}&rdquo; — {currentQuote.author}{currentQuote.context ? `, ${currentQuote.context}` : ''}
            </p>
          ) : null}
        </section>
      ) : null}
      {loadingOrg ? (
        <section aria-label="Org inventory loading state" className="rounded border border-blue-200 bg-blue-50 p-4 dark:bg-blue-900/20 dark:border-blue-800/60">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-blue-900 dark:text-blue-200">Loading org inventory for:</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs tabular-nums text-blue-700 dark:text-blue-300">{formatElapsedTime(elapsedSeconds)}</span>
              <button
                type="button"
                onClick={handleCancelOrgFetch}
                aria-label="Cancel"
                title="Cancel"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700 dark:bg-slate-900"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                  <rect x="3.5" y="3.5" width="9" height="9" rx="1" />
                </svg>
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-blue-900 dark:text-blue-200">{loadingOrg}</p>
          {elapsedSeconds >= 10 ? (
            <p className="mt-3 text-xs text-blue-700 dark:text-blue-300">
              Large organizations with many repositories may take longer to load.
            </p>
          ) : null}
          {currentQuote ? (
            <p className="mt-3 border-t border-blue-200 pt-3 text-xs italic text-blue-600 dark:border-blue-800/60 dark:text-blue-400">
              &ldquo;{currentQuote.text}&rdquo; — {currentQuote.author}{currentQuote.context ? `, ${currentQuote.context}` : ''}
            </p>
          ) : null}
        </section>
      ) : null}
      {inputMode === 'repos' && analysisResponse ? (
        <section aria-label="Analysis results" className="space-y-4">
          {orgInventoryResponse && orgAggregation.view ? (
            <section className="flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200 dark:bg-sky-900/20 dark:border-sky-800/60">
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 flex-shrink-0 text-sky-600 dark:text-sky-400">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
              </svg>
              <span>
                These repos were analyzed from the <strong>{orgInventoryResponse.org}</strong> organization. Switch to the <strong>Organization</strong> tab for org-level insights.
              </span>
            </section>
          ) : null}
          <MetricCardsOverview results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} />
          {analysisResponse.failures.length > 0 ? (
            <section className="rounded border border-amber-200 bg-amber-50 p-4 dark:bg-amber-900/20 dark:border-amber-800/60">
              <h2 className="font-semibold text-amber-900 dark:text-amber-200">Failed repositories</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 dark:text-amber-200">
                {analysisResponse.failures.map((failure) => (
                  <li key={failure.repo}>
                    {failure.repo}: {failure.reason}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {analysisResponse.rateLimit && !orgInventoryResponse && isRateLimitLow(analysisResponse.rateLimit) ? (
            <section className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-200">
              <p>Remaining API calls: {formatDisplayValue(analysisResponse.rateLimit.remaining)}</p>
              <p>Rate limit resets at: {formatRateLimitReset(analysisResponse.rateLimit.resetAt)}</p>
              {analysisResponse.rateLimit.retryAfter !== 'unavailable' ? (
                <p>Retry after: {formatRetryAfter(analysisResponse.rateLimit.retryAfter)}</p>
              ) : null}
            </section>
          ) : null}
          {/* Nudge: invite user to check Foundation readiness for these repos */}
          <FoundationNudge
            label={`Check CNCF Sandbox readiness for ${analyzedRepos.length === 1 ? analyzedRepos[0] : `${analyzedRepos.length} repos`}`}
            prefillValue={analyzedRepos.join('\n')}
            onActivate={(prefill) => {
              setInputMode('foundation')
              setFoundationInput(prefill)
            }}
          />
        </section>
      ) : null}
      {inputMode === 'org' && orgInventoryResponse ? (
        <section aria-label="Org inventory results" className="space-y-4">
          {orgInventoryResponse.failure ? (
            <section className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-900/20 dark:border-amber-800/60 dark:text-amber-200">
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
                  setPreRunDialogRepos(repos)
                }}
                onAnalyzeAllActive={(repos) => {
                  setPreRunDialogRepos(repos)
                }}
                afterSummary={orgAggregation.view ? (
                  <div ref={orgSummaryRef}>
                    <OrgSummaryView
                      org={orgInventoryResponse.org}
                      view={orgAggregation.view}
                      startedAt={orgAggregation.run?.startedAt}
                      onCancel={orgAggregation.cancel}
                      onPause={orgAggregation.pause}
                      onResume={orgAggregation.resume}
                      onRetry={orgAggregation.retry}
                      showPanels={false}
                      notificationToggle={
                        <NotificationToggle
                          enabled={notificationOptIn}
                          onChange={setNotificationOptIn}
                        />
                      }
                    />
                  </div>
                ) : undefined}
              />
              {/* Nudge: invite user to check Foundation readiness for this org */}
              <FoundationNudge
                label={`Check CNCF Sandbox candidacy for ${orgInventoryResponse.org}`}
                prefillValue={orgInventoryResponse.org}
                onActivate={(prefill) => {
                  setInputMode('foundation')
                  setFoundationInput(prefill)
                }}
              />
            </>
          )}
        </section>
      ) : null}
      {inputMode === 'foundation' ? (
        <FoundationResultsView
          result={foundationResult}
          loading={loadingFoundation}
          error={foundationError}
        />
      ) : null}
      {showOrgWorkspace && !loadingOrg && !orgInventoryResponse && !submissionError ? (
        <section className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-200">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Organization inventory</h2>
          <p className="mt-2">
            Enter a GitHub organization slug or org URL above to browse its public repository inventory.
          </p>
        </section>
      ) : null}
    </div>
  )

  return (
    <SearchProvider query={debouncedQuery}>
    {preRunDialogRepos && orgInventoryResponse ? (
      <PreRunWarningDialog
        repoCount={preRunDialogRepos.length}
        onConfirm={({ concurrency, notificationOptIn: notifOpt }) => {
          const repos = preRunDialogRepos
          setPreRunDialogRepos(null)
          setNotificationOptIn(notifOpt)
          void orgAggregation.start({
            org: orgInventoryResponse.org,
            repos,
            concurrency,
            notificationOptIn: notifOpt,
          })
        }}
        onCancel={() => setPreRunDialogRepos(null)}
      />
    ) : null}
    <ResultsShell
      resetKey={resultsResetKey}
      initialActiveTab={initialTab}
      onReset={handleReset}
      analysisPanel={analysisPanel}
      toolbar={inputMode === 'org' && orgAnalysisComplete ? <OrgWindowSelector selected={orgWindow} onChange={setOrgWindow} /> : exportToolbar}
      tabs={showOrgWorkspace ? orgInventoryTabs : repoTabs}
      searchQuery={debouncedQuery}
      onDomMatchCounts={handleDomMatchCounts}
      tagMatchCounts={analysisResponse ? computeTabTagCounts(analysisResponse.results, activeTag) : undefined}
      overview={overviewContent}
      contributors={
        inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="contributors" view={orgAggregation.view} selectedWindow={orgWindow} />
        ) : analysisResponse ? (
          <ContributorsView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} cncfBadges={cncfBadges} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter repositories and click <span className="font-medium text-slate-700 dark:text-slate-200">Analyze</span> to get started.
          </p>
        )
      }
      activity={
        inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="activity" view={orgAggregation.view} selectedWindow={orgWindow} />
        ) : analysisResponse ? (
          <ActivityView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} cncfBadges={cncfBadges} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter repositories and click <span className="font-medium text-slate-700 dark:text-slate-200">Analyze</span> to get started.
          </p>
        )
      }
      responsiveness={
        inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="responsiveness" view={orgAggregation.view} selectedWindow={orgWindow} />
        ) : analysisResponse ? (
          <ResponsivenessView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter repositories and click <span className="font-medium text-slate-700 dark:text-slate-200">Analyze</span> to get started.
          </p>
        )
      }
      documentation={
        inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent
            bucketId="documentation"
            view={orgAggregation.view}
            selectedWindow={orgWindow}
          />
        ) : analysisResponse ? (
          <DocumentationView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} cncfBadges={cncfBadges} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter repositories and click <span className="font-medium text-slate-700 dark:text-slate-200">Analyze</span> to get started.
          </p>
        )
      }
      governance={
        inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent
            bucketId="governance"
            view={orgAggregation.view}
            selectedWindow={orgWindow}
            org={orgInventoryResponse?.org ?? null}
          />
        ) : inputMode === 'org' && orgInventoryResponse?.org ? (
          <OrgBucketContent
            bucketId="governance"
            view={null}
            org={orgInventoryResponse.org}
          />
        ) : null
      }
      security={
        inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="security" view={orgAggregation.view} selectedWindow={orgWindow} />
        ) : analysisResponse ? (
          <SecurityView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} cncfBadges={cncfBadges} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter repositories and click <span className="font-medium text-slate-700 dark:text-slate-200">Analyze</span> to get started.
          </p>
        )
      }
      recommendations={
        inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="recommendations" view={orgAggregation.view} selectedWindow={orgWindow} />
        ) : analysisResponse ? (
          <RecommendationsView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter repositories and click <span className="font-medium text-slate-700 dark:text-slate-200">Analyze</span> to get started.
          </p>
        )
      }
      comparison={
        analysisResponse && successfulRepoCount >= 2 ? (
          <ComparisonView results={analysisResponse.results} rateLimit={analysisResponse.rateLimit} />
        ) : loadingRepos.length >= 2 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {loadingRepos.length > 4
              ? <>Preparing comparison for the first 4 of {loadingRepos.length}:{' '}</>
              : <>Preparing comparison for{' '}</>}
            {loadingRepos.slice(0, 4).map((repo, i, arr) => (
              <span key={repo}>
                <span className="font-medium text-slate-800 dark:text-slate-100">{repo}</span>
                {i < arr.length - 1 ? ', ' : ''}
              </span>
            ))}
            …
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter 2 or more repositories and click <span className="font-medium text-slate-700 dark:text-slate-200">Analyze</span> to get started.
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

async function submitAnalysisRequest(repos: string[], token: string, foundationTarget: FoundationTarget, signal?: AbortSignal): Promise<AnalyzeResponse> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repos, token, foundationTarget }),
    signal,
  })
  const payload = (await response.json()) as AnalyzeResponse & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? 'Analysis request failed.')
  return payload
}

async function submitOrgInventoryRequest(org: string, token: string, signal?: AbortSignal): Promise<OrgInventoryResponse> {
  const response = await fetch('/api/analyze-org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org, token }),
    signal,
  })
  const payload = (await response.json()) as OrgInventoryResponse & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? 'Organization inventory request failed.')
  return payload
}
