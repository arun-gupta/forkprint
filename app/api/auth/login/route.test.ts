import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET } from './route'

// Mock Next.js server cookies
vi.mock('next/headers', () => ({
  cookies: () => ({
    set: vi.fn(),
  }),
}))

describe('GET /api/auth/login', () => {
  beforeEach(() => {
    vi.stubEnv('GITHUB_CLIENT_ID', 'test_client_id')
  })

  it('redirects to GitHub authorize URL', async () => {
    const response = await GET()
    expect(response.status).toBe(302)
    const location = response.headers.get('location') ?? ''
    expect(location).toContain('https://github.com/login/oauth/authorize')
    expect(location).toContain('client_id=test_client_id')
    expect(location).toContain('scope=public_repo')
  })

  it('includes a state parameter', async () => {
    const response = await GET()
    const location = response.headers.get('location') ?? ''
    expect(location).toMatch(/state=[a-zA-Z0-9_-]+/)
  })

  it('returns 500 when GITHUB_CLIENT_ID is not configured', async () => {
    vi.stubEnv('GITHUB_CLIENT_ID', '')
    const response = await GET()
    expect(response.status).toBe(500)
  })
})
