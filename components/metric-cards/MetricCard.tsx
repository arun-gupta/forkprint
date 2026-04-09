'use client'

import type { MetricCardViewModel } from '@/lib/metric-cards/view-model'
import { formatPercentileLabel } from '@/lib/scoring/config-loader'
import { scoreToneClass } from '@/lib/metric-cards/score-config'

interface MetricCardProps {
  card: MetricCardViewModel
}

export function MetricCard({ card }: MetricCardProps) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" data-testid={`metric-card-${card.repo}`}>
      <div className="space-y-1">
        <h3 className="font-semibold text-slate-900">{card.repo}</h3>
        <p className="text-sm text-slate-600">Created: {card.createdAtLabel}</p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Scorecard</p>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          {card.profile ? (
            <>
              <ScorecardCell
                label="Reach"
                percentileLabel={card.profile.reachLabel}
                detail={`${card.starsLabel} stars`}
                toneClass={percentileToneClass(card.profile.reachPercentile, 'emerald')}
              />
              <ScorecardCell
                label="Attention"
                percentileLabel={card.profile.attentionLabel}
                detail={`${card.profile.watcherRateLabel} watcher rate`}
                toneClass={percentileToneClass(card.profile.attentionPercentile, 'violet')}
              />
              <ScorecardCell
                label="Engagement"
                percentileLabel={card.profile.engagementLabel}
                detail={`${card.profile.forkRateLabel} fork rate`}
                toneClass={percentileToneClass(card.profile.engagementPercentile, 'sky')}
              />
            </>
          ) : (
            <div className="col-span-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Ecosystem metrics unavailable
            </div>
          )}
          {card.scoreBadges.map((badge) => (
            <ScorecardCell
              key={badge.category}
              label={badge.category}
              percentileLabel={typeof badge.value === 'number' ? formatPercentileLabel(badge.value) : String(badge.value)}
              toneClass={scoreToneClass(badge.tone)}
            />
          ))}
        </div>
      </div>
    </article>
  )
}

function ScorecardCell({
  label,
  percentileLabel,
  detail,
  toneClass,
}: {
  label: string
  percentileLabel: string
  detail?: string
  toneClass: string
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm font-semibold">{percentileLabel}</p>
      {detail ? <p className="mt-1 text-xs opacity-75">{detail}</p> : null}
    </div>
  )
}

function percentileToneClass(percentile: number, hue: 'emerald' | 'sky' | 'violet') {
  if (percentile >= 75) return `bg-${hue}-300 text-${hue}-950 border-${hue}-400`
  if (percentile >= 50) return `bg-${hue}-200 text-${hue}-900 border-${hue}-300`
  if (percentile >= 25) return `bg-${hue}-100 text-${hue}-800 border-${hue}-200`
  return 'bg-slate-100 text-slate-700 border-slate-200'
}
