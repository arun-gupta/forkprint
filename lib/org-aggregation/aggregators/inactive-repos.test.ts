import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { inactiveReposAggregator } from './inactive-repos'
import { buildResult } from '@/lib/testing/fixtures'

function partialResult(repo: string, override: Partial<AnalysisResult> = {}): AnalysisResult {
  return buildResult({ repo, name: repo, ...override })
}

const CONTEXT = { totalReposInRun: 3, flagshipRepos: [], inactiveRepoWindowMonths: 12 }

describe('inactiveReposAggregator — FR-029', () => {
  it('typical: identifies repos with zero commits in 90 days as inactive', () => {
    const results = [
      partialResult('o/alpha', { commits90d: 42 }),
      partialResult('o/bravo', { commits90d: 0 }),
      partialResult('o/charlie', { commits90d: 0 }),
      partialResult('o/delta', { commits90d: 10 }),
    ]
    const panel = inactiveReposAggregator(results, { ...CONTEXT, totalReposInRun: 4 })
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(4)
    expect(panel.value).not.toBeNull()
    expect(panel.value!.windowMonths).toBe(12)
    // Inactive repos sorted alphabetically
    expect(panel.value!.repos).toEqual([
      { repo: 'o/bravo', lastCommitAt: null },
      { repo: 'o/charlie', lastCommitAt: null },
    ])
  })

  it('all-unavailable: every repo lacks commits90d → panel is unavailable', () => {
    const results = [
      partialResult('o/alpha', { commits90d: 'unavailable' }),
      partialResult('o/bravo', { commits90d: 'unavailable' }),
    ]
    const panel = inactiveReposAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: unavailable repos are excluded but available ones still contribute', () => {
    const results = [
      partialResult('o/alpha', { commits90d: 0 }),
      partialResult('o/bravo', { commits90d: 'unavailable' }),
      partialResult('o/charlie', { commits90d: 5 }),
    ]
    const panel = inactiveReposAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value!.repos).toEqual([{ repo: 'o/alpha', lastCommitAt: null }])
  })

  it('empty: results array is empty → in-progress with null value', () => {
    const panel = inactiveReposAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })
})
