import { describe, expect, it } from 'vitest'
import type { InclusiveNamingResult } from '@/lib/analyzer/analysis-result'
import { getInclusiveNamingScore } from '@/lib/inclusive-naming/score-config'

function buildResult(overrides: Partial<InclusiveNamingResult> = {}): InclusiveNamingResult {
  return {
    defaultBranchName: 'main',
    branchCheck: {
      checkType: 'branch',
      term: 'main',
      passed: true,
      tier: null,
      severity: null,
      replacements: [],
      context: null,
    },
    metadataChecks: [],
    ...overrides,
  }
}

describe('getInclusiveNamingScore', () => {
  it('scores 1.0 for repo with no issues', () => {
    const { compositeScore, branchScore, metadataScore } = getInclusiveNamingScore(buildResult())
    expect(branchScore).toBe(1.0)
    expect(metadataScore).toBe(1.0)
    expect(compositeScore).toBeCloseTo(1.0, 2)
  })

  it('scores 0 for branch when default branch is master', () => {
    const { branchScore, compositeScore } = getInclusiveNamingScore(buildResult({
      defaultBranchName: 'master',
      branchCheck: {
        checkType: 'branch',
        term: 'master',
        passed: false,
        tier: 1,
        severity: 'Replace immediately',
        replacements: ['main'],
        context: 'Default branch: master',
      },
    }))
    expect(branchScore).toBe(0.0)
    // 0.0 * 0.70 + 1.0 * 0.30 = 0.30
    expect(compositeScore).toBeCloseTo(0.30, 2)
  })

  it('applies Tier 1 penalty to metadata score', () => {
    const { metadataScore } = getInclusiveNamingScore(buildResult({
      metadataChecks: [{
        checkType: 'description',
        term: 'whitelist',
        passed: false,
        tier: 1,
        severity: 'Replace immediately',
        replacements: ['allowlist'],
        context: 'Repository description',
      }],
    }))
    // 1.0 - 0.25 = 0.75
    expect(metadataScore).toBeCloseTo(0.75, 2)
  })

  it('applies Tier 2 penalty to metadata score', () => {
    const { metadataScore } = getInclusiveNamingScore(buildResult({
      metadataChecks: [{
        checkType: 'description',
        term: 'sanity-check',
        passed: false,
        tier: 2,
        severity: 'Recommended to replace',
        replacements: ['confidence check'],
        context: 'Repository description',
      }],
    }))
    // 1.0 - 0.15 = 0.85
    expect(metadataScore).toBeCloseTo(0.85, 2)
  })

  it('applies Tier 3 penalty to metadata score', () => {
    const { metadataScore } = getInclusiveNamingScore(buildResult({
      metadataChecks: [{
        checkType: 'description',
        term: 'blast-radius',
        passed: false,
        tier: 3,
        severity: 'Consider replacing',
        replacements: ['extent'],
        context: 'Repository description',
      }],
    }))
    // 1.0 - 0.10 = 0.90
    expect(metadataScore).toBeCloseTo(0.90, 2)
  })

  it('accumulates penalties from multiple terms', () => {
    const { metadataScore } = getInclusiveNamingScore(buildResult({
      metadataChecks: [
        {
          checkType: 'description', term: 'whitelist', passed: false, tier: 1,
          severity: 'Replace immediately', replacements: ['allowlist'], context: 'Repository description',
        },
        {
          checkType: 'description', term: 'blacklist', passed: false, tier: 1,
          severity: 'Replace immediately', replacements: ['denylist'], context: 'Repository description',
        },
      ],
    }))
    // 1.0 - 0.25 - 0.25 = 0.50
    expect(metadataScore).toBeCloseTo(0.50, 2)
  })

  it('floors metadata score at 0.0', () => {
    const { metadataScore } = getInclusiveNamingScore(buildResult({
      metadataChecks: [
        { checkType: 'description', term: 'whitelist', passed: false, tier: 1, severity: 'Replace immediately', replacements: ['allowlist'], context: null },
        { checkType: 'description', term: 'blacklist', passed: false, tier: 1, severity: 'Replace immediately', replacements: ['denylist'], context: null },
        { checkType: 'description', term: 'master-slave', passed: false, tier: 1, severity: 'Replace immediately', replacements: ['primary/replica'], context: null },
        { checkType: 'description', term: 'grandfathered', passed: false, tier: 1, severity: 'Replace immediately', replacements: ['legacy'], context: null },
        { checkType: 'description', term: 'cripple', passed: false, tier: 1, severity: 'Replace immediately', replacements: ['degraded'], context: null },
      ],
    }))
    expect(metadataScore).toBe(0.0)
  })

  it('generates recommendation for master branch', () => {
    const { recommendations } = getInclusiveNamingScore(buildResult({
      defaultBranchName: 'master',
      branchCheck: {
        checkType: 'branch', term: 'master', passed: false, tier: 1,
        severity: 'Replace immediately', replacements: ['main'], context: 'Default branch: master',
      },
    }))
    expect(recommendations.length).toBe(1)
    expect(recommendations[0].item).toBe('branch:master')
    expect(recommendations[0].tier).toBe(1)
    expect(recommendations[0].text).toContain('inclusivenaming.org')
  })

  it('generates recommendations with correct severity labels', () => {
    const { recommendations } = getInclusiveNamingScore(buildResult({
      metadataChecks: [
        { checkType: 'description', term: 'whitelist', passed: false, tier: 1, severity: 'Replace immediately', replacements: ['allowlist'], context: 'Repository description' },
        { checkType: 'description', term: 'sanity-check', passed: false, tier: 2, severity: 'Recommended to replace', replacements: ['confidence check'], context: 'Repository description' },
      ],
    }))
    const tier1Rec = recommendations.find((r) => r.tier === 1)
    const tier2Rec = recommendations.find((r) => r.tier === 2)
    expect(tier1Rec!.severity).toBe('Replace immediately')
    expect(tier2Rec!.severity).toBe('Recommended to replace')
  })

  it('composite uses 70/30 weighting', () => {
    // Branch fails (0), metadata passes (1)
    const result = getInclusiveNamingScore(buildResult({
      defaultBranchName: 'master',
      branchCheck: {
        checkType: 'branch', term: 'master', passed: false, tier: 1,
        severity: 'Replace immediately', replacements: ['main'], context: 'Default branch: master',
      },
    }))
    // 0.0 * 0.70 + 1.0 * 0.30 = 0.30
    expect(result.compositeScore).toBeCloseTo(0.30, 2)

    // Branch passes (1), metadata has one T1 penalty (0.75)
    const result2 = getInclusiveNamingScore(buildResult({
      metadataChecks: [{
        checkType: 'description', term: 'whitelist', passed: false, tier: 1,
        severity: 'Replace immediately', replacements: ['allowlist'], context: 'Repository description',
      }],
    }))
    // 1.0 * 0.70 + 0.75 * 0.30 = 0.925
    expect(result2.compositeScore).toBeCloseTo(0.925, 2)
  })

  it('generates no recommendations for clean repo', () => {
    const { recommendations } = getInclusiveNamingScore(buildResult())
    expect(recommendations.length).toBe(0)
  })
})
