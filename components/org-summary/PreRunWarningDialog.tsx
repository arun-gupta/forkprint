'use client'

import { useState } from 'react'
import { ORG_AGGREGATION_CONFIG, clampConcurrency } from '@/lib/config/org-aggregation'

export interface PreRunWarningDialogProps {
  repoCount: number
  onConfirm: (options: { concurrency: number; notificationOptIn: boolean }) => void
  onCancel: () => void
}

const AVG_SECONDS_PER_REPO = 15

function estimateEta(repoCount: number, concurrency: number): string {
  const totalSeconds = Math.ceil((repoCount * AVG_SECONDS_PER_REPO) / concurrency)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  if (m === 0) return `~${s}s`
  return s > 0 ? `~${m}m ${s}s` : `~${m}m`
}

export function PreRunWarningDialog({ repoCount, onConfirm, onCancel }: PreRunWarningDialogProps) {
  const [concurrency, setConcurrency] = useState<number>(ORG_AGGREGATION_CONFIG.concurrency.default)
  const [notificationOptIn, setNotificationOptIn] = useState(false)

  const handleConcurrencyChange = (value: string) => {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      setConcurrency(clampConcurrency(parsed))
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Pre-run warning"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="mx-4 w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Analyze {repoCount} repositories?
        </h2>

        <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p>
            Estimated time: <strong>{estimateEta(repoCount, concurrency)}</strong>
          </p>
          <p>
            You must keep this browser tab open for the duration of the run. Closing or refreshing will lose all in-progress results.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Concurrency (1–{ORG_AGGREGATION_CONFIG.concurrency.max})
            </span>
            <input
              type="number"
              min={ORG_AGGREGATION_CONFIG.concurrency.min}
              max={ORG_AGGREGATION_CONFIG.concurrency.max}
              value={concurrency}
              onChange={(e) => handleConcurrencyChange(e.target.value)}
              aria-label="Concurrency"
              className="mt-1 w-20 rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={notificationOptIn}
              onChange={(e) => setNotificationOptIn(e.target.checked)}
              aria-label="Enable completion notification"
            />
            Notify me when the run completes
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ concurrency, notificationOptIn })}
            className="rounded border border-sky-500 bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 dark:border-sky-400 dark:bg-sky-500 dark:hover:bg-sky-600"
          >
            Start analysis
          </button>
        </div>
      </div>
    </div>
  )
}
