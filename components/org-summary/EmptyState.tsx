'use client'

/**
 * Displayed inside each panel before any repo has completed.
 *
 * Per FR-034 / research R8: explicit "Waiting for first result" text so the
 * user is never confused by numeric zeros or skeleton loaders that look like
 * real data.
 */
export function EmptyState({ label = 'Waiting for first result' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex h-full min-h-[96px] items-center justify-center rounded border-2 border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"
    >
      {label}
    </div>
  )
}
