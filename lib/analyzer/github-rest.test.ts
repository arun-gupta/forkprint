import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchMaintainerCount } from './github-rest'

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
