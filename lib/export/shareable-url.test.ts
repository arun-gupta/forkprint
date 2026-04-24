import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { encodeRepos, decodeRepos, encodeFoundationUrl, decodeFoundationUrl, isValidRepoSlug } from './shareable-url'

describe('isValidRepoSlug', () => {
  it.each([
    'facebook/react',
    'vercel/next.js',
    'owner/repo',
    'a/b',
    'my-org/my-repo_v2',
  ])('accepts valid slug %s', (slug) => {
    expect(isValidRepoSlug(slug)).toBe(true)
  })

  it.each([
    ['/react', 'leading slash'],
    ['react', 'bare name with no slash'],
    ['owner/', 'empty repo segment'],
    ['/owner/repo', 'leading slash with nested path'],
    ['owner/repo/extra', 'too many slashes'],
    ['/', 'slash only'],
    ['', 'empty string'],
  ])('rejects invalid slug: %s (%s)', (slug) => {
    expect(isValidRepoSlug(slug)).toBe(false)
  })
})

describe('encodeRepos', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('encodes a single repo as ?repos= query param', () => {
    expect(encodeRepos(['facebook/react'])).toBe('http://localhost:3000/?repos=facebook%2Freact')
  })

  it('encodes multiple repos comma-separated', () => {
    const url = encodeRepos(['facebook/react', 'vercel/next.js'])
    expect(url).toContain('repos=')
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('repos')).toBe('facebook/react,vercel/next.js')
  })

  it('returns base URL with trailing slash for empty list', () => {
    expect(encodeRepos([])).toBe('http://localhost:3000/')
  })

  it('does not include any token or auth data', () => {
    const url = encodeRepos(['facebook/react'])
    expect(url).not.toContain('token')
    expect(url).not.toContain('gho_')
    expect(url).not.toContain('ghp_')
  })
})

describe('decodeRepos', () => {
  it('decodes a single repo from ?repos= param', () => {
    expect(decodeRepos('?repos=facebook%2Freact')).toEqual(['facebook/react'])
  })

  it('decodes multiple comma-separated repos', () => {
    expect(decodeRepos('?repos=facebook/react,vercel/next.js')).toEqual([
      'facebook/react',
      'vercel/next.js',
    ])
  })

  it('returns empty array when repos param is absent', () => {
    expect(decodeRepos('')).toEqual([])
    expect(decodeRepos('?foo=bar')).toEqual([])
  })

  it('returns empty array for empty repos param', () => {
    expect(decodeRepos('?repos=')).toEqual([])
  })

  it('round-trips encode → decode', () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })
    const repos = ['facebook/react', 'vercel/next.js']
    const url = encodeRepos(repos)
    const search = '?' + url.split('?')[1]
    expect(decodeRepos(search)).toEqual(repos)
    vi.unstubAllGlobals()
  })

  it('silently drops a leading-slash slug (/react)', () => {
    expect(decodeRepos('?repos=%2Freact')).toEqual([])
  })

  it('silently drops a bare name with no slash', () => {
    expect(decodeRepos('?repos=react')).toEqual([])
  })

  it('silently drops a slug with empty repo segment (owner/)', () => {
    expect(decodeRepos('?repos=owner%2F')).toEqual([])
  })

  it('silently drops a deeply-nested path (owner/repo/extra)', () => {
    expect(decodeRepos('?repos=owner%2Frepo%2Fextra')).toEqual([])
  })

  it('keeps valid slugs and drops invalid ones in a mixed list', () => {
    expect(
      decodeRepos('?repos=facebook%2Freact,%2Fbad,bare,vercel%2Fnext.js,owner%2F')
    ).toEqual(['facebook/react', 'vercel/next.js'])
  })
})

describe('encodeFoundationUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('encodes a repo input to the Foundation URL format', () => {
    const url = encodeFoundationUrl({ foundation: 'cncf-sandbox', input: 'owner/repo' })
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('mode')).toBe('foundation')
    expect(params.get('foundation')).toBe('cncf-sandbox')
    expect(params.get('input')).toBe('owner/repo')
  })

  it('encodes an org input to the Foundation URL format', () => {
    const url = encodeFoundationUrl({ foundation: 'cncf-sandbox', input: 'cncf' })
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('mode')).toBe('foundation')
    expect(params.get('input')).toBe('cncf')
  })

  it('does not include any token or auth data', () => {
    const url = encodeFoundationUrl({ foundation: 'cncf-sandbox', input: 'owner/repo' })
    expect(url).not.toContain('token')
    expect(url).not.toContain('gho_')
    expect(url).not.toContain('ghp_')
  })
})

describe('decodeFoundationUrl', () => {
  it('decodes a Foundation URL with a repo input', () => {
    const result = decodeFoundationUrl('?mode=foundation&foundation=cncf-sandbox&input=owner%2Frepo')
    expect(result).toEqual({ foundation: 'cncf-sandbox', input: 'owner/repo' })
  })

  it('decodes a Foundation URL with an org input', () => {
    const result = decodeFoundationUrl('?mode=foundation&foundation=cncf-sandbox&input=cncf')
    expect(result).toEqual({ foundation: 'cncf-sandbox', input: 'cncf' })
  })

  it('returns null when mode param is absent', () => {
    expect(decodeFoundationUrl('?foundation=cncf-sandbox&input=owner/repo')).toBeNull()
  })

  it('returns null when mode param is not foundation', () => {
    expect(decodeFoundationUrl('?mode=repos&foundation=cncf-sandbox&input=owner/repo')).toBeNull()
  })

  it('round-trips encodeFoundationUrl → decodeFoundationUrl for repos', () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })
    const state = { foundation: 'cncf-sandbox' as const, input: 'owner/repo' }
    const url = encodeFoundationUrl(state)
    const search = '?' + url.split('?')[1]
    expect(decodeFoundationUrl(search)).toEqual(state)
    vi.unstubAllGlobals()
  })

  it('round-trips encodeFoundationUrl → decodeFoundationUrl for org', () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } })
    const state = { foundation: 'cncf-sandbox' as const, input: 'cncf' }
    const url = encodeFoundationUrl(state)
    const search = '?' + url.split('?')[1]
    expect(decodeFoundationUrl(search)).toEqual(state)
    vi.unstubAllGlobals()
  })
})
