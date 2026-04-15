'use client'

import type { LensReadout, MetricCardViewModel } from '@/lib/metric-cards/view-model'
import { formatPercentileLabel } from '@/lib/scoring/config-loader'
import { scoreToneClass } from '@/lib/metric-cards/score-config'

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
  const profileCells: ScorecardCellProps[] = card.profile
    ? [
        { label: 'Reach', percentileLabel: card.profile.reachLabel, detail: `${card.starsLabel} stars`, tooltip: 'Star count percentile. Measures visibility and adoption.', toneClass: percentileToneClass(card.profile.reachPercentile, 'emerald') },
        { label: 'Attention', percentileLabel: card.profile.attentionLabel, detail: `${card.profile.watcherRateLabel} watcher rate`, tooltip: 'Watcher-to-star ratio. More watchers = more people following updates.', toneClass: percentileToneClass(card.profile.attentionPercentile, 'violet') },
        { label: 'Engagement', percentileLabel: card.profile.engagementLabel, detail: `${card.profile.forkRateLabel} fork rate`, tooltip: 'Fork-to-star ratio. More forks = more people building on the project.', toneClass: percentileToneClass(card.profile.engagementPercentile, 'sky') },
      ]
    : []

  const scoreCells: ScorecardCellProps[] = card.scoreBadges.map((badge) => {
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

  const hs = card.healthScore

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" data-testid={`metric-card-${card.repo}`}>
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-slate-900">{card.repo}</h3>
        <p className="text-xs text-slate-400">Created: {card.createdAtLabel}</p>
      </div>
      <p className={`mt-1 line-clamp-2 text-xs italic text-slate-400 ${card.description === '—' ? '' : 'not-italic text-slate-500'}`}>{card.description === '—' ? 'No description found' : card.description}</p>

      <div className={`mt-3 flex items-center justify-between rounded-lg border px-3 py-2 ${scoreToneClass(hs.tone)}`} title={`Composite health score from Contributors (23%), Activity (25%), Responsiveness (25%), Documentation (12%, includes licensing, compliance & inclusive naming), and Security (15%) — scored relative to ${hs.bracketLabel} repositories.`}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide">OSS Health Score</p>
          {hs.bracketLabel ? <p className="text-[10px] opacity-60">{hs.bracketLabel}</p> : null}
        </div>
        <p className="text-lg font-bold">{hs.label}</p>
      </div>

      {profileCells.length > 0 ? (
        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          {profileCells.map((cell) => (
            <ScorecardCell key={cell.label} {...cell} />
          ))}
        </div>
      ) : null}
      {scoreCells.length > 0 ? (
        <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {scoreCells.map((cell) => (
            <ScorecardCell key={cell.label} {...cell} />
          ))}
        </div>
      ) : null}

      {card.lenses.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400">Lenses</span>
          {card.lenses.map((lens) => (
            <LensPill
              key={lens.key}
              lens={lens}
              active={activeTag === lens.key}
              onClick={onTagChange ? () => handleLensClick(lens.key) : undefined}
            />
          ))}
        </div>
      ) : null}

      {hs.recommendations.length > 0 ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
          <p className="text-xs text-slate-600">
            <span className="font-medium text-slate-800">{hs.recommendations.length} recommendation{hs.recommendations.length !== 1 ? 's' : ''}</span>
            {' — '}
            <button
              type="button"
              className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
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

const LENS_RING_COLORS: Record<string, string> = {
  community: 'ring-amber-400',
  governance: 'ring-indigo-400',
}

function LensPill({ lens, active, onClick }: { lens: LensReadout; active: boolean; onClick?: () => void }) {
  const ringClass = active ? `ring-2 ${LENS_RING_COLORS[lens.key] ?? 'ring-slate-400'} ring-offset-1` : ''
  const baseClass = `inline-flex items-baseline gap-1.5 rounded-full border px-2 py-0.5 text-[10px] ${scoreToneClass(lens.tone)} ${ringClass}`

  const content = (
    <>
      <span className="font-semibold uppercase tracking-wide">{lens.label}</span>
      <span className="font-medium">{lens.percentileLabel}</span>
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
        <span className="text-xs font-semibold">{percentileLabel}</span>
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
    'bg-slate-100 text-slate-700 border-slate-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-emerald-200 text-emerald-900 border-emerald-300',
    'bg-emerald-300 text-emerald-950 border-emerald-400',
  ],
  sky: [
    'bg-slate-100 text-slate-700 border-slate-200',
    'bg-sky-100 text-sky-800 border-sky-200',
    'bg-sky-200 text-sky-900 border-sky-300',
    'bg-sky-300 text-sky-950 border-sky-400',
  ],
  violet: [
    'bg-slate-100 text-slate-700 border-slate-200',
    'bg-violet-100 text-violet-800 border-violet-200',
    'bg-violet-200 text-violet-900 border-violet-300',
    'bg-violet-300 text-violet-950 border-violet-400',
  ],
} as const

function percentileToneClass(percentile: number, hue: 'emerald' | 'sky' | 'violet') {
  const classes = PERCENTILE_TONE_CLASSES[hue]
  if (percentile >= 75) return classes[3]
  if (percentile >= 50) return classes[2]
  if (percentile >= 25) return classes[1]
  return classes[0]
}
