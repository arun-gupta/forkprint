import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildDevelopmentCadenceCard } from './view-model'

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo: 'facebook/react',
    name: 'react',
    description: 'A UI library',
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

describe('buildDevelopmentCadenceCard', () => {
  it('formats cadence metrics for the activity card', () => {
    const card = buildDevelopmentCadenceCard(
      buildResult({
        activityCadenceByWindow: {
          30: {
            totalWeeks: 5,
            weeklyCommitCounts: [1, 0, 1, 2, 0],
            activeWeeksRatio: 0.6,
            commitRegularity: 0.4,
            longestGapDays: 52,
            weekendToWeekdayRatio: 0.5,
            weekendCommitCount: 2,
            weekdayCommitCount: 4,
            trendComparisons: {
              month: { currentPeriodCommitCount: 6, previousPeriodCommitCount: 3, delta: 1, direction: 'accelerating' as const },
              week: { currentPeriodCommitCount: 4, previousPeriodCommitCount: 2, delta: 1, direction: 'accelerating' as const },
              day: { currentPeriodCommitCount: 1, previousPeriodCommitCount: 0, delta: 1, direction: 'accelerating' as const },
            },
          },
          60: { totalWeeks: 9, weeklyCommitCounts: [], activeWeeksRatio: 0, commitRegularity: 0, longestGapDays: 0, weekendToWeekdayRatio: 0, weekendCommitCount: 0, weekdayCommitCount: 0, trendComparisons: 'unavailable' },
          90: { totalWeeks: 13, weeklyCommitCounts: [], activeWeeksRatio: 0, commitRegularity: 0, longestGapDays: 0, weekendToWeekdayRatio: 0, weekendCommitCount: 0, weekdayCommitCount: 0, trendComparisons: 'unavailable' },
          180: { totalWeeks: 26, weeklyCommitCounts: [], activeWeeksRatio: 0, commitRegularity: 0, longestGapDays: 0, weekendToWeekdayRatio: 0, weekendCommitCount: 0, weekdayCommitCount: 0, trendComparisons: 'unavailable' },
          365: { totalWeeks: 52, weeklyCommitCounts: [], activeWeeksRatio: 0, commitRegularity: 0, longestGapDays: 0, weekendToWeekdayRatio: 0, weekendCommitCount: 0, weekdayCommitCount: 0, trendComparisons: 'unavailable' },
        },
      }),
      30,
    )

    expect(card?.chartBars).toHaveLength(5)
    expect(card?.activeWeeksValue).toBe('60%')
    expect(card?.longestGapValue).toBe('52 days')
    expect(card?.longestGapHighlighted).toBe(true)
    expect(card?.weekendWeekdayValue).toBe('33% weekend')
    expect(card?.defaultTrendMode).toBe('month')
    expect(card?.trendModes.month.label).toBe('Month over month')
    expect(card?.trendModes.month.trendLabel).toBe('Accelerating')
    expect(card?.trendModes.month.trendDeltaValue).toBe('+100%')
    expect(card?.trendModes.month.currentPeriodValue).toBe('6')
    expect(card?.trendModes.month.previousPeriodValue).toBe('3')
  })

  it('returns null when cadence data is absent', () => {
    expect(buildDevelopmentCadenceCard(buildResult(), 30)).toBeNull()
  })
})
