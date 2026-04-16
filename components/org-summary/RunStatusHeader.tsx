'use client'

import { useState } from 'react'
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
  onPause?: () => void
  onResume?: () => void
  notificationToggle?: React.ReactNode
  hideHeading?: boolean
}

export function RunStatusHeader({ org, header, onCancel, onPause, onResume, notificationToggle, hideHeading }: Props) {
  const [expanded, setExpanded] = useState(true)
  const statusLabel =
    header.status === 'complete'
      ? 'Complete'
      : header.status === 'cancelled'
        ? 'Cancelled'
        : header.status === 'paused'
          ? `Rate-limited — auto-resumes at ${header.pause?.resumesAt.toLocaleTimeString() ?? ''}`
          : `In progress (${header.succeeded + header.failed} of ${header.total})`

  const showCancel = header.status === 'in-progress' || header.status === 'paused'
  const showPause = header.status === 'in-progress' && Boolean(onPause)
  const showResume = header.status === 'paused' && Boolean(onResume)
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
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? 'Collapse run status' : 'Expand run status'}
            aria-expanded={expanded}
            title={expanded ? 'Collapse' : 'Expand'}
            className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <ChevronIcon expanded={expanded} />
          </button>
          <div>
            {hideHeading ? (
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Analysis run</p>
            ) : (
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Org summary — {org}
              </h2>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-400">{statusLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {notificationToggle}
          {showPause && onPause ? (
            <IconButton onClick={onPause} label="Pause run" tone="neutral">
              <PauseIcon />
            </IconButton>
          ) : null}
          {showResume && onResume ? (
            <IconButton onClick={onResume} label="Resume run" tone="primary">
              <PlayIcon />
            </IconButton>
          ) : null}
          {showCancel && onCancel ? (
            <IconButton onClick={onCancel} label="Cancel run" tone="danger">
              <CancelIcon />
            </IconButton>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <>
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
        </>
      ) : null}
    </section>
  )
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 transition-transform ${expanded ? '' : '-rotate-90'}`}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

function IconButton({
  onClick,
  label,
  tone,
  children,
}: {
  onClick: () => void
  label: string
  tone: 'neutral' | 'primary' | 'danger'
  children: React.ReactNode
}) {
  const toneClass =
    tone === 'primary'
      ? 'border-sky-500 bg-sky-600 text-white hover:bg-sky-700 dark:border-sky-400 dark:bg-sky-500 dark:hover:bg-sky-600'
      : tone === 'danger'
        ? 'border-slate-300 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700'
        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded border ${toneClass}`}
    >
      {children}
    </button>
  )
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
      <rect x="4" y="3" width="3" height="10" rx="0.5" />
      <rect x="9" y="3" width="3" height="10" rx="0.5" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
      <path d="M4 3v10l9-5-9-5z" />
    </svg>
  )
}

function CancelIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
      <rect x="3.5" y="3.5" width="9" height="9" rx="1" />
    </svg>
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
