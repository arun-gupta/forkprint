import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { computeCommunityCompleteness } from './completeness'
import { buildResult } from '@/lib/testing/fixtures'

describe('computeCommunityCompleteness', () => {
  it('counts all signals unknown as ratio=null, percentile=null on a bare fixture', () => {
    const c = computeCommunityCompleteness(buildResult())
    expect(c.unknown.length).toBe(10)
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
        adoptersFile: false,
        roadmapFile: false,
        maintainersFile: false,
        cocContent: null,
      },
    }))

    // present: CoC, issue_templates, PR template, codeowners (maintainerCount > 0),
    //          discussions_enabled → 5
    // missing: funding → 1
    // unknown: governance — fixture does not include a 'governance' entry in
    //          fileChecks, so it resolves to unknown here. (When the analyzer
    //          synthesizes a real entry this would flip present/missing.) → 1
    expect(c.present.filter((k) => k !== 'gitpod_bonus').length + c.missing.length + c.unknown.length).toBe(10)
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

  it('invariant: present (excl bonus) + missing + unknown always = 10', () => {
    const cases: Partial<AnalysisResult>[] = [
      { hasIssueTemplates: true },
      { hasPullRequestTemplate: false },
      { hasFundingConfig: true, hasDiscussionsEnabled: false },
      { maintainerCount: 5 },
    ]
    for (const overrides of cases) {
      const c = computeCommunityCompleteness(buildResult(overrides))
      const total = c.present.filter((k) => k !== 'gitpod_bonus').length + c.missing.length + c.unknown.length
      expect(total).toBe(10)
    }
  })

  describe('P2-F08 onboarding signal extension (T016)', () => {
    it('good_first_issues maps to present when count > 0', () => {
      const c = computeCommunityCompleteness(buildResult({ goodFirstIssueCount: 5 }))
      expect(c.present).toContain('good_first_issues')
    })

    it('good_first_issues maps to missing when count = 0', () => {
      const c = computeCommunityCompleteness(buildResult({ goodFirstIssueCount: 0 }))
      expect(c.missing).toContain('good_first_issues')
    })

    it('good_first_issues maps to unknown when unavailable', () => {
      const c = computeCommunityCompleteness(buildResult({ goodFirstIssueCount: 'unavailable' }))
      expect(c.unknown).toContain('good_first_issues')
    })

    it('dev_environment_setup maps to present when true', () => {
      const c = computeCommunityCompleteness(buildResult({ devEnvironmentSetup: true }))
      expect(c.present).toContain('dev_environment_setup')
    })

    it('dev_environment_setup maps to missing when false', () => {
      const c = computeCommunityCompleteness(buildResult({ devEnvironmentSetup: false }))
      expect(c.missing).toContain('dev_environment_setup')
    })

    it('dev_environment_setup maps to unknown when unavailable', () => {
      const c = computeCommunityCompleteness(buildResult({ devEnvironmentSetup: 'unavailable' }))
      expect(c.unknown).toContain('dev_environment_setup')
    })

    it('new_contributor_acceptance maps to present when rate >= 0.5', () => {
      const c = computeCommunityCompleteness(buildResult({ newContributorPRAcceptanceRate: 0.8 }))
      expect(c.present).toContain('new_contributor_acceptance')
    })

    it('new_contributor_acceptance maps to missing when rate < 0.5', () => {
      const c = computeCommunityCompleteness(buildResult({ newContributorPRAcceptanceRate: 0.3 }))
      expect(c.missing).toContain('new_contributor_acceptance')
    })

    it('new_contributor_acceptance maps to unknown when unavailable', () => {
      const c = computeCommunityCompleteness(buildResult({ newContributorPRAcceptanceRate: 'unavailable' }))
      expect(c.unknown).toContain('new_contributor_acceptance')
    })

    it('Gitpod bonus increments present count without growing denominator', () => {
      const base = computeCommunityCompleteness(buildResult({ hasFundingConfig: true }))
      const withGitpod = computeCommunityCompleteness(buildResult({ hasFundingConfig: true, gitpodPresent: true }))
      // present increases (gitpod bonus added)
      expect(withGitpod.present.length).toBeGreaterThan(base.present.length)
      // denominator (present excl bonus + missing) stays the same
      const baseDenom = base.present.filter((k) => k !== 'gitpod_bonus').length + base.missing.length
      const withGitpodDenom = withGitpod.present.filter((k) => k !== 'gitpod_bonus').length + withGitpod.missing.length
      expect(withGitpodDenom).toBe(baseDenom)
    })

    it('total invariant is now 10 (7 original + 3 new signals)', () => {
      const c = computeCommunityCompleteness(buildResult({
        hasFundingConfig: true,
        goodFirstIssueCount: 3,
        devEnvironmentSetup: true,
        newContributorPRAcceptanceRate: 0.7,
      }))
      expect(c.present.length + c.missing.length + c.unknown.length).toBe(10)
    })
  })
})
