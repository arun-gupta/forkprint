'use client'

import { useEffect, useRef, useState } from 'react'
import { LOADING_QUOTES, getRandomQuoteIndex } from '@/lib/loading-quotes'
import { ORG_AGGREGATION_CONFIG } from '@/lib/config/org-aggregation'
import type { RunStatus } from '@/lib/org-aggregation/types'

interface Props {
  succeeded: number
  failed: number
  total: number
  status: RunStatus
  startedAt: Date
  etaMs: number | null
}

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

const TERMINAL_STATUSES: RunStatus[] = ['complete', 'cancelled']

export function ProgressIndicator({ succeeded, failed, total, status, startedAt, etaMs }: Props) {
  const completed = succeeded + failed
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  const isTerminal = TERMINAL_STATUSES.includes(status)

  const [elapsed, setElapsed] = useState(() => Date.now() - startedAt.getTime())
  useEffect(() => {
    if (isTerminal) return
    const id = setInterval(() => {
      setElapsed(Date.now() - startedAt.getTime())
    }, ORG_AGGREGATION_CONFIG.wallClockTickIntervalMs)
    return () => clearInterval(id)
  }, [isTerminal, startedAt])

  const [quoteIndex, setQuoteIndex] = useState(() => getRandomQuoteIndex(null))
  const quoteTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (isTerminal) {
      if (quoteTimerRef.current) clearInterval(quoteTimerRef.current)
      return
    }
    quoteTimerRef.current = setInterval(() => {
      setQuoteIndex((prev) => getRandomQuoteIndex(prev))
    }, ORG_AGGREGATION_CONFIG.quoteRotationIntervalMs)
    return () => {
      if (quoteTimerRef.current) clearInterval(quoteTimerRef.current)
    }
  }, [isTerminal])

  const quote = LOADING_QUOTES[quoteIndex]

  return (
    <div
      aria-label="Run progress"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percent}% complete`}
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isTerminal
                ? failed > 0
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
                : 'bg-sky-500'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="min-w-[3rem] text-right text-sm font-medium text-slate-700 dark:text-slate-300">
          {percent}%
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
        <span>{completed} of {total} repos</span>
        <span>Elapsed: {formatDuration(elapsed)}</span>
        {!isTerminal && etaMs !== null ? <span>ETA: {formatDuration(etaMs)}</span> : null}
        {isTerminal ? (
          <span className={failed > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
            {status === 'cancelled' ? 'Cancelled' : failed > 0 ? `Done — ${failed} failed` : 'Complete'}
          </span>
        ) : null}
      </div>

      {!isTerminal && quote ? (
        <blockquote className="mt-3 border-l-2 border-slate-200 pl-3 text-xs italic text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <p>&ldquo;{quote.text}&rdquo;</p>
          <footer className="mt-0.5 not-italic">
            — {quote.author}{quote.context ? `, ${quote.context}` : ''}
          </footer>
        </blockquote>
      ) : null}
    </div>
  )
}
