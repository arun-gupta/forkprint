'use client'

import type { PerRepoStatusEntry } from '@/lib/org-aggregation/types'

interface Props {
  entries: PerRepoStatusEntry[]
  onRetry?: (repo: string) => void
}

const BADGE_STYLE: Record<PerRepoStatusEntry['badge'], string> = {
  queued:
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'in-progress':
    'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  done:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  failed:
    'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
}

export function PerRepoStatusList({ entries, onRetry }: Props) {
  return (
    <section aria-label="Per-repo status" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
        Repos ({entries.length})
      </h3>
      <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
        {entries.map((e) => (
          <li key={e.repo} className="flex items-center gap-3 py-2">
            <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${BADGE_STYLE[e.badge]}`}>
              {e.badge}
            </span>
            <span className="flex-1 truncate text-sm text-slate-800 dark:text-slate-200">
              {e.repo}
              {e.isFlagship ? (
                <span className="ml-2 inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-300">
                  flagship
                </span>
              ) : null}
            </span>
            {e.errorReason ? (
              <span className="max-w-xs truncate text-xs text-rose-700 dark:text-rose-400" title={e.errorReason}>
                {e.errorReason}
              </span>
            ) : null}
            {e.status === 'failed' && onRetry ? (
              <button
                type="button"
                onClick={() => onRetry(e.repo)}
                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Retry
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
