'use client'

interface MetricValueProps {
  value: string
  className?: string
}

export function MetricValue({ value, className = '' }: MetricValueProps) {
  const colorClass = value === '—' ? 'text-slate-400' : 'font-semibold text-slate-900'
  return <span className={`${colorClass}${className ? ` ${className}` : ''}`}>{value}</span>
}
