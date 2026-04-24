import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST, MAX_REPOS_PER_REQUEST } from './route'
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

  // CON-05: upper-bound on repo count
  it('returns 400 with structured error when repos list exceeds MAX_REPOS_PER_REQUEST', async () => {
    const tooManyRepos = Array.from({ length: MAX_REPOS_PER_REQUEST + 1 }, (_, i) => `owner/repo-${i}`)

    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ repos: tooManyRepos, token: 'ghp_test' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toEqual({
      message: expect.stringContaining(String(MAX_REPOS_PER_REQUEST)),
      code: 'TOO_MANY_REPOS',
    })
    expect(analyzeMock).not.toHaveBeenCalled()
  })

  it('allows exactly MAX_REPOS_PER_REQUEST repos without rejecting', async () => {
    const atLimit = Array.from({ length: MAX_REPOS_PER_REQUEST }, (_, i) => `owner/repo-${i}`)
    analyzeMock.mockResolvedValue({ results: [], failures: [], rateLimit: null })

    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ repos: atLimit, token: 'ghp_test' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  // NEW-01: server-side slug validation
  it('returns 400 with structured error for a slug missing the owner (leading slash)', async () => {
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ repos: ['/react'], token: 'ghp_test' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toEqual({
      message: expect.stringContaining('/react'),
      code: 'INVALID_SLUG',
    })
    expect(analyzeMock).not.toHaveBeenCalled()
  })

  it('returns 400 for a slug with no slash at all', async () => {
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ repos: ['react'], token: 'ghp_test' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('INVALID_SLUG')
    expect(analyzeMock).not.toHaveBeenCalled()
  })

  it('returns 400 when at least one slug in a mixed list is invalid', async () => {
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ repos: ['facebook/react', '/invalid'], token: 'ghp_test' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('INVALID_SLUG')
    expect(analyzeMock).not.toHaveBeenCalled()
  })

  // CON-06: structured error shape for all 4xx/5xx responses
  it('returns structured error shape for empty repos (400)', async () => {
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ repos: [], token: 'ghp_test' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toEqual(
      expect.objectContaining({ message: expect.any(String), code: expect.any(String) }),
    )
  })

  it('returns structured error shape for missing token (401)', async () => {
    const request = new Request('http://localhost/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ repos: ['facebook/react'] }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toEqual({ message: 'Authentication required.', code: 'UNAUTHENTICATED' })
  })
})
