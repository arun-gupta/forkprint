'use client'

import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildMetricCardViewModels } from '@/lib/metric-cards/view-model'
import { MetricCard } from './MetricCard'

interface MetricCardsOverviewProps {
  results: AnalysisResult[]
  activeTag?: string | null
  onTagChange?: (tag: string | null) => void
}

export function MetricCardsOverview({ results, activeTag, onTagChange }: MetricCardsOverviewProps) {
  const cards = buildMetricCardViewModels(results)

  if (cards.length === 0) {
    return null
  }

  return (
    <section aria-label="Metric cards overview" className="space-y-4">
      {cards.map((card) => (
        <MetricCard key={card.repo} card={card} activeTag={activeTag ?? null} onTagChange={onTagChange} />
      ))}
    </section>
  )
}
