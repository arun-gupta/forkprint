import { describe, expect, it } from 'vitest'
import type { DocumentationResult } from '@/lib/analyzer/analysis-result'
import { getDocumentationScore } from './score-config'

function buildDocResult(overrides: Partial<DocumentationResult> = {}): DocumentationResult {
  return {
    fileChecks: [
      { name: 'readme', found: true, path: 'README.md', licenseType: null },
      { name: 'license', found: true, path: 'LICENSE', licenseType: 'MIT' },
      { name: 'contributing', found: true, path: 'CONTRIBUTING.md', licenseType: null },
      { name: 'code_of_conduct', found: true, path: 'CODE_OF_CONDUCT.md', licenseType: null },
      { name: 'security', found: true, path: 'SECURITY.md', licenseType: null },
      { name: 'changelog', found: true, path: 'CHANGELOG.md', licenseType: null },
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

describe('documentation/score-config', () => {
  describe('getDocumentationScore', () => {
    it('scores a fully documented repo with all files and sections', () => {
      const score = getDocumentationScore(buildDocResult(), 1000)

      expect(score.filePresenceScore).toBe(1)
      expect(score.readmeQualityScore).toBe(1)
      expect(score.compositeScore).toBe(1)
      expect(score.recommendations).toHaveLength(0)
    })

    it('scores a repo with no documentation files as 0', () => {
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: false, path: null, licenseType: null },
          { name: 'license', found: false, path: null, licenseType: null },
          { name: 'contributing', found: false, path: null, licenseType: null },
          { name: 'code_of_conduct', found: false, path: null, licenseType: null },
          { name: 'security', found: false, path: null, licenseType: null },
          { name: 'changelog', found: false, path: null, licenseType: null },
        ],
        readmeSections: [
          { name: 'description', detected: false },
          { name: 'installation', detected: false },
          { name: 'usage', detected: false },
          { name: 'contributing', detected: false },
          { name: 'license', detected: false },
        ],
        readmeContent: null,
      }), 1000)

      expect(score.filePresenceScore).toBe(0)
      expect(score.readmeQualityScore).toBe(0)
      expect(score.compositeScore).toBe(0)
      expect(score.recommendations).toHaveLength(11) // 6 files + 5 sections
    })

    it('generates recommendations for each missing file', () => {
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: true, path: 'README.md', licenseType: null },
          { name: 'license', found: true, path: 'LICENSE', licenseType: 'MIT' },
          { name: 'contributing', found: false, path: null, licenseType: null },
          { name: 'code_of_conduct', found: false, path: null, licenseType: null },
          { name: 'security', found: false, path: null, licenseType: null },
          { name: 'changelog', found: false, path: null, licenseType: null },
        ],
      }), 1000)

      const fileRecs = score.recommendations.filter((r) => r.category === 'file')
      expect(fileRecs).toHaveLength(4)
      const items = fileRecs.map((r) => r.item)
      expect(items).toContain('contributing')
      expect(items).toContain('code_of_conduct')
      expect(items).toContain('security')
      expect(items).toContain('changelog')
      expect(fileRecs.find((r) => r.item === 'contributing')!.text).toContain('contributing guidelines')
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
      }), 1000)

      const sectionRecs = score.recommendations.filter((r) => r.category === 'readme_section')
      expect(sectionRecs).toHaveLength(2)
      expect(sectionRecs.map((r) => r.item)).toEqual(['installation', 'usage'])
      expect(sectionRecs[0]!.text).toContain('installation')
    })

    it('computes weighted file presence score correctly', () => {
      // Only README (25%) and LICENSE (20%) present = 0.45
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: true, path: 'README.md', licenseType: null },
          { name: 'license', found: true, path: 'LICENSE', licenseType: 'MIT' },
          { name: 'contributing', found: false, path: null, licenseType: null },
          { name: 'code_of_conduct', found: false, path: null, licenseType: null },
          { name: 'security', found: false, path: null, licenseType: null },
          { name: 'changelog', found: false, path: null, licenseType: null },
        ],
      }), 1000)

      expect(score.filePresenceScore).toBeCloseTo(0.45, 2)
    })

    it('computes weighted README quality score correctly', () => {
      // Only description (25%) and installation (25%) detected = 0.50
      const score = getDocumentationScore(buildDocResult({
        readmeSections: [
          { name: 'description', detected: true },
          { name: 'installation', detected: true },
          { name: 'usage', detected: false },
          { name: 'contributing', detected: false },
          { name: 'license', detected: false },
        ],
      }), 1000)

      expect(score.readmeQualityScore).toBeCloseTo(0.50, 2)
    })

    it('computes composite as 60% file + 40% readme', () => {
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: true, path: 'README.md', licenseType: null },
          { name: 'license', found: true, path: 'LICENSE', licenseType: 'MIT' },
          { name: 'contributing', found: false, path: null, licenseType: null },
          { name: 'code_of_conduct', found: false, path: null, licenseType: null },
          { name: 'security', found: false, path: null, licenseType: null },
          { name: 'changelog', found: false, path: null, licenseType: null },
        ],
        readmeSections: [
          { name: 'description', detected: true },
          { name: 'installation', detected: true },
          { name: 'usage', detected: false },
          { name: 'contributing', detected: false },
          { name: 'license', detected: false },
        ],
      }), 1000)

      // 0.45 * 0.6 + 0.50 * 0.4 = 0.27 + 0.20 = 0.47
      expect(score.compositeScore).toBeCloseTo(0.47, 2)
    })

    it('returns percentile and bracket label', () => {
      const score = getDocumentationScore(buildDocResult(), 5000)

      expect(typeof score.value).toBe('number')
      expect(score.bracketLabel).toBe('Established (1k–10k stars)')
    })

    it('orders recommendations by weight descending', () => {
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: false, path: null, licenseType: null },
          { name: 'license', found: false, path: null, licenseType: null },
          { name: 'contributing', found: false, path: null, licenseType: null },
          { name: 'code_of_conduct', found: false, path: null, licenseType: null },
          { name: 'security', found: false, path: null, licenseType: null },
          { name: 'changelog', found: false, path: null, licenseType: null },
        ],
        readmeSections: [
          { name: 'description', detected: false },
          { name: 'installation', detected: false },
          { name: 'usage', detected: false },
          { name: 'contributing', detected: false },
          { name: 'license', detected: false },
        ],
        readmeContent: null,
      }), 1000)

      for (let i = 1; i < score.recommendations.length; i++) {
        expect(score.recommendations[i]!.weight).toBeLessThanOrEqual(score.recommendations[i - 1]!.weight)
      }
    })

    it('tags all recommendations with documentation bucket', () => {
      const score = getDocumentationScore(buildDocResult({
        fileChecks: [
          { name: 'readme', found: false, path: null, licenseType: null },
          { name: 'license', found: true, path: 'LICENSE', licenseType: 'MIT' },
          { name: 'contributing', found: false, path: null, licenseType: null },
          { name: 'code_of_conduct', found: true, path: 'CODE_OF_CONDUCT.md', licenseType: null },
          { name: 'security', found: true, path: 'SECURITY.md', licenseType: null },
          { name: 'changelog', found: true, path: 'CHANGELOG.md', licenseType: null },
        ],
      }), 1000)

      for (const rec of score.recommendations) {
        expect(rec.bucket).toBe('documentation')
      }
    })
  })
})
