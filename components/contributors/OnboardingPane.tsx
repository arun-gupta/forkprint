'use client'

import type { Unavailable } from '@/lib/analyzer/analysis-result'
import { TagPill } from '@/components/tags/TagPill'

interface OnboardingPaneProps {
  goodFirstIssueCount: number | Unavailable
  devEnvironmentSetup: boolean | Unavailable
  gitpodPresent: boolean | Unavailable
  newContributorPRAcceptanceRate: number | Unavailable
  activeTag?: string | null
  onTagChange?: (tag: string | null) => void
}

function formatPercentage(rate: number | Unavailable): string {
  if (rate === 'unavailable') return '—'
  return `${(rate * 100).toFixed(1)}%`
}

function formatBoolean(value: boolean | Unavailable, trueLabel: string, falseLabel: string): string {
  if (value === 'unavailable') return '—'
  return value ? trueLabel : falseLabel
}

function formatCount(count: number | Unavailable): string {
  if (count === 'unavailable') return '—'
  return String(count)
}

export function OnboardingPane({
  goodFirstIssueCount,
  devEnvironmentSetup,
  gitpodPresent,
  newContributorPRAcceptanceRate,
  activeTag,
  onTagChange,
}: OnboardingPaneProps) {
  const devLabel = formatBoolean(devEnvironmentSetup, 'Present', 'Not detected')
  const handleTagClick = (tag: string) => onTagChange?.(activeTag === tag ? null : tag)

  return (
    <section aria-label="Onboarding pane" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:bg-slate-800/60 dark:border-slate-700">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-slate-100">Onboarding</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Signals describing how welcoming this repository is to newcomers.</p>
        </div>
        <TagPill tag="onboarding" active={activeTag === 'onboarding'} onClick={handleTagClick} />
      </div>
      <dl className="grid gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:bg-slate-900 dark:border-slate-700">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Good first issues</dt>
          <dd className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{formatCount(goodFirstIssueCount)}</dd>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:bg-slate-900 dark:border-slate-700">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Dev environment setup</dt>
          <dd className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{devLabel}</dd>
          {gitpodPresent === true && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Gitpod: Present</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:bg-slate-900 dark:border-slate-700">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">New contributor PR acceptance</dt>
          <dd className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">{formatPercentage(newContributorPRAcceptanceRate)}</dd>
        </div>
      </dl>
    </section>
  )
}
