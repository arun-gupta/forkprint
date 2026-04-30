import { describe, expect, it } from 'vitest'
import type { OrgRepoSummary } from '@/lib/analyzer/org-inventory'
import { matchesStructuredSearch, parseStructuredSearchQuery } from './structured-search'

describe('org-inventory/structured-search', () => {
  it('parses free text and structured prefixes together', () => {
    const parsed = parseStructuredSearchQuery('react lang:typescript stars:>100')

    expect(parsed.freeTextTerms).toEqual(['react'])
    expect(parsed.tokens).toEqual([
      { key: 'lang', raw: 'typescript' },
      { key: 'stars', raw: '>100' },
    ])
    expect(parsed.invalidTokens).toEqual([])
  })

  it('marks malformed tokens as invalid', () => {
    const parsed = parseStructuredSearchQuery('stars:abc pushed:yesterday unknown:value')

    expect(parsed.invalidTokens).toEqual(['stars:abc', 'pushed:yesterday', 'unknown:value'])
  })

  it('matches zero-cost and low-lift prefixes conjunctively', () => {
    const parsed = parseStructuredSearchQuery('react lang:typescript stars:>100 archived:false fork:false topic:ui size:>=500 visibility:public license:mit pushed:>=2026-04-01')

    expect(
      matchesStructuredSearch(
        buildRepo('facebook/react', {
          name: 'react',
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
        parsed,
      ),
    ).toBe(true)
  })

  it('supports company: as an owner filter', () => {
    const parsed = parseStructuredSearchQuery('company:facebook')

    expect(matchesStructuredSearch(buildRepo('facebook/react'), parsed)).toBe(true)
    expect(matchesStructuredSearch(buildRepo('vercel/next.js'), parsed)).toBe(false)
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
