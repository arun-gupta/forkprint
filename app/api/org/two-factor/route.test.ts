import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

function buildReq(query: string, headers: Record<string, string> = { authorization: 'Bearer t' }) {
  return new Request(`http://localhost/api/org/two-factor${query}`, { headers })
}

function json(status: number, body: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}

describe('GET /api/org/two-factor', () => {
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
    const body = (await res.json()) as {
      section: { applicability: string; status: string | null }
    }

    expect(body.section.applicability).toBe('not-applicable-non-org')
    expect(body.section.status).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns applicable + enforced when GitHub reports the flag as true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(200, { login: 'acme', two_factor_requirement_enabled: true })),
    )

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as {
      section: { applicability: string; status: string | null }
    }

    expect(body.section.applicability).toBe('applicable')
    expect(body.section.status).toBe('enforced')
  })

  it('returns applicable + not-enforced when GitHub reports the flag as false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(200, { login: 'acme', two_factor_requirement_enabled: false })),
    )

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as {
      section: { applicability: string; status: string | null }
    }

    expect(body.section.applicability).toBe('applicable')
    expect(body.section.status).toBe('not-enforced')
  })

  it('returns applicable + unknown when the field is absent (insufficient scope)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(200, { login: 'acme' })))

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as {
      section: { applicability: string; status: string | null }
    }

    expect(body.section.applicability).toBe('applicable')
    expect(body.section.status).toBe('unknown')
  })

  it('returns org-lookup-unavailable with mapped reason when rate-limited', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 403, headers: { 'X-RateLimit-Remaining': '0' } })),
    )

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as {
      section: { applicability: string; lookupUnavailableReason?: string; status: string | null }
    }

    expect(body.section.applicability).toBe('org-lookup-unavailable')
    expect(body.section.status).toBeNull()
    expect(body.section.lookupUnavailableReason).toBe('rate-limited')
  })

  it('returns org-lookup-unavailable with reason not-found when the org is 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))

    const res = await GET(buildReq('?org=nope&ownerType=Organization'))
    const body = (await res.json()) as {
      section: { applicability: string; lookupUnavailableReason?: string }
    }

    expect(body.section.applicability).toBe('org-lookup-unavailable')
    expect(body.section.lookupUnavailableReason).toBe('not-found')
  })

  it('returns org-lookup-unavailable with reason auth-failed on 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })))

    const res = await GET(buildReq('?org=acme&ownerType=Organization'))
    const body = (await res.json()) as {
      section: { applicability: string; lookupUnavailableReason?: string }
    }

    expect(body.section.applicability).toBe('org-lookup-unavailable')
    expect(body.section.lookupUnavailableReason).toBe('auth-failed')
  })
})
