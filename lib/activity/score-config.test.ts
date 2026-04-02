import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { formatHours, formatPercentage, getActivityScore } from './score-config'

describe('activity/score-config', () => {
  it('returns a high score when verified activity inputs clear the configured thresholds', () => {
    const score = getActivityScore(buildResult())

    expect(score.value).toBe('High')
    expect(score.tone).toBe('success')
    expect(score.missingInputs).toEqual([])
  })

  it('returns insufficient when verified activity inputs are missing', () => {
    const score = getActivityScore(
      buildResult({
        activityMetricsByWindow: {
          ...buildResult().activityMetricsByWindow!,
          90: {
            ...buildResult().activityMetricsByWindow![90],
            staleIssueRatio: 'unavailable',
          },
        },
      }),
    )

    expect(score.value).toBe('Insufficient verified public data')
    expect(score.missingInputs).toContain('Stale issue ratio')
  })

  it('formats percentages and hours for the activity help surface', () => {
    expect(formatPercentage(0.625)).toBe('62.5%')
    expect(formatHours(12)).toBe('12.0h')
    expect(formatHours(72)).toBe('3.0d')
  })

  it('uses the selected activity window when computing the score', () => {
    const score30 = getActivityScore(buildResult(), 30)
    const score365 = getActivityScore(buildResult(), 365)

    expect(score30.value).toBe('Low')
    expect(score365.value).toBe('High')
    expect(score30.summary).toContain('30d')
    expect(score365.summary).toContain('12 months')
  })
})

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
    commits30d: 35,
    commits90d: 120,
    releases12mo: 18,
    prsOpened90d: 80,
    prsMerged90d: 60,
    issuesOpen: 40,
    issuesClosed90d: 70,
    uniqueCommitAuthors90d: 'unavailable',
    totalContributors: 'unavailable',
    maintainerCount: 'unavailable',
    commitCountsByAuthor: 'unavailable',
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    activityMetricsByWindow: {
      30: { commits: 3, prsOpened: 20, prsMerged: 4, issuesOpened: 18, issuesClosed: 8, releases: 0, staleIssueRatio: 0.75, medianTimeToMergeHours: 240, medianTimeToCloseHours: 480 },
      60: { commits: 80, prsOpened: 45, prsMerged: 30, issuesOpened: 42, issuesClosed: 39, releases: 5, staleIssueRatio: 0.12, medianTimeToMergeHours: 18, medianTimeToCloseHours: 24 },
      90: { commits: 120, prsOpened: 80, prsMerged: 60, issuesOpened: 75, issuesClosed: 70, releases: 7, staleIssueRatio: 0.15, medianTimeToMergeHours: 24, medianTimeToCloseHours: 36 },
      180: { commits: 240, prsOpened: 130, prsMerged: 100, issuesOpened: 120, issuesClosed: 115, releases: 11, staleIssueRatio: 0.18, medianTimeToMergeHours: 30, medianTimeToCloseHours: 48 },
      365: { commits: 500, prsOpened: 220, prsMerged: 180, issuesOpened: 200, issuesClosed: 195, releases: 18, staleIssueRatio: 0.2, medianTimeToMergeHours: 36, medianTimeToCloseHours: 60 },
    },
    staleIssueRatio: 0.15,
    medianTimeToMergeHours: 24,
    medianTimeToCloseHours: 36,
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}
