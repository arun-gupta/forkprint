import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildMetricCardViewModels } from './view-model'
import { buildResult as _buildResult, INCLUSIVE_NAMING_CLEAN } from '@/lib/testing/fixtures'

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return _buildResult({
    repo: 'facebook/react',
    createdAt: '2013-05-24T16:15:54Z',
    inclusiveNamingResult: INCLUSIVE_NAMING_CLEAN,
    ...overrides,
  })
}

describe('buildMetricCardViewModels', () => {
  it('builds formatted summary fields and explicit unavailable details', () => {
    const card = buildMetricCardViewModels([
      buildResult({
        repo: 'facebook/react',
        stars: 244295,
        forks: 50872,
        watchers: 6660,
        primaryLanguage: 'unavailable',
        releases12mo: 'unavailable',
        missingFields: ['primaryLanguage', 'releases12mo'],
      }),
    ])[0]!

    expect(card.repo).toBe('facebook/react')
    expect(card.starsLabel).toBe('244,295')
    expect(card.createdAtLabel).toBe('May 24, 2013')
    expect(card.primaryLanguage).toBe('—')
    expect(typeof card.profile?.reachPercentile).toBe('number')
    expect(card.profile?.reachLabel).toMatch(/\d+\w{2} percentile/)
    expect(card.scoreBadges).toHaveLength(5)
    expect(card.scoreBadges.find((badge) => badge.category === 'Contributors')?.value).toBe('Insufficient verified public data')
    expect(card.details.find((detail) => detail.label === 'Primary language')?.value).toBe('—')
    expect(card.details.find((detail) => detail.label === 'Releases (12mo)')).toBeUndefined()
  })

  it('formats unavailable numeric fields as em-dash', () => {
    const card = buildMetricCardViewModels([
      buildResult({ stars: 'unavailable', forks: 'unavailable', watchers: 'unavailable' }),
    ])[0]!

    expect(card.starsLabel).toBe('—')
    expect(card.forksLabel).toBe('—')
    expect(card.watchersLabel).toBe('—')
  })

  it('formats zero values as "0" distinct from em-dash', () => {
    const card = buildMetricCardViewModels([
      buildResult({ stars: 0, forks: 0, watchers: 0 }),
    ])[0]!

    expect(card.starsLabel).toBe('0')
    expect(card.forksLabel).toBe('0')
    expect(card.watchersLabel).toBe('0')
  })
})
