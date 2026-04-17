'use client'

interface MetricValueProps {
  value: string
  className?: string
}

export function MetricValue({ value, className = '' }: MetricValueProps) {
  const colorClass = value === '—' ? 'text-slate-400 dark:text-slate-500' : 'font-semibold text-slate-900 dark:text-slate-100'
  return <span className={`${colorClass}${className ? ` ${className}` : ''}`}>{value}</span>
}
