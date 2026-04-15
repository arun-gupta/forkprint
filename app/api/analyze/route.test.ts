import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import { analyze } from '@/lib/analyzer/analyze'

vi.mock('@/lib/analyzer/analyze', () => ({
  analyze: vi.fn(),
}))

const analyzeMock = vi.mocked(analyze)

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.GITHUB_TOKEN
  })

  it('returns analysis results for a valid request', async () => {
    analyzeMock.mockResolvedValue({
      results: [{ repo: 'facebook/react', name: 'react' } as never],
      failures: [],
      rateLimit: null,
    })

    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: JSON.stringify({
        repos: ['facebook/react'],
        token: 'ghp_test',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(analyzeMock).toHaveBeenCalledWith({
      repos: ['facebook/react'],
      token: 'ghp_test',
    })
    expect(body.results).toHaveLength(1)
  })

  it('returns successes and failures together when some repos cannot be analyzed', async () => {
    analyzeMock.mockResolvedValue({
      results: [{ repo: 'facebook/react', name: 'react' } as never],
      failures: [{ repo: 'facebook/missing-repo', reason: 'Repository could not be analyzed.', code: 'NOT_FOUND' }],
      rateLimit: null,
    })

    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: JSON.stringify({
        repos: ['facebook/react', 'facebook/missing-repo'],
        token: 'ghp_test',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.results).toHaveLength(1)
    expect(body.failures).toEqual([
      { repo: 'facebook/missing-repo', reason: 'Repository could not be analyzed.', code: 'NOT_FOUND' },
    ])
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

    it('uses DEV_GITHUB_PAT in development, overriding the client-supplied token', async () => {
      setEnv('development', 'ghp_dev_pat')
      analyzeMock.mockResolvedValue({ results: [], failures: [], rateLimit: null })

      const request = new Request('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ repos: ['facebook/react'], token: 'client-oauth' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(analyzeMock).toHaveBeenCalledWith({ repos: ['facebook/react'], token: 'ghp_dev_pat' })
    })

    it('succeeds in development + PAT even when client sends no token', async () => {
      setEnv('development', 'ghp_dev_pat')
      analyzeMock.mockResolvedValue({ results: [], failures: [], rateLimit: null })

      const request = new Request('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ repos: ['facebook/react'] }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(analyzeMock).toHaveBeenCalledWith({ repos: ['facebook/react'], token: 'ghp_dev_pat' })
    })

    it('ignores DEV_GITHUB_PAT in production and requires client token', async () => {
      setEnv('production', 'ghp_dev_pat')

      const request = new Request('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ repos: ['facebook/react'] }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
      expect(analyzeMock).not.toHaveBeenCalled()
    })

    it('uses OAuth token when in development without DEV_GITHUB_PAT', async () => {
      setEnv('development', undefined)
      analyzeMock.mockResolvedValue({ results: [], failures: [], rateLimit: null })

      const request = new Request('http://localhost/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ repos: ['facebook/react'], token: 'client-oauth' }),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(analyzeMock).toHaveBeenCalledWith({ repos: ['facebook/react'], token: 'client-oauth' })
    })
  })

  it('passes through analyzer diagnostics for client-side debugging', async () => {
    analyzeMock.mockResolvedValue({
      results: [],
      failures: [],
      rateLimit: null,
      diagnostics: [
        {
          level: 'warn',
          repo: 'facebook/react',
          source: 'github-rest:contributors',
          message: 'GitHub REST request failed with status 403',
          status: 403,
          retryAfter: 'unavailable',
        },
      ],
    })

    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: JSON.stringify({
        repos: ['facebook/react'],
        token: 'ghp_test',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.diagnostics).toEqual([
      {
        level: 'warn',
        repo: 'facebook/react',
        source: 'github-rest:contributors',
        message: 'GitHub REST request failed with status 403',
        status: 403,
        retryAfter: 'unavailable',
      },
    ])
  })
})
