import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

function buildReq(query: string, headers: Record<string, string> = { authorization: 'Bearer t' }) {
  return new Request(`http://localhost/api/org/member-permissions${query}`, { headers })
}

function memberPage(logins: string[]): Response {
  return new Response(JSON.stringify(logins.map((login) => ({ login }))), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('GET /api/org/member-permissions', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns 400 when org is missing', async () => {
    const res = await GET(buildReq(''))
    expect(res.status).toBe(400)
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await GET(buildReq('?org=acme', {}))
    expect(res.status).toBe(401)
  })

  it('returns not-applicable-non-org for User ownerType without any API calls', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const res = await GET(buildReq('?org=alice&ownerType=User'))
    const body = (await res.json()) as { section: { applicability: string } }

    expect(body.section.applicability).toBe('not-applicable-non-org')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns applicable with member count and collaborator count', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.includes('role=member')) return memberPage(['alice', 'bob'])
      if (url.includes('outside_collaborators')) return memberPage(['ext1'])
      return new Response('', { status: 404 })
    }))

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as {
      section: { applicability: string; memberCount: number; outsideCollaboratorCount: number }
    }

    expect(body.section.applicability).toBe('applicable')
    expect(body.section.memberCount).toBe(2)
    expect(body.section.outsideCollaboratorCount).toBe(1)
  })

  it('returns member-list-unavailable when member fetch is rate-limited', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response('', { status: 403, headers: { 'X-RateLimit-Remaining': '0' } }),
    ))

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as { section: { applicability: string } }

    expect(body.section.applicability).toBe('member-list-unavailable')
  })

  it('returns partial applicability when member fetch succeeds but collaborator fetch fails', async () => {
    let callCount = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      callCount++
      if (callCount === 1) return memberPage(['alice'])
      return new Response('', { status: 403, headers: { 'X-RateLimit-Remaining': '0' } })
    }))

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as {
      section: {
        applicability: string
        memberCount: number
        outsideCollaboratorCount: number | null
        unavailableReasons: string[]
      }
    }

    expect(body.section.applicability).toBe('partial')
    expect(body.section.memberCount).toBe(1)
    expect(body.section.outsideCollaboratorCount).toBeNull()
    expect(body.section.unavailableReasons).toContain('collaborator-list-rate-limited')
  })

  it('response includes kind: member-permission-distribution', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.includes('role=member')) return memberPage([])
      if (url.includes('outside_collaborators')) return memberPage([])
      return new Response('', { status: 404 })
    }))

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as { section: { kind: string } }

    expect(body.section.kind).toBe('member-permission-distribution')
  })

  it('does NOT include adminCount in the response (admin count is injected by parent)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.includes('role=member')) return memberPage(['alice'])
      if (url.includes('outside_collaborators')) return memberPage([])
      return new Response('', { status: 404 })
    }))

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as { section: Record<string, unknown> }

    expect('adminCount' in body.section).toBe(false)
  })
})
