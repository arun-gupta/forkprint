import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import { analyzeOrgInventory } from '@/lib/analyzer/org-inventory'

vi.mock('@/lib/analyzer/org-inventory', () => ({
  analyzeOrgInventory: vi.fn(),
}))

const analyzeOrgInventoryMock = vi.mocked(analyzeOrgInventory)

describe('POST /api/analyze-org', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.GITHUB_TOKEN
  })

  it('returns org inventory results for a valid request', async () => {
    analyzeOrgInventoryMock.mockResolvedValue({
      org: 'facebook',
      summary: {
        totalPublicRepos: 1,
        totalStars: 100,
        mostStarredRepos: [{ repo: 'facebook/react', stars: 100 }],
        mostRecentlyActiveRepos: [{ repo: 'facebook/react', pushedAt: '2026-04-02T00:00:00Z' }],
        languageDistribution: [{ language: 'TypeScript', repoCount: 1 }],
        archivedRepoCount: 0,
        activeRepoCount: 1,
      },
      results: [],
      rateLimit: null,
      failure: null,
    })

    const request = new Request('http://localhost/api/analyze-org', {
      method: 'POST',
      body: JSON.stringify({
        org: 'facebook',
        token: 'ghp_test',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(analyzeOrgInventoryMock).toHaveBeenCalledWith({
      org: 'facebook',
      token: 'ghp_test',
    })
    expect(body.org).toBe('facebook')
  })

  it('rejects requests without an org', async () => {
    const request = new Request('http://localhost/api/analyze-org', {
      method: 'POST',
      body: JSON.stringify({ token: 'ghp_test' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toEqual({ message: 'A GitHub organization is required.', code: 'INVALID_INPUT' })
  })

  // CON-06: structured error shape for 401
  it('returns structured error shape for missing token (401)', async () => {
    const request = new Request('http://localhost/api/analyze-org', {
      method: 'POST',
      body: JSON.stringify({ org: 'facebook' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toEqual({ message: 'Authentication required.', code: 'UNAUTHENTICATED' })
  })
})
