'use client'

import { useMemo, useState } from 'react'
import type { OrgInventoryResponse } from '@/lib/analyzer/org-inventory'
import { clampOrgInventoryPageSize, ORG_INVENTORY_CONFIG } from '@/lib/config/org-inventory'
import {
  applySelectionLimit,
  DEFAULT_ORG_INVENTORY_VISIBLE_COLUMNS,
  filterOrgInventoryRows,
  getEffectiveSortState,
  getNextSortState,
  OPTIONAL_ORG_INVENTORY_COLUMNS,
  sortOrgInventoryRows,
  toggleRepoSelection,
  toggleVisibleColumn,
  validateSelectionLimit,
  type OrgInventoryFilters,
  type OrgInventorySortState,
  type OrgInventoryVisibleColumn,
} from '@/lib/org-inventory/filters'
import { OrgInventorySummary } from './OrgInventorySummary'
import { OrgInventoryTable } from './OrgInventoryTable'

interface OrgInventoryViewProps {
  org: string
  summary: OrgInventoryResponse['summary']
  results: OrgInventoryResponse['results']
  rateLimit: OrgInventoryResponse['rateLimit']
  onAnalyzeRepo: (repo: string) => void
  onAnalyzeSelected: (repos: string[]) => void
}

export function OrgInventoryView({ org, summary, results, rateLimit, onAnalyzeRepo, onAnalyzeSelected }: OrgInventoryViewProps) {
  const [filters, setFilters] = useState<OrgInventoryFilters>({
    repoQuery: '',
    language: 'all',
    archived: 'all',
  })
  const [visibleColumns, setVisibleColumns] = useState<OrgInventoryVisibleColumn[]>(DEFAULT_ORG_INVENTORY_VISIBLE_COLUMNS)
  const [sortState, setSortState] = useState<OrgInventorySortState>({
    sortColumn: 'repo',
    sortDirection: 'asc',
  })
  const [selectionLimit, setSelectionLimit] = useState<number>(ORG_INVENTORY_CONFIG.defaultBulkSelectionLimit)
  const [pageSize, setPageSize] = useState<number>(ORG_INVENTORY_CONFIG.defaultPageSize)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])
  const [selectionError, setSelectionError] = useState<string | null>(null)

  const columnLabels: Record<OrgInventoryVisibleColumn, string> = {
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

  const filteredRows = useMemo(() => filterOrgInventoryRows(results, filters), [results, filters])
  const effectiveSortState = useMemo(
    () => getEffectiveSortState(sortState, visibleColumns),
    [sortState, visibleColumns],
  )
  const sortedRows = useMemo(
    () => sortOrgInventoryRows(filteredRows, effectiveSortState.sortColumn, effectiveSortState.sortDirection),
    [filteredRows, effectiveSortState],
  )
  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedRows.length / pageSize)), [sortedRows.length, pageSize])
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginatedRows = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize
    return sortedRows.slice(startIndex, startIndex + pageSize)
  }, [pageSize, safeCurrentPage, sortedRows])
  const visibleRangeStart = sortedRows.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const visibleRangeEnd = sortedRows.length === 0 ? 0 : Math.min(safeCurrentPage * pageSize, sortedRows.length)
  const languageOptions = useMemo(() => {
    return [...new Set(results.map((result) => result.primaryLanguage).filter((value): value is string => value !== 'unavailable'))].sort()
  }, [results])

  return (
    <section aria-label="Org inventory view" className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Organization</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{org}</h2>
        <p className="mt-2 text-sm text-slate-600">Browse lightweight public repository metadata and launch repo analysis from any row.</p>
      </div>

      {results.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">No public repositories found</h3>
          <p className="mt-2 text-sm text-slate-600">
            ForkPrint did not find any public repositories for this organization.
          </p>
        </section>
      ) : (
        <>
          <OrgInventorySummary summary={summary} />
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Repo filter</span>
                <input
                  value={filters.repoQuery}
                  onChange={(event) => {
                    setCurrentPage(1)
                    setFilters((current) => ({ ...current, repoQuery: event.target.value }))
                  }}
                  className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"
                  placeholder="Filter by repo name"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Language</span>
                <select
                  value={filters.language}
                  onChange={(event) => {
                    setCurrentPage(1)
                    setFilters((current) => ({ ...current, language: event.target.value }))
                  }}
                  className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"
                >
                  <option value="all">All languages</option>
                  {languageOptions.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Archived status</span>
                <select
                  value={filters.archived}
                  onChange={(event) => {
                    setCurrentPage(1)
                    setFilters((current) => ({
                      ...current,
                      archived: event.target.value as OrgInventoryFilters['archived'],
                    }))
                  }}
                  className="w-full rounded border border-slate-300 bg-white p-2 text-sm text-slate-900"
                >
                  <option value="all">All repos</option>
                  <option value="active">Active only</option>
                  <option value="archived">Archived only</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Bulk selection limit</span>
                <input
                  type="range"
                  min={1}
                  max={ORG_INVENTORY_CONFIG.maxBulkSelectionLimit}
                  value={selectionLimit}
                  onChange={(event) => {
                    const nextLimit = Number(event.target.value)
                    const validation = validateSelectionLimit(selectedRepos, nextLimit)
                    const nextSelection = applySelectionLimit(selectedRepos, nextLimit)
                    setSelectedRepos(nextSelection.selectedRepos)
                    setSelectionError(nextSelection.error ?? validation.error)
                    setSelectionLimit(nextLimit)
                  }}
                  aria-label="Bulk selection limit"
                />
                <p className="text-sm text-slate-600">Select up to {selectionLimit} repositories for bulk analysis.</p>
              </label>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Visible columns</p>
              <div className="flex flex-wrap gap-3">
                {OPTIONAL_ORG_INVENTORY_COLUMNS.map((column) => (
                  <label key={column} className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column)}
                      onChange={() =>
                        setVisibleColumns((current) => {
                          const next = toggleVisibleColumn(current, column)
                          setSortState((sortCurrent) => getEffectiveSortState(sortCurrent, next))
                          return next
                        })
                      }
                    />
                    {columnLabels[column]}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">{selectedRepos.length} selected</p>
              <button
                type="button"
                disabled={selectedRepos.length === 0}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition enabled:hover:border-slate-400 enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onAnalyzeSelected(selectedRepos)}
              >
                Analyze selected
              </button>
            </div>
            {selectionError ? <p className="mt-2 text-sm text-amber-700">{selectionError}</p> : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-600">
                Showing {visibleRangeStart}-{visibleRangeEnd} of {sortedRows.length} matching repositories
              </p>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <span>Rows per page</span>
                <select
                  aria-label="Rows per page"
                  value={pageSize}
                  onChange={(event) => {
                    setCurrentPage(1)
                    setPageSize(clampOrgInventoryPageSize(Number(event.target.value)))
                  }}
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                >
                  {ORG_INVENTORY_CONFIG.pageSizeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        </>
      )}
      {results.length > 0 && sortedRows.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">No matching repositories</h3>
          <p className="mt-2 text-sm text-slate-600">
            Try widening the repo, language, or archived filters to see more repositories.
          </p>
        </section>
      ) : null}
      {results.length > 0 && sortedRows.length > 0 ? (
        <div className="space-y-4">
          <OrgInventoryTable
            results={paginatedRows}
            visibleColumns={visibleColumns}
            sortState={effectiveSortState}
            selectedRepos={selectedRepos}
            onToggleSort={(column) => {
              setCurrentPage(1)
              setSortState((current) => getNextSortState(current, column))
            }}
            onToggleRepoSelection={(repo) => {
              const next = toggleRepoSelection(selectedRepos, repo, selectionLimit)
              setSelectedRepos(next.selectedRepos)
              setSelectionError(next.error)
            }}
            onAnalyzeRepo={onAnalyzeRepo}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">
              Page {safeCurrentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                className="rounded border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 transition enabled:hover:border-slate-400 enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                className="rounded border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 transition enabled:hover:border-slate-400 enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {rateLimit ? (
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p>Remaining API calls: {formatDisplayValue(rateLimit.remaining)}</p>
          <p>Rate limit resets at: {formatRateLimitReset(rateLimit.resetAt)}</p>
          {rateLimit.retryAfter !== 'unavailable' ? <p>Retry after: {formatRetryAfter(rateLimit.retryAfter)}</p> : null}
        </section>
      ) : null}
    </section>
  )
}

function formatDisplayValue(value: number | string) {
  if (typeof value === 'number') {
    return new Intl.NumberFormat('en-US').format(value)
  }

  return value
}

function formatRateLimitReset(value: string) {
  if (value === 'unavailable') {
    return value
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatRetryAfter(value: number | string) {
  if (typeof value !== 'number') {
    return value
  }

  return `${new Intl.NumberFormat('en-US').format(value)}s`
}
