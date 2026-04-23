'use client'

import { CNCFReadinessTab } from '@/components/cncf-readiness/CNCFReadinessTab'
import { CNCFCandidacyPanel } from '@/components/cncf-candidacy/CNCFCandidacyPanel'
import type { AnalyzeResponse } from '@/lib/analyzer/analysis-result'
import type { OrgInventoryResponse } from '@/lib/analyzer/org-inventory'

export type FoundationResult =
  | { kind: 'repos'; results: AnalyzeResponse }
  | { kind: 'org'; inventory: OrgInventoryResponse }
  | { kind: 'projects-board'; url: string }

interface FoundationResultsViewProps {
  result: FoundationResult | null
  loading: boolean
  error: string | null
}

export function FoundationResultsView({ result, loading, error }: FoundationResultsViewProps) {
  if (loading) {
    return (
      <div role="status" aria-label="Loading foundation scan" className="flex items-center gap-2 py-4 text-sm text-slate-500 dark:text-slate-400">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Scanning…
      </div>
    )
  }

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
      <div className="space-y-6">
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
        {result.results.results.map((repoResult) => (
          <section key={repoResult.repo} className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{repoResult.repo}</h2>
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
          </section>
        ))}
      </div>
    )
  }

  if (result.kind === 'org') {
    return (
      <CNCFCandidacyPanel
        org={result.inventory.org}
        repos={result.inventory.results}
      />
    )
  }

  // projects-board — reserved for #411
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
      <p className="font-medium">Projects board support coming soon</p>
      <p className="mt-1 text-slate-500 dark:text-slate-400">
        GitHub Projects board scanning will be available in a future update (<a href="https://github.com/arun-gupta/repo-pulse/issues/411" className="underline hover:no-underline">#411</a>).
      </p>
    </div>
  )
}
