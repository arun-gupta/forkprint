import { describe, expect, it } from 'vitest'
import { buildSearchIndex } from './search-index'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

const MOCK_RESULT: AnalysisResult = {
  repo: 'facebook/react',
  name: 'react',
  description: 'A JavaScript library for building user interfaces',
  createdAt: '2013-05-24T16:15:54Z',
  primaryLanguage: 'JavaScript',
  stars: 230000,
  forks: 47000,
  watchers: 6700,
  commits30d: 20,
  commits90d: 60,
  releases12mo: 10,
  prsOpened90d: 40,
  prsMerged90d: 35,
  issuesOpen: 800,
  issuesClosed90d: 120,
  uniqueCommitAuthors90d: 18,
  totalContributors: 1700,
  maintainerCount: 5,
  commitCountsByAuthor: { alice: 30, bob: 20 },
  commitCountsByExperimentalOrg: { Meta: 25 },
  experimentalAttributedAuthors90d: 10,
  experimentalUnattributedAuthors90d: 8,
  staleIssueRatio: 0.12,
  medianTimeToMergeHours: 24,
  medianTimeToCloseHours: 48,
  responsivenessMetrics: {
    issueFirstResponseMedianHours: 4.2,
    issueFirstResponseP90Hours: 24,
    prFirstReviewMedianHours: 8,
    prFirstReviewP90Hours: 48,
    issueResolutionMedianHours: 72,
    issueResolutionP90Hours: 168,
    prMergeMedianHours: 16,
    prMergeP90Hours: 72,
    issueResolutionRate: 0.85,
    contributorResponseRate: 0.92,
    botResponseRatio: 0.15,
    humanResponseRatio: 0.85,
    staleIssueRatio: 0.12,
    stalePrRatio: 0.05,
    prReviewDepth: 1.8,
    issuesClosedWithoutCommentRatio: 0.1,
    openIssueCount: 800,
    openPullRequestCount: 25,
  },
  issueFirstResponseTimestamps: [],
  issueCloseTimestamps: [],
  prMergeTimestamps: [],
  documentationResult: {
    fileChecks: [
      { name: 'readme', found: true, path: 'README.md' },
      { name: 'license', found: true, path: 'LICENSE' },
      { name: 'contributing', found: true, path: 'CONTRIBUTING.md' },
      { name: 'code_of_conduct', found: false, path: null },
      { name: 'security', found: false, path: null },
      { name: 'changelog', found: false, path: null },
    ],
    readmeSections: [
      { name: 'description', detected: true },
      { name: 'installation', detected: true },
      { name: 'usage', detected: false },
      { name: 'contributing', detected: true },
      { name: 'license', detected: true },
    ],
    readmeContent: null,
  },
  licensingResult: {
    license: { spdxId: 'MIT', name: 'MIT License', osiApproved: true, permissivenessTier: 'Permissive' },
    additionalLicenses: [],
    contributorAgreement: { signedOffByRatio: null, dcoOrClaBot: false, enforced: false },
  },
  defaultBranchName: 'main',
  topics: ['javascript', 'ui', 'frontend'],
  inclusiveNamingResult: {
    defaultBranchName: 'main',
    branchCheck: { checkType: 'branch', term: 'main', passed: true, tier: null, severity: null, replacements: [], context: null },
    metadataChecks: [],
  },
  securityResult: {
    scorecard: {
      overallScore: 7.2,
      checks: [
        { name: 'Branch-Protection', score: 8, reason: 'branch protection enabled' },
        { name: 'Dangerous-Workflow', score: 10, reason: 'no dangerous patterns' },
        { name: 'Dependency-Update-Tool', score: 0, reason: 'no update tool detected' },
      ],
      scorecardVersion: '4.13.0',
    },
    directChecks: [
      { name: 'security_policy', detected: true, details: 'SECURITY.md found' },
      { name: 'dependabot', detected: false, details: 'No dependabot config' },
      { name: 'ci_cd', detected: true, details: 'GitHub Actions detected' },
      { name: 'branch_protection', detected: 'unavailable', details: null },
    ],
    branchProtectionEnabled: 'unavailable',
  },
  missingFields: ['branchProtectionEnabled'],
}

describe('buildSearchIndex', () => {
  it('returns entries for all 8 tabs', () => {
    const index = buildSearchIndex([MOCK_RESULT])
    const tabIds = Object.keys(index)
    expect(tabIds).toContain('overview')
    expect(tabIds).toContain('contributors')
    expect(tabIds).toContain('activity')
    expect(tabIds).toContain('responsiveness')
    expect(tabIds).toContain('documentation')
    expect(tabIds).toContain('security')
    expect(tabIds).toContain('recommendations')
    expect(tabIds).toContain('comparison')
  })

  it('returns empty arrays for all tabs when results are empty', () => {
    const index = buildSearchIndex([])
    for (const entries of Object.values(index)) {
      expect(entries).toEqual([])
    }
  })

  it('includes repo name in every tab except comparison (which needs 2+ repos) and governance (org-summary only, no per-repo content)', () => {
    const index = buildSearchIndex([MOCK_RESULT])
    for (const [tabId, entries] of Object.entries(index)) {
      if (tabId === 'comparison' || tabId === 'governance' || tabId === 'cncf-readiness') {
        expect(entries).toEqual([])
        continue
      }
      const hasRepo = entries.some((e) => e.includes('facebook/react'))
      expect(hasRepo).toBe(true)
    }
  })

  it('includes metric labels in activity tab', () => {
    const index = buildSearchIndex([MOCK_RESULT])
    const activityText = index.activity.join(' ')
    expect(activityText.toLowerCase()).toContain('commits')
    expect(activityText.toLowerCase()).toContain('pull requests')
    expect(activityText.toLowerCase()).toContain('merge rate')
  })

  it('includes metric labels in responsiveness tab', () => {
    const index = buildSearchIndex([MOCK_RESULT])
    const text = index.responsiveness.join(' ')
    expect(text.toLowerCase()).toContain('issue first response')
  })

  it('includes documentation file names', () => {
    const index = buildSearchIndex([MOCK_RESULT])
    const text = index.documentation.join(' ')
    expect(text).toContain('README')
    expect(text).toContain('LICENSE')
    expect(text).toContain('CONTRIBUTING')
    expect(text).toContain('CODE_OF_CONDUCT')
    expect(text).toContain('SECURITY')
  })

  it('includes license info in documentation tab', () => {
    const index = buildSearchIndex([MOCK_RESULT])
    const text = index.documentation.join(' ')
    expect(text).toContain('MIT')
    expect(text).toContain('OSI')
  })

  it('includes security check names', () => {
    const index = buildSearchIndex([MOCK_RESULT])
    const text = index.security.join(' ')
    expect(text).toContain('Branch-Protection')
    expect(text).toContain('Dangerous-Workflow')
    expect(text).toContain('Dependabot')
  })

  it('includes contributor names', () => {
    const index = buildSearchIndex([MOCK_RESULT])
    const text = index.contributors.join(' ')
    expect(text).toContain('alice')
    expect(text).toContain('bob')
  })

  it('includes recommendation IDs and titles from catalog', () => {
    const index = buildSearchIndex([MOCK_RESULT])
    const text = index.recommendations.join(' ')
    // Dependency-Update-Tool scored 0, so SEC-6 recommendation should appear
    expect(text).toContain('SEC-6')
  })

  // US2: Risk level coverage — only includes data-derived recommendations, not static labels
  it('includes recommendation titles that contain risk-relevant terms', () => {
    const index = buildSearchIndex([MOCK_RESULT])
    const recText = index.recommendations.join(' ')
    // Dependency-Update-Tool scored 0 → SEC-6 recommendation generated
    // Branch-Protection scored 8 (not 10) → SEC-3 recommendation generated
    // These catalog entries have titles like "Enable automated dependency updates"
    expect(recText).toContain('SEC-6')
    expect(recText).toContain('SEC-3')
  })

  // US3: Metric labels in activity and responsiveness
  it('includes stale issue ratio and merge time in activity', () => {
    const index = buildSearchIndex([MOCK_RESULT])
    const text = index.activity.join(' ')
    expect(text.toLowerCase()).toContain('stale issue ratio')
    expect(text.toLowerCase()).toContain('median time to merge')
  })

  // US4: Comparison needs 2+ repos
  it('returns empty comparison index for single repo', () => {
    const index = buildSearchIndex([MOCK_RESULT])
    expect(index.comparison).toEqual([])
  })

  it('includes repo names in comparison tab when 2+ repos', () => {
    const secondResult = { ...MOCK_RESULT, repo: 'kubernetes/kubernetes', name: 'kubernetes' }
    const index = buildSearchIndex([MOCK_RESULT, secondResult])
    const text = index.comparison.join(' ')
    expect(text).toContain('facebook/react')
    expect(text).toContain('kubernetes/kubernetes')
  })

  it('includes overview data like stars, description, language', () => {
    const index = buildSearchIndex([MOCK_RESULT])
    const text = index.overview.join(' ')
    expect(text).toContain('JavaScript')
    expect(text).toContain('user interfaces')
    expect(text).toContain('230000')
  })
})
