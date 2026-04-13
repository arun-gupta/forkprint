import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import {
  buildComparisonSections,
  getComparisonLimitMessage,
  getDefaultAnchorRepo,
  limitComparedResults,
  sortComparisonRows,
  sortComparedResults,
} from './view-model'

describe('comparison/view-model', () => {
  it('defaults the anchor repo to the first successful result', () => {
    const results = [buildResult('facebook/react'), buildResult('vercel/next.js')]

    expect(getDefaultAnchorRepo(results)).toBe('facebook/react')
  })

  it('builds only enabled sections and attributes', () => {
    const sections = buildComparisonSections([buildResult('facebook/react'), buildResult('vercel/next.js')], {
      enabledSections: ['activity'],
      enabledAttributes: ['pr-merge-rate'],
    })

    expect(sections).toHaveLength(1)
    expect(sections[0]?.id).toBe('activity')
    expect(sections[0]?.rows).toHaveLength(1)
    expect(sections[0]?.rows[0]?.attributeId).toBe('pr-merge-rate')
  })

  it('computes median values across the compared repos', () => {
    const sections = buildComparisonSections([
      buildResult('facebook/react', { stars: 100 }),
      buildResult('vercel/next.js', { stars: 200 }),
      buildResult('microsoft/typescript', { stars: 300 }),
    ], {
      enabledSections: ['overview'],
      enabledAttributes: ['stars'],
    })

    expect(sections[0]?.rows[0]?.medianDisplay).toBe('200')
  })

  it('produces anchor-based delta messages and statuses', () => {
    const sections = buildComparisonSections([
      buildResult('facebook/react', { activityMetricsByWindow: windowMetrics({ prsOpened: 10, prsMerged: 8 }) }),
      buildResult('vercel/next.js', { activityMetricsByWindow: windowMetrics({ prsOpened: 10, prsMerged: 4 }) }),
    ], {
      anchorRepo: 'facebook/react',
      enabledSections: ['activity'],
      enabledAttributes: ['pr-merge-rate'],
    })

    const row = sections[0]?.rows[0]
    expect(row?.cells[0]).toMatchObject({ repo: 'facebook/react', status: 'neutral' })
    expect(row?.cells[1]?.deltaDisplay).toBe('-40.0 pts vs anchor (-50%)')
    expect(row?.cells[1]?.status).toBe('worse')
  })

  it('sorts compared results by any visible attribute with unavailable values last', () => {
    const sorted = sortComparedResults(
      [
        buildResult('z/repo', { stars: 'unavailable' }),
        buildResult('a/repo', { stars: 100 }),
        buildResult('b/repo', { stars: 200 }),
      ],
      'stars',
      'desc',
    )

    expect(sorted.map((result) => result.repo)).toEqual(['b/repo', 'a/repo', 'z/repo'])
  })

  it('caps compared results at four repositories', () => {
    const limited = limitComparedResults([
      buildResult('one/repo'),
      buildResult('two/repo'),
      buildResult('three/repo'),
      buildResult('four/repo'),
      buildResult('five/repo'),
    ])

    expect(limited).toHaveLength(4)
    expect(limited.map((result) => result.repo)).toEqual(['one/repo', 'two/repo', 'three/repo', 'four/repo'])
  })

  it('returns clear cap messaging', () => {
    expect(getComparisonLimitMessage(3)).toMatch(/up to 4 repositories/i)
    expect(getComparisonLimitMessage(5)).toMatch(/showing the first 4 of 5/i)
  })

  it('sorts comparison rows by a repo column with unavailable values last', () => {
    const sections = buildComparisonSections([buildResult('facebook/react'), buildResult('vercel/next.js')], {
      enabledSections: ['overview'],
      enabledAttributes: ['stars', 'fork-rate'],
    })

    const sortedRows = sortComparisonRows(sections[0]!.rows, { type: 'repo', repo: 'facebook/react' }, 'desc')
    expect(sortedRows.map((row) => row.attributeId)).toEqual(['stars', 'fork-rate'])
  })

  it('sorts comparison rows by median value', () => {
    const sections = buildComparisonSections([
      buildResult('facebook/react', { stars: 100, forks: 50 }),
      buildResult('vercel/next.js', { stars: 200, forks: 60 }),
    ], {
      enabledSections: ['overview'],
      enabledAttributes: ['stars', 'forks'],
    })

    const sortedRows = sortComparisonRows(sections[0]!.rows, { type: 'median' }, 'asc')
    expect(sortedRows.map((row) => row.attributeId)).toEqual(['forks', 'stars'])
  })
})

function windowMetrics(overrides: Partial<NonNullable<AnalysisResult['activityMetricsByWindow']>[90]> = {}) {
  return {
    30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 12, medianTimeToCloseHours: 24 },
    60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2, staleIssueRatio: 0.15, medianTimeToMergeHours: 18, medianTimeToCloseHours: 30 },
    90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 3, staleIssueRatio: 0.2, medianTimeToMergeHours: 24, medianTimeToCloseHours: 36, ...overrides },
    180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4, staleIssueRatio: 0.3, medianTimeToMergeHours: 48, medianTimeToCloseHours: 72 },
    365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6, staleIssueRatio: 0.4, medianTimeToMergeHours: 96, medianTimeToCloseHours: 144 },
  } as NonNullable<AnalysisResult['activityMetricsByWindow']>
}

function buildResult(repo: string, overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo,
    name: repo.split('/')[1] ?? repo,
    description: 'Repo description',
    createdAt: '2013-05-24T16:15:54Z',
    primaryLanguage: 'TypeScript',
    stars: 100,
    forks: 25,
    watchers: 10,
    commits30d: 7,
    commits90d: 18,
    releases12mo: 6,
    prsOpened90d: 4,
    prsMerged90d: 3,
    issuesOpen: 5,
    issuesClosed90d: 6,
    uniqueCommitAuthors90d: 5,
    totalContributors: 12,
    maintainerCount: 3,
    commitCountsByAuthor: {
      'login:alice': 4,
      'login:bob': 3,
      'login:carol': 2,
      'login:dave': 1,
      'login:erin': 1,
    },
    contributorMetricsByWindow: {
      30: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      60: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      90: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      180: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      365: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
    },
    activityMetricsByWindow: windowMetrics(),
    responsivenessMetricsByWindow: {
      30: {
        issueFirstResponseMedianHours: 12,
        issueFirstResponseP90Hours: 48,
        prFirstReviewMedianHours: 24,
        prFirstReviewP90Hours: 72,
        issueResolutionMedianHours: 36,
        issueResolutionP90Hours: 96,
        prMergeMedianHours: 24,
        prMergeP90Hours: 72,
        issueResolutionRate: 0.8,
        contributorResponseRate: 0.7,
        botResponseRatio: 0.1,
        humanResponseRatio: 0.8,
        staleIssueRatio: 0.1,
        stalePrRatio: 0.05,
        prReviewDepth: 3,
        issuesClosedWithoutCommentRatio: 0.2,
        openIssueCount: 10,
        openPullRequestCount: 5,
      },
      60: {
        issueFirstResponseMedianHours: 14,
        issueFirstResponseP90Hours: 50,
        prFirstReviewMedianHours: 28,
        prFirstReviewP90Hours: 78,
        issueResolutionMedianHours: 40,
        issueResolutionP90Hours: 102,
        prMergeMedianHours: 28,
        prMergeP90Hours: 78,
        issueResolutionRate: 0.82,
        contributorResponseRate: 0.72,
        botResponseRatio: 0.12,
        humanResponseRatio: 0.78,
        staleIssueRatio: 0.12,
        stalePrRatio: 0.07,
        prReviewDepth: 3.2,
        issuesClosedWithoutCommentRatio: 0.22,
        openIssueCount: 11,
        openPullRequestCount: 6,
      },
      90: {
        issueFirstResponseMedianHours: 16,
        issueFirstResponseP90Hours: 52,
        prFirstReviewMedianHours: 30,
        prFirstReviewP90Hours: 80,
        issueResolutionMedianHours: 44,
        issueResolutionP90Hours: 108,
        prMergeMedianHours: 30,
        prMergeP90Hours: 80,
        issueResolutionRate: 0.84,
        contributorResponseRate: 0.74,
        botResponseRatio: 0.15,
        humanResponseRatio: 0.75,
        staleIssueRatio: 0.14,
        stalePrRatio: 0.08,
        prReviewDepth: 3.4,
        issuesClosedWithoutCommentRatio: 0.24,
        openIssueCount: 12,
        openPullRequestCount: 7,
      },
      180: {
        issueFirstResponseMedianHours: 18,
        issueFirstResponseP90Hours: 56,
        prFirstReviewMedianHours: 34,
        prFirstReviewP90Hours: 84,
        issueResolutionMedianHours: 48,
        issueResolutionP90Hours: 114,
        prMergeMedianHours: 34,
        prMergeP90Hours: 84,
        issueResolutionRate: 0.86,
        contributorResponseRate: 0.76,
        botResponseRatio: 0.16,
        humanResponseRatio: 0.74,
        staleIssueRatio: 0.16,
        stalePrRatio: 0.09,
        prReviewDepth: 3.6,
        issuesClosedWithoutCommentRatio: 0.26,
        openIssueCount: 13,
        openPullRequestCount: 8,
      },
      365: {
        issueFirstResponseMedianHours: 20,
        issueFirstResponseP90Hours: 60,
        prFirstReviewMedianHours: 36,
        prFirstReviewP90Hours: 90,
        issueResolutionMedianHours: 52,
        issueResolutionP90Hours: 120,
        prMergeMedianHours: 36,
        prMergeP90Hours: 90,
        issueResolutionRate: 0.88,
        contributorResponseRate: 0.78,
        botResponseRatio: 0.18,
        humanResponseRatio: 0.72,
        staleIssueRatio: 0.18,
        stalePrRatio: 0.1,
        prReviewDepth: 3.8,
        issuesClosedWithoutCommentRatio: 0.28,
        openIssueCount: 14,
        openPullRequestCount: 9,
      },
    },
    responsivenessMetrics: undefined,
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    staleIssueRatio: 0.2,
    medianTimeToMergeHours: 24,
    medianTimeToCloseHours: 36,
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    documentationResult: 'unavailable',
    defaultBranchName: 'main',
    topics: [],
    inclusiveNamingResult: {
      defaultBranchName: 'main',
      branchCheck: { checkType: 'branch', term: 'main', passed: true, tier: null, severity: null, replacements: [], context: null },
      metadataChecks: [],
    },
    missingFields: [],
    ...overrides,
  }
}
