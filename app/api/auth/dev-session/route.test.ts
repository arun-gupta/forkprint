import { afterEach, describe, expect, it } from 'vitest'
import { GET } from './route'

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const ORIGINAL_PAT = process.env.DEV_GITHUB_PAT

function setEnv(nodeEnv: string | undefined, pat: string | undefined) {
  if (nodeEnv === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV
  else (process.env as Record<string, string | undefined>).NODE_ENV = nodeEnv
  if (pat === undefined) delete process.env.DEV_GITHUB_PAT
  else process.env.DEV_GITHUB_PAT = pat
}

describe('GET /api/auth/dev-session', () => {
  afterEach(() => setEnv(ORIGINAL_NODE_ENV, ORIGINAL_PAT))

  it('returns enabled with username when dev fallback is active', async () => {
    setEnv('development', 'ghp_xxx')
    const response = await GET()
    const body = (await response.json()) as { enabled: boolean; username?: string }
    expect(body.enabled).toBe(true)
    expect(body.username).toBe('dev')
  })

  it('returns disabled in production', async () => {
    setEnv('production', undefined)
    const response = await GET()
    const body = (await response.json()) as { enabled: boolean }
    expect(body.enabled).toBe(false)
  })

  it('returns disabled in development without a PAT', async () => {
    setEnv('development', undefined)
    const response = await GET()
    const body = (await response.json()) as { enabled: boolean }
    expect(body.enabled).toBe(false)
  })

  it('never leaks the PAT value in the response body', async () => {
    setEnv('development', 'ghp_super_secret_value_12345')
    const response = await GET()
    const raw = await response.text()
    expect(raw).not.toContain('ghp_super_secret_value_12345')
  })
})
