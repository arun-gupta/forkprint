import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET, retryUnavailableAdminsSerially } from './route'
import type { StaleAdminRecord } from '@/lib/governance/stale-admins'

type FetchArgs = Parameters<typeof fetch>

function buildReq(query: string, headers: Record<string, string> = { authorization: 'Bearer t' }) {
  return new Request(`http://localhost/api/org/stale-admins${query}`, { headers })
}

function json(status: number, body: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}

describe('GET /api/org/stale-admins', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns 400 when org is missing', async () => {
    const res = await GET(buildReq(''))
    expect(res.status).toBe(400)
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await GET(buildReq('?org=k8s', {}))
    expect(res.status).toBe(401)
  })

  it('returns not-applicable-non-org immediately for User ownerType without any API calls', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET(buildReq('?org=arun-gupta&ownerType=User'))
    const body = (await res.json()) as { section: { applicability: string; mode: string; admins: unknown[] } }

    expect(body.section.applicability).toBe('not-applicable-non-org')
    expect(body.section.mode).toBe('baseline')
    expect(body.section.admins).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('classifies admins using events first, commit-search fallback, and no-public-activity when empty', async () => {
    const now = new Date('2026-04-16T00:00:00Z')
    vi.setSystemTime(now)

    vi.stubGlobal(
      'fetch',
      vi.fn(async (...args: FetchArgs) => {
        const url = String(args[0])
        if (url.includes('/orgs/acme/members')) {
          return json(200, [{ login: 'active-alice' }, { login: 'stale-bob' }, { login: 'empty-carol' }])
        }
        if (url.includes('/users/active-alice/events/public')) {
          return json(200, [{ created_at: '2026-04-01T00:00:00Z' }])
        }
        if (url.includes('/users/stale-bob/events/public')) {
          return json(200, [])
        }
        if (url.includes('/users/empty-carol/events/public')) {
          return json(200, [])
        }
        if (url.includes('/search/commits') && url.includes('author%3Astale-bob')) {
          return json(200, { total_count: 1, items: [{ commit: { author: { date: '2025-09-01T00:00:00Z' } } }] })
        }
        if (url.includes('/search/commits') && url.includes('author%3Aempty-carol')) {
          return json(200, { total_count: 0, items: [] })
        }
        return json(404, {})
      }),
    )

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as { section: { applicability: string; mode: string; admins: Array<{ username: string; classification: string; lastActivitySource: string | null }> } }

    expect(body.section.applicability).toBe('applicable')
    expect(body.section.mode).toBe('baseline')
    expect(body.section.admins).toHaveLength(3)

    const byName = Object.fromEntries(body.section.admins.map((a) => [a.username, a]))
    expect(byName['active-alice'].classification).toBe('active')
    expect(byName['active-alice'].lastActivitySource).toBe('public-events')
    expect(byName['stale-bob'].classification).toBe('stale')
    expect(byName['stale-bob'].lastActivitySource).toBe('org-commit-search')
    expect(byName['empty-carol'].classification).toBe('no-public-activity')
    expect(byName['empty-carol'].lastActivitySource).toBeNull()

    vi.useRealTimers()
  })

  it('returns admin-list-unavailable with mapped reason when admin list fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('', {
          status: 403,
          headers: { 'X-RateLimit-Remaining': '0' },
        }),
      ),
    )

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as { section: { applicability: string; adminListUnavailableReason: string } }

    expect(body.section.applicability).toBe('admin-list-unavailable')
    expect(body.section.adminListUnavailableReason).toBe('rate-limited')
  })

  it('isolates a single admin fetch failure: other admins still classify, failing one is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (...args: FetchArgs) => {
        const url = String(args[0])
        if (url.includes('/orgs/acme/members')) {
          return json(200, [{ login: 'good' }, { login: 'bad' }])
        }
        if (url.includes('/users/good/events/public')) {
          return json(200, [{ created_at: '2026-04-10T00:00:00Z' }])
        }
        if (url.includes('/users/bad/events/public')) {
          return new Response('', { status: 404 })
        }
        return json(404, {})
      }),
    )

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as { section: { admins: Array<{ username: string; classification: string; unavailableReason: string | null }> } }

    const byName = Object.fromEntries(body.section.admins.map((a) => [a.username, a]))
    expect(byName['good'].classification).toBe('active')
    expect(byName['bad'].classification).toBe('unavailable')
    expect(byName['bad'].unavailableReason).toBe('admin-account-404')
  })

  it('uses elevated-effective mode when ?elevated=1 and user is a member of the org', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (...args: FetchArgs) => {
        const url = String(args[0])
        if (url.includes('/user/memberships/orgs/acme')) {
          return json(200, { state: 'active' })
        }
        if (url.includes('/orgs/acme/members')) {
          return json(200, [])
        }
        return json(404, {})
      }),
    )

    const res = await GET(buildReq('?org=acme&ownerType=Organization&elevated=1'))
    const body = (await res.json()) as { section: { mode: string } }

    expect(body.section.mode).toBe('elevated-effective')
  })

  it('uses elevated-ineffective mode when ?elevated=1 and user is not a member of the org', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (...args: FetchArgs) => {
        const url = String(args[0])
        if (url.includes('/user/memberships/orgs/acme')) {
          return new Response('', { status: 404 })
        }
        if (url.includes('/orgs/acme/members')) {
          return json(200, [])
        }
        return json(404, {})
      }),
    )

    const res = await GET(buildReq('?org=acme&ownerType=Organization&elevated=1'))
    const body = (await res.json()) as { section: { mode: string } }

    expect(body.section.mode).toBe('elevated-ineffective')
  })

  it('does NOT call the membership probe on the baseline path', async () => {
    const fetchMock = vi.fn(async (...args: FetchArgs) => {
      const url = String(args[0])
      if (url.includes('/orgs/acme/members')) {
        return json(200, [])
      }
      return json(404, {})
    })
    vi.stubGlobal('fetch', fetchMock)

    await GET(buildReq('?org=acme&ownerType=Organization'))
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes('/user/memberships/orgs/')),
    ).toBe(false)
  })

  it('auto-retries rate-limited admins server-side after the first fan-out', async () => {
    const now = new Date('2026-04-16T00:00:00Z')
    vi.setSystemTime(now)

    // stale-bob's events are empty → falls through to commit-search.
    // First commit-search call returns rate-limited; second returns a real
    // commit date. With the server-side retry pass, stale-bob should land
    // as classified (stale) rather than unavailable.
    let commitCall = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (...args: FetchArgs) => {
        const url = String(args[0])
        if (url.includes('/orgs/acme/members')) {
          return json(200, [{ login: 'stale-bob' }])
        }
        if (url.includes('/users/stale-bob/events/public')) {
          return json(200, [])
        }
        if (url.includes('/search/commits') && url.includes('author%3Astale-bob')) {
          commitCall++
          if (commitCall === 1) {
            return new Response('', {
              status: 403,
              headers: { 'X-RateLimit-Remaining': '0' },
            })
          }
          return json(200, {
            total_count: 1,
            items: [{ commit: { author: { date: '2025-09-01T00:00:00Z' } } }],
          })
        }
        return json(404, {})
      }),
    )

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as {
      section: { admins: Array<{ username: string; classification: string }> }
    }

    expect(body.section.admins[0]).toMatchObject({
      username: 'stale-bob',
      classification: 'stale',
    })

    vi.useRealTimers()
  })

  it('retryUnavailableAdminsSerially is a no-op when there are no retryable admins', async () => {
    const admins: StaleAdminRecord[] = [
      {
        username: 'active-alice',
        classification: 'active',
        lastActivityAt: '2026-04-10T00:00:00Z',
        lastActivitySource: 'public-events',
        unavailableReason: null,
        retryAvailableAt: null,
      },
      {
        username: 'ghost',
        classification: 'unavailable',
        lastActivityAt: null,
        lastActivitySource: null,
        unavailableReason: 'admin-account-404',
        retryAvailableAt: null,
      },
    ]
    const sleep = vi.fn(async () => {})
    const result = await retryUnavailableAdminsSerially(admins, 't', 'acme', '2026-04-16T00:00:00Z', {
      sleep,
    })
    expect(result).toBe(admins)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('retryUnavailableAdminsSerially stops once the deadline is exceeded', async () => {
    const admins: StaleAdminRecord[] = [
      {
        username: 'u1',
        classification: 'unavailable',
        lastActivityAt: null,
        lastActivitySource: null,
        unavailableReason: 'rate-limited',
        retryAvailableAt: null,
      },
      {
        username: 'u2',
        classification: 'unavailable',
        lastActivityAt: null,
        lastActivitySource: null,
        unavailableReason: 'rate-limited',
        retryAvailableAt: null,
      },
    ]
    // fetch should be called at most once: after the first admin, the clock
    // jumps past the 10s budget and the loop exits.
    const fetchMock = vi.fn(async () =>
      new Response('', { status: 403, headers: { 'X-RateLimit-Remaining': '0' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    let clock = 0
    const now = () => clock
    const sleep = vi.fn(async () => {
      clock += 60_000
    })

    await retryUnavailableAdminsSerially(admins, 't', 'acme', '2026-04-16T00:00:00Z', {
      now,
      sleep,
    })
    // First admin consumed: events fetch + commit search (1 call after maxRetries=0).
    // After processing, sleep advances clock past the 10s deadline, so u2 is skipped.
    const usernames = (fetchMock.mock.calls as unknown as Array<[string | URL, ...unknown[]]>).map((c) => String(c[0]))
    expect(usernames.some((u) => u.includes('/users/u1/events/public'))).toBe(true)
    expect(usernames.some((u) => u.includes('/users/u2/events/public'))).toBe(false)
  })

  it('surfaces threshold 90 as default in the response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (...args: FetchArgs) => {
        const url = String(args[0])
        if (url.includes('/orgs/acme/members')) return json(200, [])
        return json(404, {})
      }),
    )

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as { section: { thresholdDays: number } }
    expect(body.section.thresholdDays).toBe(90)
  })
})
