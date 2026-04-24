'use client'

interface FoundationNudgeProps {
  label: string
  prefillValue: string
  onActivate: (prefillValue: string) => void
}

export function FoundationNudge({ label, prefillValue, onActivate }: FoundationNudgeProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-800/60 dark:bg-emerald-900/20">
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400">
        <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
      </svg>
      <span className="text-emerald-800 dark:text-emerald-200">{label}</span>
      <button
        type="button"
        onClick={() => onActivate(prefillValue)}
        className="ml-auto shrink-0 rounded border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-emerald-700 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-900/40"
      >
        Check foundation readiness →
      </button>
    </div>
  )
}
