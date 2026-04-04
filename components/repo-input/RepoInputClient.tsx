'use client'

import { useEffect, useState } from 'react'
import { ResultsShell } from '@/components/app-shell/ResultsShell'
import { ActivityView } from '@/components/activity/ActivityView'
import { ContributorsView } from '@/components/contributors/ContributorsView'
import { EcosystemMap } from '@/components/ecosystem-map/EcosystemMap'
import { HealthRatiosView } from '@/components/health-ratios/HealthRatiosView'
import { MetricCardsOverview } from '@/components/metric-cards/MetricCardsOverview'
import { OrgInventoryView } from '@/components/org-inventory/OrgInventoryView'
import { ResponsivenessView } from '@/components/responsiveness/ResponsivenessView'
import { TokenInput } from '@/components/token-input/TokenInput'
import type { AnalyzeResponse } from '@/lib/analyzer/analysis-result'
import type { OrgInventoryResponse } from '@/lib/analyzer/org-inventory'
import type { ResultTabDefinition } from '@/specs/006-results-shell/contracts/results-shell-props'
import { readToken, writeToken } from '@/lib/token-storage'
import { RepoInputForm } from './RepoInputForm'

interface RepoInputClientProps {
  hasServerToken: boolean
  onAnalyze?: (repos: string[], token: string | null) => Promise<AnalyzeResponse> | AnalyzeResponse | void
  onAnalyzeOrg?: (org: string, token: string | null) => Promise<OrgInventoryResponse> | OrgInventoryResponse | void
}

export function RepoInputClient({ hasServerToken, onAnalyze, onAnalyzeOrg }: RepoInputClientProps) {
  const [token, setToken] = useState(() => (hasServerToken ? '' : readToken() ?? ''))
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [analysisResponse, setAnalysisResponse] = useState<AnalyzeResponse | null>(null)
  const [orgInventoryResponse, setOrgInventoryResponse] = useState<OrgInventoryResponse | null>(null)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [loadingRepos, setLoadingRepos] = useState<string[]>([])
  const [loadingOrg, setLoadingOrg] = useState<string | null>(null)
  const [resultsResetKey, setResultsResetKey] = useState(0)
  const [inputMode, setInputMode] = useState<'repos' | 'org'>('repos')

  function handleModeChange(mode: 'repos' | 'org') {
    setInputMode(mode)
  }

  useEffect(() => {
    if (!analysisResponse?.diagnostics?.length) {
      return
    }

    for (const diagnostic of analysisResponse.diagnostics) {
      const log = diagnostic.level === 'error' ? console.error : console.warn
      log('[ForkPrint GitHub diagnostic]', {
        repo: diagnostic.repo,
        source: diagnostic.source,
        message: diagnostic.message,
        status: diagnostic.status,
        retryAfter: diagnostic.retryAfter,
      })
    }
  }, [analysisResponse])

  async function handleSubmit(repos: string[]) {
    const trimmedToken = token.trim()

    if (!hasServerToken && !trimmedToken) {
      writeToken(token)
      setTokenError('A GitHub Personal Access Token is required to continue.')
      return
    }

    setTokenError(null)
    setSubmissionError(null)
    setAnalysisResponse(null)
    setOrgInventoryResponse(null)
    setResultsResetKey((current) => current + 1)
    setInputMode('repos')
    setLoadingRepos(repos)
    setLoadingOrg(null)

    if (!hasServerToken) {
      writeToken(token)
    }

    try {
      const response = onAnalyze
        ? await onAnalyze(repos, hasServerToken ? null : trimmedToken)
        : await submitAnalysisRequest(repos, hasServerToken ? null : trimmedToken)

      if (response) {
        setAnalysisResponse(response)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis request failed.'
      setSubmissionError(message)
    } finally {
      setLoadingRepos([])
    }
  }

  async function handleOrgSubmit(org: string) {
    const trimmedToken = token.trim()

    if (!hasServerToken && !trimmedToken) {
      writeToken(token)
      setTokenError('A GitHub Personal Access Token is required to continue.')
      return
    }

    setTokenError(null)
    setSubmissionError(null)
    setAnalysisResponse(null)
    setOrgInventoryResponse(null)
    setResultsResetKey((current) => current + 1)
    setInputMode('org')
    setLoadingRepos([])
    setLoadingOrg(org)

    if (!hasServerToken) {
      writeToken(token)
    }

    try {
      const response = onAnalyzeOrg
        ? await onAnalyzeOrg(org, hasServerToken ? null : trimmedToken)
        : await submitOrgInventoryRequest(org, hasServerToken ? null : trimmedToken)

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
    <div className="space-y-6">
      {!hasServerToken ? (
        <TokenInput
          initialValue={token}
          error={tokenError}
          onChange={(value) => {
            setToken(value)
            setTokenError(null)
          }}
        />
      ) : null}
      <RepoInputForm
        mode={inputMode}
        onModeChange={handleModeChange}
        onSubmitRepos={handleSubmit}
        onSubmitOrg={handleOrgSubmit}
      />
    </div>
  )

  const orgInventoryTabs: ResultTabDefinition[] = [
    {
      id: 'overview',
      label: 'Overview',
      status: 'implemented',
      description: 'Organization inventory summary and lightweight public repository metadata.',
    },
  ]

  const showOrgWorkspace = inputMode === 'org' && !analysisResponse

  const overviewContent = (
    <div className="space-y-4">
      {submissionError ? (
        <p role="alert" data-testid="analysis-error" className="text-sm text-red-600">
          {submissionError}
        </p>
      ) : null}
      {loadingRepos.length > 0 ? (
        <section aria-label="Analysis loading state" className="rounded border border-blue-200 bg-blue-50 p-4">
          <h2 className="font-semibold text-blue-900">Loading analysis for:</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-blue-900">
            {loadingRepos.map((repo) => (
              <li key={repo}>{repo}</li>
            ))}
          </ul>
          </section>
        ) : null}
      {loadingOrg ? (
        <section aria-label="Org inventory loading state" className="rounded border border-blue-200 bg-blue-50 p-4">
          <h2 className="font-semibold text-blue-900">Loading org inventory for:</h2>
          <p className="mt-2 text-sm text-blue-900">{loadingOrg}</p>
        </section>
      ) : null}
      {inputMode === 'repos' && analysisResponse ? (
        <section aria-label="Analysis results" className="space-y-4">
          <MetricCardsOverview results={analysisResponse.results} />
          <EcosystemMap results={analysisResponse.results} />
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
      key={resultsResetKey}
      analysisPanel={analysisPanel}
      tabs={showOrgWorkspace ? orgInventoryTabs : undefined}
      overview={overviewContent}
      contributors={
        analysisResponse ? (
          <ContributorsView results={analysisResponse.results} />
        ) : (
          <p className="text-sm text-slate-600">
            Contributors will become the home for core contributor metrics, with separate Core and Sustainability panes.
          </p>
        )
      }
      activity={
        analysisResponse ? (
          <ActivityView results={analysisResponse.results} />
        ) : (
          <p className="text-sm text-slate-600">
            Activity will become the primary workspace for activity scoring and detailed repo metrics.
          </p>
        )
      }
      responsiveness={
        analysisResponse ? (
          <ResponsivenessView results={analysisResponse.results} />
        ) : (
          <p className="text-sm text-slate-600">
            Responsiveness will become the home for issue and pull-request response-time, backlog, and engagement signals.
          </p>
        )
      }
      healthRatios={
        analysisResponse ? (
          <HealthRatiosView results={analysisResponse.results} />
        ) : (
          <p className="text-sm text-slate-600">
            Health Ratios will compare verified ecosystem, activity, and contributor ratios across analyzed repositories.
          </p>
        )
      }
      comparison={<p className="text-sm text-slate-600">Comparison view is planned for a later Phase 1 step.</p>}
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
  if (value === 'unavailable') {
    return value
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatRetryAfter(value: number | string) {
  if (typeof value !== 'number') {
    return value
  }

  return `${new Intl.NumberFormat('en-US').format(value)}s`
}

async function submitAnalysisRequest(repos: string[], token: string | null): Promise<AnalyzeResponse> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repos, token }),
  })

  const payload = (await response.json()) as AnalyzeResponse & { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? 'Analysis request failed.')
  }

  return payload
}

async function submitOrgInventoryRequest(org: string, token: string | null): Promise<OrgInventoryResponse> {
  const response = await fetch('/api/analyze-org', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ org, token }),
  })

  const payload = (await response.json()) as OrgInventoryResponse & { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? 'Organization inventory request failed.')
  }

  return payload
}
