'use client'

import { useState } from 'react'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildMetricCardViewModels } from '@/lib/metric-cards/view-model'
import { MetricCard } from './MetricCard'

interface MetricCardsOverviewProps {
  results: AnalysisResult[]
}

export function MetricCardsOverview({ results }: MetricCardsOverviewProps) {
  const [expandedRepos, setExpandedRepos] = useState<string[]>([])
  const cards = buildMetricCardViewModels(results)

  if (cards.length === 0) {
    return null
  }

  return (
    <section aria-label="Metric cards overview" className="space-y-4">
      {cards.map((card) => {
        const expanded = expandedRepos.includes(card.repo)

        return (
          <MetricCard
            key={card.repo}
            card={card}
            expanded={expanded}
            onToggle={() =>
              setExpandedRepos((current) =>
                current.includes(card.repo) ? current.filter((repo) => repo !== card.repo) : [...current, card.repo],
              )
            }
          />
        )
      })}
    </section>
  )
}
