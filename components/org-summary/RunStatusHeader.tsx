'use client'

import type { RunStatusHeader as RunStatusHeaderData } from '@/lib/org-aggregation/types'

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const parts = [] as string[]
  if (h) parts.push(`${h}h`)
  if (h || m) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

interface Props {
  org: string
  header: RunStatusHeaderData
  onCancel?: () => void
  notificationToggle?: React.ReactNode
}

export function RunStatusHeader({ org, header, onCancel, notificationToggle }: Props) {
  const statusLabel =
    header.status === 'complete'
      ? `complete — ${header.succeeded} of ${header.total} succeeded, ${header.failed} failed`
      : header.status === 'cancelled'
        ? `cancelled (${header.succeeded + header.failed} of ${header.total} completed)`
        : header.status === 'paused'
          ? `rate-limited — auto-resumes at ${header.pause?.resumesAt.toLocaleTimeString() ?? ''}`
          : `in progress (${header.succeeded + header.failed} of ${header.total})`

  const showCancel = header.status === 'in-progress' || header.status === 'paused'
  const concurrencyLabel =
    header.concurrency.effective !== header.concurrency.chosen
      ? `${header.concurrency.chosen} (reduced to ${header.concurrency.effective})`
      : String(header.concurrency.chosen)

  return (
    <section
      aria-label="Org aggregation run status"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Org summary — {org}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{statusLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {notificationToggle}
          {showCancel && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancel run
            </button>
          ) : null}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Total" value={header.total} />
        <Stat label="Succeeded" value={header.succeeded} tone="good" />
        <Stat label="Failed" value={header.failed} tone={header.failed > 0 ? 'bad' : 'neutral'} />
        <Stat label="In progress" value={header.inProgress} />
        <Stat label="Queued" value={header.queued} />
      </dl>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
        <span>Elapsed: {formatDuration(header.elapsedMs)}</span>
        {header.etaMs !== null ? <span>ETA: {formatDuration(header.etaMs)}</span> : null}
        <span>Concurrency: {concurrencyLabel}</span>
        {header.pause ? <span>Pauses: {header.pause.pausesSoFar}</span> : null}
      </div>
    </section>
  )
}

function Stat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'good' | 'bad' }) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-700 dark:text-emerald-400'
      : tone === 'bad'
        ? 'text-rose-700 dark:text-rose-400'
        : 'text-slate-900 dark:text-slate-100'
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-xl font-semibold ${toneClass}`}>{value}</dd>
    </div>
  )
}
