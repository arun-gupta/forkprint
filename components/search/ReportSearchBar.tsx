'use client'

interface ReportSearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  totalMatches: number
  matchedTabCount: number
  /** Free-text portion of the query after stripping recognised prefixes (e.g. company:). */
  freeText?: string
}

export function ReportSearchBar({ query, onQueryChange, totalMatches, matchedTabCount, freeText = query }: ReportSearchBarProps) {
  const hasFreeText = freeText.trim().length > 0
  const hasPrefix = hasFreeText && query.trim() !== freeText.trim()
  const showSummary = hasFreeText

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative group/help">
        <button
          type="button"
          aria-label="Search syntax help"
          className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 focus-visible:border-slate-400 focus-visible:text-slate-600 focus-visible:outline-none dark:border-slate-600 dark:text-slate-500 dark:hover:border-slate-400 dark:hover:text-slate-300 dark:focus-visible:border-slate-400 dark:focus-visible:text-slate-300"
        >
          ?
        </button>
        <div className="pointer-events-none absolute left-0 top-7 z-50 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg opacity-0 transition-opacity group-hover/help:pointer-events-auto group-hover/help:opacity-100 group-focus-within/help:pointer-events-auto group-focus-within/help:opacity-100 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">Search syntax</p>
          <dl className="space-y-1.5 text-xs">
            <div className="group/company relative">
              <dt className="font-mono text-amber-700 dark:text-amber-400">company:microsoft</dt>
              <dd className="text-slate-500 dark:text-slate-400">Filter by corporate contributor</dd>
              <div className="pointer-events-none absolute left-0 top-full z-10 mt-1 w-56 rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-500 shadow-md opacity-0 transition-opacity group-hover/company:pointer-events-auto group-hover/company:opacity-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                Enter the GitHub org handle — e.g. <span className="font-mono text-slate-700 dark:text-slate-200">facebook</span> for Meta, <span className="font-mono text-slate-700 dark:text-slate-200">google</span> for Google LLC.
              </div>
            </div>
            <div>
              <dt className="font-mono text-slate-600 dark:text-slate-300">react</dt>
              <dd className="text-slate-500 dark:text-slate-400">Search report content</dd>
            </div>
            <div>
              <dt className="font-mono text-slate-600 dark:text-slate-300">company:google hooks</dt>
              <dd className="text-slate-500 dark:text-slate-400">Combine both</dd>
            </div>
          </dl>
          <p className="mt-2.5 border-t border-slate-100 pt-2 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
            Results depend on contributors having public org membership or a corporate email address on their commits.
          </p>
        </div>
      </div>
      <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
        <svg
          className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none dark:text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search report..."
          className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-8 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-500"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>
      {showSummary ? (
        <span className="text-xs text-slate-500 whitespace-nowrap dark:text-slate-400">
          {totalMatches === 0
            ? hasPrefix
              ? '0 matches in report'
              : `0 matches across ${matchedTabCount} tab${matchedTabCount === 1 ? '' : 's'}`
            : hasPrefix
              ? `${totalMatches} match${totalMatches === 1 ? '' : 'es'} in report`
              : `${totalMatches} match${totalMatches === 1 ? '' : 'es'} across ${matchedTabCount} tab${matchedTabCount === 1 ? '' : 's'}`}
        </span>
      ) : null}
    </div>
  )
}

