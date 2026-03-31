import { beforeEach, describe, expect, it, vi } from 'vitest'
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
})
