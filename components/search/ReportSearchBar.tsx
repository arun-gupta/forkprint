'use client'

interface ReportSearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  totalMatches: number
  matchedTabCount: number
}

export function ReportSearchBar({ query, onQueryChange, totalMatches, matchedTabCount }: ReportSearchBarProps) {
  const showSummary = query.length > 0

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] sm:min-w-[240px]">
        <svg
          className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none"
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
          className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-8 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>
      {showSummary ? (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {totalMatches === 0
            ? '0 matches'
            : `${totalMatches} match${totalMatches === 1 ? '' : 'es'} across ${matchedTabCount} tab${matchedTabCount === 1 ? '' : 's'}`}
        </span>
      ) : null}
    </div>
  )
}
