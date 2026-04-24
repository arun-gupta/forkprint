import type { Unavailable } from '@/lib/analyzer/analysis-result'

export function formatPercentage(value: number | Unavailable, maximumFractionDigits = 1) {
  if (value === 'unavailable') return '—'
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value * 100)}%`
}

export function formatHours(value: number | Unavailable) {
  if (value === 'unavailable') return '—'
  if (value < 24) return `${value.toFixed(1)}h`
  return `${(value / 24).toFixed(1)}d`
}

export function formatCount(value: number | Unavailable, maximumFractionDigits = 0) {
  if (value === 'unavailable') return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)
}
