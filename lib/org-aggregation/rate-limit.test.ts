import { describe, expect, it } from 'vitest'
import { classifyRateLimitResponse, type RateLimitClassification } from './rate-limit'

function headers(init: Record<string, string>): Headers {
  const h = new Headers()
  for (const [k, v] of Object.entries(init)) h.set(k, v)
  return h
}

describe('classifyRateLimitResponse', () => {
  it('detects primary rate-limit: 403 + x-ratelimit-remaining: 0 + x-ratelimit-reset', () => {
    const resetUnix = Math.floor(Date.now() / 1000) + 300
    const res = { status: 403, headers: headers({
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(resetUnix),
    }) }
    const classification = classifyRateLimitResponse(res)
    expect(classification.kind).toBe('primary')
    expect((classification as Extract<RateLimitClassification, { resumesAt: Date }>).resumesAt.getTime()).toBe(resetUnix * 1000)
  })

  it('detects secondary rate-limit: 429 + Retry-After', () => {
    const now = Date.now()
    const res = { status: 429, headers: headers({ 'Retry-After': '60' }) }
    const classification = classifyRateLimitResponse(res, now)
    expect(classification.kind).toBe('secondary')
    expect((classification as Extract<RateLimitClassification, { resumesAt: Date }>).resumesAt.getTime()).toBe(now + 60_000)
  })

  it('detects secondary rate-limit: 403 + Retry-After (abuse detection path)', () => {
    const now = Date.now()
    const res = { status: 403, headers: headers({ 'Retry-After': '30' }) }
    const classification = classifyRateLimitResponse(res, now)
    expect(classification.kind).toBe('secondary')
    expect((classification as Extract<RateLimitClassification, { resumesAt: Date }>).resumesAt.getTime()).toBe(now + 30_000)
  })

  it('returns `none` for 403 without rate-limit headers (e.g. scope error)', () => {
    const res = { status: 403, headers: headers({}) }
    expect(classifyRateLimitResponse(res).kind).toBe('none')
  })

  it('returns `none` for 2xx success', () => {
    const res = { status: 200, headers: headers({}) }
    expect(classifyRateLimitResponse(res).kind).toBe('none')
  })

  it('returns `none` for 500 (server error is not rate-limit)', () => {
    const res = { status: 500, headers: headers({}) }
    expect(classifyRateLimitResponse(res).kind).toBe('none')
  })

  it('when both headers present, primary wins per research R4', () => {
    const resetUnix = Math.floor(Date.now() / 1000) + 300
    const res = { status: 403, headers: headers({
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(resetUnix),
      'Retry-After': '10',
    }) }
    const classification = classifyRateLimitResponse(res)
    expect(classification.kind).toBe('primary')
    expect((classification as Extract<RateLimitClassification, { resumesAt: Date }>).resumesAt.getTime()).toBe(resetUnix * 1000)
  })

  it('x-ratelimit-remaining > 0 means primary is NOT exhausted', () => {
    const res = { status: 403, headers: headers({
      'x-ratelimit-remaining': '42',
      'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 300),
    }) }
    expect(classifyRateLimitResponse(res).kind).toBe('none')
  })
})
