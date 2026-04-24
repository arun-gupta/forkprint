import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { repoAgeAggregator } from './repo-age'
import { buildResult } from '@/lib/testing/fixtures'

function partialResult(repo: string, override: Partial<AnalysisResult> = {}): AnalysisResult {
  return buildResult({ repo, name: repo, ...override })
}

const CONTEXT = { totalReposInRun: 3, flagshipRepos: [], inactiveRepoWindowMonths: 12 }

describe('repoAgeAggregator — FR-028', () => {
  it('typical: identifies newest and oldest repos', () => {
    const results = [
      partialResult('o/alpha', { createdAt: '2020-01-15T00:00:00Z' }),
      partialResult('o/bravo', { createdAt: '2023-06-01T00:00:00Z' }),
      partialResult('o/charlie', { createdAt: '2018-03-10T00:00:00Z' }),
    ]
    const panel = repoAgeAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(3)
    expect(panel.value).not.toBeNull()
    expect(panel.value!.newest).toEqual({
      repo: 'o/bravo',
      createdAt: new Date('2023-06-01T00:00:00Z'),
    })
    expect(panel.value!.oldest).toEqual({
      repo: 'o/charlie',
      createdAt: new Date('2018-03-10T00:00:00Z'),
    })
  })

  it('all-unavailable: every repo lacks createdAt → panel is unavailable', () => {
    const results = [
      partialResult('o/alpha', { createdAt: 'unavailable' }),
      partialResult('o/bravo', { createdAt: 'unavailable' }),
    ]
    const panel = repoAgeAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: unavailable repos are excluded but available ones still contribute', () => {
    const results = [
      partialResult('o/alpha', { createdAt: '2021-05-20T00:00:00Z' }),
      partialResult('o/bravo', { createdAt: 'unavailable' }),
      partialResult('o/charlie', { createdAt: '2019-11-01T00:00:00Z' }),
    ]
    const panel = repoAgeAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value!.newest!.repo).toBe('o/alpha')
    expect(panel.value!.oldest!.repo).toBe('o/charlie')
  })

  it('empty: results array is empty → in-progress with null value', () => {
    const panel = repoAgeAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })
})
