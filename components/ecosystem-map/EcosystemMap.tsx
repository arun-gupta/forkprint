'use client'

import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import {
  ATTENTION_BANDS,
  BUILDER_ENGAGEMENT_BANDS,
  REACH_BANDS,
} from '@/lib/ecosystem-map/spectrum-config'

interface EcosystemMapProps {
  results: AnalysisResult[]
}

export function EcosystemMap({ results }: EcosystemMapProps) {
  if (results.length === 0) {
    return null
  }

  return (
    <section aria-label="Ecosystem map" className="rounded border border-gray-200 bg-gray-50 p-4">
      <section className="mt-3 rounded border border-indigo-200 bg-white p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:items-start">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Ecosystem spectrum</h3>
            <p className="mt-1 text-sm text-slate-600">
              The ecosystem is summarized using three dimensions: reach, builder engagement, and attention.
            </p>
          </div>
          <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
            <LegendCard
              title="Reach bands"
              bands={REACH_BANDS}
              formatter={formatCompactNumber}
              bandClassName={reachLegendBandClass}
              cardClassName="border-emerald-200 bg-emerald-50/60"
            />
            <LegendCard
              title="Builder engagement"
              bands={BUILDER_ENGAGEMENT_BANDS}
              formatter={formatPercentBand}
              bandClassName={engagementLegendBandClass}
              cardClassName="border-sky-200 bg-sky-50/60"
            />
            <LegendCard
              title="Attention"
              bands={ATTENTION_BANDS}
              formatter={formatPercentBand}
              bandClassName={attentionLegendBandClass}
              cardClassName="border-violet-200 bg-violet-50/60"
            />
          </div>
        </div>
      </section>
    </section>
  )
}

function formatCompactNumber(value: number) {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k`
  }

  return `${value}`
}

function formatPercentBand(value: number) {
  if (Number.isInteger(value)) {
    return `${value}%`
  }

  return `${value.toFixed(1)}%`
}

function LegendCard<T extends string>({
  title,
  bands,
  formatter,
  bandClassName,
  cardClassName,
}: {
  title: string
  bands: Array<{ label: T; min: number }>
  formatter: (value: number) => string
  bandClassName: (label: T) => string
  cardClassName: string
}) {
  const orderedBands = [...bands].reverse()

  return (
    <div className={`rounded-lg border px-3 py-2 ${cardClassName}`}>
      <p className="font-medium text-slate-900">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {orderedBands.map((band, index) => {
          const nextBand = orderedBands[index + 1]
          const rangeLabel = nextBand
            ? `${formatter(band.min)}-${formatter(nextBand.min)}`
            : `${formatter(band.min)}+`

          return (
            <span
              key={band.label}
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${bandClassName(band.label)}`}
            >
              {band.label} {rangeLabel}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function reachLegendBandClass(tier: string) {
  switch (tier) {
    case 'Emerging':
      return 'bg-emerald-50 text-emerald-600'
    case 'Growing':
      return 'bg-emerald-100 text-emerald-700'
    case 'Strong':
      return 'bg-emerald-200 text-emerald-800'
    default:
      return 'bg-emerald-300 text-emerald-950'
  }
}

function engagementLegendBandClass(tier: string) {
  switch (tier) {
    case 'Light':
      return 'bg-sky-50 text-sky-600'
    case 'Healthy':
      return 'bg-sky-100 text-sky-700'
    case 'Strong':
      return 'bg-sky-200 text-sky-800'
    default:
      return 'bg-sky-300 text-sky-950'
  }
}

function attentionLegendBandClass(tier: string) {
  switch (tier) {
    case 'Light':
      return 'bg-violet-50 text-violet-600'
    case 'Active':
      return 'bg-violet-100 text-violet-700'
    case 'Strong':
      return 'bg-violet-200 text-violet-800'
    default:
      return 'bg-violet-300 text-violet-950'
  }
}
