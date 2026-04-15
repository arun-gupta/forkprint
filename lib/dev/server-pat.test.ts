import { describe, expect, it, vi, afterEach } from 'vitest'

vi.mock('server-only', () => ({}))

describe('lib/dev/server-pat', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('getDevPat returns the PAT when NODE_ENV=development and DEV_GITHUB_PAT is set', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DEV_GITHUB_PAT', 'ghp_devpat')
    const { getDevPat } = await import('./server-pat')
    expect(getDevPat()).toBe('ghp_devpat')
  })

  it('getDevPat returns null in development when DEV_GITHUB_PAT is missing', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('DEV_GITHUB_PAT', '')
    const { getDevPat } = await import('./server-pat')
    expect(getDevPat()).toBeNull()
  })

  it('getDevPat returns null in test env (treated as non-dev)', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('DEV_GITHUB_PAT', 'ghp_shouldignore')
    const { getDevPat } = await import('./server-pat')
    expect(getDevPat()).toBeNull()
  })

  it('assertDevPatNotInProduction throws when NODE_ENV=production and DEV_GITHUB_PAT is set', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DEV_GITHUB_PAT', 'ghp_shouldnotexist')
    // Module import triggers the assertion at top level.
    await expect(import('./server-pat')).rejects.toThrow(/DEV_GITHUB_PAT is set with NODE_ENV=production/)
  })

  it('assertDevPatNotInProduction does not throw in production when DEV_GITHUB_PAT is absent', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('DEV_GITHUB_PAT', '')
    await expect(import('./server-pat')).resolves.toBeDefined()
  })
})
