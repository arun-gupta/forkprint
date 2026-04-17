import { describe, expect, it } from 'vitest'
import { detectReleaseHealth, type RawRelease } from './detect'

const FIXED_NOW = new Date('2026-04-17T12:00:00Z')

function makeRelease(overrides: Partial<RawRelease> = {}): RawRelease {
  return {
    tagName: 'v1.0.0',
    name: null,
    body: 'This release fixes a regression in the login flow for users without avatars.',
    isPrerelease: false,
    createdAt: '2026-03-01T00:00:00Z',
    publishedAt: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

describe('detectReleaseHealth', () => {
  it('returns the unavailable shape when there are zero releases AND tags are unavailable', () => {
    const result = detectReleaseHealth({
      releases: [],
      totalReleasesAllTime: 0,
      totalTags: 'unavailable',
      now: FIXED_NOW,
    })
    expect(result).toBe('unavailable')
  })

  it('emits per-field unavailable when totalReleasesAnalyzed is 0 but tags exist', () => {
    const result = detectReleaseHealth({
      releases: [],
      totalReleasesAllTime: 0,
      totalTags: 5,
      now: FIXED_NOW,
    })
    expect(result).not.toBe('unavailable')
    if (result === 'unavailable') throw new Error('unreachable')
    expect(result.totalReleasesAnalyzed).toBe(0)
    expect(result.releaseFrequency).toBe('unavailable')
    expect(result.daysSinceLastRelease).toBe('unavailable')
    expect(result.semverComplianceRatio).toBe('unavailable')
    expect(result.releaseNotesQualityRatio).toBe('unavailable')
    expect(result.preReleaseRatio).toBe('unavailable')
    expect(result.tagToReleaseRatio).toBe(1) // 5 tags, 0 releases → 5/5
    expect(result.versioningScheme).toBe('unavailable')
  })

  it('one release — frequency unavailable, recency computed, semver present, notes present', () => {
    const result = detectReleaseHealth({
      releases: [makeRelease({ tagName: 'v2.0.0', publishedAt: '2026-04-10T00:00:00Z' })],
      totalReleasesAllTime: 1,
      totalTags: 1,
      now: FIXED_NOW,
    })
    if (result === 'unavailable') throw new Error('unreachable')
    expect(result.totalReleasesAnalyzed).toBe(1)
    expect(result.releaseFrequency).toBe('unavailable')
    expect(result.daysSinceLastRelease).toBe(7)
    expect(result.semverComplianceRatio).toBe(1)
    expect(result.releaseNotesQualityRatio).toBe(1)
    expect(result.preReleaseRatio).toBe(0)
  })

  it('≥ 2 releases yield a non-unavailable release frequency (per year)', () => {
    const result = detectReleaseHealth({
      releases: [
        makeRelease({ publishedAt: '2026-04-10T00:00:00Z' }),
        makeRelease({ publishedAt: '2026-01-10T00:00:00Z' }),
        makeRelease({ publishedAt: '2025-10-10T00:00:00Z' }),
        makeRelease({ publishedAt: '2025-07-10T00:00:00Z' }),
        makeRelease({ publishedAt: '2025-04-10T00:00:00Z' }),
      ],
      totalReleasesAllTime: 5,
      totalTags: 5,
      now: FIXED_NOW,
    })
    if (result === 'unavailable') throw new Error('unreachable')
    expect(result.releaseFrequency).not.toBe('unavailable')
    expect(result.releaseFrequency).toBeGreaterThan(0)
  })

  it('falls back to createdAt when publishedAt is null', () => {
    const result = detectReleaseHealth({
      releases: [makeRelease({ createdAt: '2026-04-15T00:00:00Z', publishedAt: null })],
      totalReleasesAllTime: 1,
      totalTags: 1,
      now: FIXED_NOW,
    })
    if (result === 'unavailable') throw new Error('unreachable')
    expect(result.daysSinceLastRelease).toBe(2)
  })

  it('reports tagToReleaseRatio as unavailable when totalTags is unavailable', () => {
    const result = detectReleaseHealth({
      releases: [makeRelease()],
      totalReleasesAllTime: 1,
      totalTags: 'unavailable',
      now: FIXED_NOW,
    })
    if (result === 'unavailable') throw new Error('unreachable')
    expect(result.tagToReleaseRatio).toBe('unavailable')
  })

  it('computes preReleaseRatio from isPrerelease flags', () => {
    const result = detectReleaseHealth({
      releases: [
        makeRelease({ isPrerelease: true }),
        makeRelease({ isPrerelease: true }),
        makeRelease({ isPrerelease: false }),
        makeRelease({ isPrerelease: false }),
      ],
      totalReleasesAllTime: 4,
      totalTags: 4,
      now: FIXED_NOW,
    })
    if (result === 'unavailable') throw new Error('unreachable')
    expect(result.preReleaseRatio).toBe(0.5)
  })

  it('counts whitespace-only bodies as non-substantive', () => {
    const result = detectReleaseHealth({
      releases: [
        makeRelease({ body: '' }),
        makeRelease({ body: '   ' }),
        makeRelease({ body: null }),
        makeRelease({ body: 'Substantial notes explaining the changes in detail for this release.' }),
      ],
      totalReleasesAllTime: 4,
      totalTags: 4,
      now: FIXED_NOW,
    })
    if (result === 'unavailable') throw new Error('unreachable')
    expect(result.releaseNotesQualityRatio).toBe(0.25)
  })

  it('computes tagToReleaseRatio as the share of unpromoted tags', () => {
    const result = detectReleaseHealth({
      releases: [makeRelease(), makeRelease(), makeRelease()],
      totalReleasesAllTime: 3,
      totalTags: 10,
      now: FIXED_NOW,
    })
    if (result === 'unavailable') throw new Error('unreachable')
    expect(result.tagToReleaseRatio).toBe(0.7)
  })

  it('classifies the dominant versioning scheme from tag names', () => {
    const result = detectReleaseHealth({
      releases: [
        makeRelease({ tagName: 'v1.0.0' }),
        makeRelease({ tagName: 'v1.1.0' }),
        makeRelease({ tagName: 'v1.2.0' }),
      ],
      totalReleasesAllTime: 3,
      totalTags: 3,
      now: FIXED_NOW,
    })
    if (result === 'unavailable') throw new Error('unreachable')
    expect(result.versioningScheme).toBe('semver')
  })
})
