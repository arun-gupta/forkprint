'use client'

import { scoreToneClass } from '@/lib/metric-cards/score-config'
import { formatPercentileLabel } from '@/lib/scoring/config-loader'
import type { ScoreBadgeProps } from '@/specs/008-metric-cards/contracts/metric-card-props'

export function ScoreBadge({ category, value, tone }: ScoreBadgeProps) {
  const displayValue = typeof value === 'number' ? formatPercentileLabel(value) : value
  return (
    <div className={`rounded-lg border px-3 py-2 ${scoreToneClass(tone)}`}>
      <p className="text-xs font-medium uppercase tracking-wide">{category}</p>
      <p className="mt-1 text-sm font-semibold">{displayValue}</p>
    </div>
  )
}
