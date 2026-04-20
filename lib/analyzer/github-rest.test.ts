import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchMaintainerCount,
  fetchOrgAdmins,
  fetchOrgTwoFactorRequirement,
  fetchUserLatestOrgCommit,
  fetchUserOrgMembership,
  fetchUserPublicEvents,
} from './github-rest'

describe('fetchMaintainerCount', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('dedupes maintainers across supported owner and maintainer files', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input)

      if (url.endsWith('/OWNERS')) {
        return buildJsonResponse({
          content: Buffer.from('approvers:\n- alice\n- bob\nreviewers:\n- carol\n').toString('base64'),
          encoding: 'base64',
        })
      }

      if (url.endsWith('/.github/CODEOWNERS')) {
        return buildJsonResponse({
          content: Buffer.from('* @alice @dave\n/docs @eve\n').toString('base64'),
          encoding: 'base64',
        })
      }

      if (url.endsWith('/GOVERNANCE.md')) {
        return buildJsonResponse({
          content: Buffer.from('Maintainers: @frank and @alice\n').toString('base64'),
          encoding: 'base64',
        })
      }

      return new Response(null, { status: 404 })
    })

    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMaintainerCount('ghp_test', 'kubernetes', 'kubernetes')

    expect(result.data.count).toBe(6)
    expect(Array.isArray(result.data.tokens)).toBe(true)
    const tokens = result.data.tokens as { token: string; kind: 'user' | 'team' }[]
    expect(tokens.map((t) => t.token).sort()).toEqual(['alice', 'bob', 'carol', 'dave', 'eve', 'frank'])
    expect(tokens.every((t) => t.kind === 'user')).toBe(true)
  })

  it('returns unavailable when no supported file can be parsed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(null, { status: 404 })
      }),
    )

    const result = await fetchMaintainerCount('ghp_test', 'facebook', 'react')

    expect(result.data.count).toBe('unavailable')
    expect(result.data.tokens).toBe('unavailable')
  })

  it('parses bare usernames from a generic MAINTAINERS file', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input)

      if (url.endsWith('/MAINTAINERS')) {
        return buildJsonResponse({
          content: Buffer.from('acdlite eps1lon EugeneChoi4 gaearon\n').toString('base64'),
          encoding: 'base64',
        })
      }

      return new Response(null, { status: 404 })
    })

    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMaintainerCount('ghp_test', 'facebook', 'react')

    expect(result.data.count).toBe(4)
  })

  it('classifies @org/team handles as team kind without expanding them', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.endsWith('/.github/CODEOWNERS')) {
        return buildJsonResponse({
          content: Buffer.from('* @kubernetes/sig-node @alice\n').toString('base64'),
          encoding: 'base64',
        })
      }
      return new Response(null, { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchMaintainerCount('ghp_test', 'kubernetes', 'kubernetes')
    expect(result.data.count).toBe(2)
    const tokens = result.data.tokens as { token: string; kind: 'user' | 'team' }[]
    const sorted = [...tokens].sort((a, b) => a.token.localeCompare(b.token))
    expect(sorted).toEqual([
      { token: 'alice', kind: 'user' },
      { token: 'kubernetes/sig-node', kind: 'team' },
    ])
  })
})

function buildJsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': '4990',
      'X-RateLimit-Reset': '1775100000',
    },
  })
}

function buildPageResponse(body: unknown, opts: { linkHeader?: string | null } = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-RateLimit-Remaining': '4990',
    'X-RateLimit-Reset': '1775100000',
  }
  if (opts.linkHeader) headers['Link'] = opts.linkHeader
  return new Response(JSON.stringify(body), { status: 200, headers })
}

function buildRateLimitedResponse() {
  return new Response('rate limited', {
    status: 403,
    headers: {
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '1775100000',
    },
  })
}

describe('fetchOrgAdmins', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends the admin-role query with bearer auth and a large page size', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input)
      expect(url).toContain('/orgs/kubernetes/members')
      expect(url).toContain('role=admin')
      expect(url).toContain('per_page=100')
      return buildPageResponse([{ login: 'alice' }])
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchOrgAdmins('ghp_test', 'kubernetes')

    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.admins.map((a) => a.login)).toEqual(['alice'])
    }
    const callArgs = fetchMock.mock.calls[0]
    expect(callArgs).toBeDefined()
    const init = callArgs![1] as RequestInit | undefined
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer ghp_test' })
  })

  it('follows Link: rel="next" across pages and concatenates admins (no silent truncation)', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.endsWith('&page=2')) {
        return buildPageResponse([{ login: 'bob' }, { login: 'carol' }])
      }
      return buildPageResponse([{ login: 'alice' }], {
        linkHeader:
          '<https://api.github.com/orgs/x/members?role=admin&per_page=100&page=2>; rel="next", <https://api.github.com/orgs/x/members?role=admin&per_page=100&page=2>; rel="last"',
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchOrgAdmins('ghp_test', 'x')

    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.admins.map((a) => a.login)).toEqual(['alice', 'bob', 'carol'])
    }
  })

  it('maps 403 + X-RateLimit-Remaining: 0 to kind rate-limited', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildRateLimitedResponse()))

    const result = await fetchOrgAdmins('ghp_test', 'x')

    expect(result.kind).toBe('rate-limited')
  })

  it('maps 401 to kind auth-failed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unauthorized', { status: 401 })))

    const result = await fetchOrgAdmins('ghp_test', 'x')

    expect(result.kind).toBe('auth-failed')
  })

  it('maps 404 to kind unknown', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('not found', { status: 404 })))

    const result = await fetchOrgAdmins('ghp_test', 'x')

    expect(result.kind).toBe('unknown')
  })

  it('maps a thrown fetch error to kind network', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('boom')
      }),
    )

    const result = await fetchOrgAdmins('ghp_test', 'x')

    expect(result.kind).toBe('network')
  })
})

describe('fetchUserPublicEvents', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns the created_at of the most recent event', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        buildPageResponse([
          { created_at: '2026-04-10T12:00:00Z' },
          { created_at: '2026-03-10T12:00:00Z' },
        ]),
      ),
    )

    const result = await fetchUserPublicEvents('ghp_test', 'alice')

    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.lastActivityAt).toBe('2026-04-10T12:00:00Z')
    }
  })

  it('returns null last-activity when the events array is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildPageResponse([])))

    const result = await fetchUserPublicEvents('ghp_test', 'alice')

    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.lastActivityAt).toBeNull()
    }
  })

  it('maps 404 to admin-account-404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    expect((await fetchUserPublicEvents('t', 'ghost')).kind).toBe('admin-account-404')
  })

  it('maps 403+rate-limit to rate-limited', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildRateLimitedResponse()))
    expect((await fetchUserPublicEvents('t', 'alice')).kind).toBe('rate-limited')
  })

  it('maps other failures to events-fetch-failed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    expect((await fetchUserPublicEvents('t', 'alice')).kind).toBe('events-fetch-failed')
  })
})

describe('fetchUserLatestOrgCommit', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns the most recent commit date from /search/commits', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input)
      expect(url).toContain('/search/commits')
      expect(url).toContain('author%3Aalice')
      expect(url).toContain('org%3Akubernetes')
      return buildPageResponse({
        total_count: 1,
        items: [{ commit: { author: { date: '2025-12-01T08:00:00Z' } } }],
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchUserLatestOrgCommit('t', 'alice', 'kubernetes')

    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.lastActivityAt).toBe('2025-12-01T08:00:00Z')
    }
  })

  it('returns null last-activity when total_count is zero', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildPageResponse({ total_count: 0, items: [] })))

    const result = await fetchUserLatestOrgCommit('t', 'alice', 'kubernetes')

    expect(result.kind).toBe('ok')
    if (result.kind === 'ok') {
      expect(result.lastActivityAt).toBeNull()
    }
  })

  it('maps 403+rate-limit to rate-limited after one retry', async () => {
    const fetchMock = vi.fn(async () => buildRateLimitedResponse())
    vi.stubGlobal('fetch', fetchMock)
    const sleep = vi.fn(async () => {})
    const result = await fetchUserLatestOrgCommit('t', 'alice', 'x', { sleep })
    expect(result.kind).toBe('rate-limited')
    // One initial attempt + one retry attempt = 2 fetches, 1 sleep.
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledTimes(1)
  })

  it('retries after a transient rate-limit and succeeds on the second attempt', async () => {
    let call = 0
    const fetchMock = vi.fn(async () => {
      call++
      if (call === 1) return buildRateLimitedResponse()
      return buildPageResponse({
        total_count: 1,
        items: [{ commit: { author: { date: '2026-01-01T00:00:00Z' } } }],
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const sleep = vi.fn(async () => {})

    const result = await fetchUserLatestOrgCommit('t', 'alice', 'x', { sleep })

    expect(result).toEqual({ kind: 'ok', lastActivityAt: '2026-01-01T00:00:00Z' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledTimes(1)
  })

  it('treats 403 with Retry-After header (no X-RateLimit-Remaining: 0) as rate-limited', async () => {
    const fetchMock = vi.fn(async () =>
      new Response('', {
        status: 403,
        headers: { 'Retry-After': '1' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const sleep = vi.fn(async () => {})

    const result = await fetchUserLatestOrgCommit('t', 'alice', 'x', { sleep })
    expect(result.kind).toBe('rate-limited')
    // Retry-After=1 second → bounded ≤3000ms.
    expect(sleep).toHaveBeenCalledWith(1000)
  })

  it('caps the retry wait at 3000ms even when Retry-After is larger', async () => {
    const fetchMock = vi.fn(async () =>
      new Response('', {
        status: 403,
        headers: { 'Retry-After': '60' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const sleep = vi.fn(async () => {})

    await fetchUserLatestOrgCommit('t', 'alice', 'x', { sleep })
    expect(sleep).toHaveBeenCalledWith(3000)
  })

  it('populates retryAvailableAt from Retry-After when rate-limited', async () => {
    const nowMs = Date.parse('2026-04-16T00:00:00Z')
    vi.setSystemTime(new Date(nowMs))

    const fetchMock = vi.fn(async () =>
      new Response('', {
        status: 403,
        headers: { 'X-RateLimit-Remaining': '0', 'Retry-After': '45' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchUserLatestOrgCommit('t', 'alice', 'x', { sleep: async () => {} })
    expect(result.kind).toBe('rate-limited')
    if (result.kind === 'rate-limited') {
      expect(result.retryAvailableAt).toBe(new Date(nowMs + 45_000).toISOString())
    }

    vi.useRealTimers()
  })

  it('falls back to X-RateLimit-Reset when Retry-After is absent', async () => {
    const resetEpoch = Math.floor(Date.parse('2026-04-16T00:05:00Z') / 1000)
    const fetchMock = vi.fn(async () =>
      new Response('', {
        status: 403,
        headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': String(resetEpoch) },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchUserLatestOrgCommit('t', 'alice', 'x', { sleep: async () => {} })
    expect(result.kind).toBe('rate-limited')
    if (result.kind === 'rate-limited') {
      expect(result.retryAvailableAt).toBe(new Date(resetEpoch * 1000).toISOString())
    }
  })

  it('returns retryAvailableAt=null when neither header is present', async () => {
    const fetchMock = vi.fn(async () =>
      new Response('', { status: 403, headers: { 'X-RateLimit-Remaining': '0' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchUserLatestOrgCommit('t', 'alice', 'x', { sleep: async () => {} })
    expect(result.kind).toBe('rate-limited')
    if (result.kind === 'rate-limited') {
      expect(result.retryAvailableAt).toBeNull()
    }
  })

  it('detects secondary rate-limit by body message when headers do not match', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          message: 'You have exceeded a secondary rate limit. Please wait a few minutes.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const sleep = vi.fn(async () => {})

    const result = await fetchUserLatestOrgCommit('t', 'alice', 'x', { sleep })
    expect(result.kind).toBe('rate-limited')
    expect(sleep).toHaveBeenCalledTimes(1)
  })

  it('maps true 4xx/5xx errors to commit-search-failed without retrying', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 422 }))
    vi.stubGlobal('fetch', fetchMock)
    const sleep = vi.fn(async () => {})

    const result = await fetchUserLatestOrgCommit('t', 'alice', 'x', { sleep })
    expect(result.kind).toBe('commit-search-failed')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })
})

describe('fetchOrgTwoFactorRequirement', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends bearer auth to /orgs/{org} and returns the literal boolean true', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input)
      expect(url).toBe('https://api.github.com/orgs/kubernetes')
      return buildPageResponse({ login: 'kubernetes', two_factor_requirement_enabled: true })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchOrgTwoFactorRequirement('ghp_test', 'kubernetes')

    expect(result).toEqual({ kind: 'ok', twoFactorRequirementEnabled: true })
    const init = fetchMock.mock.calls[0]![1] as RequestInit | undefined
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer ghp_test' })
  })

  it('returns literal false when enforcement is explicitly disabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => buildPageResponse({ two_factor_requirement_enabled: false })),
    )

    const result = await fetchOrgTwoFactorRequirement('t', 'x')

    expect(result).toEqual({ kind: 'ok', twoFactorRequirementEnabled: false })
  })

  it('returns null (unknown) when the field is absent — caller lacks org-owner scope', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildPageResponse({ login: 'x' })))

    const result = await fetchOrgTwoFactorRequirement('t', 'x')

    expect(result).toEqual({ kind: 'ok', twoFactorRequirementEnabled: null })
  })

  it('returns null (unknown) when the field value is literal null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => buildPageResponse({ two_factor_requirement_enabled: null })),
    )

    const result = await fetchOrgTwoFactorRequirement('t', 'x')

    expect(result).toEqual({ kind: 'ok', twoFactorRequirementEnabled: null })
  })

  it('maps 403 + X-RateLimit-Remaining: 0 to kind rate-limited', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildRateLimitedResponse()))

    const result = await fetchOrgTwoFactorRequirement('t', 'x')

    expect(result.kind).toBe('rate-limited')
  })

  it('maps 401 to kind auth-failed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })))

    const result = await fetchOrgTwoFactorRequirement('t', 'x')

    expect(result.kind).toBe('auth-failed')
  })

  it('maps 404 to kind not-found', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))

    const result = await fetchOrgTwoFactorRequirement('t', 'x')

    expect(result.kind).toBe('not-found')
  })

  it('maps a thrown fetch error to kind network', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('boom')
      }),
    )

    const result = await fetchOrgTwoFactorRequirement('t', 'x')

    expect(result.kind).toBe('network')
  })

  it('maps an unexpected 500 to kind unknown', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))

    const result = await fetchOrgTwoFactorRequirement('t', 'x')

    expect(result.kind).toBe('unknown')
  })
})

describe('fetchUserOrgMembership', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns isMember true when GitHub reports active membership', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => buildPageResponse({ state: 'active', role: 'member' })),
    )

    const result = await fetchUserOrgMembership('t', 'kubernetes')

    expect(result.isMember).toBe(true)
  })

  it('returns isMember false when the endpoint is 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))

    const result = await fetchUserOrgMembership('t', 'kubernetes')

    expect(result.isMember).toBe(false)
    expect(result.reason).toBeUndefined()
  })

  it('returns isMember false with reason unknown for other failures (honest conservative default)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))

    const result = await fetchUserOrgMembership('t', 'kubernetes')

    expect(result.isMember).toBe(false)
    expect(result.reason).toBe('unknown')
  })
})
