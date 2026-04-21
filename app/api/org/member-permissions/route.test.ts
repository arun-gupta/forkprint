import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

function buildReq(query: string, headers: Record<string, string> = { authorization: 'Bearer t' }) {
  return new Request(`http://localhost/api/org/member-permissions${query}`, { headers })
}

function memberPage(logins: string[]): Response {
  return new Response(
    JSON.stringify(logins.map((login) => ({ login, avatar_url: `https://github.com/${login}.png` }))),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
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

  it('returns applicable with correct adminCount, memberCount (non-admin), collaboratorCount, and publicMemberCount', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = String(input)
      // role=admin → 2 admins; role=all → 5 total members; outside_collaborators → 1; public_members → 3
      if (url.includes('role=admin')) return memberPage(['admin1', 'admin2'])
      if (url.includes('role=all')) return memberPage(['admin1', 'admin2', 'user1', 'user2', 'user3'])
      if (url.includes('outside_collaborators')) return memberPage(['ext1'])
      if (url.includes('public_members')) return memberPage(['user1', 'user2', 'user3'])
      return new Response('', { status: 404 })
    }))

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as {
      section: {
        applicability: string
        adminCount: number
        memberCount: number
        outsideCollaboratorCount: number
        publicMemberCount: number
        publicMembers: string[]
      }
    }

    expect(body.section.applicability).toBe('applicable')
    expect(body.section.adminCount).toBe(2)
    expect(body.section.memberCount).toBe(3) // 5 total - 2 admins
    expect(body.section.outsideCollaboratorCount).toBe(1)
    expect(body.section.publicMemberCount).toBe(3)
    expect(body.section.publicMembers).toEqual([
      { login: 'user1', avatarUrl: 'https://github.com/user1.png' },
      { login: 'user2', avatarUrl: 'https://github.com/user2.png' },
      { login: 'user3', avatarUrl: 'https://github.com/user3.png' },
    ])
  })

  it('returns member-list-unavailable when total-member fetch is rate-limited', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.includes('role=admin')) return memberPage(['admin1'])
      // role=all fetch fails
      return new Response('', { status: 403, headers: { 'X-RateLimit-Remaining': '0' } })
    }))

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as { section: { applicability: string } }

    expect(body.section.applicability).toBe('member-list-unavailable')
  })

  it('returns partial when admin fetch fails but total-member fetch succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.includes('role=admin')) return new Response('', { status: 401 })
      if (url.includes('role=all')) return memberPage(['user1', 'user2'])
      if (url.includes('outside_collaborators')) return memberPage([])
      return new Response('', { status: 404 })
    }))

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as {
      section: {
        applicability: string
        adminCount: number | null
        memberCount: number | null
        unavailableReasons: string[]
      }
    }

    expect(body.section.applicability).toBe('partial')
    expect(body.section.adminCount).toBeNull()
    expect(body.section.memberCount).toBeNull()
    expect(body.section.unavailableReasons).toContain('admin-list-auth-failed')
  })

  it('returns partial when collaborator fetch fails but member fetch succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.includes('role=admin')) return memberPage(['admin1'])
      if (url.includes('role=all')) return memberPage(['admin1', 'user1'])
      if (url.includes('outside_collaborators'))
        return new Response('', { status: 403, headers: { 'X-RateLimit-Remaining': '0' } })
      return new Response('', { status: 404 })
    }))

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as {
      section: {
        applicability: string
        adminCount: number
        memberCount: number
        outsideCollaboratorCount: number | null
        unavailableReasons: string[]
      }
    }

    expect(body.section.applicability).toBe('partial')
    expect(body.section.adminCount).toBe(1)
    expect(body.section.memberCount).toBe(1) // 2 total - 1 admin
    expect(body.section.outsideCollaboratorCount).toBeNull()
    expect(body.section.unavailableReasons).toContain('collaborator-list-rate-limited')
  })

  it('response includes kind: member-permission-distribution', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.includes('role=admin')) return memberPage([])
      if (url.includes('role=all')) return memberPage([])
      if (url.includes('outside_collaborators')) return memberPage([])
      return new Response('', { status: 404 })
    }))

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as { section: { kind: string } }

    expect(body.section.kind).toBe('member-permission-distribution')
  })

  it('response includes adminCount from the same endpoint as stale admins panel', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url.includes('role=admin')) return memberPage(['admin1', 'admin2', 'admin3'])
      if (url.includes('role=all')) return memberPage(['admin1', 'admin2', 'admin3', 'user1'])
      if (url.includes('outside_collaborators')) return memberPage([])
      return new Response('', { status: 404 })
    }))

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as { section: Record<string, unknown> }

    expect('adminCount' in body.section).toBe(true)
    expect(body.section.adminCount).toBe(3)
  })
})
