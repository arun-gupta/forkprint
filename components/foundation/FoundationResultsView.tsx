'use client'

import { useState } from 'react'
import { CNCFReadinessTab } from '@/components/cncf-readiness/CNCFReadinessTab'
import { CNCFCandidacyPanel } from '@/components/cncf-candidacy/CNCFCandidacyPanel'
import type { AnalyzeResponse, AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { OrgInventoryResponse } from '@/lib/analyzer/org-inventory'
import type { SkippedIssue } from '@/lib/foundation/fetch-board-repos'

export type FoundationResult =
  | { kind: 'repos'; results: AnalyzeResponse }
  | { kind: 'org'; inventory: OrgInventoryResponse }
  | { kind: 'projects-board'; url: string; results: AnalyzeResponse; skipped: SkippedIssue[]; method: 'graphql' | 'labels' }

interface FoundationResultsViewProps {
  result: FoundationResult | null
  error: string | null
  onReanalyze?: () => void
  shareableUrl?: string
}

function CopyLinkButton({ url }: { url: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'fallback'>('idle')
  const [fallbackUrl, setFallbackUrl] = useState('')

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setFallbackUrl(url)
      setState('fallback')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { void handleCopy() }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        {state === 'copied' ? 'Copied!' : 'Copy link'}
      </button>
      {state === 'fallback' && fallbackUrl ? (
        <input
          type="text"
          readOnly
          value={fallbackUrl}
          aria-label="Shareable URL"
          className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}
    </>
  )
}

function ReanalyzeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13.5 8A5.5 5.5 0 1 1 10 3.07" strokeLinecap="round" />
        <path d="M10 2v3h3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Re-analyze
    </button>
  )
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
    : score >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium tabular-nums ${color}`}>
      {score}%
    </span>
  )
}

function RepoAccordion({ repoResults }: { repoResults: AnalysisResult[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const allExpanded = expanded.size === repoResults.length

  function toggle(repo: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(repo)) next.delete(repo)
      else next.add(repo)
      return next
    })
  }

  function toggleAll() {
    setExpanded(allExpanded ? new Set() : new Set(repoResults.map((r) => r.repo)))
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-slate-500 underline hover:no-underline dark:text-slate-400"
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
    <div className="divide-y divide-slate-200 dark:divide-slate-700 rounded border border-slate-200 dark:border-slate-700">
      {repoResults.map((repoResult) => {
        const isOpen = expanded.has(repoResult.repo)
        const score = repoResult.aspirantResult?.readinessScore
        return (
          <div key={repoResult.repo}>
            <button
              type="button"
              onClick={() => toggle(repoResult.repo)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
              aria-expanded={isOpen}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="flex items-center gap-2 min-w-0">
                <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                  {repoResult.repo}
                </span>
                {score !== undefined ? <ScoreBadge score={score} /> : null}
              </span>
            </button>
            {isOpen ? (
              <div className="border-t border-slate-200 px-4 pb-4 pt-3 dark:border-slate-700">
                {repoResult.aspirantResult ? (
                  <CNCFReadinessTab
                    aspirantResult={repoResult.aspirantResult}
                    repoSlug={repoResult.repo}
                  />
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No foundation readiness data available for {repoResult.repo}.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
    </div>
  )
}

export function FoundationResultsView({ result, error, onReanalyze, shareableUrl }: FoundationResultsViewProps) {

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-300">
        {error}
      </p>
    )
  }

  if (!result) return null

  if (result.kind === 'repos') {
    return (
      <div className="space-y-4">
        {(onReanalyze || shareableUrl) ? (
          <div className="flex justify-end gap-2">
            {shareableUrl ? <CopyLinkButton url={shareableUrl} /> : null}
            {onReanalyze ? <ReanalyzeButton onClick={onReanalyze} /> : null}
          </div>
        ) : null}
        {result.results.failures.length > 0 ? (
          <section className="rounded border border-amber-200 bg-amber-50 p-4 dark:bg-amber-900/20 dark:border-amber-800/60">
            <h2 className="font-semibold text-amber-900 dark:text-amber-200">Failed repositories</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 dark:text-amber-200">
              {result.results.failures.map((failure) => (
                <li key={failure.repo}>
                  {failure.repo}: {failure.reason}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <RepoAccordion repoResults={result.results.results} />
      </div>
    )
  }

  if (result.kind === 'org') {
    return (
      <div className="space-y-4">
        {(onReanalyze || shareableUrl) ? (
          <div className="flex justify-end gap-2">
            {shareableUrl ? <CopyLinkButton url={shareableUrl} /> : null}
            {onReanalyze ? <ReanalyzeButton onClick={onReanalyze} /> : null}
          </div>
        ) : null}
        <CNCFCandidacyPanel
          org={result.inventory.org}
          repos={result.inventory.results}
        />
      </div>
    )
  }

  // projects-board — board scan results
  const totalResolved = result.results.results.length + result.results.failures.length
  return (
    <div className="space-y-4">
      <section className="rounded border border-sky-200 bg-sky-50 p-4 text-sm dark:border-sky-800/60 dark:bg-sky-900/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-sky-900 dark:text-sky-200">CNCF Sandbox board scan</p>
            <p className="mt-1 text-sky-800 dark:text-sky-300">
              Scanned <strong>{totalResolved}</strong> {totalResolved === 1 ? 'repository' : 'repositories'} from the{' '}
              <strong>New</strong> and <strong>review/tech</strong> columns of the{' '}
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                CNCF sandbox board
              </a>
              .
            </p>
            {result.skipped.length > 0 ? (
              <p className="mt-1 text-sky-700 dark:text-sky-400">
                {result.skipped.length} {result.skipped.length === 1 ? 'issue was' : 'issues were'} skipped — see warning below.
              </p>
            ) : null}
            {result.method === 'labels' ? (
              <p className="mt-2 text-xs text-sky-600 dark:text-sky-400">
                <span className="font-medium">Note:</span> Projects board API requires <span className="font-mono">read:project</span> scope — results are based on issue labels and may include repos no longer in those columns.{' '}
                <a
                  href="/api/auth/login?scope_tier=read-project"
                  className="underline hover:no-underline"
                >
                  Re-authenticate with board read access
                </a>{' '}
                for exact results.
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {shareableUrl ? <CopyLinkButton url={shareableUrl} /> : null}
            {onReanalyze ? <ReanalyzeButton onClick={onReanalyze} /> : null}
          </div>
        </div>
      </section>

      {result.skipped.length > 0 ? (
        <section className="rounded border border-amber-200 bg-amber-50 p-4 dark:bg-amber-900/20 dark:border-amber-800/60">
          <h2 className="font-semibold text-amber-900 dark:text-amber-200">
            Skipped issues ({result.skipped.length})
          </h2>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            These issues could not be resolved to a repository URL and were excluded from the scan.
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 dark:text-amber-200">
            {result.skipped.map((s) => (
              <li key={s.issueNumber}>
                <a
                  href={s.issueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  #{s.issueNumber} {s.title}
                </a>
                : {s.reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result.results.failures.length > 0 ? (
        <section className="rounded border border-amber-200 bg-amber-50 p-4 dark:bg-amber-900/20 dark:border-amber-800/60">
          <h2 className="font-semibold text-amber-900 dark:text-amber-200">Failed repositories</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-900 dark:text-amber-200">
            {result.results.failures.map((failure) => (
              <li key={failure.repo}>
                {failure.repo}: {failure.reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result.results.results.length > 0 ? (
        <RepoAccordion repoResults={result.results.results} />
      ) : null}

      {result.results.results.length === 0 && result.results.failures.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No repositories were successfully scanned from the board.
        </p>
      ) : null}
    </div>
  )
}
