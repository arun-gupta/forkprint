import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyze } from './analyze'
import { queryGitHubGraphQL } from './github-graphql'

vi.mock('./github-graphql', () => ({
  queryGitHubGraphQL: vi.fn(),
}))

const queryGitHubGraphQLMock = vi.mocked(queryGitHubGraphQL)

describe('analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a successful flat analysis result with unavailable placeholders where data is not verified', async () => {
    queryGitHubGraphQLMock
      .mockResolvedValueOnce({
        data: {
          repository: {
            name: 'react',
            description: 'A UI library',
            createdAt: '2013-05-24T16:15:54Z',
            primaryLanguage: { name: 'TypeScript' },
            stargazerCount: 100,
            forkCount: 25,
            watchers: { totalCount: 10 },
            issues: { totalCount: 5 },
          },
          rateLimit: { remaining: 4999, resetAt: '2026-03-31T23:59:59Z' },
        },
        rateLimit: { remaining: 4999, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      .mockResolvedValueOnce({
        data: {
          repository: {
            defaultBranchRef: {
              target: {
                recent30: { totalCount: 7 },
                recent90: { totalCount: 18 },
              },
            },
          },
          prsOpened: { issueCount: 4 },
          prsMerged: { issueCount: 3 },
          issuesClosed: { issueCount: 6 },
          rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z' },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })

    const result = await analyze({
      repos: ['facebook/react'],
      token: 'ghp_test',
    })

    expect(result.failures).toEqual([])
    expect(result.results).toHaveLength(1)
    expect(result.results[0]).toMatchObject({
      repo: 'facebook/react',
      name: 'react',
      stars: 100,
      forks: 25,
      watchers: 10,
      commits30d: 7,
      commits90d: 18,
      prsOpened90d: 4,
      prsMerged90d: 3,
      issuesOpen: 5,
      issuesClosed90d: 6,
      releases12mo: 'unavailable',
      uniqueCommitAuthors90d: 'unavailable',
      totalContributors: 'unavailable',
      commitCountsByAuthor: 'unavailable',
      issueFirstResponseTimestamps: 'unavailable',
      issueCloseTimestamps: 'unavailable',
      prMergeTimestamps: 'unavailable',
    })
    expect(result.results[0]?.missingFields).toContain('releases12mo')
    expect(result.rateLimit).toEqual({
      remaining: 4998,
      resetAt: '2026-03-31T23:59:59Z',
      retryAfter: 'unavailable',
    })
  })

  it('isolates a failing repository while still returning successful results for others', async () => {
    queryGitHubGraphQLMock
      .mockResolvedValueOnce({
        data: {
          repository: {
            name: 'react',
            description: 'A UI library',
            createdAt: '2013-05-24T16:15:54Z',
            primaryLanguage: { name: 'TypeScript' },
            stargazerCount: 100,
            forkCount: 25,
            watchers: { totalCount: 10 },
            issues: { totalCount: 5 },
          },
          rateLimit: { remaining: 4999, resetAt: '2026-03-31T23:59:59Z' },
        },
        rateLimit: { remaining: 4999, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      .mockResolvedValueOnce({
        data: {
          repository: {
            defaultBranchRef: {
              target: {
                recent30: { totalCount: 7 },
                recent90: { totalCount: 18 },
              },
            },
          },
          prsOpened: { issueCount: 4 },
          prsMerged: { issueCount: 3 },
          issuesClosed: { issueCount: 6 },
          rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z' },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      .mockRejectedValueOnce(new Error('not found'))

    const result = await analyze({
      repos: ['facebook/react', 'facebook/missing-repo'],
      token: 'ghp_test',
    })

    expect(result.results).toHaveLength(1)
    expect(result.results[0]?.repo).toBe('facebook/react')
    expect(result.failures).toEqual([
      {
        repo: 'facebook/missing-repo',
        reason: 'Repository could not be analyzed.',
        code: 'NOT_FOUND',
      },
    ])
  })

  it('surfaces rate-limit failures with retry metadata when GitHub rejects the request', async () => {
    const error = new Error('rate limit exceeded') as Error & { status?: number; retryAfter?: number | 'unavailable' }
    error.status = 403
    error.retryAfter = 60
    queryGitHubGraphQLMock.mockRejectedValue(error)

    const result = await analyze({
      repos: ['facebook/react'],
      token: 'ghp_test',
    })

    expect(result.results).toEqual([])
    expect(result.failures).toEqual([
      {
        repo: 'facebook/react',
        reason: 'GitHub rate limit prevented analysis.',
        code: 'RATE_LIMITED',
      },
    ])
    expect(result.rateLimit).toEqual({
      remaining: 'unavailable',
      resetAt: 'unavailable',
      retryAfter: 60,
    })
  })
})
