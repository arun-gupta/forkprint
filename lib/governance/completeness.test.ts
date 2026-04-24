import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { computeGovernanceCompleteness } from './completeness'
import { buildResult } from '@/lib/testing/fixtures'

describe('computeGovernanceCompleteness', () => {
  it('all-unknown bare fixture → ratio=null, percentile=null, neutral tone', () => {
    const g = computeGovernanceCompleteness(buildResult())
    expect(g.unknown.length).toBe(8)
    expect(g.present.length + g.missing.length).toBe(0)
    expect(g.ratio).toBeNull()
    expect(g.percentile).toBeNull()
    expect(g.tone).toBe('neutral')
  })

  it('mixed: counts signals across all three categories (invariant total=8)', () => {
    const g = computeGovernanceCompleteness(buildResult({
      maintainerCount: 3,
      documentationResult: {
        fileChecks: [
          { name: 'license', found: true, path: 'LICENSE' },
          { name: 'contributing', found: false, path: null },
          { name: 'code_of_conduct', found: true, path: 'CODE_OF_CONDUCT.md' },
          { name: 'security', found: false, path: null },
          { name: 'changelog', found: false, path: null },
        ],
        readmeSections: [],
        readmeContent: null,
      },
      securityResult: {
        scorecard: {
          overallScore: 7,
          checks: [{ name: 'Code-Review', score: 8, reason: 'reviews' }],
          scorecardVersion: 'v4',
        },
        directChecks: [
          { name: 'branch_protection', detected: true, details: null },
        ],
        branchProtectionEnabled: true,
      },
    }))

    // present: license, code_of_conduct, branch_protection, code_review, maintainers → 5
    // missing: contributing, security, changelog → 3
    // unknown: 0
    expect(g.present.length + g.missing.length + g.unknown.length).toBe(8)
    expect(g.present).toEqual(expect.arrayContaining(['license', 'code_of_conduct', 'branch_protection', 'code_review', 'maintainers']))
    expect(g.missing).toEqual(expect.arrayContaining(['contributing', 'security', 'changelog']))
    expect(g.ratio).toBeCloseTo(5 / 8, 5)
    expect(g.percentile).toBeGreaterThan(0)
  })

  it('all-present → ratio=1, percentile=99', () => {
    const g = computeGovernanceCompleteness(buildResult({
      maintainerCount: 2,
      documentationResult: {
        fileChecks: [
          { name: 'license', found: true, path: 'LICENSE' },
          { name: 'contributing', found: true, path: 'CONTRIBUTING.md' },
          { name: 'code_of_conduct', found: true, path: 'CODE_OF_CONDUCT.md' },
          { name: 'security', found: true, path: 'SECURITY.md' },
          { name: 'changelog', found: true, path: 'CHANGELOG.md' },
        ],
        readmeSections: [],
        readmeContent: null,
      },
      securityResult: {
        scorecard: {
          overallScore: 9,
          checks: [{ name: 'Code-Review', score: 9, reason: 'ok' }],
          scorecardVersion: 'v4',
        },
        directChecks: [{ name: 'branch_protection', detected: true, details: null }],
        branchProtectionEnabled: true,
      },
    }))
    expect(g.present.length).toBe(8)
    expect(g.missing.length).toBe(0)
    expect(g.ratio).toBe(1)
    expect(g.percentile).toBe(99)
    expect(g.tone).not.toBe('neutral')
  })

  it('all-missing → ratio=0, percentile=0', () => {
    const g = computeGovernanceCompleteness(buildResult({
      maintainerCount: 0,
      documentationResult: {
        fileChecks: [
          { name: 'license', found: false, path: null },
          { name: 'contributing', found: false, path: null },
          { name: 'code_of_conduct', found: false, path: null },
          { name: 'security', found: false, path: null },
          { name: 'changelog', found: false, path: null },
        ],
        readmeSections: [],
        readmeContent: null,
      },
      securityResult: {
        scorecard: {
          overallScore: 1,
          checks: [{ name: 'Code-Review', score: 0, reason: 'none' }],
          scorecardVersion: 'v4',
        },
        directChecks: [{ name: 'branch_protection', detected: false, details: null }],
        branchProtectionEnabled: false,
      },
    }))
    expect(g.missing.length).toBe(8)
    expect(g.ratio).toBe(0)
    expect(g.percentile).toBe(0)
  })

  it('invariant: present + missing + unknown always = 8', () => {
    const cases: Partial<AnalysisResult>[] = [
      { maintainerCount: 5 },
      { maintainerCount: 0 },
      {
        documentationResult: {
          fileChecks: [{ name: 'license', found: true, path: 'LICENSE' }],
          readmeSections: [],
          readmeContent: null,
        },
      },
      {
        securityResult: {
          scorecard: 'unavailable',
          directChecks: [{ name: 'branch_protection', detected: true, details: null }],
          branchProtectionEnabled: true,
        },
      },
    ]
    for (const overrides of cases) {
      const g = computeGovernanceCompleteness(buildResult(overrides))
      expect(g.present.length + g.missing.length + g.unknown.length).toBe(8)
    }
  })

  it('excludes unknowns from both numerator and denominator', () => {
    // Only one known signal (maintainers present). Everything else unknown.
    const g = computeGovernanceCompleteness(buildResult({ maintainerCount: 4 }))
    expect(g.present).toContain('maintainers')
    expect(g.ratio).toBe(1)
    expect(g.percentile).toBe(99)
  })

  it('Code-Review score between 0 and threshold counts as missing; score=-1 as unknown', () => {
    const belowThreshold = computeGovernanceCompleteness(buildResult({
      securityResult: {
        scorecard: {
          overallScore: 5,
          checks: [{ name: 'Code-Review', score: 5, reason: 'partial' }],
          scorecardVersion: 'v4',
        },
        directChecks: [],
        branchProtectionEnabled: 'unavailable',
      },
    }))
    expect(belowThreshold.missing).toContain('code_review')

    const indeterminate = computeGovernanceCompleteness(buildResult({
      securityResult: {
        scorecard: {
          overallScore: 5,
          checks: [{ name: 'Code-Review', score: -1, reason: 'unknown' }],
          scorecardVersion: 'v4',
        },
        directChecks: [],
        branchProtectionEnabled: 'unavailable',
      },
    }))
    expect(indeterminate.unknown).toContain('code_review')
  })
})
