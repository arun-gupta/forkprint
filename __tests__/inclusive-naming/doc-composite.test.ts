import { describe, expect, it } from 'vitest'
import type { DocumentationResult, LicensingResult, InclusiveNamingResult } from '@/lib/analyzer/analysis-result'
import { getDocumentationScore } from '@/lib/documentation/score-config'

function buildDocResult(): DocumentationResult {
  return {
    fileChecks: [
      { name: 'readme', found: true, path: 'README.md' },
      { name: 'license', found: true, path: 'LICENSE' },
      { name: 'contributing', found: true, path: 'CONTRIBUTING.md' },
      { name: 'code_of_conduct', found: true, path: 'CODE_OF_CONDUCT.md' },
      { name: 'security', found: true, path: 'SECURITY.md' },
      { name: 'changelog', found: true, path: 'CHANGELOG.md' },
    ],
    readmeSections: [
      { name: 'description', detected: true },
      { name: 'installation', detected: true },
      { name: 'usage', detected: true },
      { name: 'contributing', detected: true },
      { name: 'license', detected: true },
    ],
    readmeContent: '# Test',
  }
}

function buildLicensingResult(): LicensingResult {
  return {
    license: { spdxId: 'MIT', name: 'MIT License', osiApproved: true, permissivenessTier: 'Permissive' },
    additionalLicenses: [],
    contributorAgreement: { signedOffByRatio: 1.0, dcoOrClaBot: true, enforced: true },
  }
}

function buildInclusiveNamingResult(overrides: Partial<InclusiveNamingResult> = {}): InclusiveNamingResult {
  return {
    defaultBranchName: 'main',
    branchCheck: { checkType: 'branch', term: 'main', passed: true, tier: null, severity: null, replacements: [], context: null },
    metadataChecks: [],
    ...overrides,
  }
}

describe('Documentation four-part composite', () => {
  it('uses 35/30/25/10 weights when inclusive naming is available', () => {
    const score = getDocumentationScore(buildDocResult(), buildLicensingResult(), 1000, buildInclusiveNamingResult())
    // All sub-scores are 1.0: 0.35 + 0.30 + 0.25 + 0.10 = 1.0
    expect(score.compositeScore).toBeCloseTo(1.0, 2)
    expect(score.inclusiveNamingScore).toBeCloseTo(1.0, 2)
  })

  it('reduces composite when inclusive naming fails', () => {
    const iniResult = buildInclusiveNamingResult({
      defaultBranchName: 'master',
      branchCheck: {
        checkType: 'branch', term: 'master', passed: false, tier: 1,
        severity: 'Replace immediately', replacements: ['main'], context: 'Default branch: master',
      },
    })
    const score = getDocumentationScore(buildDocResult(), buildLicensingResult(), 1000, iniResult)
    // INI composite: 0.0 * 0.70 + 1.0 * 0.30 = 0.30
    // Doc composite: 1.0*0.35 + 1.0*0.30 + 1.0*0.25 + 0.30*0.10 = 0.35+0.30+0.25+0.03 = 0.93
    expect(score.compositeScore).toBeCloseTo(0.93, 2)
    expect(score.inclusiveNamingScore).toBeCloseTo(0.30, 2)
  })

  it('falls back to three-part (40/30/30) when inclusive naming unavailable', () => {
    const score = getDocumentationScore(buildDocResult(), buildLicensingResult(), 1000, 'unavailable')
    // All sub-scores 1.0: 0.40 + 0.30 + 0.30 = 1.0
    expect(score.compositeScore).toBeCloseTo(1.0, 2)
    expect(score.inclusiveNamingScore).toBe(0)
  })

  it('falls back to two-part when both licensing and inclusive naming unavailable', () => {
    const score = getDocumentationScore(buildDocResult(), 'unavailable', 1000, 'unavailable')
    // 1.0*0.60 + 1.0*0.40 = 1.0
    expect(score.compositeScore).toBeCloseTo(1.0, 2)
  })

  it('includes inclusive naming recommendations in output', () => {
    const iniResult = buildInclusiveNamingResult({
      defaultBranchName: 'master',
      branchCheck: {
        checkType: 'branch', term: 'master', passed: false, tier: 1,
        severity: 'Replace immediately', replacements: ['main'], context: 'Default branch: master',
      },
    })
    const score = getDocumentationScore(buildDocResult(), buildLicensingResult(), 1000, iniResult)
    const iniRecs = score.recommendations.filter((r) => r.category === 'inclusive_naming')
    expect(iniRecs.length).toBeGreaterThan(0)
    expect(iniRecs[0].text).toContain('inclusivenaming.org')
  })
})
