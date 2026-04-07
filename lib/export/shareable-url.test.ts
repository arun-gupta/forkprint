import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { encodeRepos, decodeRepos } from './shareable-url'

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
})
