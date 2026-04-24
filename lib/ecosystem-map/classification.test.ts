import { describe, expect, it } from 'vitest'
import { buildResult } from '@/lib/testing/fixtures'
import { buildSpectrumProfile, buildSpectrumProfiles } from './classification'

describe('buildSpectrumProfile', () => {
  it('returns null when stars is unavailable', () => {
    const result = buildResult({ stars: 'unavailable', forks: 100, watchers: 50 })
    expect(buildSpectrumProfile(result)).toBeNull()
  })

  it('returns null when forks is unavailable', () => {
    const result = buildResult({ stars: 1000, forks: 'unavailable', watchers: 50 })
    expect(buildSpectrumProfile(result)).toBeNull()
  })

  it('returns null when watchers is unavailable', () => {
    const result = buildResult({ stars: 1000, forks: 100, watchers: 'unavailable' })
    expect(buildSpectrumProfile(result)).toBeNull()
  })

  it('returns null when stars is zero', () => {
    const result = buildResult({ stars: 0, forks: 0, watchers: 0 })
    expect(buildSpectrumProfile(result)).toBeNull()
  })

  it('returns a profile with percentile fields in [0, 99] when data is complete', () => {
    const result = buildResult({ stars: 5000, forks: 1000, watchers: 500 })
    const profile = buildSpectrumProfile(result)
    expect(profile).not.toBeNull()
    expect(profile!.reachPercentile).toBeGreaterThanOrEqual(0)
    expect(profile!.reachPercentile).toBeLessThanOrEqual(99)
    expect(profile!.engagementPercentile).toBeGreaterThanOrEqual(0)
    expect(profile!.engagementPercentile).toBeLessThanOrEqual(99)
    expect(profile!.attentionPercentile).toBeGreaterThanOrEqual(0)
    expect(profile!.attentionPercentile).toBeLessThanOrEqual(99)
  })

  it('computes forkRate as (forks / stars) * 100', () => {
    const result = buildResult({ stars: 1000, forks: 100, watchers: 50 })
    const profile = buildSpectrumProfile(result)
    expect(profile!.forkRate).toBeCloseTo(10, 10)
  })

  it('computes watcherRate as (watchers / stars) * 100', () => {
    const result = buildResult({ stars: 1000, forks: 100, watchers: 50 })
    const profile = buildSpectrumProfile(result)
    expect(profile!.watcherRate).toBeCloseTo(5, 10)
  })

  it('formats forkRateLabel and watcherRateLabel with one decimal place', () => {
    const result = buildResult({ stars: 1000, forks: 100, watchers: 50 })
    const profile = buildSpectrumProfile(result)
    expect(profile!.forkRateLabel).toBe('10.0%')
    expect(profile!.watcherRateLabel).toBe('5.0%')
  })

  it('includes human-readable percentile labels', () => {
    const result = buildResult({ stars: 5000, forks: 1000, watchers: 500 })
    const profile = buildSpectrumProfile(result)
    expect(typeof profile!.reachLabel).toBe('string')
    expect(profile!.reachLabel.length).toBeGreaterThan(0)
  })
})

describe('buildSpectrumProfiles', () => {
  it('returns an empty object for an empty results array', () => {
    expect(buildSpectrumProfiles([])).toEqual({})
  })

  it('keys the profile by repo name', () => {
    const result = buildResult({ repo: 'facebook/react', stars: 5000, forks: 1000, watchers: 500 })
    const profiles = buildSpectrumProfiles([result])
    expect(profiles['facebook/react']).toBeDefined()
  })

  it('omits repos with unavailable data', () => {
    const good = buildResult({ repo: 'facebook/react', stars: 5000, forks: 1000, watchers: 500 })
    const bad = buildResult({ repo: 'torvalds/linux', stars: 'unavailable', forks: 100, watchers: 50 })
    const profiles = buildSpectrumProfiles([good, bad])
    expect(profiles['facebook/react']).toBeDefined()
    expect(profiles['torvalds/linux']).toBeUndefined()
  })
})
