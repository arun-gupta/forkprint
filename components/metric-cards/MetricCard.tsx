'use client'

import type { MetricCardViewModel } from '@/lib/metric-cards/view-model'
import { MetricValue } from '@/components/shared/MetricValue'
import { ScoreBadge } from './ScoreBadge'

interface MetricCardProps {
  card: MetricCardViewModel
}

export function MetricCard({ card }: MetricCardProps) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" data-testid={`metric-card-${card.repo}`}>
      <div className="space-y-1">
        <div className="space-y-1">
          <h3 className="font-semibold text-slate-900">{card.repo}</h3>
          <p className="text-sm text-slate-600">Created: {card.createdAtLabel}</p>
        </div>
      </div>

      {card.profile ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Ecosystem profile</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <ProfileMetric label="Reach" value={card.profile.reachLabel} toneClass={percentileToneClass(card.profile.reachPercentile, 'emerald')} />
            <ProfileMetric
              label="Attention"
              value={card.profile.attentionLabel}
              detail={`${card.profile.watcherRateLabel} watcher rate`}
              toneClass={percentileToneClass(card.profile.attentionPercentile, 'violet')}
            />
            <ProfileMetric
              label="Engagement"
              value={card.profile.engagementLabel}
              detail={`${card.profile.forkRateLabel} fork rate`}
              toneClass={percentileToneClass(card.profile.engagementPercentile, 'sky')}
            />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-amber-700">Ecosystem profile is unavailable because ecosystem metrics were incomplete.</p>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SummaryStat label="Stars" value={card.starsLabel} />
        <SummaryStat label="Forks" value={card.forksLabel} />
        <SummaryStat label="Watchers" value={card.watchersLabel} />
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-3">
        {card.scoreBadges.map((badge) => (
          <ScoreBadge key={badge.category} category={badge.category} value={badge.value} tone={badge.tone} />
        ))}
      </div>
    </article>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg">
        <MetricValue value={value} />
      </p>
    </div>
  )
}

function ProfileMetric({
  label,
  value,
  detail,
  toneClass,
}: {
  label: string
  value: string
  detail?: string
  toneClass: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${toneClass}`}>{value}</p>
      {detail ? <p className="mt-2 text-xs text-slate-500">{detail}</p> : null}
    </div>
  )
}

function percentileToneClass(percentile: number, hue: 'sky' | 'violet') {
  if (percentile >= 75) return `bg-${hue}-300 text-${hue}-950`
  if (percentile >= 50) return `bg-${hue}-200 text-${hue}-900`
  if (percentile >= 25) return `bg-${hue}-100 text-${hue}-800`
  return 'bg-slate-100 text-slate-700'
}
