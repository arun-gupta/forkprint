import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyzeOrgInventory, buildOrgRepoSummary, normalizeOrgInput } from './org-inventory'
import { queryGitHubGraphQL } from './github-graphql'

vi.mock('./github-graphql', () => ({
  queryGitHubGraphQL: vi.fn(),
}))

const queryGitHubGraphQLMock = vi.mocked(queryGitHubGraphQL)

describe('analyzer/org-inventory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes an org slug or GitHub org URL', () => {
    expect(normalizeOrgInput('facebook')).toEqual({ valid: true, org: 'facebook' })
    expect(normalizeOrgInput('https://github.com/vercel')).toEqual({ valid: true, org: 'vercel' })
    expect(normalizeOrgInput('github.com/openai')).toEqual({ valid: true, org: 'openai' })
    expect(normalizeOrgInput(' https://github.com/openai/ ')).toEqual({ valid: true, org: 'openai' })
  })

  it('rejects malformed org input', () => {
    expect(normalizeOrgInput('')).toEqual({ valid: false, error: 'A GitHub organization is required.' })
    expect(normalizeOrgInput('https://github.com/vercel/next.js')).toEqual({ valid: false, error: 'Enter a top-level GitHub organization, not a repository URL.' })
    expect(normalizeOrgInput('github.com/vercel/next.js')).toEqual({ valid: false, error: 'Enter a top-level GitHub organization, not a repository URL.' })
  })

  it('shapes lightweight public repository metadata into an org repo summary', () => {
    const row = buildOrgRepoSummary('facebook', {
      name: 'react',
      description: 'A UI library',
      primaryLanguage: { name: 'TypeScript' },
      stargazerCount: 100,
      forkCount: 25,
      watchers: { totalCount: 10 },
      issues: { totalCount: 5 },
      pushedAt: '2026-04-02T00:00:00Z',
      isArchived: false,
      url: 'https://github.com/facebook/react',
    })

    expect(row).toEqual({
      repo: 'facebook/react',
      name: 'react',
      description: 'A UI library',
      primaryLanguage: 'TypeScript',
      stars: 100,
      forks: 25,
      watchers: 10,
      openIssues: 5,
      pushedAt: '2026-04-02T00:00:00Z',
      archived: false,
      url: 'https://github.com/facebook/react',
    })
  })

  it('paginates through all public repositories beyond the first 100 rows', async () => {
    queryGitHubGraphQLMock
      .mockResolvedValueOnce({
        data: {
          organization: {
            repositories: {
              pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
              nodes: [buildNode('react')],
            },
          },
        },
        rateLimit: null,
      })
      .mockResolvedValueOnce({
        data: {
          organization: {
            repositories: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [buildNode('jest')],
            },
          },
        },
        rateLimit: null,
      })

    const response = await analyzeOrgInventory({ org: 'facebook', token: 'ghp_test' })

    expect(response.results.map((row) => row.repo)).toEqual(['facebook/react', 'facebook/jest'])
    expect(queryGitHubGraphQLMock).toHaveBeenCalledTimes(2)
  })
})

function buildNode(name: string) {
  return {
    name,
    description: `${name} description`,
    primaryLanguage: { name: 'TypeScript' },
    stargazerCount: 100,
    forkCount: 25,
    watchers: { totalCount: 10 },
    issues: { totalCount: 5 },
    pushedAt: '2026-04-02T00:00:00Z',
    isArchived: false,
    url: `https://github.com/facebook/${name}`,
  }
}
