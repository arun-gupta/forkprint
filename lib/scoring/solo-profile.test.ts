import { describe, expect, it } from 'vitest'
import type { AnalysisResult, DocumentationResult } from '@/lib/analyzer/analysis-result'
import { SOLO_WEIGHTS, detectSoloProjectProfile } from './solo-profile'
import { buildResult as _buildResult } from '@/lib/testing/fixtures'

function docWithGovernance(found: boolean): DocumentationResult {
  return {
    fileChecks: [
      { name: 'readme', found: true, path: 'README.md' },
      { name: 'governance', found, path: found ? 'GOVERNANCE.md' : null },
    ],
    readmeSections: [],
    readmeContent: null,
  }
}

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return _buildResult({
    uniqueCommitAuthors90d: 1,
    totalContributors: 1,
    commitCountsByAuthor: { 'login:alice': 5 },
    documentationResult: docWithGovernance(false),
    ...overrides,
  })
}

describe('SOLO_WEIGHTS', () => {
  it('sums to 1.00', () => {
    const total = SOLO_WEIGHTS.activity + SOLO_WEIGHTS.security + SOLO_WEIGHTS.documentation
    expect(total).toBeCloseTo(1, 10)
  })
})

describe('detectSoloProjectProfile', () => {
  it('classifies a 1-contributor, no-governance repo as solo (4/4)', () => {
    const d = detectSoloProjectProfile(buildResult())
    expect(d.isSolo).toBe(true)
    expect(d.trippedCount).toBe(4)
  })

  it('classifies a community repo as not solo', () => {
    const d = detectSoloProjectProfile(buildResult({
      totalContributors: 50,
      uniqueCommitAuthors90d: 20,
      maintainerCount: 4,
      documentationResult: docWithGovernance(true),
    }))
    expect(d.isSolo).toBe(false)
    expect(d.trippedCount).toBe(0)
  })

  it('trips at 3 of 4 criteria', () => {
    // totalContributors and uniqueCommitAuthors90d and maintainerCount trip;
    // governance is present so criterion 4 does not trip.
    const d = detectSoloProjectProfile(buildResult({
      totalContributors: 2,
      uniqueCommitAuthors90d: 2,
      maintainerCount: 1,
      documentationResult: docWithGovernance(true),
    }))
    expect(d.isSolo).toBe(true)
    expect(d.trippedCount).toBe(3)
    expect(d.tripped.noGovernance).toBe(false)
  })

  it('does not trip at 2 of 4 criteria', () => {
    const d = detectSoloProjectProfile(buildResult({
      totalContributors: 10,
      uniqueCommitAuthors90d: 10,
      maintainerCount: 1,
      documentationResult: docWithGovernance(false),
    }))
    expect(d.isSolo).toBe(false)
    expect(d.trippedCount).toBe(2)
  })

  it("treats maintainerCount === 'unavailable' as tripping criterion 3", () => {
    const d = detectSoloProjectProfile(buildResult({
      totalContributors: 1,
      uniqueCommitAuthors90d: 1,
      maintainerCount: 'unavailable',
      documentationResult: docWithGovernance(true),
    }))
    expect(d.tripped.maintainerCount).toBe(true)
    expect(d.isSolo).toBe(true)
  })

  it("treats documentationResult === 'unavailable' as tripping criterion 4 (no verified governance)", () => {
    const d = detectSoloProjectProfile(buildResult({
      totalContributors: 1,
      uniqueCommitAuthors90d: 1,
      maintainerCount: 2,
      documentationResult: 'unavailable',
    }))
    expect(d.tripped.noGovernance).toBe(true)
    expect(d.isSolo).toBe(true)
  })

  it("does not trip totalContributors when value is 'unavailable'", () => {
    const d = detectSoloProjectProfile(buildResult({
      totalContributors: 'unavailable',
      uniqueCommitAuthors90d: 10,
      maintainerCount: 5,
      documentationResult: docWithGovernance(true),
    }))
    expect(d.tripped.totalContributors).toBe(false)
    expect(d.isSolo).toBe(false)
  })

  it('edge: exactly 3 (e.g. 2 contributors / 3 authors / 1 maintainer / no governance) trips solo', () => {
    const d = detectSoloProjectProfile(buildResult({
      totalContributors: 2,
      uniqueCommitAuthors90d: 3, // not tripping
      maintainerCount: 1,
      documentationResult: docWithGovernance(false),
    }))
    expect(d.tripped.uniqueCommitAuthors90d).toBe(false)
    expect(d.trippedCount).toBe(3)
    expect(d.isSolo).toBe(true)
  })
})
