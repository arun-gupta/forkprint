import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { governanceAggregator } from './governance'
import { buildResult } from '@/lib/testing/fixtures'

function partialResult(repo: string, override: Partial<AnalysisResult> = {}): AnalysisResult {
  return buildResult({ repo, name: repo, ...override })
}

const CONTEXT = { totalReposInRun: 3, flagshipRepos: [], inactiveRepoWindowMonths: 12 }

const DOC_WITH_GOVERNANCE = {
  documentationResult: {
    fileChecks: [{ name: 'governance' as const, found: true, path: 'GOVERNANCE.md' }],
    readmeSections: [],
    readmeContent: null,
  },
}

const DOC_WITHOUT_GOVERNANCE = {
  documentationResult: {
    fileChecks: [{ name: 'governance' as const, found: false, path: null }],
    readmeSections: [],
    readmeContent: null,
  },
}

describe('governanceAggregator — FR-013', () => {
  it('typical: repos with and without governance files', () => {
    const results = [
      partialResult('o/alpha', DOC_WITH_GOVERNANCE),
      partialResult('o/bravo', DOC_WITHOUT_GOVERNANCE),
      partialResult('o/charlie', DOC_WITH_GOVERNANCE),
    ]
    const panel = governanceAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(3)
    expect(panel.value).not.toBeNull()
    expect(panel.value!.orgLevel).toBeNull()

    const perRepo = panel.value!.perRepo
    expect(perRepo).toHaveLength(3)
    // Sorted alphabetically
    expect(perRepo.map((r) => r.repo)).toEqual(['o/alpha', 'o/bravo', 'o/charlie'])
    expect(perRepo.find((r) => r.repo === 'o/alpha')?.present).toBe(true)
    expect(perRepo.find((r) => r.repo === 'o/bravo')?.present).toBe(false)
    expect(perRepo.find((r) => r.repo === 'o/charlie')?.present).toBe(true)
  })

  it('all-unavailable: every repo has unavailable documentationResult → panel is unavailable', () => {
    const results = [
      partialResult('o/alpha', { documentationResult: 'unavailable' }),
      partialResult('o/bravo', { documentationResult: 'unavailable' }),
    ]
    const panel = governanceAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: unavailable repos do not contribute but available ones do', () => {
    const results = [
      partialResult('o/alpha', DOC_WITH_GOVERNANCE),
      partialResult('o/bravo', { documentationResult: 'unavailable' }),
      partialResult('o/charlie', DOC_WITHOUT_GOVERNANCE),
    ]
    const panel = governanceAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)
    expect(panel.value!.perRepo).toHaveLength(3)
    // Unavailable repos still appear in perRepo with present: false
    expect(panel.value!.perRepo.find((r) => r.repo === 'o/bravo')?.present).toBe(false)
  })

  it('empty: results array is empty → in-progress with null value', () => {
    const panel = governanceAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('.github repo is detected and surfaced as orgLevel', () => {
    const results = [
      partialResult('o/.github', DOC_WITH_GOVERNANCE),
      partialResult('o/alpha', DOC_WITHOUT_GOVERNANCE),
    ]
    const panel = governanceAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('final')
    expect(panel.value!.orgLevel).toEqual({ repo: 'o/.github', present: true })
    // .github repo also appears in perRepo
    expect(panel.value!.perRepo.find((r) => r.repo === 'o/.github')?.present).toBe(true)
  })
})
