import { describe, expect, it } from 'vitest'
import {
  buildDiagnostic,
  buildFailure,
  collectIssueCloseTimestamps,
  collectIssueFirstResponseTimestamps,
  collectPullRequestMergeTimestamps,
  computeMedian,
  computeMedianDurationHours,
  computeMedianDurationHoursWithinWindow,
  computePercentile,
  computeRatio,
  computeStaleIssueRatio,
  computeStaleItemRatio,
  countReleaseDatesWithinWindow,
  extractRateLimitFromError,
  filterNodesByEndDate,
  filterNodesByStartDate,
  getDurationHours,
  getFirstNonAuthorInteraction,
  getResponseSignal,
  getWindowCutoffTime,
  isBotLogin,
  toAnalyzerError,
} from './analyzer-utils'

describe('toAnalyzerError', () => {
  it('returns empty object for null/primitive', () => {
    expect(toAnalyzerError(null)).toEqual({})
    expect(toAnalyzerError('string')).toEqual({})
    expect(toAnalyzerError(42)).toEqual({})
  })

  it('extracts message, status, retryAfter from error-like object', () => {
    const error = { message: 'rate limited', status: 403, retryAfter: 60 }
    expect(toAnalyzerError(error)).toEqual({ message: 'rate limited', status: 403, retryAfter: 60 })
  })

  it('accepts retryAfter=unavailable', () => {
    const error = { retryAfter: 'unavailable' }
    expect(toAnalyzerError(error).retryAfter).toBe('unavailable')
  })
})

describe('extractRateLimitFromError', () => {
  it('returns null when error has no rate-limit signals', () => {
    expect(extractRateLimitFromError(new Error('not found'))).toBeNull()
  })

  it('returns rate-limit state when status is 403', () => {
    const result = extractRateLimitFromError({ status: 403 })
    expect(result).not.toBeNull()
    expect(result?.limit).toBe('unavailable')
  })

  it('returns rate-limit state when retryAfter is set', () => {
    const result = extractRateLimitFromError({ retryAfter: 120 })
    expect(result?.retryAfter).toBe(120)
  })
})

describe('buildFailure', () => {
  it('maps NOT_FOUND message to NOT_FOUND code', () => {
    const result = buildFailure('owner/repo', { message: 'not found' })
    expect(result.code).toBe('NOT_FOUND')
  })

  it('maps status 401 to UNAUTHORIZED code', () => {
    const result = buildFailure('owner/repo', { status: 401 })
    expect(result.code).toBe('UNAUTHORIZED')
  })

  it('maps status 403 to RATE_LIMITED code', () => {
    const result = buildFailure('owner/repo', { status: 403 })
    expect(result.code).toBe('RATE_LIMITED')
  })

  it('maps unknown error to FETCH_FAILED code', () => {
    const result = buildFailure('owner/repo', { message: 'something unexpected' })
    expect(result.code).toBe('FETCH_FAILED')
  })
})

describe('buildDiagnostic', () => {
  it('defaults to warn level and extracts message', () => {
    const result = buildDiagnostic('owner/repo', 'test-source', { message: 'oops' })
    expect(result.level).toBe('warn')
    expect(result.repo).toBe('owner/repo')
    expect(result.source).toBe('test-source')
    expect(result.message).toBe('oops')
  })

  it('accepts explicit level', () => {
    const result = buildDiagnostic('owner/repo', 'test', new Error('x'), 'error')
    expect(result.level).toBe('error')
  })
})

describe('computeMedian', () => {
  it('returns unavailable for empty array', () => {
    expect(computeMedian([])).toBe('unavailable')
  })

  it('returns middle value for odd-length array', () => {
    expect(computeMedian([3, 1, 2])).toBe(2)
  })

  it('returns average of two middle values for even-length array', () => {
    expect(computeMedian([1, 2, 3, 4])).toBe(2.5)
  })
})

describe('computePercentile', () => {
  it('returns unavailable for empty array', () => {
    expect(computePercentile([], 0.9)).toBe('unavailable')
  })

  it('returns p90 of values', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const p90 = computePercentile(values, 0.9)
    expect(typeof p90).toBe('number')
    expect(p90).toBeGreaterThanOrEqual(9)
  })
})

describe('computeRatio', () => {
  it('returns unavailable when either value is unavailable', () => {
    expect(computeRatio('unavailable', 10)).toBe('unavailable')
    expect(computeRatio(5, 'unavailable')).toBe('unavailable')
  })

  it('returns unavailable when denominator is 0', () => {
    expect(computeRatio(5, 0)).toBe('unavailable')
  })

  it('computes ratio correctly', () => {
    expect(computeRatio(3, 6)).toBe(0.5)
  })
})

describe('computeMedianDurationHours', () => {
  it('returns unavailable when nodes is empty', () => {
    expect(computeMedianDurationHours([], 'closedAt')).toBe('unavailable')
  })

  it('computes median duration', () => {
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()
    const nodes = [
      { createdAt: fourHoursAgo, closedAt: now.toISOString() },
      { createdAt: twoHoursAgo, closedAt: now.toISOString() },
    ]
    const result = computeMedianDurationHours(nodes, 'closedAt')
    expect(typeof result).toBe('number')
    expect(result as number).toBeCloseTo(3, 0)
  })
})

describe('computeMedianDurationHoursWithinWindow', () => {
  it('returns unavailable when no nodes fall within the window', () => {
    const now = new Date()
    const old = new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000)
    const nodes = [{ createdAt: old.toISOString(), closedAt: old.toISOString() }]
    expect(computeMedianDurationHoursWithinWindow(nodes, 'closedAt', now, 30)).toBe('unavailable')
  })
})

describe('isBotLogin', () => {
  it('identifies [bot] suffix', () => {
    expect(isBotLogin('github-actions[bot]')).toBe(true)
  })

  it('identifies -bot suffix', () => {
    expect(isBotLogin('dependabot-bot')).toBe(true)
  })

  it('returns false for human logins', () => {
    expect(isBotLogin('octocat')).toBe(false)
    expect(isBotLogin(null)).toBe(false)
  })
})

describe('getFirstNonAuthorInteraction', () => {
  it('returns null when all interactions are by the author', () => {
    const interactions = [
      { createdAt: '2024-01-01T00:00:00Z', author: { login: 'author' } },
    ]
    expect(getFirstNonAuthorInteraction('author', interactions)).toBeNull()
  })

  it('returns the first non-author interaction sorted by date', () => {
    const interactions = [
      { createdAt: '2024-01-03T00:00:00Z', author: { login: 'responder2' } },
      { createdAt: '2024-01-02T00:00:00Z', author: { login: 'responder1' } },
    ]
    const result = getFirstNonAuthorInteraction('author', interactions)
    expect(result?.author?.login).toBe('responder1')
  })
})

describe('getDurationHours', () => {
  it('returns null when end is null', () => {
    expect(getDurationHours('2024-01-01T00:00:00Z', null)).toBeNull()
  })

  it('returns null when end is before start', () => {
    expect(getDurationHours('2024-01-02T00:00:00Z', '2024-01-01T00:00:00Z')).toBeNull()
  })

  it('computes duration in hours', () => {
    const result = getDurationHours('2024-01-01T00:00:00Z', '2024-01-01T02:00:00Z')
    expect(result).toBe(2)
  })
})

describe('getResponseSignal', () => {
  it('returns null firstResponderKind when no interactions', () => {
    const signal = getResponseSignal('author', [])
    expect(signal?.firstResponderKind).toBeNull()
  })

  it('identifies bot first responder', () => {
    const signal = getResponseSignal('author', [
      { createdAt: '2024-01-01T01:00:00Z', author: { login: 'bot[bot]' } },
    ])
    expect(signal?.firstResponderKind).toBe('bot')
    expect(signal?.firstHumanResponseAt).toBeNull()
  })

  it('identifies human first responder', () => {
    const signal = getResponseSignal('author', [
      { createdAt: '2024-01-01T01:00:00Z', author: { login: 'human-reviewer' } },
    ])
    expect(signal?.firstResponderKind).toBe('human')
    expect(signal?.firstHumanResponseAt).toBe('2024-01-01T01:00:00Z')
  })
})

describe('filterNodesByStartDate', () => {
  it('filters out nodes before the window', () => {
    const now = Date.now()
    const recent = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString()
    const old = new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString()
    const nodes = [{ createdAt: recent }, { createdAt: old }]
    const result = filterNodesByStartDate(nodes, 30)
    expect(result).toHaveLength(1)
    expect(result[0]!.createdAt).toBe(recent)
  })
})

describe('filterNodesByEndDate', () => {
  it('filters nodes by end field within window', () => {
    const now = Date.now()
    const recentClose = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString()
    const oldClose = new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString()
    const nodes = [
      { createdAt: '2024-01-01T00:00:00Z', closedAt: recentClose },
      { createdAt: '2024-01-01T00:00:00Z', closedAt: oldClose },
    ]
    const result = filterNodesByEndDate(nodes, 'closedAt', 30)
    expect(result).toHaveLength(1)
  })
})

describe('getWindowCutoffTime', () => {
  it('returns a timestamp approximately windowDays ago', () => {
    const cutoff = getWindowCutoffTime(30)
    const expected = Date.now() - 30 * 24 * 60 * 60 * 1000
    expect(Math.abs(cutoff - expected)).toBeLessThan(1000)
  })
})

describe('countReleaseDatesWithinWindow', () => {
  it('returns 0 for empty array', () => {
    expect(countReleaseDatesWithinWindow([], new Date(), 30)).toBe(0)
  })

  it('counts releases within window', () => {
    const now = new Date()
    const recent = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const old = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString()
    expect(countReleaseDatesWithinWindow([recent, old], now, 30)).toBe(1)
  })
})

describe('computeStaleIssueRatio', () => {
  it('returns unavailable when inputs are undefined', () => {
    expect(computeStaleIssueRatio(undefined, undefined)).toBe('unavailable')
    expect(computeStaleIssueRatio(5, undefined)).toBe('unavailable')
  })

  it('returns unavailable when openIssueCount is 0', () => {
    expect(computeStaleIssueRatio(5, 0)).toBe('unavailable')
  })

  it('computes ratio', () => {
    expect(computeStaleIssueRatio(3, 10)).toBe(0.3)
  })
})

describe('computeStaleItemRatio', () => {
  it('computes ratio', () => {
    expect(computeStaleItemRatio(2, 5)).toBe(0.4)
  })
})

describe('collectIssueFirstResponseTimestamps', () => {
  it('returns unavailable when no responses exist', () => {
    const now = Date.now()
    const issues = [
      {
        createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
        author: { login: 'opener' },
        comments: { totalCount: 0, nodes: [] },
      },
    ]
    expect(collectIssueFirstResponseTimestamps(issues, 30)).toBe('unavailable')
  })

  it('collects first response timestamps within window', () => {
    const now = Date.now()
    const createdAt = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString()
    const responseAt = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString()
    const issues = [
      {
        createdAt,
        author: { login: 'opener' },
        comments: {
          totalCount: 1,
          nodes: [{ createdAt: responseAt, author: { login: 'responder' } }],
        },
      },
    ]
    const result = collectIssueFirstResponseTimestamps(issues, 30)
    expect(Array.isArray(result)).toBe(true)
    expect((result as string[])[0]).toBe(responseAt)
  })
})

describe('collectIssueCloseTimestamps', () => {
  it('returns unavailable when no closed issues in window', () => {
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString()
    const issues = [{ createdAt: old, closedAt: old, author: null, comments: { totalCount: 0, nodes: [] } }]
    expect(collectIssueCloseTimestamps(issues, 30)).toBe('unavailable')
  })
})

describe('collectPullRequestMergeTimestamps', () => {
  it('collects merge timestamps within window', () => {
    const now = Date.now()
    const mergedAt = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString()
    const prs = [{ createdAt: mergedAt, mergedAt }]
    const result = collectPullRequestMergeTimestamps(prs, 30)
    expect(Array.isArray(result)).toBe(true)
  })
})
