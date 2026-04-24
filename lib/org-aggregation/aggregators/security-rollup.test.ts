import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { securityRollupAggregator } from './security-rollup'
import { buildResult } from '@/lib/testing/fixtures'

function partialResult(repo: string, override: Partial<AnalysisResult> = {}): AnalysisResult {
  return buildResult({ repo, name: repo, ...override })
}

const CONTEXT = { totalReposInRun: 3, flagshipRepos: [], inactiveRepoWindowMonths: 12 }

describe('securityRollupAggregator — FR-012', () => {
  it('typical: 3 repos with mixed scores, sorted alphabetically, worst score identified', () => {
    const results = [
      partialResult('o/charlie', {
        securityResult: {
          scorecard: { overallScore: 5.0, checks: [], scorecardVersion: '4.0' },
          directChecks: [],
          branchProtectionEnabled: 'unavailable',
        },
      }),
      partialResult('o/alpha', {
        securityResult: {
          scorecard: { overallScore: 7.5, checks: [], scorecardVersion: '4.0' },
          directChecks: [],
          branchProtectionEnabled: 'unavailable',
        },
      }),
      partialResult('o/bravo', {
        securityResult: {
          scorecard: { overallScore: 9.0, checks: [], scorecardVersion: '4.0' },
          directChecks: [],
          branchProtectionEnabled: 'unavailable',
        },
      }),
    ]
    const panel = securityRollupAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(3)
    expect(panel.value).not.toBeNull()

    // Sorted alphabetically by repo
    expect(panel.value!.perRepo.map((e) => e.repo)).toEqual(['o/alpha', 'o/bravo', 'o/charlie'])
    expect(panel.value!.perRepo.map((e) => e.score)).toEqual([7.5, 9.0, 5.0])
    expect(panel.value!.worstScore).toBe(5.0)
  })

  it('all-unavailable: every repo lacks scorecard data → panel is unavailable', () => {
    const results = [
      partialResult('o/alpha', { securityResult: 'unavailable' }),
      partialResult('o/bravo', { securityResult: 'unavailable' }),
    ]
    const panel = securityRollupAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: some repos have scorecard, some do not — unavailable repos included in perRepo', () => {
    const results = [
      partialResult('o/alpha', {
        securityResult: {
          scorecard: { overallScore: 7.5, checks: [], scorecardVersion: '4.0' },
          directChecks: [],
          branchProtectionEnabled: 'unavailable',
        },
      }),
      partialResult('o/bravo', { securityResult: 'unavailable' }),
      partialResult('o/charlie', {
        securityResult: {
          scorecard: 'unavailable',
          directChecks: [],
          branchProtectionEnabled: 'unavailable',
        },
      }),
    ]
    const panel = securityRollupAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(1)
    expect(panel.value).not.toBeNull()

    // All repos appear in perRepo, sorted alphabetically
    expect(panel.value!.perRepo).toEqual([
      { repo: 'o/alpha', score: 7.5 },
      { repo: 'o/bravo', score: 'unavailable' },
      { repo: 'o/charlie', score: 'unavailable' },
    ])
    expect(panel.value!.worstScore).toBe(7.5)
  })

  it('empty: results array is empty → in-progress with null value', () => {
    const panel = securityRollupAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })
})
