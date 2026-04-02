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

    expect(result.data).toBe(6)
  })

  it('returns unavailable when no supported file can be parsed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(null, { status: 404 })
      }),
    )

    const result = await fetchMaintainerCount('ghp_test', 'facebook', 'react')

    expect(result.data).toBe('unavailable')
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
