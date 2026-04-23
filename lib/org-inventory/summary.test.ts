import { describe, expect, it } from 'vitest'
import { buildOrgInventorySummary } from './summary'

describe('org-inventory/summary', () => {
  it('builds rollups from lightweight repo rows', () => {
    const summary = buildOrgInventorySummary([
      buildRepo('facebook/react', { stars: 100, primaryLanguage: 'TypeScript', archived: false, pushedAt: '2026-04-02T00:00:00Z' }),
      buildRepo('facebook/jest', { stars: 80, primaryLanguage: 'TypeScript', archived: false, pushedAt: '2026-04-01T00:00:00Z' }),
      buildRepo('facebookarchive/old', { stars: 10, primaryLanguage: 'JavaScript', archived: true, pushedAt: '2025-01-01T00:00:00Z' }),
    ])

    expect(summary.totalPublicRepos).toBe(3)
    expect(summary.totalStars).toBe(190)
    expect(summary.archivedRepoCount).toBe(1)
    expect(summary.activeRepoCount).toBe(2)
    expect(summary.mostStarredRepos[0]).toEqual({ repo: 'facebook/react', stars: 100 })
    expect(summary.mostRecentlyActiveRepos[0]?.repo).toBe('facebook/react')
    expect(summary.languageDistribution).toEqual([
      { language: 'TypeScript', repoCount: 2 },
      { language: 'JavaScript', repoCount: 1 },
    ])
  })

  it('keeps unavailable stars explicit in totalStars when no verified totals exist', () => {
    const summary = buildOrgInventorySummary([buildRepo('facebook/react', { stars: 'unavailable' })])
    expect(summary.totalStars).toBe('unavailable')
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
    isFork: false,
    url: `https://github.com/${repo}`,
    ...overrides,
  }
}
