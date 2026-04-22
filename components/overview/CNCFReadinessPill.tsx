import type { AspirantReadinessResult } from '@/lib/cncf-sandbox/types'

interface CNCFReadinessPillProps {
  aspirantResult: AspirantReadinessResult
  onClick: () => void
}

export function CNCFReadinessPill({ aspirantResult, onClick }: CNCFReadinessPillProps) {
  const { readinessScore } = aspirantResult
  const colorClass =
    readinessScore >= 80
      ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
      : readinessScore >= 50
        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'
        : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition hover:opacity-80 ${colorClass}`}
    >
      <span>CNCF Sandbox Readiness</span>
      <span className="font-semibold">{readinessScore} / 100</span>
    </button>
  )
}
