'use client'

import type { OrgRepoSummary } from '@/lib/analyzer/org-inventory'
import type { OrgInventorySortColumn, OrgInventorySortState, OrgInventoryVisibleColumn } from '@/lib/org-inventory/filters'

interface OrgInventoryTableProps {
  results: OrgRepoSummary[]
  visibleColumns: OrgInventoryVisibleColumn[]
  sortState: OrgInventorySortState
  selectedRepos: string[]
  onToggleSort: (column: OrgInventorySortColumn) => void
  onToggleRepoSelection: (repo: string) => void
  onAnalyzeRepo: (repo: string) => void
}

const COLUMN_LABELS: Record<OrgInventorySortColumn, string> = {
  repo: 'Repository',
  name: 'Name',
  description: 'Description',
  primaryLanguage: 'Language',
  stars: 'Stars',
  forks: 'Forks',
  watchers: 'Watchers',
  openIssues: 'Open issues',
  pushedAt: 'Last pushed',
  archived: 'Archived',
  url: 'Repo URL',
}

export function OrgInventoryTable({
  results,
  visibleColumns,
  sortState,
  selectedRepos,
  onToggleSort,
  onToggleRepoSelection,
  onAnalyzeRepo,
}: OrgInventoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2">
        <thead>
          <tr>
            <th className="w-16 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Select</th>
            {(['repo', ...visibleColumns] as OrgInventorySortColumn[]).map((column) => (
              <th key={column} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <button type="button" className="inline-flex items-center gap-2" onClick={() => onToggleSort(column)}>
                  <span>{COLUMN_LABELS[column]}</span>
                  {sortState.sortColumn === column ? <span className="text-[10px] text-slate-400">{sortState.sortDirection === 'asc' ? '↑' : '↓'}</span> : null}
                </button>
              </th>
            ))}
            <th className="w-28 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.repo} className="rounded-xl border border-slate-200 bg-slate-50">
              <td className="rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedRepos.includes(result.repo)}
                  onChange={() => onToggleRepoSelection(result.repo)}
                  aria-label={`Select ${result.repo}`}
                />
              </td>
              <th className="border border-r-0 border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-medium text-slate-900">{result.repo}</th>
              {visibleColumns.map((column) => (
                <td key={`${result.repo}-${column}`} className="border border-r-0 border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  {renderColumnValue(result, column)}
                </td>
              ))}
              <td className="rounded-r-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <button
                  type="button"
                  className="w-full whitespace-nowrap rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                  onClick={() => onAnalyzeRepo(result.repo)}
                  aria-label={`Analyze ${result.repo}`}
                >
                  Analyze
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatValue(value: number | string) {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value)
  }

  if (typeof value === 'string' && value.includes('T')) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
    }
  }

  return value
}

function renderColumnValue(result: OrgRepoSummary, column: OrgInventoryVisibleColumn) {
  if (column === 'archived') {
    return result.archived ? 'Yes' : 'No'
  }

  return formatValue(result[column])
}
