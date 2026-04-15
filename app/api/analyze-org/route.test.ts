import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  describe('dev-only PAT fallback (Issue #207)', () => {
    const ORIGINAL_NODE_ENV = process.env.NODE_ENV
    const ORIGINAL_PAT = process.env.DEV_GITHUB_PAT

    function setEnv(nodeEnv: string | undefined, pat: string | undefined) {
      if (nodeEnv === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV
      else (process.env as Record<string, string | undefined>).NODE_ENV = nodeEnv
      if (pat === undefined) delete process.env.DEV_GITHUB_PAT
      else process.env.DEV_GITHUB_PAT = pat
    }

    afterEach(() => setEnv(ORIGINAL_NODE_ENV, ORIGINAL_PAT))

    it('uses DEV_GITHUB_PAT in development, overriding client token', async () => {
      setEnv('development', 'ghp_dev_pat')
      analyzeOrgInventoryMock.mockResolvedValue({
        org: 'facebook',
        summary: {
          totalPublicRepos: 0,
          totalStars: 0,
          mostStarredRepos: [],
          mostRecentlyActiveRepos: [],
          languageDistribution: [],
          archivedRepoCount: 0,
          activeRepoCount: 0,
        },
        results: [],
        rateLimit: null,
        failure: null,
      })

      const request = new Request('http://localhost/api/analyze-org', {
        method: 'POST',
        body: JSON.stringify({ org: 'facebook', token: 'client-oauth' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(analyzeOrgInventoryMock).toHaveBeenCalledWith({ org: 'facebook', token: 'ghp_dev_pat' })
    })

    it('returns 401 in production when client token missing (PAT ignored)', async () => {
      setEnv('production', 'ghp_dev_pat')
      const request = new Request('http://localhost/api/analyze-org', {
        method: 'POST',
        body: JSON.stringify({ org: 'facebook' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })

  it('rejects requests without an org', async () => {
    const request = new Request('http://localhost/api/analyze-org', {
      method: 'POST',
      body: JSON.stringify({ token: 'ghp_test' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
