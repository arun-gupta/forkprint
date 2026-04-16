import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyze } from './analyze'
import { queryGitHubGraphQL } from './github-graphql'
import { fetchContributorCount, fetchMaintainerCount, fetchPublicUserOrganizations } from './github-rest'

vi.mock('./github-graphql', () => ({
  queryGitHubGraphQL: vi.fn(),
}))

vi.mock('./github-rest', () => ({
  fetchContributorCount: vi.fn(),
  fetchMaintainerCount: vi.fn(),
  fetchPublicUserOrganizations: vi.fn(),
}))

vi.mock('@/lib/security/scorecard-client', () => ({
  fetchScorecardData: vi.fn().mockResolvedValue('unavailable'),
}))

vi.mock('@/lib/security/direct-checks', () => ({
  fetchBranchProtection: vi.fn().mockResolvedValue('unavailable'),
}))

const queryGitHubGraphQLMock = vi.mocked(queryGitHubGraphQL)
const fetchContributorCountMock = vi.mocked(fetchContributorCount)
const fetchMaintainerCountMock = vi.mocked(fetchMaintainerCount)
const fetchPublicUserOrganizationsMock = vi.mocked(fetchPublicUserOrganizations)

describe('analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchContributorCountMock.mockResolvedValue({
      data: 1742,
      rateLimit: { remaining: 4997, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
    })
    fetchMaintainerCountMock.mockResolvedValue({
      data: {
        count: 4,
        tokens: [
          { token: 'alice', kind: 'user' },
          { token: 'bob', kind: 'user' },
          { token: 'carol', kind: 'user' },
          { token: 'dave', kind: 'user' },
        ],
      },
      rateLimit: { remaining: 4996, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
    })
    fetchPublicUserOrganizationsMock.mockResolvedValue({
      data: ['meta'],
      rateLimit: { remaining: 4995, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
    })
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
      // Activity pass 1: commit history + releases
      .mockResolvedValueOnce({
        data: {
          repository: {
            releases: { nodes: [] },
            defaultBranchRef: {
              target: {
                recent30: { totalCount: 7 },
                recent60: { totalCount: 12 },
                recent90: { totalCount: 18 },
                recent180: { totalCount: 30 },
                recent365Commits: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [
                    {
                      authoredDate: '2026-03-30T12:00:00Z',
                      author: { name: 'Alice', email: 'alice@example.com', user: { login: 'alice' } },
                    },
                    {
                      authoredDate: '2026-03-29T12:00:00Z',
                      author: { name: 'Alice', email: 'alice@example.com', user: { login: 'alice' } },
                    },
                    {
                      authoredDate: '2026-03-28T12:00:00Z',
                      author: { name: 'Bob', email: 'bob@example.com', user: { login: 'bob' } },
                    },
                  ],
                },
              },
            },
          },
          rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z' },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      // Activity pass 2: search-based counts
      .mockResolvedValueOnce({
        data: {
          prsOpened30: { issueCount: 4 }, prsOpened60: { issueCount: 4 }, prsOpened90: { issueCount: 4 }, prsOpened180: { issueCount: 4 }, prsOpened365: { issueCount: 4 },
          prsMerged30: { issueCount: 3 }, prsMerged60: { issueCount: 3 }, prsMerged90: { issueCount: 3 }, prsMerged180: { issueCount: 3 }, prsMerged365: { issueCount: 3 },
          issuesOpened30: { issueCount: 0 }, issuesOpened60: { issueCount: 0 }, issuesOpened90: { issueCount: 0 }, issuesOpened180: { issueCount: 0 }, issuesOpened365: { issueCount: 0 },
          issuesClosed30: { issueCount: 6 }, issuesClosed60: { issueCount: 6 }, issuesClosed90: { issueCount: 6 }, issuesClosed180: { issueCount: 6 }, issuesClosed365: { issueCount: 6 },
          staleIssues30: { issueCount: 0 }, staleIssues60: { issueCount: 0 }, staleIssues90: { issueCount: 0 }, staleIssues180: { issueCount: 0 }, staleIssues365: { issueCount: 0 },
          recentMergedPullRequests: { nodes: [] },
          recentClosedIssues: { nodes: [] },
          rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z' },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      // Responsiveness metadata query (pass 1) — empty for this test
      .mockResolvedValueOnce({
        data: {
          recentCreatedIssues: { nodes: [] },
          recentClosedIssues: { nodes: [] },
          recentCreatedPullRequests: { nodes: [] },
          recentMergedPullRequests: { nodes: [] },
          staleOpenPullRequests30: { issueCount: 0 },
          staleOpenPullRequests60: { issueCount: 0 },
          staleOpenPullRequests90: { issueCount: 0 },
          staleOpenPullRequests180: { issueCount: 0 },
          staleOpenPullRequests365: { issueCount: 0 },
          rateLimit: { remaining: 4997, resetAt: '2026-03-31T23:59:59Z' },
        },
        rateLimit: { remaining: 4997, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
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
      releases12mo: 0,
      uniqueCommitAuthors90d: 2,
      totalContributors: 1742,
      maintainerCount: 4,
      commitCountsByAuthor: {
        'login:alice': 2,
        'login:bob': 1,
      },
      commitCountsByExperimentalOrg: {
        meta: 3,
      },
      experimentalAttributedAuthors90d: 2,
      experimentalUnattributedAuthors90d: 0,
      issueFirstResponseTimestamps: 'unavailable',
      issueCloseTimestamps: 'unavailable',
      prMergeTimestamps: 'unavailable',
    })
    expect(result.results[0]?.missingFields).not.toContain('releases12mo')
    expect(result.results[0]?.missingFields).not.toContain('uniqueCommitAuthors90d')
    expect(result.results[0]?.missingFields).not.toContain('totalContributors')
    expect(result.results[0]?.missingFields).not.toContain('maintainerCount')
    expect(result.results[0]?.missingFields).not.toContain('commitCountsByAuthor')
    expect(result.results[0]?.missingFields).not.toContain('commitCountsByExperimentalOrg')
    expect(result.rateLimit).toEqual({
      remaining: 4995,
      resetAt: '2026-03-31T23:59:59Z',
      retryAfter: 'unavailable',
    })
  })

  it('counts 12-month commits across paginated commit-history pages instead of capping at the first 100 nodes', async () => {
    const firstPageNodes = Array.from({ length: 100 }, (_, index) => ({
      authoredDate: `2026-03-${String((index % 28) + 1).padStart(2, '0')}T12:00:00Z`,
      author: { name: 'Alice', email: 'alice@example.com', user: { login: 'alice' } },
    }))
    const secondPageNodes = Array.from({ length: 30 }, (_, index) => ({
      authoredDate: `2026-02-${String((index % 28) + 1).padStart(2, '0')}T12:00:00Z`,
      author: { name: 'Bob', email: 'bob@example.com', user: { login: 'bob' } },
    }))

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
        },
        rateLimit: { remaining: 4999, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      // Activity pass 1: commit history + releases
      .mockResolvedValueOnce({
        data: {
          repository: {
            releases: { nodes: [] },
            defaultBranchRef: {
              target: {
                recent30: { totalCount: 7 },
                recent60: { totalCount: 12 },
                recent90: { totalCount: 18 },
                recent180: { totalCount: 50 },
                recent365Commits: {
                  pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
                  nodes: firstPageNodes,
                },
              },
            },
          },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      // Activity pass 2: search-based counts
      .mockResolvedValueOnce({
        data: {
          prsOpened30: { issueCount: 2 }, prsOpened60: { issueCount: 3 }, prsOpened90: { issueCount: 4 }, prsOpened180: { issueCount: 7 }, prsOpened365: { issueCount: 12 },
          prsMerged30: { issueCount: 1 }, prsMerged60: { issueCount: 2 }, prsMerged90: { issueCount: 3 }, prsMerged180: { issueCount: 5 }, prsMerged365: { issueCount: 9 },
          issuesOpened30: { issueCount: 4 }, issuesOpened60: { issueCount: 6 }, issuesOpened90: { issueCount: 8 }, issuesOpened180: { issueCount: 10 }, issuesOpened365: { issueCount: 16 },
          issuesClosed30: { issueCount: 3 }, issuesClosed60: { issueCount: 5 }, issuesClosed90: { issueCount: 6 }, issuesClosed180: { issueCount: 8 }, issuesClosed365: { issueCount: 13 },
          staleIssues30: { issueCount: 0 }, staleIssues60: { issueCount: 0 }, staleIssues90: { issueCount: 0 }, staleIssues180: { issueCount: 0 }, staleIssues365: { issueCount: 0 },
          recentMergedPullRequests: { nodes: [] },
          recentClosedIssues: { nodes: [] },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      .mockResolvedValueOnce({
        data: {
          recentCreatedIssues: { nodes: [] },
          recentClosedIssues: { nodes: [] },
          recentCreatedPullRequests: { nodes: [] },
          recentMergedPullRequests: { nodes: [] },
          staleOpenPullRequests30: { issueCount: 0 },
          staleOpenPullRequests60: { issueCount: 0 },
          staleOpenPullRequests90: { issueCount: 0 },
          staleOpenPullRequests180: { issueCount: 0 },
          staleOpenPullRequests365: { issueCount: 0 },
        },
        rateLimit: { remaining: 4997, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      .mockResolvedValueOnce({
        data: {
          repository: {
            defaultBranchRef: {
              target: {
                recent365Commits: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: secondPageNodes,
                },
              },
            },
          },
        },
        rateLimit: { remaining: 4996, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })

    const result = await analyze({
      repos: ['facebook/react'],
      token: 'ghp_test',
    })

    expect(result.results[0]?.activityMetricsByWindow?.[365]?.commits).toBe(130)
  })

  it('derives first-response, stale backlog, and engagement responsiveness metrics from verified issue and PR event data', async () => {
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
            issues: { totalCount: 10 },
            pullRequests: { totalCount: 4 },
          },
        },
        rateLimit: { remaining: 4999, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      // Activity pass 1: commit history + releases
      .mockResolvedValueOnce({
        data: {
          repository: {
            releases: { nodes: [] },
            defaultBranchRef: {
              target: {
                recent30: { totalCount: 7 },
                recent60: { totalCount: 12 },
                recent90: { totalCount: 18 },
                recent180: { totalCount: 30 },
                recent365Commits: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [
                    {
                      authoredDate: '2026-03-30T12:00:00Z',
                      author: { name: 'Alice', email: 'alice@example.com', user: { login: 'alice' } },
                    },
                  ],
                },
              },
            },
          },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      // Activity pass 2: search-based counts
      .mockResolvedValueOnce({
        data: {
          prsOpened30: { issueCount: 2 }, prsOpened60: { issueCount: 3 }, prsOpened90: { issueCount: 4 }, prsOpened180: { issueCount: 5 }, prsOpened365: { issueCount: 6 },
          prsMerged30: { issueCount: 1 }, prsMerged60: { issueCount: 2 }, prsMerged90: { issueCount: 3 }, prsMerged180: { issueCount: 4 }, prsMerged365: { issueCount: 5 },
          issuesOpened30: { issueCount: 3 }, issuesOpened60: { issueCount: 5 }, issuesOpened90: { issueCount: 8 }, issuesOpened180: { issueCount: 10 }, issuesOpened365: { issueCount: 11 },
          issuesClosed30: { issueCount: 2 }, issuesClosed60: { issueCount: 4 }, issuesClosed90: { issueCount: 6 }, issuesClosed180: { issueCount: 8 }, issuesClosed365: { issueCount: 9 },
          staleIssues30: { issueCount: 1 }, staleIssues60: { issueCount: 1 }, staleIssues90: { issueCount: 2 }, staleIssues180: { issueCount: 2 }, staleIssues365: { issueCount: 3 },
          recentMergedPullRequests: { nodes: [{ createdAt: '2026-03-01T00:00:00Z', mergedAt: '2026-03-02T12:00:00Z' }] },
          recentClosedIssues: { nodes: [{ createdAt: '2026-03-03T00:00:00Z', closedAt: '2026-03-05T00:00:00Z' }] },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      // Responsiveness pass 1: metadata (no nested comment/review nodes)
      .mockResolvedValueOnce({
        data: {
          recentCreatedIssues: {
            nodes: [
              { id: 'issue-1', createdAt: '2026-03-10T00:00:00Z', author: { login: 'alice' }, comments: { totalCount: 1 } },
              { id: 'issue-2', createdAt: '2026-03-11T00:00:00Z', author: { login: 'carol' }, comments: { totalCount: 0 } },
            ],
          },
          recentClosedIssues: {
            nodes: [
              { id: 'issue-3', createdAt: '2026-03-03T00:00:00Z', closedAt: '2026-03-05T00:00:00Z', author: { login: 'alice' }, comments: { totalCount: 0 } },
            ],
          },
          recentCreatedPullRequests: {
            nodes: [
              { id: 'pr-1', createdAt: '2026-03-12T00:00:00Z', author: { login: 'dave' }, comments: { totalCount: 0 }, reviews: { totalCount: 2 } },
            ],
          },
          recentMergedPullRequests: {
            nodes: [{ createdAt: '2026-03-01T00:00:00Z', mergedAt: '2026-03-02T12:00:00Z' }],
          },
          staleOpenPullRequests30: { issueCount: 0 },
          staleOpenPullRequests60: { issueCount: 0 },
          staleOpenPullRequests90: { issueCount: 1 },
          staleOpenPullRequests180: { issueCount: 1 },
          staleOpenPullRequests365: { issueCount: 1 },
          rateLimit: { remaining: 4997, resetAt: '2026-03-31T23:59:59Z' },
        },
        rateLimit: { remaining: 4997, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      // Responsiveness pass 2: detail query for nodes with comments/reviews
      .mockResolvedValueOnce({
        data: {
          node0: {
            id: 'issue-1',
            createdAt: '2026-03-10T00:00:00Z',
            author: { login: 'alice' },
            comments: { totalCount: 1, nodes: [{ createdAt: '2026-03-10T06:00:00Z', author: { login: 'bob' } }] },
          },
          node1: {
            id: 'pr-1',
            createdAt: '2026-03-12T00:00:00Z',
            author: { login: 'dave' },
            comments: { totalCount: 0, nodes: [] },
            reviews: { totalCount: 2, nodes: [{ createdAt: '2026-03-12T12:00:00Z', author: { login: 'erin' } }] },
          },
          rateLimit: { remaining: 4996, resetAt: '2026-03-31T23:59:59Z' },
        },
        rateLimit: { remaining: 4996, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })

    const result = await analyze({
      repos: ['facebook/react'],
      token: 'ghp_test',
    })

    expect(result.results[0]?.responsivenessMetrics).toMatchObject({
      issueFirstResponseMedianHours: 6,
      issueFirstResponseP90Hours: 6,
      prFirstReviewMedianHours: 12,
      prFirstReviewP90Hours: 12,
      issueResolutionMedianHours: 48,
      issueResolutionP90Hours: 48,
      prMergeMedianHours: 36,
      prMergeP90Hours: 36,
      issueResolutionRate: 0.75,
      contributorResponseRate: 2 / 3,
      botResponseRatio: 0,
      humanResponseRatio: 1,
      staleIssueRatio: 0.2,
      stalePrRatio: 0.25,
      prReviewDepth: 2,
      issuesClosedWithoutCommentRatio: 1,
      openIssueCount: 10,
      openPullRequestCount: 4,
    })
    expect(result.results[0]?.issueFirstResponseTimestamps).toEqual(['2026-03-10T06:00:00Z'])
    expect(result.results[0]?.issueCloseTimestamps).toEqual(['2026-03-05T00:00:00Z'])
    expect(result.results[0]?.prMergeTimestamps).toEqual(['2026-03-02T12:00:00Z'])
  })

  it('isolates a failing repository while still returning successful results for others', async () => {
    queryGitHubGraphQLMock
      // react: overview
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
      // react: activity pass 1
      .mockResolvedValueOnce({
        data: {
          repository: {
            releases: { nodes: [] },
            defaultBranchRef: {
              target: {
                recent30: { totalCount: 7 },
                recent60: { totalCount: 12 },
                recent90: { totalCount: 18 },
                recent180: { totalCount: 30 },
                recent365Commits: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [
                    {
                      authoredDate: '2026-03-30T12:00:00Z',
                      author: { name: 'Alice', email: 'alice@example.com', user: { login: 'alice' } },
                    },
                  ],
                },
              },
            },
          },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      // react: activity pass 2
      .mockResolvedValueOnce({
        data: {
          prsOpened30: { issueCount: 4 }, prsOpened60: { issueCount: 4 }, prsOpened90: { issueCount: 4 }, prsOpened180: { issueCount: 4 }, prsOpened365: { issueCount: 4 },
          prsMerged30: { issueCount: 3 }, prsMerged60: { issueCount: 3 }, prsMerged90: { issueCount: 3 }, prsMerged180: { issueCount: 3 }, prsMerged365: { issueCount: 3 },
          issuesOpened30: { issueCount: 0 }, issuesOpened60: { issueCount: 0 }, issuesOpened90: { issueCount: 0 }, issuesOpened180: { issueCount: 0 }, issuesOpened365: { issueCount: 0 },
          issuesClosed30: { issueCount: 6 }, issuesClosed60: { issueCount: 6 }, issuesClosed90: { issueCount: 6 }, issuesClosed180: { issueCount: 6 }, issuesClosed365: { issueCount: 6 },
          staleIssues30: { issueCount: 0 }, staleIssues60: { issueCount: 0 }, staleIssues90: { issueCount: 0 }, staleIssues180: { issueCount: 0 }, staleIssues365: { issueCount: 0 },
          recentMergedPullRequests: { nodes: [] },
          recentClosedIssues: { nodes: [] },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      // react: responsiveness pass 1
      .mockResolvedValueOnce({
        data: {
          recentCreatedIssues: { nodes: [] },
          recentClosedIssues: { nodes: [] },
          recentCreatedPullRequests: { nodes: [] },
          recentMergedPullRequests: { nodes: [] },
          staleOpenPullRequests30: { issueCount: 0 },
          staleOpenPullRequests60: { issueCount: 0 },
          staleOpenPullRequests90: { issueCount: 0 },
          staleOpenPullRequests180: { issueCount: 0 },
          staleOpenPullRequests365: { issueCount: 0 },
        },
        rateLimit: { remaining: 4997, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      // missing-repo: overview fails
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

  it('keeps contributor metrics unavailable when commit authors cannot be verified', async () => {
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
                recent365Commits: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [{ authoredDate: '2026-03-30T12:00:00Z', author: null }],
                },
              },
            },
          },
          prsOpened: { issueCount: 4 },
          prsMerged: { issueCount: 3 },
          issuesClosed: { issueCount: 6 },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })

    const result = await analyze({
      repos: ['facebook/react'],
      token: 'ghp_test',
    })

    expect(result.results[0]).toMatchObject({
      uniqueCommitAuthors90d: 'unavailable',
      totalContributors: 1742,
      maintainerCount: 4,
      commitCountsByAuthor: 'unavailable',
      commitCountsByExperimentalOrg: 'unavailable',
      experimentalAttributedAuthors90d: 'unavailable',
      experimentalUnattributedAuthors90d: 'unavailable',
    })
  })

  it('falls back to commit-based contributor count when REST API contributor count is unavailable', async () => {
    fetchContributorCountMock.mockResolvedValueOnce({
      data: 'unavailable',
      rateLimit: { remaining: 4997, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
    })

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
                recent365Commits: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [
                    {
                      authoredDate: '2026-03-30T12:00:00Z',
                      author: { name: 'Alice', email: 'alice@example.com', user: { login: 'alice' } },
                    },
                  ],
                },
              },
            },
          },
          prsOpened: { issueCount: 4 },
          prsMerged: { issueCount: 3 },
          issuesClosed: { issueCount: 6 },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })

    const result = await analyze({
      repos: ['facebook/react'],
      token: 'ghp_test',
    })

    expect(result.results[0]).toMatchObject({
      totalContributors: 1,
      totalContributorsSource: 'commit-history',
    })
    expect(result.results[0]?.missingFields).not.toContain('totalContributors')
  })

  it('keeps maintainer count unavailable when no supported maintainer or owner file can be verified', async () => {
    fetchMaintainerCountMock.mockResolvedValueOnce({
      data: { count: 'unavailable', tokens: 'unavailable' },
      rateLimit: { remaining: 4996, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
    })

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
                recent365Commits: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [
                    {
                      authoredDate: '2026-03-30T12:00:00Z',
                      author: { name: 'Alice', email: 'alice@example.com', user: { login: 'alice' } },
                    },
                  ],
                },
              },
            },
          },
          prsOpened: { issueCount: 4 },
          prsMerged: { issueCount: 3 },
          issuesClosed: { issueCount: 6 },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })

    const result = await analyze({
      repos: ['facebook/react'],
      token: 'ghp_test',
    })

    expect(result.results[0]).toMatchObject({
      maintainerCount: 'unavailable',
    })
    expect(result.results[0]?.missingFields).toContain('maintainerCount')
  })

  it('shows Unaffiliated in org metrics when contributors have no public organization', async () => {
    fetchPublicUserOrganizationsMock.mockResolvedValueOnce({
      data: [],
      rateLimit: { remaining: 4995, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
    })

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
                recent365Commits: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [
                    {
                      authoredDate: '2026-03-30T12:00:00Z',
                      author: { name: 'Alice', email: 'alice@example.com', user: { login: 'alice' } },
                    },
                  ],
                },
              },
            },
          },
          prsOpened: { issueCount: 4 },
          prsMerged: { issueCount: 3 },
          issuesClosed: { issueCount: 6 },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })

    const result = await analyze({
      repos: ['facebook/react'],
      token: 'ghp_test',
    })

    expect(result.results[0]).toMatchObject({
      commitCountsByExperimentalOrg: { Unaffiliated: 1 },
    })
  })

  it('degrades experimental org attribution when a user organization lookup fails', async () => {
    fetchPublicUserOrganizationsMock
      .mockResolvedValueOnce({
        data: ['kubernetes'],
        rateLimit: { remaining: 4995, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      .mockRejectedValueOnce(Object.assign(new Error('GitHub REST request failed with status 404'), { status: 404 }))

    queryGitHubGraphQLMock
      .mockResolvedValueOnce({
        data: {
          repository: {
            name: 'kubernetes',
            description: 'Container orchestration',
            createdAt: '2014-06-06T22:40:25Z',
            primaryLanguage: { name: 'Go' },
            stargazerCount: 123,
            forkCount: 45,
            watchers: { totalCount: 6 },
            issues: { totalCount: 7 },
          },
        },
        rateLimit: { remaining: 4999, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })
      .mockResolvedValueOnce({
        data: {
          repository: {
            defaultBranchRef: {
              target: {
                recent30: { totalCount: 2 },
                recent90: { totalCount: 5 },
                recent365Commits: {
                  pageInfo: { hasNextPage: false, endCursor: null },
                  nodes: [
                    {
                      authoredDate: '2026-03-30T12:00:00Z',
                      author: { name: 'Alice', email: 'alice@example.com', user: { login: 'alice' } },
                    },
                    {
                      authoredDate: '2026-03-29T12:00:00Z',
                      author: { name: 'Bob', email: 'bob@example.com', user: { login: 'bob' } },
                    },
                  ],
                },
              },
            },
          },
          prsOpened: { issueCount: 1 },
          prsMerged: { issueCount: 1 },
          issuesClosed: { issueCount: 1 },
        },
        rateLimit: { remaining: 4998, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
      })

    const result = await analyze({
      repos: ['kubernetes/kubernetes'],
      token: 'ghp_test',
    })

    expect(result.failures).toEqual([])
    expect(result.results[0]).toMatchObject({
      repo: 'kubernetes/kubernetes',
      commitCountsByExperimentalOrg: {
        kubernetes: 1,
      },
      experimentalAttributedAuthors90d: 1,
      experimentalUnattributedAuthors90d: 1,
    })
  })
})
