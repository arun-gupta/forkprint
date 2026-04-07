import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET } from './route'

const mockCookieGet = vi.fn()
const mockCookieDelete = vi.fn()

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: mockCookieGet,
    delete: mockCookieDelete,
  }),
}))

global.fetch = vi.fn()

describe('GET /api/auth/callback', () => {
  beforeEach(() => {
    vi.stubEnv('GITHUB_CLIENT_ID', 'test_client_id')
    vi.stubEnv('GITHUB_CLIENT_SECRET', 'test_client_secret')
    vi.resetAllMocks()
    mockCookieGet.mockReturnValue({ value: 'valid_state' })
  })

  function makeRequest(params: Record<string, string>) {
    const url = new URL('http://localhost/api/auth/callback')
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    return new Request(url.toString())
  }

  it('redirects to error page when error param is present', async () => {
    const req = makeRequest({ error: 'access_denied', state: 'valid_state' })
    const response = await GET(req)
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('auth_error=access_denied')
  })

  it('redirects to error page when state is missing', async () => {
    mockCookieGet.mockReturnValue(undefined)
    const req = makeRequest({ code: 'abc123', state: 'valid_state' })
    const response = await GET(req)
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('auth_error=invalid_state')
  })

  it('redirects to error page when state does not match', async () => {
    const req = makeRequest({ code: 'abc123', state: 'wrong_state' })
    const response = await GET(req)
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('auth_error=invalid_state')
  })

  it('exchanges code for token and redirects with fragment on success', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'gho_token123' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ login: 'arun-gupta' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    const req = makeRequest({ code: 'abc123', state: 'valid_state' })
    const response = await GET(req)
    expect(response.status).toBe(302)
    const location = response.headers.get('location') ?? ''
    expect(location).toContain('token=gho_token123')
    expect(location).toContain('username=arun-gupta')
    expect(location).toContain('#')
  })

  it('redirects to error page when token exchange fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'bad_verification_code' }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const req = makeRequest({ code: 'bad_code', state: 'valid_state' })
    const response = await GET(req)
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('auth_error=token_exchange_failed')
  })
})
