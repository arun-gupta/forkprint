import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'
import { fetchCNCFLandscape } from '@/lib/cncf-sandbox/landscape'

vi.mock('@/lib/cncf-sandbox/landscape', () => ({
  fetchCNCFLandscape: vi.fn(),
}))

const landscapeMock = vi.mocked(fetchCNCFLandscape)

describe('GET /api/cncf-landscape', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty repoStatuses when landscape fetch returns null', async () => {
    landscapeMock.mockResolvedValue(null)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.repoStatuses).toEqual({})
  })

  it('returns empty repoStatuses when landscape fetch throws', async () => {
    landscapeMock.mockRejectedValue(new Error('network error'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.repoStatuses).toEqual({})
  })

  it('maps repo URLs to their project status', async () => {
    landscapeMock.mockResolvedValue({
      repoUrls: new Set([
        'https://github.com/kubernetes/kubernetes',
        'https://github.com/prometheus/prometheus',
      ]),
      homepageUrls: new Set<string>(),
      fetchedAt: Date.now(),
      categories: [],
      projectStatusMap: new Map<string, 'graduated' | 'incubating' | 'sandbox'>([
        ['https://github.com/kubernetes/kubernetes', 'graduated'],
        ['https://github.com/prometheus/prometheus', 'graduated'],
      ]),
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.repoStatuses['https://github.com/kubernetes/kubernetes']).toBe('graduated')
    expect(body.repoStatuses['https://github.com/prometheus/prometheus']).toBe('graduated')
  })

  it('falls back to "landscape" status for URLs not in the project status map', async () => {
    landscapeMock.mockResolvedValue({
      repoUrls: new Set(['https://github.com/example/repo']),
      homepageUrls: new Set<string>(),
      fetchedAt: Date.now(),
      categories: [],
      projectStatusMap: new Map<string, 'graduated' | 'incubating' | 'sandbox'>(),
    })

    const response = await GET()
    const body = await response.json()

    expect(body.repoStatuses['https://github.com/example/repo']).toBe('landscape')
  })
})
