import type { OrgRepoSummary } from '@/lib/analyzer/org-inventory'
import { applyDateFilter, applyNumericFilter, parseOrgInventorySearchQuery } from './search-parser'

export type OrgInventorySortColumn =
  | 'repo'
  | 'name'
  | 'description'
  | 'primaryLanguage'
  | 'stars'
  | 'forks'
  | 'watchers'
  | 'openIssues'
  | 'pushedAt'
  | 'archived'
  | 'url'

export type OrgInventoryVisibleColumn =
  | 'description'
  | 'primaryLanguage'
  | 'stars'
  | 'forks'
  | 'watchers'
  | 'openIssues'
  | 'pushedAt'
  | 'archived'
  | 'url'

export interface OrgInventoryFilters {
  /** Raw query string. Supports structured prefixes: lang:, archived:, fork:, stars:, forks:, watchers:, issues:, pushed: */
  repoQuery: string
}

export interface SelectedOnlyOptions {
  selectedOnly: boolean
  selectedRepos: string[]
}

export interface OrgInventorySortState {
  sortColumn: OrgInventorySortColumn
  sortDirection: 'asc' | 'desc'
}

export const PINNED_ORG_INVENTORY_COLUMN: OrgInventorySortColumn = 'repo'

export const OPTIONAL_ORG_INVENTORY_COLUMNS: OrgInventoryVisibleColumn[] = [
  'description',
  'primaryLanguage',
  'stars',
  'forks',
  'watchers',
  'openIssues',
  'pushedAt',
  'archived',
  'url',
]

export const DEFAULT_ORG_INVENTORY_VISIBLE_COLUMNS: OrgInventoryVisibleColumn[] = [
  'primaryLanguage',
  'stars',
  'forks',
  'watchers',
  'openIssues',
  'pushedAt',
  'archived',
]

export function filterOrgInventoryRows(
  rows: OrgRepoSummary[],
  filters: OrgInventoryFilters,
  options?: SelectedOnlyOptions,
) {
  const parsed = parseOrgInventorySearchQuery(filters.repoQuery)
  const freeText = parsed.freeText.toLowerCase()
  const selectedSet = options?.selectedOnly ? new Set(options.selectedRepos) : null

  return rows.filter((row) => {
    if (freeText && !row.repo.toLowerCase().includes(freeText) && !row.name.toLowerCase().includes(freeText)) {
      return false
    }

    if (parsed.lang !== null && row.primaryLanguage.toLowerCase() !== parsed.lang.toLowerCase()) {
      return false
    }

    if (parsed.archived !== null && row.archived !== parsed.archived) {
      return false
    }

    if (parsed.fork !== null && row.isFork !== parsed.fork) {
      return false
    }

    if (parsed.stars !== null && !applyNumericFilter(row.stars, parsed.stars)) {
      return false
    }

    if (parsed.forks !== null && !applyNumericFilter(row.forks, parsed.forks)) {
      return false
    }

    if (parsed.watchers !== null && !applyNumericFilter(row.watchers, parsed.watchers)) {
      return false
    }

    if (parsed.issues !== null && !applyNumericFilter(row.openIssues, parsed.issues)) {
      return false
    }

    if (parsed.pushed !== null && !applyDateFilter(row.pushedAt, parsed.pushed)) {
      return false
    }

    if (selectedSet && !selectedSet.has(row.repo)) {
      return false
    }

    return true
  })
}

export function sortOrgInventoryRows(rows: OrgRepoSummary[], column: OrgInventorySortColumn, direction: 'asc' | 'desc') {
  return [...rows].sort((left, right) => {
    const comparison = compareByColumn(left, right, column)
    if (comparison !== 0) {
      return direction === 'asc' ? comparison : -comparison
    }
    return left.repo.localeCompare(right.repo)
  })
}

export function getNextSortState(current: OrgInventorySortState, nextColumn: OrgInventorySortColumn): OrgInventorySortState {
  if (current.sortColumn === nextColumn) {
    return {
      sortColumn: nextColumn,
      sortDirection: current.sortDirection === 'asc' ? 'desc' : 'asc',
    }
  }

  return {
    sortColumn: nextColumn,
    sortDirection: 'asc',
  }
}

export function toggleVisibleColumn(current: OrgInventoryVisibleColumn[], column: OrgInventoryVisibleColumn) {
  if (current.includes(column)) {
    return current.filter((entry) => entry !== column)
  }

  return [...current, column]
}

export function getEffectiveSortState(
  current: OrgInventorySortState,
  visibleColumns: OrgInventoryVisibleColumn[],
): OrgInventorySortState {
  if (current.sortColumn === PINNED_ORG_INVENTORY_COLUMN) {
    return current
  }

  if (visibleColumns.includes(current.sortColumn as OrgInventoryVisibleColumn)) {
    return current
  }

  return {
    sortColumn: PINNED_ORG_INVENTORY_COLUMN,
    sortDirection: 'asc',
  }
}

export function toggleRepoSelection(selectedRepos: string[], repo: string): string[] {
  if (selectedRepos.includes(repo)) {
    return selectedRepos.filter((entry) => entry !== repo)
  }

  return [...selectedRepos, repo]
}

function compareByColumn(left: OrgRepoSummary, right: OrgRepoSummary, column: OrgInventorySortColumn) {
  switch (column) {
    case 'repo':
      return left.repo.localeCompare(right.repo)
    case 'stars':
    case 'forks':
    case 'watchers':
    case 'openIssues':
      return compareNumeric(left[column], right[column])
    case 'archived':
      return Number(left.archived) - Number(right.archived)
    case 'pushedAt':
      return compareDate(left.pushedAt, right.pushedAt)
    case 'name':
    case 'description':
    case 'primaryLanguage':
    case 'url':
      return compareText(left[column], right[column])
  }
}

function compareNumeric(left: number | 'unavailable', right: number | 'unavailable') {
  if (typeof left !== 'number' && typeof right !== 'number') {
    return 0
  }
  if (typeof left !== 'number') {
    return 1
  }
  if (typeof right !== 'number') {
    return -1
  }
  return left - right
}

function compareText(left: string | 'unavailable', right: string | 'unavailable') {
  if (left === 'unavailable' && right === 'unavailable') {
    return 0
  }
  if (left === 'unavailable') {
    return 1
  }
  if (right === 'unavailable') {
    return -1
  }
  return left.localeCompare(right)
}

function compareDate(left: string | 'unavailable', right: string | 'unavailable') {
  if (left === 'unavailable' && right === 'unavailable') {
    return 0
  }
  if (left === 'unavailable') {
    return 1
  }
  if (right === 'unavailable') {
    return -1
  }
  return new Date(left).getTime() - new Date(right).getTime()
}
