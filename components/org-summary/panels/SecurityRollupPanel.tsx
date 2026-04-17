'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { SecurityRollupValue } from '@/lib/org-aggregation/aggregators/types'
import { HelpLabel } from '@/components/shared/HelpLabel'
import { EmptyState } from '../EmptyState'

interface Props {
  panel: AggregatePanel<SecurityRollupValue>
}

function scoreTone(score: number): string {
  if (score >= 7) return 'text-emerald-700 dark:text-emerald-400'
  if (score >= 4) return 'text-amber-700 dark:text-amber-400'
  return 'text-rose-700 dark:text-rose-400'
}

function pct(present: number, total: number): string {
  if (total === 0) return '—'
  return `${Math.round((present / total) * 100)}%`
}

export function SecurityRollupPanel({ panel }: Props) {
  return (
    <section aria-label="Security rollup" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Security (OpenSSF Scorecard)</h3>
        {panel.lastUpdatedAt ? (
          <span className="text-xs text-slate-400 dark:text-slate-500">updated {panel.lastUpdatedAt.toLocaleTimeString()}</span>
        ) : null}
      </header>

      {panel.status === 'in-progress' && !panel.value ? (
        <EmptyState />
      ) : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No security data available across this run.</p>
      ) : (
        <Body value={panel.value} />
      )}
    </section>
  )
}

function Body({ value }: { value: SecurityRollupValue }) {
  const available = value.perRepo.filter((r) => typeof r.score === 'number')

  return (
    <>
      <dl className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <HelpLabel label="Worst score" helpText="Lowest OpenSSF Scorecard score across the repo set." />
          </dt>
          <dd className={`text-2xl font-semibold ${value.worstScore !== null ? scoreTone(value.worstScore) : 'text-slate-400'} dark:text-slate-500 dark:text-slate-400 `}>
            {value.worstScore !== null ? value.worstScore.toFixed(1) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Repos with scorecard</dt>
          <dd className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {available.length} of {value.perRepo.length}
          </dd>
        </div>
      </dl>

      {value.directChecks ? (
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Direct security checks</h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <DirectCheckCard label="Security policy" present={value.directChecks.securityPolicy.present} total={value.directChecks.securityPolicy.total} />
            <DirectCheckCard label="Dependabot" present={value.directChecks.dependabot.present} total={value.directChecks.dependabot.total} />
            <DirectCheckCard label="CI/CD" present={value.directChecks.ciCd.present} total={value.directChecks.ciCd.total} />
            <DirectCheckCard label="Branch protection" present={value.directChecks.branchProtection.present} total={value.directChecks.branchProtection.total} />
          </div>
        </div>
      ) : null}

      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Per-repo scores</h4>
      <ul role="list" className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
        {value.perRepo.map((r) => (
          <li key={r.repo} className="flex items-center justify-between gap-3 py-2">
            <span className="truncate text-sm text-slate-800 dark:text-slate-200 dark:text-slate-100">{r.repo}</span>
            {typeof r.score === 'number' ? (
              <span className={`text-sm font-semibold ${scoreTone(r.score)}`}>{r.score.toFixed(1)}</span>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500">unavailable</span>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

function DirectCheckCard({ label, present, total }: { label: string; present: number; total: number }) {
  const ratio = total > 0 ? present / total : 0
  const tone = ratio >= 0.8 ? 'text-emerald-700 dark:text-emerald-400' : ratio >= 0.5 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'
  return (
    <div className="rounded border border-slate-200 p-2 dark:border-slate-700">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${total > 0 ? tone : 'text-slate-400'} dark:text-slate-500 dark:text-slate-400 `}>
        {pct(present, total)}
      </p>
      <p className="text-[10px] text-slate-400 dark:text-slate-500">{present} of {total}</p>
    </div>
  )
}
