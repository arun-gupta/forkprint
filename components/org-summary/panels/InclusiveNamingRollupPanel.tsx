'use client'

import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { InclusiveNamingRollupValue } from '@/lib/org-aggregation/aggregators/types'
import { HelpLabel } from '@/components/shared/HelpLabel'
import { EmptyState } from '../EmptyState'

interface Props { panel: AggregatePanel<InclusiveNamingRollupValue> }

const TIER_TOOLTIPS = {
  tier1: 'Tier 1 — "Replace immediately". Exclusionary terminology (e.g. master, whitelist, blacklist). Counted per occurrence across default branches, descriptions, and topics.',
  tier2: 'Tier 2 — "Recommended to replace". Terminology with non-inclusive connotations (e.g. sanity-check). Counted per occurrence across default branches, descriptions, and topics.',
  tier3: 'Tier 3 — "Consider replacing". Context-dependent terminology (e.g. man-in-the-middle, segregate). Counted per occurrence across default branches, descriptions, and topics.',
} as const

export function InclusiveNamingRollupPanel({ panel }: Props) {
  return (
    <section aria-label="Inclusive naming" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Inclusive naming</h3>
        {panel.lastUpdatedAt ? <span className="text-xs text-slate-400 dark:text-slate-500">updated {panel.lastUpdatedAt.toLocaleTimeString()}</span> : null}
      </header>
      {panel.status === 'in-progress' && !panel.value ? <EmptyState /> : panel.status === 'unavailable' || !panel.value ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No inclusive naming data available.</p>
      ) : (
        <>
          <dl className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              label="Tier 1 violations"
              tooltip={TIER_TOOLTIPS.tier1}
              value={panel.value.tier1}
              tone={panel.value.tier1 > 0 ? 'bad' : 'good'}
            />
            <Stat
              label="Tier 2 violations"
              tooltip={TIER_TOOLTIPS.tier2}
              value={panel.value.tier2}
              tone={panel.value.tier2 > 0 ? 'warn' : 'good'}
            />
            <Stat
              label="Tier 3 violations"
              tooltip={TIER_TOOLTIPS.tier3}
              value={panel.value.tier3}
              tone="neutral"
            />
            <Stat
              label="Repos with violations"
              tooltip={`${panel.value.reposWithAnyViolation} of ${panel.contributingReposCount} scanned ${panel.contributingReposCount === 1 ? 'repo' : 'repos'} have at least one Tier 1–3 violation.`}
              value={panel.value.reposWithAnyViolation}
              denominator={panel.contributingReposCount}
              tone={panel.value.reposWithAnyViolation > 0 ? 'warn' : 'good'}
            />
          </dl>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tier counts are violation occurrences (one repo can contribute multiple). Hover each label for the tier definition.
          </p>
        </>
      )}
    </section>
  )
}

function Stat({
  label,
  tooltip,
  value,
  denominator,
  tone,
}: {
  label: string
  tooltip: string
  value: number
  denominator?: number
  tone: 'good' | 'warn' | 'bad' | 'neutral'
}) {
  const toneClass = tone === 'good' ? 'text-emerald-700 dark:text-emerald-400' : tone === 'bad' ? 'text-rose-700 dark:text-rose-400' : tone === 'warn' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <HelpLabel label={label} helpText={tooltip} />
      </dt>
      <dd className={`text-lg font-semibold ${toneClass}`}>
        {value}
        {denominator !== undefined ? (
          <span className="ml-1 text-sm font-normal text-slate-500 dark:text-slate-400">
            / {denominator}
          </span>
        ) : null}
      </dd>
    </div>
  )
}
