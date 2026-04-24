import { describe, expect, it } from 'vitest'
import { buildBubbleChartPoints, buildEcosystemRows } from '@/lib/ecosystem-map/chart-data'
import { buildSpectrumProfile } from '@/lib/ecosystem-map/classification'
import { buildResult } from '@/lib/testing/fixtures'

describe('ecosystem map helpers', () => {
  it('formats visible ecosystem metrics for successful repositories', () => {
    const results = [
      buildResult({
        repo: 'facebook/react',
        stars: 244295,
        forks: 50872,
        watchers: 6660,
      }),
    ]

    expect(buildEcosystemRows(results)[0]).toMatchObject({
      repo: 'facebook/react',
      starsLabel: '244,295',
      forksLabel: '50,872',
      watchersLabel: '6,660',
      plotStatusNote: null,
    })
  })

  it('keeps unavailable ecosystem metrics explicit instead of guessing values', () => {
    const results = [
      buildResult({
        repo: 'facebook/react',
        stars: 'unavailable',
        forks: 50872,
        watchers: 'unavailable',
      }),
    ]

    expect(buildEcosystemRows(results)[0]).toMatchObject({
      starsLabel: 'unavailable',
      watchersLabel: 'unavailable',
      plotStatusNote: 'Could not plot this repository because ecosystem metrics were incomplete.',
      profile: null,
    })
  })

  it('builds bubble chart points from stars, fork rate, and watcher rate', () => {
    const results = [
      buildResult({
        repo: 'facebook/react',
        stars: 244295,
        forks: 50872,
        watchers: 6660,
      }),
    ]

    expect(buildBubbleChartPoints(results)).toEqual([
      expect.objectContaining({
        repo: 'facebook/react',
        x: 244295,
        y: expect.closeTo((50872 / 244295) * 100, 5),
        stars: 244295,
        forks: 50872,
        watchers: 6660,
        forkRateLabel: '20.8%',
        watcherRateLabel: '2.7%',
      }),
    ])
  })

  it('builds a config-driven spectrum profile', () => {
    const profile = buildSpectrumProfile(
      buildResult({ repo: 'kubernetes/kubernetes', stars: 121419, forks: 42757, watchers: 3181 }),
    )

    expect(profile).toMatchObject({
      forkRateLabel: '35.2%',
      watcherRateLabel: '2.6%',
    })
    expect(typeof profile!.reachPercentile).toBe('number')
    expect(typeof profile!.engagementPercentile).toBe('number')
    expect(typeof profile!.attentionPercentile).toBe('number')
    expect(profile!.reachLabel).toMatch(/\d+\w{2} percentile/)
    expect(profile!.engagementLabel).toMatch(/\d+\w{2} percentile/)
    expect(profile!.attentionLabel).toMatch(/\d+\w{2} percentile/)
  })
})
