import type { AspirantFieldStatus } from '@/lib/cncf-sandbox/types'

interface CNCFFieldPillProps {
  status: AspirantFieldStatus
}

export function CNCFFieldPill({ status }: CNCFFieldPillProps) {
  if (status === 'human-only') return null

  if (status === 'ready') {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        ✅ CNCF
      </span>
    )
  }

  if (status === 'partial') {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        ⚠️ CNCF
      </span>
    )
  }

  // missing
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
      ❌ CNCF
    </span>
  )
}
