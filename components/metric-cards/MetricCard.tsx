'use client'

import type { MetricCardViewModel } from '@/lib/metric-cards/view-model'
import { ScoreBadge } from './ScoreBadge'

interface MetricCardProps {
  card: MetricCardViewModel
  expanded: boolean
  onToggle: () => void
}

export function MetricCard({ card, expanded, onToggle }: MetricCardProps) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" data-testid={`metric-card-${card.repo}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold text-slate-900">{card.repo}</h3>
          <p className="text-sm text-slate-600">Created: {card.createdAtLabel}</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          {expanded ? 'Hide details' : 'Show details'}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SummaryStat label="Stars" value={card.starsLabel} />
        <SummaryStat label="Forks" value={card.forksLabel} />
        <SummaryStat label="Watchers" value={card.watchersLabel} />
      </div>

      {card.profile ? (
        <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">Ecosystem profile summary</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <ProfilePill label="Reach" value={card.profile.reachTier} toneClass={reachTierClass(card.profile.reachTier)} />
            <ProfilePill
              label="Builder Engagement"
              value={`${card.profile.engagementTier} (${card.profile.forkRateLabel} fork rate)`}
              toneClass={engagementTierClass(card.profile.engagementTier)}
            />
            <ProfilePill
              label="Attention"
              value={`${card.profile.attentionTier} (${card.profile.watcherRateLabel} watcher rate)`}
              toneClass={attentionTierClass(card.profile.attentionTier)}
            />
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-amber-700">Ecosystem profile summary is unavailable because ecosystem metrics were incomplete.</p>
      )}

      <div className="mt-4 grid gap-2 lg:grid-cols-3">
        {card.scoreBadges.map((badge) => (
          <ScoreBadge key={badge.category} category={badge.category} value={badge.value} tone={badge.tone} />
        ))}
      </div>

      {expanded ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">Full metric detail</p>
          <dl className="mt-3 grid gap-2 md:grid-cols-2">
            {card.details.map((detail) => (
              <div key={detail.label} className="rounded-md border border-white bg-white px-3 py-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{detail.label}</dt>
                <dd className="mt-1 text-sm text-slate-800">{detail.value}</dd>
              </div>
            ))}
          </dl>
          {card.missingFields.length > 0 ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Missing fields</p>
              <p className="mt-1 text-sm text-amber-800">{card.missingFields.join(', ')}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function ProfilePill({ label, value, toneClass }: { label: string; value: string; toneClass: string }) {
  return (
    <div className="rounded-md border border-white bg-white px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}

function reachTierClass(tier: string) {
  switch (tier) {
    case 'Exceptional':
      return 'bg-emerald-100 text-emerald-800'
    case 'Strong':
      return 'bg-emerald-200 text-emerald-900'
    case 'Growing':
      return 'bg-emerald-50 text-emerald-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function engagementTierClass(tier: string) {
  switch (tier) {
    case 'Exceptional':
      return 'bg-sky-300 text-sky-950'
    case 'Strong':
      return 'bg-sky-200 text-sky-900'
    case 'Healthy':
      return 'bg-sky-100 text-sky-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

function attentionTierClass(tier: string) {
  switch (tier) {
    case 'Exceptional':
      return 'bg-violet-300 text-violet-950'
    case 'Strong':
      return 'bg-violet-200 text-violet-900'
    case 'Active':
      return 'bg-violet-100 text-violet-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}
