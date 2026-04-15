import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { assertDevPatNotInProduction, isDevPatActive, resolveServerToken } from './dev-pat'

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const ORIGINAL_PAT = process.env.DEV_GITHUB_PAT

function setEnv(nodeEnv: string | undefined, pat: string | undefined) {
  if (nodeEnv === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV
  else (process.env as Record<string, string | undefined>).NODE_ENV = nodeEnv
  if (pat === undefined) delete process.env.DEV_GITHUB_PAT
  else process.env.DEV_GITHUB_PAT = pat
}

describe('isDevPatActive', () => {
  afterEach(() => setEnv(ORIGINAL_NODE_ENV, ORIGINAL_PAT))

  it('returns true in development with a non-empty PAT', () => {
    setEnv('development', 'ghp_xxx')
    expect(isDevPatActive()).toBe(true)
  })

  it('returns false when PAT is empty string', () => {
    setEnv('development', '')
    expect(isDevPatActive()).toBe(false)
  })

  it('returns false when PAT is unset', () => {
    setEnv('development', undefined)
    expect(isDevPatActive()).toBe(false)
  })

  it('returns false in production even with a PAT', () => {
    setEnv('production', 'ghp_xxx')
    expect(isDevPatActive()).toBe(false)
  })

  it('returns false in test env even with a PAT', () => {
    setEnv('test', 'ghp_xxx')
    expect(isDevPatActive()).toBe(false)
  })
})

describe('resolveServerToken', () => {
  afterEach(() => setEnv(ORIGINAL_NODE_ENV, ORIGINAL_PAT))

  it('returns PAT when dev fallback is active, ignoring client token', () => {
    setEnv('development', 'ghp_dev')
    expect(resolveServerToken('client-oauth-token')).toBe('ghp_dev')
    expect(resolveServerToken(null)).toBe('ghp_dev')
  })

  it('returns client token when fallback is inactive', () => {
    setEnv('production', undefined)
    expect(resolveServerToken('client-oauth-token')).toBe('client-oauth-token')
  })

  it('returns null when fallback is inactive and no client token', () => {
    setEnv('production', undefined)
    expect(resolveServerToken(null)).toBeNull()
    expect(resolveServerToken(undefined)).toBeNull()
  })

  it('returns client token in dev when PAT is not set', () => {
    setEnv('development', undefined)
    expect(resolveServerToken('client-oauth-token')).toBe('client-oauth-token')
  })
})

describe('assertDevPatNotInProduction', () => {
  afterEach(() => setEnv(ORIGINAL_NODE_ENV, ORIGINAL_PAT))

  it('throws when production + PAT set', () => {
    setEnv('production', 'ghp_xxx')
    expect(() => assertDevPatNotInProduction()).toThrow(/DEV_GITHUB_PAT.*production/i)
  })

  it('does not throw when production and PAT unset', () => {
    setEnv('production', undefined)
    expect(() => assertDevPatNotInProduction()).not.toThrow()
  })

  it('does not throw in development with PAT set', () => {
    setEnv('development', 'ghp_xxx')
    expect(() => assertDevPatNotInProduction()).not.toThrow()
  })
})

beforeEach(() => {
  // sanity restore
  setEnv(ORIGINAL_NODE_ENV, ORIGINAL_PAT)
})
