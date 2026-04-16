'use client'

import { useMemo, useState } from 'react'
import { isRateLimitLow } from '@/lib/analyzer/analysis-result'
import type { OrgInventoryResponse } from '@/lib/analyzer/org-inventory'
import { ORG_AGGREGATION_CONFIG } from '@/lib/config/org-aggregation'
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
  onAnalyzeAllActive?: (repos: string[]) => void
  afterSummary?: React.ReactNode
}

export function OrgInventoryView({
  org,
  summary,
  results,
  rateLimit,
  onAnalyzeRepo,
  onAnalyzeSelected,
  onAnalyzeAllActive,
  afterSummary,
}: OrgInventoryViewProps) {
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
  const [excludeArchivedRepos, setExcludeArchivedRepos] = useState<boolean>(
    ORG_AGGREGATION_CONFIG.preFilters.excludeArchivedByDefault,
  )
  const [excludeForks, setExcludeForks] = useState<boolean>(
    ORG_AGGREGATION_CONFIG.preFilters.excludeForksByDefault,
  )
  const [repoTableExpanded, setRepoTableExpanded] = useState(true)

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
  const activeRunRepos = useMemo(() => {
    return sortedRows
      .filter((row) => (excludeArchivedRepos ? !row.archived : true))
      .filter((row) => (excludeForks ? !row.isFork : true))
      .map((row) => row.repo)
  }, [excludeArchivedRepos, excludeForks, sortedRows])

  return (
    <section aria-label="Org inventory view" className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Organization</p>
        <h2 className="mt-0.5 text-xl font-semibold text-slate-900 dark:text-slate-100">{org}</h2>
      </div>

      {results.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900">No public repositories found</h3>
          <p className="mt-2 text-sm text-slate-600">
            RepoPulse did not find any public repositories for this organization.
          </p>
        </section>
      ) : (
        <>
          <OrgInventorySummary summary={summary} />
          {afterSummary}
          <section className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setRepoTableExpanded((e) => !e)}
              aria-expanded={repoTableExpanded}
              className="flex w-full items-center gap-2 p-3 text-left"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 text-slate-500 transition-transform dark:text-slate-400 ${repoTableExpanded ? '' : '-rotate-90'}`}
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Repositories ({sortedRows.length})
              </span>
            </button>
            {repoTableExpanded ? (
              <div className="space-y-4 px-3 pb-3">
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex-1 min-w-[140px]">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Filter</span>
                    <input
                      value={filters.repoQuery}
                      onChange={(event) => {
                        setCurrentPage(1)
                        setFilters((current) => ({ ...current, repoQuery: event.target.value }))
                      }}
                      className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      placeholder="Repo name"
                    />
                  </label>
                  <label className="min-w-[120px]">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Language</span>
                    <select
                      value={filters.language}
                      onChange={(event) => {
                        setCurrentPage(1)
                        setFilters((current) => ({ ...current, language: event.target.value }))
                      }}
                      className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="all">All</option>
                      {languageOptions.map((language) => (
                        <option key={language} value={language}>{language}</option>
                      ))}
                    </select>
                  </label>
                  <label className="min-w-[100px]">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Archived</span>
                    <select
                      value={filters.archived}
                      onChange={(event) => {
                        setCurrentPage(1)
                        setFilters((current) => ({ ...current, archived: event.target.value as OrgInventoryFilters['archived'] }))
                      }}
                      className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
                    <label className="inline-flex items-center gap-1">
                      <input type="checkbox" checked={excludeArchivedRepos} onChange={(e) => setExcludeArchivedRepos(e.target.checked)} aria-label="Exclude archived repos" />
                      No archived
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input type="checkbox" checked={excludeForks} onChange={(e) => setExcludeForks(e.target.checked)} aria-label="Exclude forks" />
                      No forks
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{selectedRepos.length} selected · {activeRunRepos.length} after filters</span>
                    <button
                      type="button"
                      onClick={() => setSelectedRepos(sortedRows.map((r) => r.repo))}
                      className="text-xs text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
                    >
                      Select all
                    </button>
                    {selectedRepos.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setSelectedRepos([])}
                        className="text-xs text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {onAnalyzeAllActive ? (
                      <button
                        type="button"
                        disabled={activeRunRepos.length === 0}
                        className="rounded border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800 transition enabled:hover:border-sky-400 enabled:hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                        onClick={() => onAnalyzeAllActive(activeRunRepos)}
                      >
                        Analyze all ({activeRunRepos.length})
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={selectedRepos.length === 0}
                      className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition enabled:hover:border-slate-400 enabled:hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200"
                      onClick={() => onAnalyzeSelected(selectedRepos)}
                    >
                      Analyze selected ({selectedRepos.length})
                    </button>
                  </div>
                </div>
                {selectionError ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{selectionError}</p> : null}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Showing {visibleRangeStart}–{visibleRangeEnd} of {sortedRows.length}
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
                </div>

                {sortedRows.length === 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">No matching repositories</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Try widening the repo, language, or archived filters to see more repositories.
                    </p>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            ) : null}
          </section>
        </>
      )}
      {rateLimit && isRateLimitLow(rateLimit) ? (
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
