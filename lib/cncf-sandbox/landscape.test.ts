import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// T036 — landscape module
// ---------------------------------------------------------------------------

// Pure-function tests (no fetch needed) — import directly
import { normalizeUrl, isRepoInLandscape, findSandboxApplication } from './landscape'
import type { CNCFLandscapeData, SandboxApplicationIssue } from './types'

describe('T036 — normalizeUrl', () => {
  it('T036-1: strips .git suffix and trailing slash', () => {
    expect(normalizeUrl('https://github.com/foo/bar.git')).toBe('https://github.com/foo/bar')
  })

  it('T036-2: lowercases the URL', () => {
    expect(normalizeUrl('https://GitHub.com/Foo/Bar')).toBe('https://github.com/foo/bar')
  })
})

describe('T036 — isRepoInLandscape', () => {
  const landscapeData: CNCFLandscapeData = {
    repoUrls: new Set(['https://github.com/foo/bar']),
    homepageUrls: new Set(),
    fetchedAt: Date.now(),
    categories: [],
  }

  it('T036-3: repo slug in Set → true', () => {
    expect(isRepoInLandscape('foo/bar', landscapeData)).toBe(true)
  })

  it('T036-4: repo not in Set → false', () => {
    expect(isRepoInLandscape('foo/baz', landscapeData)).toBe(false)
  })
})

describe('T036 — findSandboxApplication', () => {
  const issues: SandboxApplicationIssue[] = [
    {
      issueNumber: 1,
      issueUrl: 'https://github.com/cncf/sandbox/issues/1',
      title: '[Sandbox] MyProject application',
      state: 'OPEN',
      createdAt: '2024-01-01T00:00:00Z',
      labels: [],
      approved: false,
    },
    {
      issueNumber: 2,
      issueUrl: 'https://github.com/cncf/sandbox/issues/2',
      title: '[Sandbox] OtherProject application',
      state: 'OPEN',
      createdAt: '2024-01-02T00:00:00Z',
      labels: [],
      approved: false,
    },
  ]

  it('T036-5: matching title → returns the issue', () => {
    const result = findSandboxApplication('org/myproject', issues)
    expect(result).not.toBeNull()
    expect(result?.issueNumber).toBe(1)
  })

  it('T036-6: no match → returns null', () => {
    const result = findSandboxApplication('org/nonexistent', issues)
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// fetchCNCFLandscape — uses module-level cache; reset with vi.resetModules()
// ---------------------------------------------------------------------------

describe('T036 — fetchCNCFLandscape', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('T036-7: fetch returns valid YAML → repoUrls contains the project URL', async () => {
    const yaml = `
landscape:
  - name: Cat1
    subcategories:
      - name: Sub1
        items:
          - name: TestProject
            repo_url: https://github.com/test/project
`
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(yaml),
    })
    vi.stubGlobal('fetch', mockFetch)

    // Dynamic import after resetting modules to bypass module-level cache
    const { fetchCNCFLandscape } = await import('./landscape')
    const data = await fetchCNCFLandscape()
    expect(data).not.toBeNull()
    expect(data?.repoUrls.has('https://github.com/test/project')).toBe(true)
  })

  it('T036-8: fetch returns non-ok response → returns null', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { fetchCNCFLandscape } = await import('./landscape')
    const data = await fetchCNCFLandscape()
    expect(data).toBeNull()
  })
})
