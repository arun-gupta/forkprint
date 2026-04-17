'use client'

import { useEffect, useState } from 'react'

interface Props {
  kind: 'primary' | 'secondary'
  resumesAt: Date
  reposToReDispatch: number
  pausesSoFar: number
  onCancel?: () => void
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

export function RateLimitPausePanel({ kind, resumesAt, reposToReDispatch, pausesSoFar, onCancel }: Props) {
  const [remaining, setRemaining] = useState(() => Math.max(0, resumesAt.getTime() - Date.now()))

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, resumesAt.getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(id)
  }, [resumesAt])

  return (
    <section
      aria-label="Rate limit pause"
      className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 dark:bg-amber-900/20 dark:border-amber-800/60"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-amber-600 dark:text-amber-400">
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2.5a1 1 0 011 1V8a1 1 0 01-2 0V4.5a1 1 0 011-1zM8 10.5a1 1 0 100 2 1 1 0 000-2z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Rate limited — {kind === 'primary' ? 'primary' : 'secondary'} limit hit
          </h3>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Auto-resumes in <strong data-testid="countdown">{formatCountdown(remaining)}</strong>
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-amber-600 dark:text-amber-400">
            <span>{reposToReDispatch} repos to re-dispatch</span>
            <span>Pauses so far: {pausesSoFar}</span>
          </div>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel run"
              title="Cancel run"
              className="mt-3 inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700 dark:bg-slate-900"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                <rect x="3.5" y="3.5" width="9" height="9" rx="1" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
