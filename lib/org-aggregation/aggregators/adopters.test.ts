import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import type { AggregationContext } from './types'
import { adoptersAggregator } from './adopters'
import { buildResult } from '@/lib/testing/fixtures'

function partialResult(repo: string, override: Partial<AnalysisResult> = {}): AnalysisResult {
  return buildResult({ repo, name: repo, ...override })
}

const CONTEXT: AggregationContext = {
  totalReposInRun: 3,
  flagshipRepos: [{ repo: 'o/alpha', source: 'pinned', rank: 0 }],
  inactiveRepoWindowMonths: 12,
}

describe('adoptersAggregator — FR-014', () => {
  it('typical: flagship repo has ADOPTERS.md → final with flagshipUsed', () => {
    const results = [
      partialResult('o/alpha', {
        documentationResult: {
          fileChecks: [
            { name: 'readme', found: true, path: 'README.md' },
            { name: 'contributing', found: true, path: 'ADOPTERS.md' },
          ],
          readmeSections: [],
          readmeContent: null,
        },
      }),
      partialResult('o/bravo', {
        documentationResult: {
          fileChecks: [{ name: 'readme', found: true, path: 'README.md' }],
          readmeSections: [],
          readmeContent: null,
        },
      }),
      partialResult('o/charlie', {
        documentationResult: {
          fileChecks: [{ name: 'readme', found: true, path: 'README.md' }],
          readmeSections: [],
          readmeContent: null,
        },
      }),
    ]
    const panel = adoptersAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(3)
    expect(panel.value).not.toBeNull()
    expect(panel.value!.flagshipUsed).toBe('o/alpha')
    expect(panel.value!.entries).toEqual([])
  })

  it('all-unavailable: every repo lacks documentationResult → panel is unavailable', () => {
    const results = [
      partialResult('o/alpha', { documentationResult: 'unavailable' }),
      partialResult('o/bravo', { documentationResult: 'unavailable' }),
    ]
    const panel = adoptersAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: no repo has ADOPTERS.md but some have docs → unavailable', () => {
    const results = [
      partialResult('o/alpha', {
        documentationResult: {
          fileChecks: [{ name: 'readme', found: true, path: 'README.md' }],
          readmeSections: [],
          readmeContent: null,
        },
      }),
      partialResult('o/bravo', { documentationResult: 'unavailable' }),
      partialResult('o/charlie', {
        documentationResult: {
          fileChecks: [{ name: 'license', found: true, path: 'LICENSE' }],
          readmeSections: [],
          readmeContent: null,
        },
      }),
    ]
    const panel = adoptersAggregator(results, CONTEXT)
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(2)
  })

  it('empty: results array is empty → in-progress with null value', () => {
    const panel = adoptersAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('flagship priority: flagship has ADOPTERS.md, non-flagship also has it → flagship wins', () => {
    const results = [
      partialResult('o/bravo', {
        documentationResult: {
          fileChecks: [
            { name: 'readme', found: true, path: 'README.md' },
            { name: 'contributing', found: true, path: 'docs/ADOPTERS.md' },
          ],
          readmeSections: [],
          readmeContent: null,
        },
      }),
      partialResult('o/alpha', {
        documentationResult: {
          fileChecks: [
            { name: 'readme', found: true, path: 'README.md' },
            { name: 'contributing', found: true, path: 'ADOPTERS.md' },
          ],
          readmeSections: [],
          readmeContent: null,
        },
      }),
    ]
    // o/bravo comes first in results but o/alpha is the flagship
    const panel = adoptersAggregator(results, {
      ...CONTEXT,
      totalReposInRun: 2,
      flagshipRepos: [{ repo: 'o/alpha', source: 'pinned', rank: 0 }],
    })
    expect(panel.status).toBe('final')
    expect(panel.value!.flagshipUsed).toBe('o/alpha')
  })

  it('fallback: no flagship has ADOPTERS.md but a non-flagship does → uses non-flagship', () => {
    const results = [
      partialResult('o/alpha', {
        documentationResult: {
          fileChecks: [{ name: 'readme', found: true, path: 'README.md' }],
          readmeSections: [],
          readmeContent: null,
        },
      }),
      partialResult('o/bravo', {
        documentationResult: {
          fileChecks: [
            { name: 'readme', found: true, path: 'README.md' },
            { name: 'contributing', found: true, path: 'ADOPTERS.md' },
          ],
          readmeSections: [],
          readmeContent: null,
        },
      }),
    ]
    const panel = adoptersAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('final')
    expect(panel.value!.flagshipUsed).toBe('o/bravo')
  })
})
