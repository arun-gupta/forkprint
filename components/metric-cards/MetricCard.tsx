'use client'

import type { MetricCardViewModel } from '@/lib/metric-cards/view-model'
import { formatPercentileLabel } from '@/lib/scoring/config-loader'
import { scoreToneClass } from '@/lib/metric-cards/score-config'

interface MetricCardProps {
  card: MetricCardViewModel
}

export function MetricCard({ card }: MetricCardProps) {
  const cells: ScorecardCellProps[] = []

  if (card.profile) {
    cells.push(
      { label: 'Reach', percentileLabel: card.profile.reachLabel, detail: `${card.starsLabel} stars`, tooltip: 'Star count percentile. Measures visibility and adoption.', toneClass: percentileToneClass(card.profile.reachPercentile, 'emerald') },
      { label: 'Attention', percentileLabel: card.profile.attentionLabel, detail: `${card.profile.watcherRateLabel} watcher rate`, tooltip: 'Watcher-to-star ratio. More watchers = more people following updates.', toneClass: percentileToneClass(card.profile.attentionPercentile, 'violet') },
      { label: 'Engagement', percentileLabel: card.profile.engagementLabel, detail: `${card.profile.forkRateLabel} fork rate`, tooltip: 'Fork-to-star ratio. More forks = more people building on the project.', toneClass: percentileToneClass(card.profile.engagementPercentile, 'sky') },
    )
  }

  for (const badge of card.scoreBadges) {
    cells.push({
      label: badge.category,
      percentileLabel: typeof badge.value === 'number' ? formatPercentileLabel(badge.value) : String(badge.value),
      tooltip: badge.description,
      toneClass: scoreToneClass(badge.tone),
    })
  }

  const hs = card.healthScore

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" data-testid={`metric-card-${card.repo}`}>
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-slate-900">{card.repo}</h3>
        <p className="text-xs text-slate-400">Created: {card.createdAtLabel}</p>
      </div>

      <div className={`mt-3 flex items-center justify-between rounded-lg border px-3 py-2 ${scoreToneClass(hs.tone)}`} title={`Composite health score from Activity (36%), Responsiveness (36%), and Sustainability (28%) — scored relative to ${hs.bracketLabel} repositories.`}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide">OSS Health Score</p>
          {hs.bracketLabel ? <p className="text-[10px] opacity-60">{hs.bracketLabel}</p> : null}
        </div>
        <p className="text-lg font-bold">{hs.label}</p>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {cells.map((cell) => (
          <ScorecardCell key={cell.label} {...cell} />
        ))}
      </div>

      {hs.recommendations.length > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800">Recommendations</p>
          <ul className="mt-1.5 space-y-1">
            {hs.recommendations.map((rec, i) => (
              <li key={i} className="text-xs text-amber-900">
                <span className="font-medium">{rec.bucket}:</span> {rec.message}
              </li>
            ))}
          </ul>
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
}

function ScorecardCell({ label, percentileLabel, detail, tooltip, toneClass }: ScorecardCellProps) {
  return (
    <div className={`rounded border px-2 py-1.5 ${toneClass}`} title={tooltip}>
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
        <span className="text-xs font-semibold">{percentileLabel}</span>
      </div>
      {detail ? <p className="mt-0.5 text-[10px] opacity-60">{detail}</p> : null}
    </div>
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
