import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildResult, INCLUSIVE_NAMING_CLEAN } from './fixtures'

// CON-02 compile-time guard: the return type must satisfy AnalysisResult
// without unsafe casts. If any required field is removed from AnalysisResult
// or its type changes incompatibly, this line will fail to compile.
const _typeGuard: AnalysisResult = buildResult() satisfies AnalysisResult

describe('buildResult', () => {
  it('returns a valid AnalysisResult with all required fields', () => {
    const result = buildResult()
    expect(result.repo).toBe('owner/repo')
    expect(result.missingFields).toEqual([])
    expect(result.topics).toEqual([])
  })

  it('applies overrides over the defaults', () => {
    const result = buildResult({ repo: 'facebook/react', stars: 244295 })
    expect(result.repo).toBe('facebook/react')
    expect(result.stars).toBe(244295)
    expect(result.forks).toBe('unavailable')
  })

  it('overrides inclusiveNamingResult with INCLUSIVE_NAMING_CLEAN', () => {
    const result = buildResult({ inclusiveNamingResult: INCLUSIVE_NAMING_CLEAN })
    expect(result.inclusiveNamingResult).toBe(INCLUSIVE_NAMING_CLEAN)
  })
})
