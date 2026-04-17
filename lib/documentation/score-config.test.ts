import { describe, expect, it } from 'vitest'
import type { DocumentationResult, LicensingResult } from '@/lib/analyzer/analysis-result'
import { getDocumentationScore } from './score-config'

function buildDocResult(overrides: Partial<DocumentationResult> = {}): DocumentationResult {
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
    readmeContent: '# Project\n\nA great project.\n\n## Installation\n\nnpm install\n\n## Usage\n\nUse it.\n\n## Contributing\n\nPRs welcome.\n\n## License\n\nMIT',
    ...overrides,
  }
}

const fullLicensing: LicensingResult = {
  license: { spdxId: 'MIT', name: 'MIT License', osiApproved: true, permissivenessTier: 'Permissive' },
  additionalLicenses: [],
  contributorAgreement: { signedOffByRatio: 1.0, dcoOrClaBot: true, enforced: true },
}

const noLicensing: LicensingResult = {
  license: { spdxId: null, name: null, osiApproved: false, permissivenessTier: null },
  additionalLicenses: [],
  contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
}

const partialLicensing: LicensingResult = {
  license: { spdxId: 'MIT', name: 'MIT License', osiApproved: true, permissivenessTier: 'Permissive' },
  additionalLicenses: [],
  contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
}

describe('documentation/score-config', () => {
  describe('getDocumentationScore', () => {
    it('scores a fully documented repo with all files, sections, and licensing as 1.0', () => {
      const score = getDocumentationScore(buildDocResult(), fullLicensing, 1000)

      expect(score.filePresenceScore).toBe(1)
      expect(score.readmeQualityScore).toBe(1)
      expect(score.licensingScore).toBeCloseTo(1, 2)
      expect(score.compositeScore).toBeCloseTo(1, 2)
    })

    it('scores a repo with no documentation files and no license as 0', () => {
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: false, path: null },
          { name: 'license', found: false, path: null },
          { name: 'contributing', found: false, path: null },
          { name: 'code_of_conduct', found: false, path: null },
          { name: 'security', found: false, path: null },
          { name: 'changelog', found: false, path: null },
        ],
        readmeSections: [
          { name: 'description', detected: false },
          { name: 'installation', detected: false },
          { name: 'usage', detected: false },
          { name: 'contributing', detected: false },
          { name: 'license', detected: false },
        ],
        readmeContent: null,
      }), noLicensing, 1000)

      expect(score.filePresenceScore).toBe(0)
      expect(score.readmeQualityScore).toBe(0)
      expect(score.licensingScore).toBe(0)
      expect(score.compositeScore).toBe(0)
    })

    it('generates recommendations for each missing file (except license)', () => {
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: true, path: 'README.md' },
          { name: 'license', found: true, path: 'LICENSE' },
          { name: 'contributing', found: false, path: null },
          { name: 'code_of_conduct', found: false, path: null },
          { name: 'security', found: false, path: null },
          { name: 'changelog', found: false, path: null },
        ],
      }), fullLicensing, 1000)

      const fileRecs = score.recommendations.filter((r) => r.category === 'file')
      expect(fileRecs).toHaveLength(4)
      const items = fileRecs.map((r) => r.item)
      expect(items).toContain('contributing')
      expect(items).toContain('code_of_conduct')
      expect(items).toContain('security')
      expect(items).toContain('changelog')
      // License file is no longer in file recs — it's in licensing category
      expect(items).not.toContain('license')
    })

    it('emits a concrete governance recommendation with non-zero weight when GOVERNANCE.md is missing', () => {
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: true, path: 'README.md' },
          { name: 'license', found: true, path: 'LICENSE' },
          { name: 'contributing', found: true, path: 'CONTRIBUTING.md' },
          { name: 'code_of_conduct', found: true, path: 'CODE_OF_CONDUCT.md' },
          { name: 'security', found: true, path: 'SECURITY.md' },
          { name: 'changelog', found: true, path: 'CHANGELOG.md' },
          { name: 'governance', found: false, path: null },
        ],
      }), fullLicensing, 1000)

      const governanceRec = score.recommendations.find((r) => r.category === 'file' && r.item === 'governance')
      expect(governanceRec).toBeDefined()
      expect(governanceRec!.text).toContain('GOVERNANCE.md')
      expect(governanceRec!.text).not.toBe('Add governance')
      expect(governanceRec!.weight).toBeGreaterThan(0)
    })

    it('suppresses the governance recommendation when GOVERNANCE.md is present', () => {
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: true, path: 'README.md' },
          { name: 'license', found: true, path: 'LICENSE' },
          { name: 'contributing', found: true, path: 'CONTRIBUTING.md' },
          { name: 'code_of_conduct', found: true, path: 'CODE_OF_CONDUCT.md' },
          { name: 'security', found: true, path: 'SECURITY.md' },
          { name: 'changelog', found: true, path: 'CHANGELOG.md' },
          { name: 'governance', found: true, path: 'GOVERNANCE.md' },
        ],
      }), fullLicensing, 1000)

      const governanceRec = score.recommendations.find((r) => r.category === 'file' && r.item === 'governance')
      expect(governanceRec).toBeUndefined()
    })

    it('generates recommendations for each missing README section', () => {
      const score = getDocumentationScore(buildDocResult({
        readmeSections: [
          { name: 'description', detected: true },
          { name: 'installation', detected: false },
          { name: 'usage', detected: false },
          { name: 'contributing', detected: true },
          { name: 'license', detected: true },
        ],
      }), fullLicensing, 1000)

      const sectionRecs = score.recommendations.filter((r) => r.category === 'readme_section')
      expect(sectionRecs).toHaveLength(2)
      expect(sectionRecs.map((r) => r.item)).toEqual(['installation', 'usage'])
    })

    it('computes weighted file presence score excluding license', () => {
      // Only README (30%) present out of 5 scored files
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: true, path: 'README.md' },
          { name: 'license', found: true, path: 'LICENSE' },
          { name: 'contributing', found: false, path: null },
          { name: 'code_of_conduct', found: false, path: null },
          { name: 'security', found: false, path: null },
          { name: 'changelog', found: false, path: null },
        ],
      }), fullLicensing, 1000)

      // readme (0.30) only — license is not scored in file presence
      expect(score.filePresenceScore).toBeCloseTo(0.30, 2)
    })

    it('computes three-part composite correctly', () => {
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: true, path: 'README.md' },
          { name: 'license', found: true, path: 'LICENSE' },
          { name: 'contributing', found: false, path: null },
          { name: 'code_of_conduct', found: false, path: null },
          { name: 'security', found: false, path: null },
          { name: 'changelog', found: false, path: null },
        ],
        readmeSections: [
          { name: 'description', detected: true },
          { name: 'installation', detected: true },
          { name: 'usage', detected: false },
          { name: 'contributing', detected: false },
          { name: 'license', detected: false },
        ],
      }), partialLicensing, 1000)

      // filePresence = 0.30, readmeQuality = 0.50, licensing = 0.75 (MIT, OSI, tier, no DCO)
      // composite = 0.30 * 0.40 + 0.50 * 0.30 + 0.75 * 0.30 = 0.12 + 0.15 + 0.225 = 0.495
      expect(score.compositeScore).toBeCloseTo(0.495, 2)
    })

    it('falls back to two-part model when licensing is unavailable', () => {
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: true, path: 'README.md' },
          { name: 'license', found: true, path: 'LICENSE' },
          { name: 'contributing', found: false, path: null },
          { name: 'code_of_conduct', found: false, path: null },
          { name: 'security', found: false, path: null },
          { name: 'changelog', found: false, path: null },
        ],
        readmeSections: [
          { name: 'description', detected: true },
          { name: 'installation', detected: true },
          { name: 'usage', detected: false },
          { name: 'contributing', detected: false },
          { name: 'license', detected: false },
        ],
      }), 'unavailable', 1000)

      // filePresence = 0.30, readmeQuality = 0.50
      // fallback composite = 0.30 * 0.60 + 0.50 * 0.40 = 0.18 + 0.20 = 0.38
      expect(score.compositeScore).toBeCloseTo(0.38, 2)
      expect(score.licensingScore).toBe(0)
    })

    it('returns percentile and bracket label', () => {
      const score = getDocumentationScore(buildDocResult(), fullLicensing, 5000)

      expect(typeof score.value).toBe('number')
      expect(score.bracketLabel).toBe('Established (1k–10k stars)')
    })

    it('orders recommendations by weight descending', () => {
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: false, path: null },
          { name: 'license', found: false, path: null },
          { name: 'contributing', found: false, path: null },
          { name: 'code_of_conduct', found: false, path: null },
          { name: 'security', found: false, path: null },
          { name: 'changelog', found: false, path: null },
        ],
        readmeSections: [
          { name: 'description', detected: false },
          { name: 'installation', detected: false },
          { name: 'usage', detected: false },
          { name: 'contributing', detected: false },
          { name: 'license', detected: false },
        ],
        readmeContent: null,
      }), noLicensing, 1000)

      for (let i = 1; i < score.recommendations.length; i++) {
        expect(score.recommendations[i]!.weight).toBeLessThanOrEqual(score.recommendations[i - 1]!.weight)
      }
    })

    it('tags all recommendations with documentation bucket', () => {
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: false, path: null },
          { name: 'license', found: true, path: 'LICENSE' },
          { name: 'contributing', found: false, path: null },
          { name: 'code_of_conduct', found: true, path: 'CODE_OF_CONDUCT.md' },
          { name: 'security', found: true, path: 'SECURITY.md' },
          { name: 'changelog', found: true, path: 'CHANGELOG.md' },
        ],
      }), partialLicensing, 1000)

      for (const rec of score.recommendations) {
        expect(rec.bucket).toBe('documentation')
      }
    })
  })
})
