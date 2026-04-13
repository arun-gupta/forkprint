'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ResultsShell } from '@/components/app-shell/ResultsShell'
import { ActivityView } from '@/components/activity/ActivityView'
import { ContributorsView } from '@/components/contributors/ContributorsView'
import { ComparisonView } from '@/components/comparison/ComparisonView'
import { DocumentationView } from '@/components/documentation/DocumentationView'
import { RecommendationsView } from '@/components/recommendations/RecommendationsView'
import { MetricCardsOverview } from '@/components/metric-cards/MetricCardsOverview'
import { OrgInventoryView } from '@/components/org-inventory/OrgInventoryView'
import { ResponsivenessView } from '@/components/responsiveness/ResponsivenessView'
import { ExportControls } from '@/components/export/ExportControls'
import { useAuth } from '@/components/auth/AuthContext'
import type { AnalyzeResponse } from '@/lib/analyzer/analysis-result'
import type { OrgInventoryResponse } from '@/lib/analyzer/org-inventory'
import type { ResultTabDefinition } from '@/specs/006-results-shell/contracts/results-shell-props'
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const quoteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isLoading = loadingRepos.length > 0 || !!loadingOrg

  useEffect(() => {
    if (isLoading) {
      setElapsedSeconds(0)
      setQuoteIndex(null)
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1)
      }, 1000)

      // Show first quote after 5 seconds, rotate every 6 seconds
      const quoteDelay = setTimeout(() => {
        setQuoteIndex(getRandomQuoteIndex(null))
        quoteTimerRef.current = setInterval(() => {
          setQuoteIndex((current) => getRandomQuoteIndex(current))
        }, 6000)
      }, 5000)

      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
        if (quoteTimerRef.current) clearInterval(quoteTimerRef.current)
        clearTimeout(quoteDelay)
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
    }, 8000)

    return () => clearInterval(interval)
  }, [isEmptyState])

  const emptyQuote = LOADING_QUOTES[emptyQuoteIndex]

  function handleModeChange(mode: 'repos' | 'org') {
    setInputMode(mode)
  }

  function handleReset() {
    setAnalysisResponse(null)
    setAnalyzedRepos([])
    setOrgInventoryResponse(null)
    setSubmissionError(null)
    setResultsResetKey((k) => k + 1)
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
    <ExportControls analysisResponse={analysisResponse} analyzedRepos={analyzedRepos} />
  ) : null

  const orgInventoryTabs: ResultTabDefinition[] = [
    {
      id: 'overview',
      label: 'Overview',
      status: 'implemented',
      description: 'Organization inventory summary and lightweight public repository metadata.',
    },
  ]

  const showOrgWorkspace = inputMode === 'org' && !analysisResponse
  const successfulRepoCount = analysisResponse?.results.length ?? 0
  const repoTabs: ResultTabDefinition[] = [
    {
      id: 'overview',
      label: 'Overview',
      status: 'implemented',
      description: 'Current analysis summary, ecosystem profile, and shared status',
    },
    {
      id: 'contributors',
      label: 'Contributors',
      status: 'implemented',
      description: 'Core contributor metrics and sustainability signals.',
    },
    {
      id: 'activity',
      label: 'Activity',
      status: 'implemented',
      description: 'Activity metrics, scoring, and detailed repo flow signals.',
    },
    {
      id: 'responsiveness',
      label: 'Responsiveness',
      status: 'implemented',
      description: 'Response-time, backlog-health, and engagement signals from public issue and PR activity.',
    },
    {
      id: 'documentation',
      label: 'Documentation',
      status: 'implemented',
      description: 'Documentation file presence, README quality, and improvement recommendations.',
    },
    {
      id: 'recommendations',
      label: 'Recommendations',
      status: 'implemented',
      description: 'Actionable recommendations across all scoring dimensions.',
    },
    {
      id: 'comparison' as const,
      label: 'Comparison',
      status: 'implemented' as const,
      description: 'Side-by-side comparison across analyzed repositories.',
    },
  ]

  const overviewContent = (
    <div className="space-y-4">
      {isEmptyState ? (
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
      {loadingRepos.length > 0 ? (
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
          <MetricCardsOverview results={analysisResponse.results} />
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
            />
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
    <ResultsShell
      resetKey={resultsResetKey}
      initialActiveTab="overview"
      onReset={handleReset}
      analysisPanel={analysisPanel}
      toolbar={exportToolbar}
      tabs={showOrgWorkspace ? orgInventoryTabs : repoTabs}
      overview={overviewContent}
      contributors={
        analysisResponse ? (
          <ContributorsView results={analysisResponse.results} />
        ) : (
          <p className="text-sm text-slate-500">
            Enter repositories and click <span className="font-medium text-slate-700">Analyze</span> to get started.
          </p>
        )
      }
      activity={
        analysisResponse ? (
          <ActivityView results={analysisResponse.results} />
        ) : (
          <p className="text-sm text-slate-500">
            Enter repositories and click <span className="font-medium text-slate-700">Analyze</span> to get started.
          </p>
        )
      }
      responsiveness={
        analysisResponse ? (
          <ResponsivenessView results={analysisResponse.results} />
        ) : (
          <p className="text-sm text-slate-500">
            Enter repositories and click <span className="font-medium text-slate-700">Analyze</span> to get started.
          </p>
        )
      }
      documentation={
        analysisResponse ? (
          <DocumentationView results={analysisResponse.results} />
        ) : (
          <p className="text-sm text-slate-500">
            Enter repositories and click <span className="font-medium text-slate-700">Analyze</span> to get started.
          </p>
        )
      }
      recommendations={
        analysisResponse ? (
          <RecommendationsView results={analysisResponse.results} />
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
