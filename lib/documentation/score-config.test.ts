import { describe, expect, it } from 'vitest'
import type { DocumentationResult, InclusiveNamingResult, LicensingResult } from '@/lib/analyzer/analysis-result'
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
    adoptersFile: false,
    roadmapFile: false,
    maintainersFile: false,
    cocContent: null,
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

  // Regression guard for issue #233: arun-gupta/repo-pulse (Growing bracket,
  // 3 of 9 canonical files, 3 of 5 README sections, MIT + OSI, no DCO/CLA,
  // clean inclusive naming) landed at 90+ percentile prior to the #152
  // documentation recalibration + composite re-weighting. The fix aligned the
  // calibrator formula with the runtime (INI + community templates) and
  // shifted composite weights toward File Presence (0.50/0.25/0.15/0.10).
  // Test bound ≤ 85 catches a regression back to 90+ while tolerating small
  // anchor shifts from future recalibrations. The residual gap to ≤ p75
  // reflects sample bias (growing-tier repos are genuinely documentation-
  // light) rather than formula error — sample-curation work tracked in #152.
  describe('documentation percentile regression (issue #233)', () => {
    const repoPulseDocResult: DocumentationResult = {
      fileChecks: [
        { name: 'readme', found: true, path: 'README.md' },
        { name: 'license', found: true, path: 'LICENSE' },
        { name: 'contributing', found: true, path: 'CONTRIBUTING.md' },
        { name: 'code_of_conduct', found: false, path: null },
        { name: 'security', found: false, path: null },
        { name: 'changelog', found: false, path: null },
        { name: 'issue_templates', found: false, path: null },
        { name: 'pull_request_template', found: false, path: null },
        { name: 'governance', found: false, path: null },
      ],
      readmeSections: [
        { name: 'description', detected: true },
        { name: 'installation', detected: true },
        { name: 'usage', detected: false },
        { name: 'contributing', detected: true },
        { name: 'license', detected: false },
      ],
      readmeContent: '# repo-pulse\n\nA GitHub health scorecard.\n\n## Getting Started\n\nnpm install\n\n## Contributing\n\nPRs welcome.',
      adoptersFile: false,
      roadmapFile: false,
      maintainersFile: false,
      cocContent: null,
    }

    const repoPulseLicensing: LicensingResult = {
      license: { spdxId: 'MIT', name: 'MIT License', osiApproved: true, permissivenessTier: 'Permissive' },
      additionalLicenses: [],
      contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
    }

    const cleanInclusiveNaming: InclusiveNamingResult = {
      defaultBranchName: 'main',
      branchCheck: { checkType: 'branch', term: 'main', passed: true, tier: null, severity: null, replacements: [], context: null },
      metadataChecks: [],
    }

    it('lands at or below the 85th percentile in the Growing bracket', () => {
      const score = getDocumentationScore(
        repoPulseDocResult,
        repoPulseLicensing,
        500, // Growing bracket (100–999 stars)
        cleanInclusiveNaming,
      )

      expect(typeof score.value).toBe('number')
      if (typeof score.value === 'number') {
        // Regression bound: catches the pre-fix 90+ state. Tighter targets
        // require sample curation per #152.
        expect(score.value).toBeLessThanOrEqual(85)
      }
    })
  })

  describe('release health bonuses (P2-F09 / #69)', () => {
    it('adds bonus points when semver / notes / tag-promotion signals are strong', () => {
      const baseline = getDocumentationScore(buildDocResult(), fullLicensing, 1000)
      const withRelease = getDocumentationScore(buildDocResult(), fullLicensing, 1000, undefined, 'community', {
        totalReleasesAnalyzed: 10,
        totalTags: 10,
        releaseFrequency: 8,
        daysSinceLastRelease: 30,
        semverComplianceRatio: 1,
        releaseNotesQualityRatio: 1,
        tagToReleaseRatio: 0,
        preReleaseRatio: 0,
        versioningScheme: 'semver',
      })
      expect(withRelease.percentile).not.toBeNull()
      if (typeof baseline.value === 'number' && typeof withRelease.value === 'number') {
        expect(withRelease.value).toBeGreaterThanOrEqual(baseline.value)
      }
    })

    it('absence of release-health signals preserves the baseline documentation score', () => {
      const baseline = getDocumentationScore(buildDocResult(), fullLicensing, 1000)
      const withUnavailable = getDocumentationScore(buildDocResult(), fullLicensing, 1000, undefined, 'community', 'unavailable')
      expect(withUnavailable.value).toBe(baseline.value)
    })

    it('clamps the total percentile to [0, 99] even with max bonuses applied', () => {
      const score = getDocumentationScore(buildDocResult(), fullLicensing, 1000, undefined, 'community', {
        totalReleasesAnalyzed: 100,
        totalTags: 100,
        releaseFrequency: 24,
        daysSinceLastRelease: 1,
        semverComplianceRatio: 1,
        releaseNotesQualityRatio: 1,
        tagToReleaseRatio: 0,
        preReleaseRatio: 0,
        versioningScheme: 'semver',
      })
      if (typeof score.value === 'number') {
        expect(score.value).toBeLessThanOrEqual(99)
        expect(score.value).toBeGreaterThanOrEqual(0)
      }
    })
  })
})
