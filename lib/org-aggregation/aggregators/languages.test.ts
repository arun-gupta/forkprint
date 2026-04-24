import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { languagesAggregator } from './languages'
import { buildResult } from '@/lib/testing/fixtures'

function partialResult(repo: string, override: Partial<AnalysisResult> = {}): AnalysisResult {
  return buildResult({ repo, name: repo, ...override })
}

const CONTEXT = { totalReposInRun: 3, flagshipRepos: [], inactiveRepoWindowMonths: 12 }

describe('languagesAggregator — FR-025', () => {
  it('typical: groups repos by primaryLanguage sorted by repoCount desc then alphabetically', () => {
    const results = [
      partialResult('o/alpha', { primaryLanguage: 'TypeScript' }),
      partialResult('o/bravo', { primaryLanguage: 'Go' }),
      partialResult('o/charlie', { primaryLanguage: 'TypeScript' }),
      partialResult('o/delta', { primaryLanguage: 'Go' }),
      partialResult('o/echo', { primaryLanguage: 'Rust' }),
    ]
    const panel = languagesAggregator(results, { ...CONTEXT, totalReposInRun: 5 })
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(5)
    expect(panel.value).not.toBeNull()

    const langs = panel.value!.perLanguage
    // Go and TypeScript tied at 2 each — alphabetical: Go first
    expect(langs[0]).toEqual({ language: 'Go', repoCount: 2 })
    expect(langs[1]).toEqual({ language: 'TypeScript', repoCount: 2 })
    expect(langs[2]).toEqual({ language: 'Rust', repoCount: 1 })
  })

  it('all-unavailable: every repo has primaryLanguage unavailable -> panel is unavailable', () => {
    const results = [
      partialResult('o/alpha', { primaryLanguage: 'unavailable' }),
      partialResult('o/bravo', { primaryLanguage: 'unavailable' }),
    ]
    const panel = languagesAggregator(results, { ...CONTEXT, totalReposInRun: 2 })
    expect(panel.status).toBe('unavailable')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })

  it('mixed: unavailable repos excluded; null/empty mapped to Unknown', () => {
    const results = [
      partialResult('o/alpha', { primaryLanguage: 'TypeScript' }),
      partialResult('o/bravo', { primaryLanguage: 'unavailable' }),
      partialResult('o/charlie', { primaryLanguage: '' }),
    ]
    const panel = languagesAggregator(results, CONTEXT)
    expect(panel.status).toBe('final')
    expect(panel.contributingReposCount).toBe(2)

    const langs = panel.value!.perLanguage
    expect(langs).toHaveLength(2)
    const byLang = Object.fromEntries(langs.map((l) => [l.language, l.repoCount]))
    expect(byLang.TypeScript).toBe(1)
    expect(byLang.Unknown).toBe(1)
  })

  it('empty: results array is empty -> in-progress with null value', () => {
    const panel = languagesAggregator([], { ...CONTEXT, totalReposInRun: 3 })
    expect(panel.status).toBe('in-progress')
    expect(panel.value).toBeNull()
    expect(panel.contributingReposCount).toBe(0)
  })
})
