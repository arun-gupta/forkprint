import { describe, expect, it } from 'vitest'
import { toAnalyzerError } from './analyze'

describe('toAnalyzerError', () => {
  it('extracts message, status, and retryAfter from a plain Error object', () => {
    const err = Object.assign(new Error('not found'), { status: 404 })
    const result = toAnalyzerError(err)
    expect(result.message).toBe('not found')
    expect(result.status).toBe(404)
    expect(result.retryAfter).toBeUndefined()
  })

  it('extracts retryAfter when it is a number', () => {
    const err = Object.assign(new Error('rate limit'), { status: 403, retryAfter: 60 })
    const result = toAnalyzerError(err)
    expect(result.retryAfter).toBe(60)
  })

  it('extracts retryAfter when it is the "unavailable" sentinel', () => {
    const err = Object.assign(new Error('rate limit'), { status: 403, retryAfter: 'unavailable' })
    const result = toAnalyzerError(err)
    expect(result.retryAfter).toBe('unavailable')
  })

  it('returns empty object for a thrown string', () => {
    const result = toAnalyzerError('something went wrong')
    expect(result).toEqual({})
  })

  it('returns empty object for null', () => {
    expect(toAnalyzerError(null)).toEqual({})
  })

  it('returns empty object for undefined', () => {
    expect(toAnalyzerError(undefined)).toEqual({})
  })

  it('returns empty object for a thrown number', () => {
    expect(toAnalyzerError(42)).toEqual({})
  })

  it('extracts fields from a plain object (non-Error throw)', () => {
    const result = toAnalyzerError({ message: 'custom error', status: 401 })
    expect(result.message).toBe('custom error')
    expect(result.status).toBe(401)
  })

  it('ignores status when it is not a number', () => {
    const result = toAnalyzerError({ status: 'forbidden' })
    expect(result.status).toBeUndefined()
  })

  it('ignores retryAfter when it is an unexpected type', () => {
    const result = toAnalyzerError({ retryAfter: true })
    expect(result.retryAfter).toBeUndefined()
  })
})
