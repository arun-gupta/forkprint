'use client'

import { useState } from 'react'
import { CollapseChevron } from '@/components/shared/CollapseChevron'
import type { LensReadout, MetricCardViewModel } from '@/lib/metric-cards/view-model'
import { formatPercentileLabel } from '@/lib/scoring/config-loader'
import { scoreToneClass } from '@/lib/metric-cards/score-config'
import { getHealthScore, type HealthScoreProfile } from '@/lib/scoring/health-score'

interface MetricCardProps {
  card: MetricCardViewModel
  activeTag?: string | null
  onTagChange?: (tag: string | null) => void
}

export function MetricCard({ card, activeTag, onTagChange }: MetricCardProps) {
  const handleLensClick = (key: string) => {
    if (!onTagChange) return
    onTagChange(activeTag === key ? null : key)
  }

  const [paneCollapsed, setPaneCollapsed] = useState(false)
  // Session-scoped override for the solo-project scoring surface. null =
  // use the auto-detected profile from the precomputed health score.
  const [profileOverride, setProfileOverride] = useState<HealthScoreProfile | null>(null)
  const hs = profileOverride === null
    ? card.healthScore
    : getHealthScore(card.analysisResult, { mode: profileOverride })
  const isSolo = hs.profile === 'solo'
  const autoSolo = card.healthScore.soloDetection.isSolo
  const showOverrideToggle = autoSolo || profileOverride !== null
  const profileCells: ScorecardCellProps[] = card.profile
    ? [
        { label: 'Reach', percentileLabel: card.profile.reachLabel, detail: `${card.starsLabel} stars`, tooltip: 'Star count percentile. Measures visibility and adoption.', toneClass: percentileToneClass(card.profile.reachPercentile, 'emerald') },
        { label: 'Attention', percentileLabel: card.profile.attentionLabel, detail: `${card.profile.watcherRateLabel} watcher rate`, tooltip: 'Watcher-to-star ratio. More watchers = more people following updates.', toneClass: percentileToneClass(card.profile.attentionPercentile, 'violet') },
        { label: 'Engagement', percentileLabel: card.profile.engagementLabel, detail: `${card.profile.forkRateLabel} fork rate`, tooltip: 'Fork-to-star ratio. More forks = more people building on the project.', toneClass: percentileToneClass(card.profile.engagementPercentile, 'sky') },
      ]
    : []

  const hiddenBucketNames = new Set(hs.buckets.filter((b) => b.hidden).map((b) => b.name))
  const scoreCells: ScorecardCellProps[] = card.scoreBadges
    .filter((badge) => !hiddenBucketNames.has(badge.category))
    .map((badge) => {
    const tabId = badge.category.toLowerCase()
    return {
      label: badge.category,
      percentileLabel: typeof badge.value === 'number' ? formatPercentileLabel(badge.value) : String(badge.value),
      detail: badge.detail,
      tooltip: badge.description,
      toneClass: scoreToneClass(badge.tone),
      onClick: () => {
        const tab = document.querySelector<HTMLButtonElement>(`[role="tab"][data-tab-id="${tabId}"]`)
        tab?.click()
      },
      ariaLabel: `Open ${badge.category} tab`,
    }
  })

  const scoreTooltip = isSolo
    ? `Solo-project scoring surface — composite health score from Activity (30%), Security (35%), and Documentation (35%). Contributors and Responsiveness are hidden because this project appears to be solo-maintained. Scored relative to ${hs.bracketLabel} repositories.`
    : `Composite health score from Contributors (23%), Activity (25%), Responsiveness (25%), Documentation (12%, includes licensing, compliance & inclusive naming), and Security (15%) — scored relative to ${hs.bracketLabel} repositories.`

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900" data-testid={`metric-card-${card.repo}`}>
      <button
        type="button"
        onClick={() => setPaneCollapsed((prev) => !prev)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={!paneCollapsed}
      >
        <CollapseChevron expanded={!paneCollapsed} />
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{card.repo}</h3>
        <p className="ml-auto text-xs text-slate-400 dark:text-slate-500">Created: {card.createdAtLabel}</p>
      </button>
      {!paneCollapsed ? (
      <>
      <p className={`mt-1 line-clamp-2 text-xs italic text-slate-400 dark:text-slate-500 ${card.description === '—' ? '' : 'not-italic text-slate-500 dark:text-slate-400'}`}>{card.description === '—' ? 'No description found' : card.description}</p>

      {showOverrideToggle ? (
        <div
          className={`mt-3 flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${isSolo ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200' : 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700/60 dark:bg-sky-900/20 dark:text-sky-200'}`}
          data-testid={`solo-profile-banner-${card.repo}`}
          role="status"
        >
          <p className="flex-1">
            {isSolo ? (
              <>
                <span className="font-semibold">Solo-maintained project.</span>{' '}
                Scoring emphasizes Activity, Security, and Documentation. Contributors and Responsiveness are hidden.
              </>
            ) : (
              <>
                <span className="font-semibold">Community scoring override active.</span>{' '}
                This project was auto-classified as solo-maintained; you&apos;ve opted into the community surface for this session.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => setProfileOverride(isSolo ? 'community' : (autoSolo ? null : 'solo'))}
            className="shrink-0 rounded border border-current px-2 py-0.5 font-medium hover:bg-white/50 dark:hover:bg-white/10"
            data-testid={`solo-profile-toggle-${card.repo}`}
          >
            {isSolo ? 'Use community scoring' : 'Use solo scoring'}
          </button>
        </div>
      ) : null}

      <div className={`mt-3 flex items-center justify-between rounded-lg border px-3 py-2 ${scoreToneClass(hs.tone)}`} title={scoreTooltip}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide">OSS Health Score</p>
          {hs.bracketLabel ? <p className="text-[10px] opacity-60">{hs.bracketLabel}</p> : null}
        </div>
        <p className="text-lg font-bold">{hs.label}</p>
      </div>

      {(profileCells.length > 0 || scoreCells.length > 0) ? (
        <div className="mt-2">
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-[9px] text-slate-400 dark:text-slate-500">percentile rank</span>
          </div>
          {profileCells.length > 0 ? (
            <div
              className={`grid grid-cols-1 gap-1.5 sm:grid-cols-3 ${isSolo ? 'opacity-50' : ''}`}
              title={isSolo ? 'Popularity signals — not health. Dimmed for solo-maintained projects.' : undefined}
              data-testid={isSolo ? `ecosystem-dimmed-${card.repo}` : undefined}
            >
              {profileCells.map((cell) => (
                <ScorecardCell key={cell.label} {...cell} />
              ))}
            </div>
          ) : null}
          {scoreCells.length > 0 ? (
            <div className={`mt-1.5 grid grid-cols-2 gap-1.5 ${SCORECARD_GRID_COLS[scoreCells.length] ?? 'sm:grid-cols-5'}`}>
              {scoreCells.map((cell) => (
                <ScorecardCell key={cell.label} {...cell} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {card.lenses.length > 0 ? (
        <div
          className={`mt-2 ${isSolo ? 'opacity-50' : ''}`}
          title={isSolo ? 'Community-shape lenses — structurally low for solo-maintained projects. Dimmed, not scored.' : undefined}
        >
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Lenses</span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500">percentile rank · signals present</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {card.lenses.map((lens) => (
              <LensPill
                key={lens.key}
                lens={lens}
                active={activeTag === lens.key}
                onClick={onTagChange ? () => handleLensClick(lens.key) : undefined}
              />
            ))}
          </div>
        </div>
      ) : null}

      {card.details.length > 0 ? (
        <section
          aria-label={`${card.repo} details`}
          className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800/60"
        >
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {card.details.map((detail) => (
              <div key={detail.label} className="min-w-0">
                <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {detail.label}
                </dt>
                <dd className="mt-0.5 break-words text-sm text-slate-900 dark:text-slate-100">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {hs.recommendations.length > 0 ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-800/60">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">{hs.recommendations.length} recommendation{hs.recommendations.length !== 1 ? 's' : ''}</span>
            {' — '}
            <button
              type="button"
              className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={() => {
                const tab = document.querySelector<HTMLButtonElement>('[role="tab"][data-tab-id="recommendations"]')
                tab?.click()
              }}
            >
              see Recommendations tab
            </button>
          </p>
        </div>
      ) : null}
      </>
      ) : null}
    </article>
  )
}

interface ScorecardCellProps {
  label: string
  percentileLabel: string
  detail?: string
  tooltip?: string
  toneClass: string
  onClick?: () => void
  ariaLabel?: string
}

// Static mapping so Tailwind's JIT scanner can see every class used.
const SCORECARD_GRID_COLS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
}

const LENS_RING_COLORS: Record<string, string> = {
  community: 'ring-amber-400',
  governance: 'ring-indigo-400',
}

function LensPill({ lens, active, onClick }: { lens: LensReadout; active: boolean; onClick?: () => void }) {
  const ringClass = active ? `ring-2 ${LENS_RING_COLORS[lens.key] ?? 'ring-slate-400'} ring-offset-1` : ''
  const baseClass = `inline-flex items-baseline gap-1.5 rounded-full border px-2 py-0.5 text-[10px] ${scoreToneClass(lens.tone)} ${ringClass}`

  const shortPercentile = lens.percentileLabel.replace(' percentile', '')
  const content = (
    <>
      <span className="font-semibold uppercase tracking-wide">{lens.label}</span>
      <span className="font-medium">{shortPercentile}</span>
      <span className="opacity-60">· {lens.detail}</span>
    </>
  )

  if (!onClick) {
    return <span className={baseClass} title={lens.tooltip}>{content}</span>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClass} transition-all hover:opacity-80`}
      title={lens.tooltip}
      aria-pressed={active}
    >
      {content}
    </button>
  )
}

function ScorecardCell({ label, percentileLabel, detail, tooltip, toneClass, onClick, ariaLabel }: ScorecardCellProps) {
  const baseClass = `flex min-h-[44px] flex-col justify-between rounded border px-2 py-1.5 ${toneClass}`
  const content = (
    <>
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
        <span className="text-xs font-semibold">{percentileLabel.replace(' percentile', '')}</span>
      </div>
      <p className="mt-0.5 text-[10px] opacity-60">{detail ?? '\u00A0'}</p>
    </>
  )

  if (!onClick) {
    return (
      <div className={baseClass} title={tooltip}>
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      aria-label={ariaLabel}
      className={`${baseClass} text-left transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1`}
    >
      {content}
    </button>
  )
}

const PERCENTILE_TONE_CLASSES = {
  emerald: [
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700',
    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60',
    'bg-emerald-200 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-700/70',
    'bg-emerald-300 text-emerald-950 border-emerald-400 dark:bg-emerald-800/50 dark:text-emerald-50 dark:border-emerald-600/70',
  ],
  sky: [
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700',
    'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800/60',
    'bg-sky-200 text-sky-900 border-sky-300 dark:bg-sky-900/40 dark:text-sky-100 dark:border-sky-700/70',
    'bg-sky-300 text-sky-950 border-sky-400 dark:bg-sky-800/50 dark:text-sky-50 dark:border-sky-600/70',
  ],
  violet: [
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700',
    'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800/60',
    'bg-violet-200 text-violet-900 border-violet-300 dark:bg-violet-900/40 dark:text-violet-100 dark:border-violet-700/70',
    'bg-violet-300 text-violet-950 border-violet-400 dark:bg-violet-800/50 dark:text-violet-50 dark:border-violet-600/70',
  ],
} as const

function percentileToneClass(percentile: number, hue: 'emerald' | 'sky' | 'violet') {
  const classes = PERCENTILE_TONE_CLASSES[hue]
  if (percentile >= 75) return classes[3]
  if (percentile >= 50) return classes[2]
  if (percentile >= 25) return classes[1]
  return classes[0]
}
