import { describe, expect, it } from 'vitest'
import { extractCommunitySignals } from './analyze'

// Minimal shape for testing — matches RepoOverviewResponse['repository'] structurally.
// We only populate the community-related fields; other fields are cast via `as any`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function repoFixture(overrides: Record<string, unknown>): any {
  return {
    // Required stubs so the type narrows to non-null
    name: 'test', description: '', createdAt: '', primaryLanguage: null,
    stargazerCount: 0, forkCount: 0, watchers: { totalCount: 0 },
    issues: { totalCount: 0 },
    ...overrides,
  }
}

describe('extractCommunitySignals', () => {
  it('returns all-unavailable when repo is null', () => {
    const result = extractCommunitySignals(null)
    expect(result).toEqual({
      hasIssueTemplates: 'unavailable',
      hasPullRequestTemplate: 'unavailable',
      hasFundingConfig: 'unavailable',
      hasDiscussionsEnabled: 'unavailable',
      discussionsCountWindow: 'unavailable',
      discussionsWindowDays: 'unavailable',
      discussionsRecentCreatedAt: 'unavailable',
      discussionsRecentTruncated: false,
    })
  })

  describe('hasIssueTemplates', () => {
    it('true when .github/ISSUE_TEMPLATE/ has a markdown file', () => {
      const result = extractCommunitySignals(repoFixture({
        commIssueTemplateDir: { entries: [{ name: 'bug_report.md' }] },
      }))
      expect(result.hasIssueTemplates).toBe(true)
    })

    it('true when directory has only yaml templates', () => {
      const result = extractCommunitySignals(repoFixture({
        commIssueTemplateDir: { entries: [{ name: 'config.yml' }, { name: 'bug.yaml' }] },
      }))
      expect(result.hasIssueTemplates).toBe(true)
    })

    it('true when legacy root ISSUE_TEMPLATE.md exists', () => {
      const result = extractCommunitySignals(repoFixture({
        commIssueTemplateLegacyRoot: { oid: 'abc' },
      }))
      expect(result.hasIssueTemplates).toBe(true)
    })

    it('true when legacy .github/ISSUE_TEMPLATE.md exists', () => {
      const result = extractCommunitySignals(repoFixture({
        commIssueTemplateLegacyGithub: { oid: 'abc' },
      }))
      expect(result.hasIssueTemplates).toBe(true)
    })

    it('false when only non-template files exist in dir', () => {
      const result = extractCommunitySignals(repoFixture({
        commIssueTemplateDir: { entries: [{ name: 'README.txt' }] },
      }))
      expect(result.hasIssueTemplates).toBe(false)
    })

    it('false when no templates anywhere', () => {
      const result = extractCommunitySignals(repoFixture({}))
      expect(result.hasIssueTemplates).toBe(false)
    })
  })

  describe('hasPullRequestTemplate', () => {
    it.each([
      ['commPrTemplateRoot', 'root'],
      ['commPrTemplateGithub', '.github/'],
      ['commPrTemplateDocs', 'docs/'],
    ])('true when PR template exists at %s', (field) => {
      const result = extractCommunitySignals(repoFixture({ [field]: { oid: 'x' } }))
      expect(result.hasPullRequestTemplate).toBe(true)
    })

    it('false when no PR template exists in any location', () => {
      expect(extractCommunitySignals(repoFixture({})).hasPullRequestTemplate).toBe(false)
    })
  })

  describe('hasFundingConfig', () => {
    it('true when .github/FUNDING.yml exists', () => {
      expect(extractCommunitySignals(repoFixture({ commFunding: { oid: 'f' } })).hasFundingConfig).toBe(true)
    })

    it('false when .github/FUNDING.yml is absent', () => {
      expect(extractCommunitySignals(repoFixture({})).hasFundingConfig).toBe(false)
    })
  })

  describe('hasDiscussionsEnabled + count', () => {
    it('maps enabled=true and counts recent discussions within window', () => {
      const now = Date.now()
      const within = new Date(now - 10 * 24 * 3600 * 1000).toISOString() // 10 days ago
      const outside = new Date(now - 200 * 24 * 3600 * 1000).toISOString() // 200 days ago
      const result = extractCommunitySignals(repoFixture({
        hasDiscussionsEnabled: true,
        commDiscussionsRecent: { nodes: [{ createdAt: within }, { createdAt: within }, { createdAt: outside }] },
      }), 90)
      expect(result.hasDiscussionsEnabled).toBe(true)
      expect(result.discussionsCountWindow).toBe(2)
      expect(result.discussionsWindowDays).toBe(90)
    })

    it('returns zero count when enabled but no recent nodes (FR-008 edge)', () => {
      const result = extractCommunitySignals(repoFixture({
        hasDiscussionsEnabled: true,
        commDiscussionsRecent: { nodes: [] },
      }))
      expect(result.hasDiscussionsEnabled).toBe(true)
      expect(result.discussionsCountWindow).toBe(0)
      expect(result.discussionsWindowDays).toBe(90)
    })

    it('returns unavailable count when disabled — no activity fetch ever claimed (FR-008, SC-003)', () => {
      const result = extractCommunitySignals(repoFixture({
        hasDiscussionsEnabled: false,
        commDiscussionsRecent: { nodes: [{ createdAt: new Date().toISOString() }] },
      }))
      expect(result.hasDiscussionsEnabled).toBe(false)
      expect(result.discussionsCountWindow).toBe('unavailable')
      expect(result.discussionsWindowDays).toBe('unavailable')
    })

    it('maps hasDiscussionsEnabled=null from GraphQL to unavailable (API gap)', () => {
      const result = extractCommunitySignals(repoFixture({
        hasDiscussionsEnabled: null,
      }))
      expect(result.hasDiscussionsEnabled).toBe('unavailable')
      expect(result.discussionsCountWindow).toBe('unavailable')
      expect(result.discussionsWindowDays).toBe('unavailable')
    })

    it('honors a non-default window', () => {
      const now = Date.now()
      const day5 = new Date(now - 5 * 24 * 3600 * 1000).toISOString()
      const day40 = new Date(now - 40 * 24 * 3600 * 1000).toISOString()
      const result30 = extractCommunitySignals(repoFixture({
        hasDiscussionsEnabled: true,
        commDiscussionsRecent: { nodes: [{ createdAt: day5 }, { createdAt: day40 }] },
      }), 30)
      expect(result30.discussionsCountWindow).toBe(1)
      expect(result30.discussionsWindowDays).toBe(30)
    })

    // Issue #194 acceptance: same fixture, different windowDays → different counts.
    it('returns different counts for windowDays 30 vs 365 on same fixture', () => {
      const now = Date.now()
      const day10 = new Date(now - 10 * 24 * 3600 * 1000).toISOString()
      const day200 = new Date(now - 200 * 24 * 3600 * 1000).toISOString()
      const day400 = new Date(now - 400 * 24 * 3600 * 1000).toISOString()
      const fixture = repoFixture({
        hasDiscussionsEnabled: true,
        commDiscussionsRecent: { nodes: [{ createdAt: day10 }, { createdAt: day200 }, { createdAt: day400 }] },
      })
      expect(extractCommunitySignals(fixture, 30).discussionsCountWindow).toBe(1)
      expect(extractCommunitySignals(fixture, 365).discussionsCountWindow).toBe(2)
    })

    it('preserves raw createdAt array when enabled for per-window recompute', () => {
      const now = Date.now()
      const iso = new Date(now - 5 * 24 * 3600 * 1000).toISOString()
      const result = extractCommunitySignals(repoFixture({
        hasDiscussionsEnabled: true,
        commDiscussionsRecent: { nodes: [{ createdAt: iso }, { createdAt: iso }] },
      }))
      expect(result.discussionsRecentCreatedAt).toEqual([iso, iso])
    })

    it('keeps discussionsRecentCreatedAt unavailable when disabled', () => {
      const result = extractCommunitySignals(repoFixture({
        hasDiscussionsEnabled: false,
        commDiscussionsRecent: { nodes: [{ createdAt: new Date().toISOString() }] },
      }))
      expect(result.discussionsRecentCreatedAt).toBe('unavailable')
    })
  })
})
