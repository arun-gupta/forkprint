import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ActivityCadenceMetrics, AnalysisResult, TrendComparisonMetrics } from '@/lib/analyzer/analysis-result'
import { buildResult as _buildResult } from '@/lib/testing/fixtures'
import { DevelopmentCadenceCard } from './DevelopmentCadenceCard'

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return _buildResult({ repo: 'facebook/react', defaultBranchName: 'main', ...overrides })
}

function stubCadenceEntry(overrides: Partial<ActivityCadenceMetrics> = {}): ActivityCadenceMetrics {
  return {
    totalWeeks: 0,
    weeklyCommitCounts: [],
    activeWeeksRatio: 0,
    commitRegularity: 0,
    longestGapDays: 0,
    weekendToWeekdayRatio: 0,
    weekendCommitCount: 0,
    weekdayCommitCount: 0,
    trendComparisons: 'unavailable',
    ...overrides,
  }
}

function buildCadenceWindows(
  partial: Partial<Record<30 | 60 | 90 | 180 | 365, ActivityCadenceMetrics>> = {},
): Record<30 | 60 | 90 | 180 | 365, ActivityCadenceMetrics> {
  const stub = stubCadenceEntry()
  return { 30: stub, 60: stub, 90: stub, 180: stub, 365: stub, ...partial }
}

function createTrendComparisons(overrides: Partial<Record<'month' | 'week' | 'day', Partial<TrendComparisonMetrics>>> = {}): Record<'month' | 'week' | 'day', TrendComparisonMetrics> {
  return {
    month: { currentPeriodCommitCount: 6, previousPeriodCommitCount: 3, delta: 1, direction: 'accelerating', ...overrides.month },
    week: { currentPeriodCommitCount: 3, previousPeriodCommitCount: 6, delta: -0.5, direction: 'decelerating', ...overrides.week },
    day: { currentPeriodCommitCount: 1, previousPeriodCommitCount: 0, delta: 1, direction: 'accelerating', ...overrides.day },
  }
}

describe('DevelopmentCadenceCard', () => {
  it('renders cadence metrics with a unified default month-over-month trend module', () => {
    render(
      <DevelopmentCadenceCard
        result={buildResult({
          activityCadenceByWindow: buildCadenceWindows({
            30: stubCadenceEntry({
              totalWeeks: 5,
              weeklyCommitCounts: [1, 0, 1, 2, 0],
              activeWeeksRatio: 0.6,
              commitRegularity: 0.4,
              longestGapDays: 52,
              weekendToWeekdayRatio: 0.5,
              weekendCommitCount: 2,
              weekdayCommitCount: 4,
              trendComparisons: createTrendComparisons(),
            }),
          }),
        })}
        windowDays={30}
      />,
    )

    expect(screen.getByRole('region', { name: /development cadence for facebook\/react/i })).toHaveClass('md:col-span-2', 'xl:col-span-2')
    expect(screen.getByText(/development cadence/i)).toBeInTheDocument()
    expect(screen.getByText(/based on commit history from the default branch \(main\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/weekly commit rhythm/i)).toBeInTheDocument()
    expect(screen.getByText(/high consistency|moderate consistency|bursty/i)).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByLabelText(/active weeks help/i))
    expect(screen.getByRole('tooltip')).toHaveTextContent(/an active week is any week/i)
    expect(screen.getByRole('tooltip')).toHaveTextContent(/3 of 5 weeks/i)
    fireEvent.mouseLeave(screen.getByLabelText(/active weeks help/i))
    expect(screen.getByText('52 days')).toBeInTheDocument()
    expect(screen.getByText('Weekend Flow')).toBeInTheDocument()
    expect(screen.getByText('33% weekend')).toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByLabelText(/weekend flow help/i))
    expect(screen.getByRole('tooltip')).toHaveTextContent(/2 weekend commits and 4 weekday commits/i)
    expect(screen.getByRole('tooltip')).toHaveTextContent(/weekend activity made up 33% of all commits/i)
    expect(screen.getByRole('tooltip')).toHaveTextContent(/0.50x/i)
    fireEvent.mouseLeave(screen.getByLabelText(/weekend flow help/i))
    expect(screen.getByTitle(/W4 \(.+ to .+\): 2 commits/)).toBeInTheDocument()
    expect(screen.getByText(/W1 starts .+ The chart runs left-to-right from oldest to most recent week/i)).toBeInTheDocument()
    expect(screen.getByText(/The selected window currently spans .+ to .+\./i)).toBeInTheDocument()
    expect(screen.getByText('Month over month')).toBeInTheDocument()
    expect(screen.getByText(/compares the latest 30 days with the 30 days immediately before them/i)).toBeInTheDocument()
    expect(screen.getByText('Days 31-60 ago')).toBeInTheDocument()
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: /zoom in/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /zoom out/i })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Trend: Accelerating (+100%)')).toBeInTheDocument()
    expect(screen.getByText('+100%')).toBeInTheDocument()
  })

  it('returns null when cadence data is absent', () => {
    const { container } = render(<DevelopmentCadenceCard result={buildResult()} windowDays={30} />)
    expect(container.firstChild).toBeNull()
  })

  it('preserves chart zoom affordances on longer windows', async () => {
    render(
      <DevelopmentCadenceCard
        result={buildResult({
          activityCadenceByWindow: buildCadenceWindows({
            365: stubCadenceEntry({
              totalWeeks: 13,
              weeklyCommitCounts: [2, 1, 1, 2, 2, 3, 1, 2, 1, 1, 2, 3, 1],
              activeWeeksRatio: 1,
              commitRegularity: 0.4,
              longestGapDays: 2,
              weekendToWeekdayRatio: 0.1,
              weekendCommitCount: 122,
              weekdayCommitCount: 1279,
              trendComparisons: createTrendComparisons({
                month: { currentPeriodCommitCount: 411, previousPeriodCommitCount: 525, delta: -0.22, direction: 'decelerating' },
              }),
            }),
          }),
        })}
        windowDays={365}
      />,
    )

    expect(screen.getByText('W1')).toBeVisible()
    expect(screen.queryByText('W2')).not.toBeInTheDocument()
    expect(screen.getByText('W4')).toBeVisible()
    expect(screen.getByText('W7')).toBeVisible()
    expect(screen.getByText('W13')).toBeVisible()
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeDisabled()
    expect(screen.getByLabelText('Trend: Decelerating (-22%)')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /zoom in/i }))

    expect(screen.getByText(/Scroll horizontally to move through the timeline\./i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeEnabled()
  })

  it('shows readable commit counts when toggled on', async () => {
    render(
      <DevelopmentCadenceCard
        result={buildResult({
          activityCadenceByWindow: buildCadenceWindows({
            30: stubCadenceEntry({
              totalWeeks: 5,
              weeklyCommitCounts: [1, 0, 1, 2, 0],
              activeWeeksRatio: 0.6,
              commitRegularity: 0.4,
              longestGapDays: 52,
              weekendToWeekdayRatio: 0.5,
              weekendCommitCount: 2,
              weekdayCommitCount: 4,
              trendComparisons: createTrendComparisons(),
            }),
          }),
        })}
        windowDays={30}
      />,
    )

    expect(screen.queryByText('W4: 2')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show commit counts/i }))

    expect(screen.getByRole('button', { name: /hide commit counts/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('W1: 1')).toBeInTheDocument()
    expect(screen.getByText('W2: 0')).toBeInTheDocument()
    expect(screen.getByText('W4: 2')).toBeInTheDocument()
  })

  it('switches trend modes locally and keeps labels, values, and helper copy in sync', async () => {
    render(
      <DevelopmentCadenceCard
        result={buildResult({
          activityCadenceByWindow: buildCadenceWindows({
            30: stubCadenceEntry({
              totalWeeks: 5,
              weeklyCommitCounts: [1, 0, 1, 2, 0],
              activeWeeksRatio: 0.6,
              commitRegularity: 0.4,
              longestGapDays: 52,
              weekendToWeekdayRatio: 0.5,
              weekendCommitCount: 2,
              weekdayCommitCount: 4,
              trendComparisons: createTrendComparisons({
                day: {
                  currentPeriodCommitCount: 0,
                  previousPeriodCommitCount: 0,
                  delta: 'unavailable',
                  direction: 'unavailable',
                },
              }),
            }),
          }),
        })}
        windowDays={30}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Week' }))

    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Week over week')).toBeInTheDocument()
    expect(screen.getByText(/compares the latest 7 days with the 7 days immediately before them/i)).toBeInTheDocument()
    expect(screen.getByText('Days 8-14 ago')).toBeInTheDocument()
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
    expect(screen.getByLabelText('Trend: Decelerating (-50%)')).toBeInTheDocument()
    expect(screen.getByText('-50%')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Day' }))

    expect(screen.getByRole('button', { name: 'Day' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Day over day')).toBeInTheDocument()
    expect(screen.getByText(/compares the most recent complete UTC day with the previous complete UTC day/i)).toBeInTheDocument()
    expect(screen.getByText('Previous full day')).toBeInTheDocument()
    expect(screen.getByText('Most recent full day')).toBeInTheDocument()
    expect(screen.getByLabelText('Trend: Insufficient verified public data')).toBeInTheDocument()
  })
})
