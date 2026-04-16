import { describe, expect, it } from 'vitest'
import { extractDocumentationResult } from './analyze'
import type { DocumentationFileCheck } from './analysis-result'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function repoFixture(overrides: Record<string, unknown>): any {
  return {
    name: 'test', description: '', createdAt: '', primaryLanguage: null,
    stargazerCount: 0, forkCount: 0, watchers: { totalCount: 0 },
    issues: { totalCount: 0 },
    ...overrides,
  }
}

function check(
  result: ReturnType<typeof extractDocumentationResult>,
  name: DocumentationFileCheck['name'],
): DocumentationFileCheck {
  if (result === 'unavailable') throw new Error('expected DocumentationResult, got unavailable')
  const found = result.fileChecks.find((c) => c.name === name)
  if (!found) throw new Error(`no ${name} check in result`)
  return found
}

describe('extractDocumentationResult — non-security governance variants', () => {
  describe('code_of_conduct', () => {
    it.each([
      ['CODE_OF_CONDUCT.md', 'docCodeOfConduct'],
      ['CODE_OF_CONDUCT.rst', 'docCodeOfConductRst'],
      ['CODE_OF_CONDUCT.txt', 'docCodeOfConductTxt'],
      // Regression: kubernetes/kubernetes uses lowercase hyphenated form (issue #308).
      ['code-of-conduct.md', 'docCodeOfConductHyphenLower'],
      ['code_of_conduct.md', 'docCodeOfConductUnderscoreLower'],
      ['docs/CODE_OF_CONDUCT.md', 'docCodeOfConductDocs'],
      ['.github/CODE_OF_CONDUCT.md', 'docCodeOfConductGithub'],
    ])('resolves as present when %s exists', (path, field) => {
      const result = extractDocumentationResult(repoFixture({ [field]: { oid: 'abc' } }))
      const coc = check(result, 'code_of_conduct')
      expect(coc.found).toBe(true)
      expect(coc.path).toBe(path)
    })

    it('resolves as absent when no CoC variant exists', () => {
      const result = extractDocumentationResult(repoFixture({}))
      const coc = check(result, 'code_of_conduct')
      expect(coc.found).toBe(false)
      expect(coc.path).toBeNull()
    })
  })

  describe('contributing', () => {
    it.each([
      ['CONTRIBUTING.md', 'docContributing'],
      ['contributing.md', 'docContributingLower'],
      ['docs/CONTRIBUTING.md', 'docContributingDocs'],
      ['.github/CONTRIBUTING.md', 'docContributingGithub'],
    ])('resolves as present when %s exists', (path, field) => {
      const result = extractDocumentationResult(repoFixture({ [field]: { oid: 'abc' } }))
      const contrib = check(result, 'contributing')
      expect(contrib.found).toBe(true)
      expect(contrib.path).toBe(path)
    })
  })

  describe('changelog', () => {
    it('resolves as present when docs/CHANGELOG.md exists', () => {
      const result = extractDocumentationResult(repoFixture({ docChangelogDocs: { oid: 'abc' } }))
      const changelog = check(result, 'changelog')
      expect(changelog.found).toBe(true)
      expect(changelog.path).toBe('docs/CHANGELOG.md')
    })
  })

  it('returns unavailable when repo is null', () => {
    expect(extractDocumentationResult(null)).toBe('unavailable')
  })
})
