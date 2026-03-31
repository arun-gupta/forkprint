import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TOKEN_STORAGE_KEY, clearToken, readToken, writeToken } from './token-storage'

describe('token storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('returns null when no token is stored', () => {
    expect(readToken()).toBeNull()
  })

  it('writes and reads a stored token', () => {
    writeToken('ghp_example')
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('ghp_example')
    expect(readToken()).toBe('ghp_example')
  })

  it('trims whitespace before storing', () => {
    writeToken('  ghp_trimmed  ')
    expect(readToken()).toBe('ghp_trimmed')
  })

  it('clears the token when an empty value is written', () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_existing')
    writeToken('   ')
    expect(readToken()).toBeNull()
  })

  it('clears the stored token when empty whitespace is submitted after a saved value', () => {
    writeToken('ghp_existing')
    writeToken('      ')

    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('removes the stored token explicitly', () => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, 'ghp_existing')
    clearToken()
    expect(readToken()).toBeNull()
  })

  it('returns null when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    expect(readToken()).toBeNull()
  })
})
