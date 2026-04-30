'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ResultsShell } from '@/components/app-shell/ResultsShell'
import { ActivityView } from '@/components/activity/ActivityView'
import { ContributorsView } from '@/components/contributors/ContributorsView'
import { CorporateContributionPanel } from '@/components/contributors/CorporateContributionPanel'
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
import { decodeFoundationUrl, encodeFoundationUrl, isValidRepoSlug } from '@/lib/export/shareable-url'
import { parseRepos } from '@/lib/parse-repos'
import { parseFoundationInput } from '@/lib/foundation/parse-foundation-input'
import { fetchBoardRepos, type SkippedIssue } from '@/lib/foundation/fetch-board-repos'
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
  // Raw slugs for textarea display — show everything from the URL including invalid entries
  // so users can see and correct them; isValidRepoSlug gates the auto-trigger below.
  const initialRawRepos = (() => {
    const raw = new URLSearchParams(searchParams.toString()).get('repos')
    if (!raw) return []
    return raw.split(',').map((s) => s.trim()).filter(Boolean)
  })()
  const initialRepoValue = initialRawRepos.join('\n')
  const initialFoundationState = decodeFoundationUrl(searchParams.toString())
  const initialFoundationTarget = (initialFoundationState?.foundation ?? 'none') as FoundationTarget
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
  const [foundationLoadingItems, setFoundationLoadingItems] = useState<string[]>([])
  const [foundationError, setFoundationError] = useState<string | null>(null)
  const [verifyRepos, setVerifyRepos] = useState(false)
  const [pendingBoardScan, setPendingBoardScan] = useState<{
    repos: string[]
    skipped: SkippedIssue[]
    method: 'graphql' | 'labels'
    url: string
    issueMap: Record<string, number>
  } | null>(null)
  const cncfBadges: CNCFFieldBadge[] = aspirantResult
    ? aspirantResult.autoFields.map((field) => ({ fieldId: field.id, label: field.label, status: field.status }))
    : []
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [preRunDialogRepos, setPreRunDialogRepos] = useState<string[] | null>(null)
  const [notificationOptIn, setNotificationOptIn] = useState(false)
  const repoFetchAbortRef = useRef<AbortController | null>(null)
  const orgFetchAbortRef = useRef<AbortController | null>(null)
  const foundationFetchAbortRef = useRef<AbortController | null>(null)
  const previousFoundationResultRef = useRef<FoundationResult | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const quoteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Ref so the loading-start effect can read the current emptyQuoteIndex without
  // re-running (and resetting the elapsed timer) each time the idle quote rotates.
  const emptyQuoteIndexRef = useRef(emptyQuoteIndex)
  emptyQuoteIndexRef.current = emptyQuoteIndex
  // Latest-ref wrappers so one-shot auto-trigger effects always call the current handler
  // without taking it as a dep (which would cause the effects to re-run on every render).
  const handleSubmitRef = useRef(handleSubmit)
  handleSubmitRef.current = handleSubmit
  const handleFoundationSubmitRef = useRef(handleFoundationSubmit)
  handleFoundationSubmitRef.current = handleFoundationSubmit

  const isLoading = loadingRepos.length > 0 || !!loadingOrg || loadingFoundation

  useEffect(() => {
    if (isLoading) {
      setElapsedSeconds(0)
      setQuoteIndex(emptyQuoteIndexRef.current)
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

  // Parse company: prefix from raw search query
  function parseSearchQuery(query: string): { companyName: string; freeText: string } {
    const match = query.match(/(^|\s)company:\s*(\S+)/i)
    if (!match) return { companyName: '', freeText: query.trim() }
    return { companyName: match[2], freeText: query.replace(match[0], '').trim() }
  }
  const { companyName, freeText: searchFreeText } = parseSearchQuery(searchQuery)

  // Search: debounce free-text portion (company: prefix is handled separately)
  useEffect(() => {
    if (!searchQuery) {
      setDebouncedQuery('')
      setDomTotalMatches(0)
      setDomMatchedTabCount(0)
      return
    }
    const { freeText } = parseSearchQuery(searchQuery)
    const timeout = setTimeout(() => setDebouncedQuery(freeText), 300)
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
    setFoundationLoadingItems([])
    setPendingBoardScan(null)
    previousFoundationResultRef.current = null
  }

  async function handleFoundationSubmit(input: string) {
    if (!session?.token) return

    const parsed = parseFoundationInput(input)

    if (parsed.kind === 'invalid') {
      setFoundationError(parsed.error)
      return
    }

    foundationFetchAbortRef.current?.abort()
    const controller = new AbortController()
    foundationFetchAbortRef.current = controller

    previousFoundationResultRef.current = foundationResult
    setFoundationError(null)
    setFoundationResult(null)
    setPendingBoardScan(null)
    setLoadingFoundation(true)

    if (parsed.kind === 'projects-board') {
      setFoundationLoadingItems(['Resolving repositories from board…'])
      try {
        const { repos, skipped, method, issueMap } = await fetchBoardRepos(session.token, parsed.url)

        if (controller.signal.aborted) return

        if (repos.length === 0) {
          setFoundationError(
            'No repositories could be resolved from the CNCF sandbox board. The New and review/tech columns may be empty, or issue bodies may not contain parseable repository URLs.',
          )
          return
        }

        if (verifyRepos) {
          // Pause here — show review panel so user can confirm before analysis
          setPendingBoardScan({ repos, skipped, method, url: parsed.url, issueMap })
          return
        }

        // Go straight into analysis without review
        setFoundationLoadingItems(repos)
        const response = onAnalyze
          ? await onAnalyze(repos, session.token)
          : await submitAnalysisRequest(repos, session.token, 'cncf-sandbox', controller.signal, issueMap)
        if (response && !controller.signal.aborted) {
          setFoundationResult({ kind: 'projects-board', url: parsed.url, results: response, skipped, method })
        }
      } catch (error) {
        if (controller.signal.aborted) return
        setFoundationError(error instanceof Error ? error.message : 'Board scan failed.')
      } finally {
        setLoadingFoundation(false)
        setFoundationLoadingItems([])
        foundationFetchAbortRef.current = null
      }
      return
    }

    setFoundationLoadingItems(parsed.kind === 'repos' ? parsed.repos : [parsed.kind === 'org' ? parsed.org : ''])

    try {
      if (parsed.kind === 'repos') {
        const response = onAnalyze
          ? await onAnalyze(parsed.repos, session.token)
          : await submitAnalysisRequest(parsed.repos, session.token, foundationTarget, controller.signal)
        if (response && !controller.signal.aborted) {
          setFoundationResult({ kind: 'repos', results: response })
        }
      } else {
        const response = onAnalyzeOrg
          ? await onAnalyzeOrg(parsed.org, session.token)
          : await submitOrgInventoryRequest(parsed.org, session.token)
        if (response && !controller.signal.aborted) {
          setFoundationResult({ kind: 'org', inventory: response })
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return
      setFoundationError(error instanceof Error ? error.message : 'Foundation scan failed.')
    } finally {
      setLoadingFoundation(false)
      foundationFetchAbortRef.current = null
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
    if (initialRawRepos.length === 0) return
    if (!initialRawRepos.every(isValidRepoSlug)) return

    autoTriggeredRef.current = true
    const parsed = parseRepos(initialRepoValue)
    if (!parsed.valid) return
    void handleSubmitRef.current(parsed.repos)
  }, [session?.token, initialRawRepos, initialRepoValue])

  // Auto-trigger Foundation scan when URL has mode=foundation params
  useEffect(() => {
    if (foundationAutoTriggeredRef.current) return
    if (!session?.token) return
    if (!initialFoundationState) return

    foundationAutoTriggeredRef.current = true
    setInputMode('foundation')
    setFoundationTarget(initialFoundationState.foundation)
    setFoundationInput(initialFoundationState.input)
    void handleFoundationSubmitRef.current(initialFoundationState.input)
  }, [session?.token, initialFoundationState, setInputMode, setFoundationTarget, setFoundationInput])

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

  function handleCancelFoundationFetch() {
    foundationFetchAbortRef.current?.abort()
    foundationFetchAbortRef.current = null
    setLoadingFoundation(false)
    setFoundationLoadingItems([])
    // If analysis was aborted for a board scan, keep pendingBoardScan so the
    // review panel reappears; otherwise restore the previous result.
    if (!pendingBoardScan) {
      setFoundationResult(previousFoundationResultRef.current)
    }
    previousFoundationResultRef.current = null
  }

  async function handleStartBoardAnalysis() {
    if (!session?.token || !pendingBoardScan) return

    foundationFetchAbortRef.current?.abort()
    const controller = new AbortController()
    foundationFetchAbortRef.current = controller

    previousFoundationResultRef.current = foundationResult
    setFoundationError(null)
    setFoundationResult(null)
    setLoadingFoundation(true)
    setFoundationLoadingItems(pendingBoardScan.repos)

    const { repos, skipped, method, url, issueMap } = pendingBoardScan

    try {
      const response = onAnalyze
        ? await onAnalyze(repos, session.token)
        : await submitAnalysisRequest(repos, session.token, 'cncf-sandbox', controller.signal, issueMap)

      if (response && !controller.signal.aborted) {
        setFoundationResult({ kind: 'projects-board', url, results: response, skipped, method })
        setPendingBoardScan(null)
      }
    } catch (error) {
      if (controller.signal.aborted) return
      setFoundationError(error instanceof Error ? error.message : 'Board scan failed.')
    } finally {
      setLoadingFoundation(false)
      setFoundationLoadingItems([])
      foundationFetchAbortRef.current = null
    }
  }

  async function handleReanalyzeBoard(url: string) {
    if (!session?.token) return

    foundationFetchAbortRef.current?.abort()
    const controller = new AbortController()
    foundationFetchAbortRef.current = controller

    previousFoundationResultRef.current = foundationResult
    setFoundationError(null)
    setFoundationResult(null)
    setPendingBoardScan(null)
    setLoadingFoundation(true)
    setFoundationLoadingItems(['Resolving repositories from board…'])

    try {
      const { repos, skipped, method, issueMap } = await fetchBoardRepos(session.token, url)
      if (controller.signal.aborted) return

      if (repos.length === 0) {
        setFoundationError(
          'No repositories could be resolved from the CNCF sandbox board. The New and review/tech columns may be empty, or issue bodies may not contain parseable repository URLs.',
        )
        return
      }

      setFoundationLoadingItems(repos)
      const response = onAnalyze
        ? await onAnalyze(repos, session.token)
        : await submitAnalysisRequest(repos, session.token, 'cncf-sandbox', controller.signal, issueMap)

      if (response && !controller.signal.aborted) {
        setFoundationResult({ kind: 'projects-board', url, results: response, skipped, method })
      }
    } catch (error) {
      if (controller.signal.aborted) return
      setFoundationError(error instanceof Error ? error.message : 'Board re-analysis failed.')
    } finally {
      setLoadingFoundation(false)
      setFoundationLoadingItems([])
      foundationFetchAbortRef.current = null
    }
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
      verifyRepos={verifyRepos}
      onVerifyReposChange={setVerifyRepos}
    />
  )

  const exportToolbar = analysisResponse && inputMode === 'repos' ? (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <ReportSearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          totalMatches={domTotalMatches}
          matchedTabCount={domMatchedTabCount}
          freeText={searchFreeText}
        />
        <ExportControls analysisResponse={analysisResponse} analyzedRepos={analyzedRepos} />
      </div>
      {companyName && (
        <CorporateContributionPanel results={analysisResponse.results} companyName={companyName} />
      )}
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
      {inputMode === 'foundation' && !foundationResult && !foundationError && !loadingFoundation && !pendingBoardScan ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter one or more repos or an org slug above and click <span className="font-medium text-slate-700 dark:text-slate-200">Analyze</span> to check foundation readiness.
          </p>
          {emptyQuote ? (
            <p className="text-xs italic text-slate-400 dark:text-slate-500">
              &ldquo;{emptyQuote.text}&rdquo; — {emptyQuote.author}{emptyQuote.context ? `, ${emptyQuote.context}` : ''}
            </p>
          ) : null}
        </div>
      ) : null}
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
        <section aria-label="Analysis loading state">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Analyzing repositories...</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{formatElapsedTime(elapsedSeconds)}</span>
              <button
                type="button"
                onClick={handleCancelRepoFetch}
                aria-label="Cancel"
                title="Cancel"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                  <rect x="3.5" y="3.5" width="9" height="9" rx="1" />
                </svg>
              </button>
            </div>
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
            {loadingRepos.map((repo) => (
              <li key={repo}>{repo}</li>
            ))}
          </ul>
          {elapsedSeconds >= 10 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Large repositories with extensive commit history may take longer to analyze.
            </p>
          ) : null}
          {elapsedSeconds >= 30 ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Still working — fetching commit history and computing contributor metrics.
            </p>
          ) : null}
          {currentQuote ? (
            <p className="mt-3 border-t border-slate-200 pt-3 text-xs italic text-slate-400 dark:border-slate-700 dark:text-slate-500">
              &ldquo;{currentQuote.text}&rdquo; — {currentQuote.author}{currentQuote.context ? `, ${currentQuote.context}` : ''}
            </p>
          ) : null}
        </section>
      ) : null}
      {loadingOrg ? (
        <section aria-label="Org inventory loading state">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Loading org inventory for:</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{formatElapsedTime(elapsedSeconds)}</span>
              <button
                type="button"
                onClick={handleCancelOrgFetch}
                aria-label="Cancel"
                title="Cancel"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                  <rect x="3.5" y="3.5" width="9" height="9" rx="1" />
                </svg>
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{loadingOrg}</p>
          {elapsedSeconds >= 10 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Large organizations with many repositories may take longer to load.
            </p>
          ) : null}
          {currentQuote ? (
            <p className="mt-3 border-t border-slate-200 pt-3 text-xs italic text-slate-400 dark:border-slate-700 dark:text-slate-500">
              &ldquo;{currentQuote.text}&rdquo; — {currentQuote.author}{currentQuote.context ? `, ${currentQuote.context}` : ''}
            </p>
          ) : null}
        </section>
      ) : null}
      {loadingFoundation ? (
        <section aria-label="Foundation scan loading state">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200">Analyzing foundation readiness...</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{formatElapsedTime(elapsedSeconds)}</span>
              <button
                type="button"
                onClick={handleCancelFoundationFetch}
                aria-label="Cancel"
                title="Cancel"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                  <rect x="3.5" y="3.5" width="9" height="9" rx="1" />
                </svg>
              </button>
            </div>
          </div>
          {foundationLoadingItems.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
              {foundationLoadingItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
          {elapsedSeconds >= 10 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Large repositories with extensive commit history may take longer to analyze.
            </p>
          ) : null}
          {elapsedSeconds >= 30 ? (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Still working — fetching commit history and computing contributor metrics.
            </p>
          ) : null}
          {currentQuote ? (
            <p className="mt-3 border-t border-slate-200 pt-3 text-xs italic text-slate-400 dark:border-slate-700 dark:text-slate-500">
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
      {inputMode === 'foundation' && pendingBoardScan && !loadingFoundation ? (
        <section className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {pendingBoardScan.repos.length} {pendingBoardScan.repos.length === 1 ? 'repository' : 'repositories'} found
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {pendingBoardScan.method === 'graphql' ? (
                  <>Resolved from the <strong>New</strong> and <strong>review/tech</strong> columns of the board via the GitHub Projects API.</>
                ) : (
                  <>Resolved from open issues in{' '}
                  <a href="https://github.com/cncf/sandbox/issues" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">cncf/sandbox</a>
                  {' '}matching{' '}
                  <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-700">label:New -label:gitvote/passed</code>
                  {' '}or{' '}
                  <code className="rounded bg-slate-100 px-1 text-xs dark:bg-slate-700">label:review/tech -label:sandbox</code>.</>
                )}
              </p>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                Review the list below, then click <strong>Analyze</strong> to run the CNCF Sandbox readiness scan.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => void handleStartBoardAnalysis()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                Analyze
              </button>
              <button
                type="button"
                onClick={() => setPendingBoardScan(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {pendingBoardScan.repos.map((repo) => (
              <li key={repo} className="truncate text-sm text-slate-700 dark:text-slate-300">
                <a
                  href={`https://github.com/${repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  {repo}
                </a>
              </li>
            ))}
          </ul>
          {pendingBoardScan.skipped.length > 0 ? (
            <section className="rounded border border-amber-200 bg-amber-50 p-4 dark:bg-amber-900/20 dark:border-amber-800/60">
              <h2 className="font-semibold text-amber-900 dark:text-amber-200">
                Skipped issues ({pendingBoardScan.skipped.length})
              </h2>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                These issues could not be resolved to a repository URL and will be excluded from the scan.
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 dark:text-amber-200">
                {pendingBoardScan.skipped.map((s) => (
                  <li key={s.issueNumber}>
                    <a href={s.issueUrl} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                      #{s.issueNumber} {s.title}
                    </a>: {s.reason}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </section>
      ) : null}
      {inputMode === 'foundation' && !pendingBoardScan ? (
        <FoundationResultsView
          result={foundationResult}
          error={foundationError}
          shareableUrl={
            foundationResult && foundationInput
              ? encodeFoundationUrl({ foundation: foundationTarget, input: foundationInput })
              : undefined
          }
          onReanalyze={
            foundationResult && !loadingFoundation
              ? foundationResult.kind === 'projects-board'
                ? () => void handleReanalyzeBoard(foundationResult.url)
                : () => void handleFoundationSubmit(foundationInput)
              : undefined
          }
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
      hideTabs={inputMode === 'foundation'}
      toolbar={inputMode === 'org' && orgAnalysisComplete ? <OrgWindowSelector selected={orgWindow} onChange={setOrgWindow} /> : exportToolbar}
      tabs={showOrgWorkspace ? orgInventoryTabs : repoTabs}
      searchQuery={debouncedQuery}
      onDomMatchCounts={handleDomMatchCounts}
      tagMatchCounts={analysisResponse ? computeTabTagCounts(analysisResponse.results, activeTag) : undefined}
      slots={{
        overview: overviewContent,
        contributors: inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="contributors" view={orgAggregation.view} selectedWindow={orgWindow} />
        ) : analysisResponse ? (
          <ContributorsView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} cncfBadges={cncfBadges} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter repositories and click <span className="font-medium text-slate-700 dark:text-slate-200">Analyze</span> to get started.
          </p>
        ),
        activity: inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="activity" view={orgAggregation.view} selectedWindow={orgWindow} />
        ) : analysisResponse ? (
          <ActivityView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} cncfBadges={cncfBadges} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter repositories and click <span className="font-medium text-slate-700 dark:text-slate-200">Analyze</span> to get started.
          </p>
        ),
        responsiveness: inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="responsiveness" view={orgAggregation.view} selectedWindow={orgWindow} />
        ) : analysisResponse ? (
          <ResponsivenessView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter repositories and click <span className="font-medium text-slate-700 dark:text-slate-200">Analyze</span> to get started.
          </p>
        ),
        documentation: inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
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
        ),
        governance: inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
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
        ) : undefined,
        security: inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="security" view={orgAggregation.view} selectedWindow={orgWindow} />
        ) : analysisResponse ? (
          <SecurityView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} cncfBadges={cncfBadges} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter repositories and click <span className="font-medium text-slate-700 dark:text-slate-200">Analyze</span> to get started.
          </p>
        ),
        recommendations: inputMode === 'org' && orgAnalysisComplete && orgAggregation.view ? (
          <OrgBucketContent bucketId="recommendations" view={orgAggregation.view} selectedWindow={orgWindow} />
        ) : analysisResponse ? (
          <RecommendationsView results={analysisResponse.results} activeTag={activeTag} onTagChange={setActiveTag} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter repositories and click <span className="font-medium text-slate-700 dark:text-slate-200">Analyze</span> to get started.
          </p>
        ),
        comparison: analysisResponse && successfulRepoCount >= 2 ? (
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
        ),
      }}
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

async function submitAnalysisRequest(repos: string[], token: string, foundationTarget: FoundationTarget, signal?: AbortSignal, sandboxIssueNumbers?: Record<string, number>): Promise<AnalyzeResponse> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repos, token, foundationTarget, sandboxIssueNumbers }),
    signal,
  })
  const payload = (await response.json()) as AnalyzeResponse & { error?: { message: string; code: string } }
  if (!response.ok) throw new Error(payload.error?.message ?? 'Analysis request failed.')
  return payload
}

async function submitOrgInventoryRequest(org: string, token: string, signal?: AbortSignal): Promise<OrgInventoryResponse> {
  const response = await fetch('/api/analyze-org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org, token }),
    signal,
  })
  const payload = (await response.json()) as OrgInventoryResponse & { error?: { message: string; code: string } }
  if (!response.ok) throw new Error(payload.error?.message ?? 'Organization inventory request failed.')
  return payload
}
