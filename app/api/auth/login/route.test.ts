import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// Mock Next.js server cookies
vi.mock('next/headers', () => ({
  cookies: () => ({
    set: vi.fn(),
  }),
}))

// Mock server-only sentinel (would otherwise throw in a unit-test context)
vi.mock('server-only', () => ({}))

// Import AFTER mocks so the module-level `assertDevPatNotInProduction` runs
// against our default env (development, no PAT).
vi.stubEnv('NODE_ENV', 'development')
vi.stubEnv('DEV_GITHUB_PAT', '')
const { GET } = await import('./route')

function mockRequest(url = 'http://localhost:3010/api/auth/login'): Request {
  return new Request(url)
}

describe('GET /api/auth/login', () => {
  beforeEach(() => {
    vi.stubEnv('GITHUB_CLIENT_ID', 'test_client_id')
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DEV_GITHUB_PAT', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('redirects to GitHub authorize URL when no dev PAT is set', async () => {
    const response = await GET(mockRequest())
    expect(response.status).toBe(302)
    const location = response.headers.get('location') ?? ''
    expect(location).toContain('https://github.com/login/oauth/authorize')
    expect(location).toContain('client_id=test_client_id')
    expect(location).toContain('scope=public_repo')
  })

  it('includes a state parameter', async () => {
    const response = await GET(mockRequest())
    const location = response.headers.get('location') ?? ''
    expect(location).toMatch(/state=[a-zA-Z0-9_-]+/)
  })

  it('returns 500 when GITHUB_CLIENT_ID is not configured (and no dev PAT)', async () => {
    vi.stubEnv('GITHUB_CLIENT_ID', '')
    const response = await GET(mockRequest())
    expect(response.status).toBe(500)
  })

  it('short-circuits OAuth when DEV_GITHUB_PAT is set in development', async () => {
    vi.stubEnv('DEV_GITHUB_PAT', 'ghp_devtesttoken')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ login: 'dev-user' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(mockRequest())
    expect(response.status).toBe(302)
    const location = response.headers.get('location') ?? ''
    expect(location).not.toContain('github.com/login/oauth/authorize')
    expect(location).toContain('#token=ghp_devtesttoken')
    expect(location).toContain('username=dev-user')

    // Verifies the server fetched /user with the PAT
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer ghp_devtesttoken' }),
      }),
    )
  })

  it('returns 500 when DEV_GITHUB_PAT is set but GitHub rejects it', async () => {
    vi.stubEnv('DEV_GITHUB_PAT', 'ghp_invalid')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Bad credentials', { status: 401 })),
    )
    const response = await GET(mockRequest())
    expect(response.status).toBe(500)
    const body = (await response.json()) as { error: string }
    expect(body.error).toMatch(/rejected by GitHub/i)
  })

  it('ignores DEV_GITHUB_PAT in production (falls back to OAuth path)', async () => {
    // Note: can't set NODE_ENV=production here without tripping the
    // module-level assertDevPatNotInProduction that ran at import time.
    // This test covers the getDevPat runtime guard only. The boot assertion
    // has its own dedicated test file (server-pat.test.ts).
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('DEV_GITHUB_PAT', 'ghp_prodshouldignore')
    const response = await GET(mockRequest())
    expect(response.status).toBe(302)
    const location = response.headers.get('location') ?? ''
    expect(location).toContain('github.com/login/oauth/authorize')
  })

  it('requests public_repo scope only on the baseline path (no ?elevated=1)', async () => {
    const response = await GET(mockRequest('http://localhost:3010/api/auth/login'))
    const location = response.headers.get('location') ?? ''
    const scopeMatch = location.match(/scope=([^&]+)/)
    expect(scopeMatch).not.toBeNull()
    const scope = decodeURIComponent(scopeMatch![1]!)
    expect(scope).toBe('public_repo')
  })

  it('adds read:org scope when ?elevated=1 is passed (legacy alias for scope_tier=read-org)', async () => {
    const response = await GET(mockRequest('http://localhost:3010/api/auth/login?elevated=1'))
    const location = response.headers.get('location') ?? ''
    const scopeMatch = location.match(/scope=([^&]+)/)
    expect(scopeMatch).not.toBeNull()
    const scope = decodeURIComponent(scopeMatch![1]!).replace(/\+/g, ' ')
    expect(scope).toBe('public_repo read:org')
  })

  it('treats ?elevated=0 as baseline', async () => {
    const response = await GET(mockRequest('http://localhost:3010/api/auth/login?elevated=0'))
    const location = response.headers.get('location') ?? ''
    const scope = decodeURIComponent(location.match(/scope=([^&]+)/)![1]!).replace(/\+/g, ' ')
    expect(scope).toBe('public_repo')
  })

  it('adds read:org scope when ?scope_tier=read-org is passed', async () => {
    const response = await GET(mockRequest('http://localhost:3010/api/auth/login?scope_tier=read-org'))
    const location = response.headers.get('location') ?? ''
    const scope = decodeURIComponent(location.match(/scope=([^&]+)/)![1]!).replace(/\+/g, ' ')
    expect(scope).toBe('public_repo read:org')
  })

  it('adds admin:org scope when ?scope_tier=admin-org is passed (no need to also include read:org — admin:org is a superset)', async () => {
    const response = await GET(mockRequest('http://localhost:3010/api/auth/login?scope_tier=admin-org'))
    const location = response.headers.get('location') ?? ''
    const scope = decodeURIComponent(location.match(/scope=([^&]+)/)![1]!).replace(/\+/g, ' ')
    expect(scope).toBe('public_repo admin:org')
  })

  it('treats ?scope_tier=baseline as baseline', async () => {
    const response = await GET(mockRequest('http://localhost:3010/api/auth/login?scope_tier=baseline'))
    const location = response.headers.get('location') ?? ''
    const scope = decodeURIComponent(location.match(/scope=([^&]+)/)![1]!).replace(/\+/g, ' ')
    expect(scope).toBe('public_repo')
  })

  it('prefers scope_tier over the legacy elevated flag when both are present', async () => {
    const response = await GET(mockRequest('http://localhost:3010/api/auth/login?elevated=1&scope_tier=admin-org'))
    const location = response.headers.get('location') ?? ''
    const scope = decodeURIComponent(location.match(/scope=([^&]+)/)![1]!).replace(/\+/g, ' ')
    expect(scope).toBe('public_repo admin:org')
  })

  it('dev-PAT session reports the PAT\'s real scopes from X-OAuth-Scopes, not the requested tier', async () => {
    vi.stubEnv('DEV_GITHUB_PAT', 'ghp_devtesttoken')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ login: 'dev-user' }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            // PAT actually has only public_repo + read:org, even though the
            // user asked for admin-org below — the session should reflect
            // reality, not the request.
            'x-oauth-scopes': 'public_repo, read:org',
          },
        }),
      ),
    )

    const response = await GET(mockRequest('http://localhost:3010/api/auth/login?scope_tier=admin-org'))
    const location = response.headers.get('location') ?? ''
    const decoded = decodeURIComponent(location)
    expect(decoded).toContain('scopes=public_repo read:org')
    expect(decoded).not.toContain('admin:org')
  })

  it('dev-PAT falls back to the requested tier when X-OAuth-Scopes is absent (fine-grained PATs do not report it)', async () => {
    vi.stubEnv('DEV_GITHUB_PAT', 'github_pat_finegrained')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ login: 'dev-user' }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            // No x-oauth-scopes header — fine-grained PATs omit it.
          },
        }),
      ),
    )

    const response = await GET(mockRequest('http://localhost:3010/api/auth/login?scope_tier=admin-org'))
    const location = response.headers.get('location') ?? ''
    expect(decodeURIComponent(location)).toContain('scopes=public_repo admin:org')
  })

  it('dev-PAT treats an empty X-OAuth-Scopes header (legacy GitHub responses) as absent', async () => {
    vi.stubEnv('DEV_GITHUB_PAT', 'ghp_test')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ login: 'dev-user' }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-oauth-scopes': '',
          },
        }),
      ),
    )

    const response = await GET(mockRequest('http://localhost:3010/api/auth/login?scope_tier=read-org'))
    const location = response.headers.get('location') ?? ''
    expect(decodeURIComponent(location)).toContain('scopes=public_repo read:org')
  })
})
