import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchScorecardData } from '@/lib/security/scorecard-client'

describe('fetchScorecardData', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns parsed scorecard data on success', async () => {
    const mockResponse = {
      score: 7.5,
      repo: { name: 'github.com/test/repo' },
      scorecard: { version: 'v5.0.0' },
      checks: [
        { name: 'Security-Policy', score: 10, reason: 'security policy file detected' },
        { name: 'Code-Review', score: 8, reason: 'found 25/30 approved changesets' },
        { name: 'Branch-Protection', score: -1, reason: 'internal error' },
      ],
    }

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await fetchScorecardData('test', 'repo')

    expect(result).not.toBe('unavailable')
    if (result === 'unavailable') return
    expect(result.overallScore).toBe(7.5)
    expect(result.scorecardVersion).toBe('v5.0.0')
    expect(result.checks).toHaveLength(3)
    expect(result.checks[0]!.name).toBe('Security-Policy')
    expect(result.checks[0]!.score).toBe(10)
    expect(result.checks[2]!.score).toBe(-1)
  })

  it('returns unavailable on 404 (not in dataset)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const result = await fetchScorecardData('small', 'repo')
    expect(result).toBe('unavailable')
  })

  it('returns unavailable on network error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network error'))

    const result = await fetchScorecardData('test', 'repo')
    expect(result).toBe('unavailable')
  })

  it('returns unavailable on timeout', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('AbortError')), 100)),
    )

    const result = await fetchScorecardData('test', 'repo')
    expect(result).toBe('unavailable')
  })

  it('calls the correct API endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    await fetchScorecardData('kubernetes', 'kubernetes')

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.securityscorecards.dev/projects/github.com/kubernetes/kubernetes',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })
})
