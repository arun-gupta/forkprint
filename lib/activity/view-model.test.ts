import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildDevelopmentCadenceCard } from './view-model'
import { buildResult } from '@/lib/testing/fixtures'

// Spy on interpolatePercentile and getCalibrationForStars to control percentile values in boundary tests
vi.mock('@/lib/scoring/config-loader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/scoring/config-loader')>()
  return {
    ...actual,
    interpolatePercentile: vi.fn(actual.interpolatePercentile),
    getCalibrationForStars: vi.fn(actual.getCalibrationForStars),
  }
})

const baseCadence = {
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
}

const emptyCadence = { totalWeeks: 0, weeklyCommitCounts: [], activeWeeksRatio: 0, commitRegularity: 0, longestGapDays: 0, weekendToWeekdayRatio: 0, weekendCommitCount: 0, weekdayCommitCount: 0, trendComparisons: 'unavailable' as const }

describe('buildDevelopmentCadenceCard', () => {
  it('formats cadence metrics for the activity card', () => {
    const card = buildDevelopmentCadenceCard(
      buildResult({
        activityCadenceByWindow: {
          30: baseCadence,
          60: emptyCadence,
          90: emptyCadence,
          180: emptyCadence,
          365: emptyCadence,
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

// CON-03: boundary tests asserting regularityLabel changes at the 75th-percentile
// crossing (the threshold defined in percentileToTone()).
describe('buildDevelopmentCadenceCard — CON-03 regularityLabel boundary', () => {
  let interpolateMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const configLoader = await import('@/lib/scoring/config-loader')
    interpolateMock = configLoader.interpolatePercentile as ReturnType<typeof vi.fn>
    interpolateMock.mockReset()
    // Provide fake commitRegularity calibration so the percentile path is taken
    ;(configLoader.getCalibrationForStars as ReturnType<typeof vi.fn>).mockReturnValue({
      commitRegularity: { p25: 0.4, p50: 0.7, p75: 1.2, p90: 2.0 },
    })
  })

  function buildResultWithCommitRegularity(): AnalysisResult {
    return buildResult({
      activityCadenceByWindow: {
        30: { ...baseCadence, commitRegularity: 0.4 },
        60: emptyCadence,
        90: emptyCadence,
        180: emptyCadence,
        365: emptyCadence,
      },
    })
  }

  it('returns "High consistency" at exactly the 75th-percentile boundary', () => {
    interpolateMock.mockReturnValue(75)
    const card = buildDevelopmentCadenceCard(buildResultWithCommitRegularity(), 30)
    expect(card?.regularityLabel).toBe('High consistency')
  })

  it('returns "Moderate consistency" just below the 75th-percentile boundary (74)', () => {
    interpolateMock.mockReturnValue(74)
    const card = buildDevelopmentCadenceCard(buildResultWithCommitRegularity(), 30)
    expect(card?.regularityLabel).toBe('Moderate consistency')
  })

  it('returns "Moderate consistency" at exactly the 40th-percentile boundary', () => {
    interpolateMock.mockReturnValue(40)
    const card = buildDevelopmentCadenceCard(buildResultWithCommitRegularity(), 30)
    expect(card?.regularityLabel).toBe('Moderate consistency')
  })

  it('returns "Bursty" just below the 40th-percentile boundary (39)', () => {
    interpolateMock.mockReturnValue(39)
    const card = buildDevelopmentCadenceCard(buildResultWithCommitRegularity(), 30)
    expect(card?.regularityLabel).toBe('Bursty')
  })
})
