import { describe, expect, it } from 'vitest'
import { buildResult } from '@/lib/testing/fixtures'
import { buildEcosystemRows, buildBubbleChartPoints } from './chart-data'

describe('buildEcosystemRows', () => {
  it('returns one row per result', () => {
    const results = [
      buildResult({ repo: 'facebook/react', stars: 5000, forks: 1000, watchers: 500 }),
      buildResult({ repo: 'torvalds/linux', stars: 100000, forks: 50000, watchers: 5000 }),
    ]
    const rows = buildEcosystemRows(results)
    expect(rows).toHaveLength(2)
    expect(rows[0].repo).toBe('facebook/react')
    expect(rows[1].repo).toBe('torvalds/linux')
  })

  it('formats numeric metrics with Intl.NumberFormat (commas for thousands)', () => {
    const result = buildResult({ repo: 'facebook/react', stars: 5000, forks: 1000, watchers: 500 })
    const [row] = buildEcosystemRows([result])
    expect(row.starsLabel).toBe('5,000')
    expect(row.forksLabel).toBe('1,000')
    expect(row.watchersLabel).toBe('500')
  })

  it('passes through "unavailable" as the label when a metric is unavailable', () => {
    const result = buildResult({ repo: 'facebook/react', stars: 'unavailable', forks: 100, watchers: 50 })
    const [row] = buildEcosystemRows([result])
    expect(row.starsLabel).toBe('unavailable')
  })

  it('sets plotStatusNote when any metric is unavailable', () => {
    const result = buildResult({ repo: 'facebook/react', stars: 'unavailable', forks: 100, watchers: 50 })
    const [row] = buildEcosystemRows([result])
    expect(row.plotStatusNote).not.toBeNull()
    expect(row.plotStatusNote).toContain('incomplete')
  })

  it('sets plotStatusNote to null when all metrics are available', () => {
    const result = buildResult({ repo: 'facebook/react', stars: 5000, forks: 1000, watchers: 500 })
    const [row] = buildEcosystemRows([result])
    expect(row.plotStatusNote).toBeNull()
  })

  it('attaches a spectrum profile for repos with complete metrics', () => {
    const result = buildResult({ repo: 'facebook/react', stars: 5000, forks: 1000, watchers: 500 })
    const [row] = buildEcosystemRows([result])
    expect(row.profile).not.toBeNull()
    expect(row.profile!.reachPercentile).toBeGreaterThanOrEqual(0)
  })

  it('sets profile to null for repos with unavailable stars', () => {
    const result = buildResult({ repo: 'facebook/react', stars: 'unavailable', forks: 100, watchers: 50 })
    const [row] = buildEcosystemRows([result])
    expect(row.profile).toBeNull()
  })
})

describe('buildBubbleChartPoints', () => {
  it('returns an empty array for empty results', () => {
    expect(buildBubbleChartPoints([])).toEqual([])
  })

  it('excludes repos with unavailable stars, forks, or watchers', () => {
    const bad = buildResult({ repo: 'a/b', stars: 'unavailable', forks: 100, watchers: 50 })
    expect(buildBubbleChartPoints([bad])).toHaveLength(0)
  })

  it('excludes repos with zero stars', () => {
    const bad = buildResult({ repo: 'a/b', stars: 0, forks: 0, watchers: 0 })
    expect(buildBubbleChartPoints([bad])).toHaveLength(0)
  })

  it('includes repos with all numeric metrics and positive stars', () => {
    const good = buildResult({ repo: 'facebook/react', stars: 5000, forks: 1000, watchers: 500 })
    const points = buildBubbleChartPoints([good])
    expect(points).toHaveLength(1)
    expect(points[0].repo).toBe('facebook/react')
  })

  it('sets x to star count and y to forkRate', () => {
    const result = buildResult({ repo: 'facebook/react', stars: 1000, forks: 100, watchers: 50 })
    const [point] = buildBubbleChartPoints([result])
    expect(point.x).toBe(1000)
    expect(point.y).toBeCloseTo(10, 5)
  })

  it('sets the radius proportional to watcherRate tier boundaries', () => {
    // watcherRate ≥ 2.5 → r = 20
    const high = buildResult({ repo: 'a/b', stars: 100, forks: 10, watchers: 3 })
    const [point] = buildBubbleChartPoints([high])
    expect(point.r).toBe(20)
  })
})
