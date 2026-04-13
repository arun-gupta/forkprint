import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { formatHours, formatPercentage, getResponsivenessScore } from './score-config'

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo: 'facebook/react',
    name: 'react',
    description: 'The library for web and native user interfaces.',
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
    uniqueCommitAuthors90d: 'unavailable',
    totalContributors: 'unavailable',
    maintainerCount: 'unavailable',
    commitCountsByAuthor: 'unavailable',
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    staleIssueRatio: 0.2,
    medianTimeToMergeHours: 24,
    medianTimeToCloseHours: 36,
    activityMetricsByWindow: {
      30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 12, medianTimeToCloseHours: 24 },
      60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2, staleIssueRatio: 0.15, medianTimeToMergeHours: 18, medianTimeToCloseHours: 30 },
      90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 3, staleIssueRatio: 0.2, medianTimeToMergeHours: 24, medianTimeToCloseHours: 36 },
      180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4, staleIssueRatio: 0.3, medianTimeToMergeHours: 48, medianTimeToCloseHours: 72 },
      365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6, staleIssueRatio: 0.4, medianTimeToMergeHours: 96, medianTimeToCloseHours: 144 },
    },
    responsivenessMetrics: {
      issueFirstResponseMedianHours: 4,
      issueFirstResponseP90Hours: 20,
      prFirstReviewMedianHours: 8,
      prFirstReviewP90Hours: 24,
      issueResolutionMedianHours: 48,
      issueResolutionP90Hours: 120,
      prMergeMedianHours: 36,
      prMergeP90Hours: 96,
      issueResolutionRate: 0.92,
      contributorResponseRate: 0.88,
      botResponseRatio: 0.1,
      humanResponseRatio: 0.9,
      staleIssueRatio: 0.12,
      stalePrRatio: 0.08,
      prReviewDepth: 2.4,
      issuesClosedWithoutCommentRatio: 0.08,
      openIssueCount: 22,
      openPullRequestCount: 11,
    },
    responsivenessMetricsByWindow: {
      30: {
        issueFirstResponseMedianHours: 36,
        issueFirstResponseP90Hours: 96,
        prFirstReviewMedianHours: 48,
        prFirstReviewP90Hours: 120,
        issueResolutionMedianHours: 144,
        issueResolutionP90Hours: 240,
        prMergeMedianHours: 96,
        prMergeP90Hours: 168,
        issueResolutionRate: 0.4,
        contributorResponseRate: 0.45,
        botResponseRatio: 0.4,
        humanResponseRatio: 0.6,
        staleIssueRatio: 0.45,
        stalePrRatio: 0.35,
        prReviewDepth: 0.6,
        issuesClosedWithoutCommentRatio: 0.4,
        openIssueCount: 22,
        openPullRequestCount: 11,
      },
      60: {
        issueFirstResponseMedianHours: 12,
        issueFirstResponseP90Hours: 48,
        prFirstReviewMedianHours: 20,
        prFirstReviewP90Hours: 72,
        issueResolutionMedianHours: 96,
        issueResolutionP90Hours: 168,
        prMergeMedianHours: 72,
        prMergeP90Hours: 120,
        issueResolutionRate: 0.7,
        contributorResponseRate: 0.72,
        botResponseRatio: 0.2,
        humanResponseRatio: 0.8,
        staleIssueRatio: 0.25,
        stalePrRatio: 0.18,
        prReviewDepth: 1.2,
        issuesClosedWithoutCommentRatio: 0.2,
        openIssueCount: 22,
        openPullRequestCount: 11,
      },
      90: {
        issueFirstResponseMedianHours: 4,
        issueFirstResponseP90Hours: 20,
        prFirstReviewMedianHours: 8,
        prFirstReviewP90Hours: 24,
        issueResolutionMedianHours: 48,
        issueResolutionP90Hours: 120,
        prMergeMedianHours: 36,
        prMergeP90Hours: 96,
        issueResolutionRate: 0.92,
        contributorResponseRate: 0.88,
        botResponseRatio: 0.1,
        humanResponseRatio: 0.9,
        staleIssueRatio: 0.12,
        stalePrRatio: 0.08,
        prReviewDepth: 2.4,
        issuesClosedWithoutCommentRatio: 0.08,
        openIssueCount: 22,
        openPullRequestCount: 11,
      },
      180: {
        issueFirstResponseMedianHours: 6,
        issueFirstResponseP90Hours: 24,
        prFirstReviewMedianHours: 10,
        prFirstReviewP90Hours: 36,
        issueResolutionMedianHours: 60,
        issueResolutionP90Hours: 144,
        prMergeMedianHours: 40,
        prMergeP90Hours: 100,
        issueResolutionRate: 0.85,
        contributorResponseRate: 0.84,
        botResponseRatio: 0.12,
        humanResponseRatio: 0.88,
        staleIssueRatio: 0.18,
        stalePrRatio: 0.12,
        prReviewDepth: 2.1,
        issuesClosedWithoutCommentRatio: 0.1,
        openIssueCount: 22,
        openPullRequestCount: 11,
      },
      365: {
        issueFirstResponseMedianHours: 8,
        issueFirstResponseP90Hours: 30,
        prFirstReviewMedianHours: 14,
        prFirstReviewP90Hours: 42,
        issueResolutionMedianHours: 72,
        issueResolutionP90Hours: 180,
        prMergeMedianHours: 48,
        prMergeP90Hours: 120,
        issueResolutionRate: 0.8,
        contributorResponseRate: 0.8,
        botResponseRatio: 0.15,
        humanResponseRatio: 0.85,
        staleIssueRatio: 0.22,
        stalePrRatio: 0.14,
        prReviewDepth: 1.9,
        issuesClosedWithoutCommentRatio: 0.12,
        openIssueCount: 22,
        openPullRequestCount: 11,
      },
    },
    issueFirstResponseTimestamps: ['2026-03-01T10:00:00Z'],
    issueCloseTimestamps: ['2026-03-02T10:00:00Z'],
    prMergeTimestamps: ['2026-03-03T10:00:00Z'],
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

describe('responsiveness score-config', () => {
  it('returns a high responsiveness score when verified metrics are strong', () => {
    const score = getResponsivenessScore(buildResult())

    expect(typeof score.value).toBe('number')
    expect(score.value).toBeGreaterThanOrEqual(40)
    expect(score.weightedCategories).toHaveLength(5)
  })

  it('changes score bands with the selected responsiveness window', () => {
    expect(typeof getResponsivenessScore(buildResult(), 30).value).toBe('number')
    expect(getResponsivenessScore(buildResult(), 30).value).toBeLessThan(75)
    expect(typeof getResponsivenessScore(buildResult(), 90).value).toBe('number')
    expect(getResponsivenessScore(buildResult(), 90).value).toBeGreaterThanOrEqual(40)
  })

  it('returns insufficient when required metrics are unavailable', () => {
    const score = getResponsivenessScore(
      buildResult({
        responsivenessMetrics: {
          ...buildResult().responsivenessMetrics!,
          issueFirstResponseMedianHours: 'unavailable',
          prReviewDepth: 'unavailable',
        },
        responsivenessMetricsByWindow: {
          ...buildResult().responsivenessMetricsByWindow!,
          90: {
            ...buildResult().responsivenessMetricsByWindow![90],
            issueFirstResponseMedianHours: 'unavailable',
            prReviewDepth: 'unavailable',
          },
        },
      }),
    )

    expect(score.value).toBe('Insufficient verified public data')
    expect(score.missingInputs).toContain('Issue first response time')
    expect(score.missingInputs).toContain('PR review depth')
  })

  it('formats percentages and hours consistently', () => {
    expect(formatPercentage(0.125)).toBe('12.5%')
    expect(formatHours(12)).toBe('12.0h')
    expect(formatHours(48)).toBe('2.0d')
  })

  it('returns em-dash for unavailable inputs', () => {
    expect(formatPercentage('unavailable')).toBe('—')
    expect(formatHours('unavailable')).toBe('—')
  })
})
