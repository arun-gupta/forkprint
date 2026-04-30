import { describe, expect, it } from 'vitest'
import type { OrgRepoSummary } from '@/lib/analyzer/org-inventory'
import {
  getEffectiveSortState,
  filterOrgInventoryRows,
  getNextSortState,
  sortOrgInventoryRows,
  toggleRepoSelection,
  toggleVisibleColumn,
  DEFAULT_ORG_INVENTORY_VISIBLE_COLUMNS,
  type OrgInventorySortColumn,
} from './filters'

describe('org-inventory/filters', () => {
  it('filters rows by free-text query and structured prefixes (lang:, archived:)', () => {
    const rows = [
      buildRepo('facebook/react', { primaryLanguage: 'TypeScript', archived: false }),
      buildRepo('facebook/jest', { primaryLanguage: 'JavaScript', archived: false }),
      buildRepo('facebookarchive/old', { primaryLanguage: 'JavaScript', archived: true }),
    ]

    expect(
      filterOrgInventoryRows(rows, {
        repoQuery: 'jest',
      }).map((row) => row.repo),
    ).toEqual(['facebook/jest'])

    expect(
      filterOrgInventoryRows(rows, {
        repoQuery: 'lang:javascript archived:true',
      }).map((row) => row.repo),
    ).toEqual(['facebookarchive/old'])
  })

  it('filters rows by numeric, boolean, and metadata prefixes', () => {
    const rows = [
      buildRepo('facebook/react', {
        primaryLanguage: 'TypeScript',
        stars: 230,
        archived: false,
        isFork: false,
        topics: ['ui', 'frontend'],
        sizeKb: 800,
        visibility: 'public',
        licenseSpdxId: 'MIT',
        pushedAt: '2026-04-02T00:00:00Z',
      }),
      buildRepo('facebook/react-old', {
        primaryLanguage: 'JavaScript',
        stars: 90,
        archived: true,
        isFork: true,
        topics: ['legacy'],
        sizeKb: 200,
        visibility: 'public',
        licenseSpdxId: 'Apache-2.0',
        pushedAt: '2025-01-01T00:00:00Z',
      }),
    ]

    expect(
      filterOrgInventoryRows(rows, {
        repoQuery: 'lang:typescript stars:>100 archived:false fork:false topic:ui size:>=500 visibility:public license:mit pushed:>=2026-04-01',
      }).map((row) => row.repo),
    ).toEqual(['facebook/react'])
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

  it('adds a repo to the selection when not already present', () => {
    expect(toggleRepoSelection(['facebook/react'], 'facebook/jest')).toEqual(['facebook/react', 'facebook/jest'])
  })

  it('removes a repo from the selection when already present', () => {
    expect(toggleRepoSelection(['facebook/react', 'facebook/jest'], 'facebook/react')).toEqual(['facebook/jest'])
  })

  describe('selectedOnly option', () => {
    const baseFilters = { repoQuery: '' } as const

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
          { repoQuery: 'jest' },
          { selectedOnly: true, selectedRepos: ['facebook/jest', 'facebook/react'] },
        ).map((row) => row.repo),
      ).toEqual(['facebook/jest'])

      expect(
        filterOrgInventoryRows(
          rows,
          { repoQuery: 'lang:javascript' },
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

function buildRepo(repo: string, overrides: Record<string, unknown> = {}): OrgRepoSummary {
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
    isFork: false,
    topics: [],
    sizeKb: 100,
    visibility: 'public',
    licenseSpdxId: 'unavailable',
    licenseName: 'unavailable',
    url: `https://github.com/${repo}`,
    ...overrides,
  }
}
