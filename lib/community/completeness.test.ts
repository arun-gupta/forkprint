import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { computeCommunityCompleteness } from './completeness'

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo: 'foo/bar',
    name: 'bar',
    description: '—',
    createdAt: '2024-01-01T00:00:00Z',
    primaryLanguage: 'TypeScript',
    stars: 100,
    forks: 10,
    watchers: 5,
    commits30d: 5,
    commits90d: 15,
    releases12mo: 2,
    prsOpened90d: 3,
    prsMerged90d: 2,
    issuesOpen: 4,
    issuesClosed90d: 3,
    uniqueCommitAuthors90d: 4,
    totalContributors: 10,
    maintainerCount: 'unavailable',
    commitCountsByAuthor: { 'login:alice': 5 },
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    documentationResult: 'unavailable',
    licensingResult: 'unavailable',
    defaultBranchName: 'main',
    topics: [],
    inclusiveNamingResult: 'unavailable',
    securityResult: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}

describe('computeCommunityCompleteness', () => {
  it('counts all signals unknown as ratio=null, percentile=null on a bare fixture', () => {
    const c = computeCommunityCompleteness(buildResult())
    expect(c.unknown.length).toBe(7)
    expect(c.present.length + c.missing.length).toBe(0)
    expect(c.ratio).toBeNull()
    expect(c.percentile).toBeNull()
    expect(c.tone).toBe('neutral')
  })

  it('counts signals across all three categories and the invariant total=7', () => {
    const c = computeCommunityCompleteness(buildResult({
      hasIssueTemplates: true,
      hasPullRequestTemplate: true,
      hasFundingConfig: false,
      hasDiscussionsEnabled: true,
      maintainerCount: 3, // implies CODEOWNERS present
      documentationResult: {
        fileChecks: [
          { name: 'readme', found: true, path: 'README.md' },
          { name: 'license', found: true, path: 'LICENSE' },
          { name: 'contributing', found: false, path: null },
          { name: 'code_of_conduct', found: true, path: 'CODE_OF_CONDUCT.md' },
          { name: 'security', found: false, path: null },
          { name: 'changelog', found: false, path: null },
        ],
        readmeSections: [],
        readmeContent: null,
      },
    }))

    // present: CoC, issue_templates, PR template, codeowners (maintainerCount > 0),
    //          discussions_enabled → 5
    // missing: funding → 1
    // unknown: governance — fixture does not include a 'governance' entry in
    //          fileChecks, so it resolves to unknown here. (When the analyzer
    //          synthesizes a real entry this would flip present/missing.) → 1
    expect(c.present.length + c.missing.length + c.unknown.length).toBe(7)
    expect(c.present).toContain('code_of_conduct')
    expect(c.present).toContain('issue_templates')
    expect(c.present).toContain('pull_request_template')
    expect(c.present).toContain('codeowners')
    expect(c.present).toContain('discussions_enabled')
    expect(c.missing).toContain('funding')
    expect(c.unknown).toContain('governance')
    expect(c.ratio).toBeCloseTo(5 / 6, 5)
    expect(c.percentile).toBeGreaterThan(0)
  })

  it('excludes unknowns from both numerator and denominator (FR-016)', () => {
    // Only two known signals: both present → ratio = 2/2 = 1.0
    const c = computeCommunityCompleteness(buildResult({
      hasFundingConfig: true,
      hasDiscussionsEnabled: true,
      // everything else remains unknown
    }))
    expect(c.present).toContain('funding')
    expect(c.present).toContain('discussions_enabled')
    expect(c.ratio).toBe(1)
    expect(c.percentile).toBe(99)
    expect(c.tone).not.toBe('neutral')
  })

  it('ratio is 0 when every known signal is missing', () => {
    const c = computeCommunityCompleteness(buildResult({
      hasFundingConfig: false,
      hasDiscussionsEnabled: false,
    }))
    expect(c.ratio).toBe(0)
    expect(c.percentile).toBe(0)
  })

  it('invariant: present + missing + unknown always = 7', () => {
    const cases: Partial<AnalysisResult>[] = [
      { hasIssueTemplates: true },
      { hasPullRequestTemplate: false },
      { hasFundingConfig: true, hasDiscussionsEnabled: false },
      { maintainerCount: 5 },
    ]
    for (const overrides of cases) {
      const c = computeCommunityCompleteness(buildResult(overrides))
      expect(c.present.length + c.missing.length + c.unknown.length).toBe(7)
    }
  })
})
