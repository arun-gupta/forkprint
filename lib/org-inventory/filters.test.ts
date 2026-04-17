import { describe, expect, it } from 'vitest'
import {
  applySelectionLimit,
  getEffectiveSortState,
  filterOrgInventoryRows,
  getNextSortState,
  sortOrgInventoryRows,
  toggleRepoSelection,
  toggleVisibleColumn,
  validateSelectionLimit,
  DEFAULT_ORG_INVENTORY_VISIBLE_COLUMNS,
  type OrgInventorySortColumn,
} from './filters'

describe('org-inventory/filters', () => {
  it('filters rows by repo query, language, and archived status', () => {
    const rows = [
      buildRepo('facebook/react', { primaryLanguage: 'TypeScript', archived: false }),
      buildRepo('facebook/jest', { primaryLanguage: 'JavaScript', archived: false }),
      buildRepo('facebookarchive/old', { primaryLanguage: 'JavaScript', archived: true }),
    ]

    expect(
      filterOrgInventoryRows(rows, {
        repoQuery: 'jest',
        language: 'all',
        archived: 'all',
      }).map((row) => row.repo),
    ).toEqual(['facebook/jest'])

    expect(
      filterOrgInventoryRows(rows, {
        repoQuery: '',
        language: 'JavaScript',
        archived: 'archived',
      }).map((row) => row.repo),
    ).toEqual(['facebookarchive/old'])
  })

  it('sorts every visible column in ascending and descending order', () => {
    const rows = [
      buildRepo('facebook/react', { name: 'react', description: 'UI library', primaryLanguage: 'TypeScript', stars: 100, forks: 25, watchers: 10, openIssues: 5, pushedAt: '2026-04-02T00:00:00Z', archived: false }),
      buildRepo('facebook/jest', { name: 'jest', description: 'Testing', primaryLanguage: 'JavaScript', stars: 80, forks: 10, watchers: 7, openIssues: 2, pushedAt: '2026-04-01T00:00:00Z', archived: false }),
    ]

    const sortableColumns: OrgInventorySortColumn[] = [
      'repo',
      'name',
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

    for (const column of sortableColumns) {
      expect(sortOrgInventoryRows(rows, column, 'asc')).toHaveLength(2)
      expect(sortOrgInventoryRows(rows, column, 'desc')).toHaveLength(2)
    }
  })

  it('toggles sort direction when the same column is activated twice', () => {
    expect(getNextSortState({ sortColumn: 'stars', sortDirection: 'asc' }, 'stars')).toEqual({
      sortColumn: 'stars',
      sortDirection: 'desc',
    })

    expect(getNextSortState({ sortColumn: 'stars', sortDirection: 'desc' }, 'forks')).toEqual({
      sortColumn: 'forks',
      sortDirection: 'asc',
    })
  })

  it('toggles optional visible columns locally', () => {
    expect(toggleVisibleColumn(DEFAULT_ORG_INVENTORY_VISIBLE_COLUMNS, 'description')).toContain('description')
    expect(toggleVisibleColumn(['description', 'stars'], 'description')).toEqual(['stars'])
  })

  it('falls back to repository sorting when a sorted column becomes hidden', () => {
    expect(
      getEffectiveSortState(
        { sortColumn: 'stars', sortDirection: 'desc' },
        ['primaryLanguage', 'forks'],
      ),
    ).toEqual({
      sortColumn: 'repo',
      sortDirection: 'asc',
    })
  })

  it('explains when lowering the selection limit would trim the current selection', () => {
    expect(validateSelectionLimit(['facebook/react', 'facebook/jest'], 1)).toEqual({
      valid: false,
      error: 'Selection will be trimmed to the first 1 repositories.',
    })

    expect(validateSelectionLimit(['facebook/react'], 2)).toEqual({
      valid: true,
      error: null,
    })
  })

  it('trims selection deterministically when the current limit is lowered', () => {
    expect(applySelectionLimit(['facebook/react', 'facebook/jest', 'facebook/relay'], 2)).toEqual({
      selectedRepos: ['facebook/react', 'facebook/jest'],
      error: 'Selection trimmed to the first 2 repositories.',
    })

    expect(applySelectionLimit(['facebook/react'], 2)).toEqual({
      selectedRepos: ['facebook/react'],
      error: null,
    })
  })

  it('prevents selecting more repos than the current selection limit', () => {
    expect(toggleRepoSelection(['facebook/react'], 'facebook/jest', 1)).toEqual({
      selectedRepos: ['facebook/react'],
      error: 'You can select up to 1 repositories for bulk analysis.',
    })

    expect(toggleRepoSelection(['facebook/react'], 'facebook/react', 1)).toEqual({
      selectedRepos: [],
      error: null,
    })
  })

  describe('selectedOnly option', () => {
    const baseFilters = { repoQuery: '', language: 'all', archived: 'all' } as const

    it('returns the same rows as before when options are undefined', () => {
      const rows = [
        buildRepo('facebook/react'),
        buildRepo('facebook/jest'),
        buildRepo('facebook/relay'),
      ]

      expect(filterOrgInventoryRows(rows, baseFilters).map((row) => row.repo)).toEqual([
        'facebook/react',
        'facebook/jest',
        'facebook/relay',
      ])
    })

    it('is a no-op when selectedOnly is false', () => {
      const rows = [buildRepo('facebook/react'), buildRepo('facebook/jest')]

      expect(
        filterOrgInventoryRows(rows, baseFilters, { selectedOnly: false, selectedRepos: ['facebook/react'] }).map(
          (row) => row.repo,
        ),
      ).toEqual(['facebook/react', 'facebook/jest'])
    })

    it('narrows rows to the selected set when selectedOnly is true', () => {
      const rows = [
        buildRepo('facebook/react'),
        buildRepo('facebook/jest'),
        buildRepo('facebook/relay'),
      ]

      expect(
        filterOrgInventoryRows(rows, baseFilters, { selectedOnly: true, selectedRepos: ['facebook/jest', 'facebook/relay'] }).map(
          (row) => row.repo,
        ),
      ).toEqual(['facebook/jest', 'facebook/relay'])
    })

    it('returns an empty array when selectedOnly is true and selectedRepos is empty', () => {
      const rows = [buildRepo('facebook/react'), buildRepo('facebook/jest')]

      expect(filterOrgInventoryRows(rows, baseFilters, { selectedOnly: true, selectedRepos: [] })).toEqual([])
    })

    it('composes with the existing filters (intersection semantics)', () => {
      const rows = [
        buildRepo('facebook/react', { primaryLanguage: 'TypeScript', archived: false }),
        buildRepo('facebook/jest', { primaryLanguage: 'JavaScript', archived: false }),
        buildRepo('facebookarchive/old', { primaryLanguage: 'JavaScript', archived: true }),
      ]

      expect(
        filterOrgInventoryRows(
          rows,
          { repoQuery: 'jest', language: 'all', archived: 'all' },
          { selectedOnly: true, selectedRepos: ['facebook/jest', 'facebook/react'] },
        ).map((row) => row.repo),
      ).toEqual(['facebook/jest'])

      expect(
        filterOrgInventoryRows(
          rows,
          { repoQuery: '', language: 'JavaScript', archived: 'all' },
          { selectedOnly: true, selectedRepos: ['facebook/jest', 'facebookarchive/old', 'facebook/react'] },
        ).map((row) => row.repo),
      ).toEqual(['facebook/jest', 'facebookarchive/old'])
    })

    it('does not produce duplicate rows when selectedRepos contains duplicate entries', () => {
      const rows = [buildRepo('facebook/react'), buildRepo('facebook/jest')]

      expect(
        filterOrgInventoryRows(rows, baseFilters, { selectedOnly: true, selectedRepos: ['facebook/react', 'facebook/react'] }).map(
          (row) => row.repo,
        ),
      ).toEqual(['facebook/react'])
    })
  })
})

function buildRepo(repo: string, overrides: Record<string, unknown> = {}) {
  return {
    repo,
    name: repo.split('/')[1] ?? repo,
    description: 'Repo description',
    primaryLanguage: 'TypeScript',
    stars: 25,
    forks: 10,
    watchers: 5,
    openIssues: 2,
    pushedAt: '2026-03-31T00:00:00Z',
    archived: false,
    url: `https://github.com/${repo}`,
    ...overrides,
  }
}
