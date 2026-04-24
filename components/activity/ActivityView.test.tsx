import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ActivityView } from './ActivityView'
import type { AnalysisResult, TrendComparisonMetrics } from '@/lib/analyzer/analysis-result'
import { buildResult as _buildResult, INCLUSIVE_NAMING_CLEAN } from '@/lib/testing/fixtures'

function createTrendComparisons(overrides: Partial<Record<'month' | 'week' | 'day', Partial<TrendComparisonMetrics>>> = {}): Record<'month' | 'week' | 'day', TrendComparisonMetrics> {
  return {
    month: { currentPeriodCommitCount: 3, previousPeriodCommitCount: 2, delta: 0.5, direction: 'accelerating', ...overrides.month },
    week: { currentPeriodCommitCount: 2, previousPeriodCommitCount: 1, delta: 1, direction: 'accelerating', ...overrides.week },
    day: { currentPeriodCommitCount: 1, previousPeriodCommitCount: 0, delta: 1, direction: 'accelerating', ...overrides.day },
  }
}

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return _buildResult({
    repo: 'facebook/react',
    commits30d: 7,
    commits90d: 18,
    releases12mo: 6,
    prsOpened90d: 4,
    prsMerged90d: 3,
    issuesOpen: 5,
    issuesClosed90d: 6,
    activityMetricsByWindow: {
      30: { commits: 3, prsOpened: 5, prsMerged: 1, issuesOpened: 4, issuesClosed: 1, releases: 0, staleIssueRatio: 0.75, medianTimeToMergeHours: 240, medianTimeToCloseHours: 480 },
      60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2, staleIssueRatio: 0.15, medianTimeToMergeHours: 18, medianTimeToCloseHours: 30 },
      90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 3, staleIssueRatio: 0.2, medianTimeToMergeHours: 24, medianTimeToCloseHours: 36 },
      180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4, staleIssueRatio: 0.3, medianTimeToMergeHours: 48, medianTimeToCloseHours: 72 },
      365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6, staleIssueRatio: 0.4, medianTimeToMergeHours: 96, medianTimeToCloseHours: 144 },
    },
    staleIssueRatio: 0.2,
    medianTimeToMergeHours: 24,
    medianTimeToCloseHours: 36,
    activityCadenceByWindow: {
      30: { totalWeeks: 5, weeklyCommitCounts: [1, 0, 1, 0, 1], activeWeeksRatio: 0.6, commitRegularity: 0.4, longestGapDays: 12, weekendToWeekdayRatio: 0.5, weekendCommitCount: 2, weekdayCommitCount: 4, trendComparisons: createTrendComparisons() },
      60: { totalWeeks: 9, weeklyCommitCounts: [1, 1, 0, 1, 0, 1, 2, 0, 1], activeWeeksRatio: 0.67, commitRegularity: 0.5, longestGapDays: 18, weekendToWeekdayRatio: 0.5, weekendCommitCount: 3, weekdayCommitCount: 6, trendComparisons: createTrendComparisons({ month: { currentPeriodCommitCount: 3, previousPeriodCommitCount: 4, delta: -0.25, direction: 'decelerating' } }) },
      90: { totalWeeks: 13, weeklyCommitCounts: [1, 0, 1, 0, 1, 1, 0, 2, 0, 2, 1, 0, 1], activeWeeksRatio: 0.62, commitRegularity: 0.58, longestGapDays: 21, weekendToWeekdayRatio: 0.6, weekendCommitCount: 6, weekdayCommitCount: 10, trendComparisons: createTrendComparisons({ month: { currentPeriodCommitCount: 6, previousPeriodCommitCount: 4, delta: 0.5, direction: 'accelerating' } }) },
      180: { totalWeeks: 26, weeklyCommitCounts: Array.from({ length: 26 }, (_, i) => (i % 4 === 0 ? 2 : i % 3 === 0 ? 1 : 0)), activeWeeksRatio: 0.5, commitRegularity: 0.75, longestGapDays: 34, weekendToWeekdayRatio: 0.7, weekendCommitCount: 9, weekdayCommitCount: 13, trendComparisons: createTrendComparisons({ month: { currentPeriodCommitCount: 6, previousPeriodCommitCount: 4, delta: 0.5, direction: 'accelerating' } }) },
      365: { totalWeeks: 53, weeklyCommitCounts: Array.from({ length: 53 }, (_, i) => (i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : 0)), activeWeeksRatio: 0.55, commitRegularity: 0.82, longestGapDays: 41, weekendToWeekdayRatio: 0.8, weekendCommitCount: 16, weekdayCommitCount: 20, trendComparisons: createTrendComparisons({ month: { currentPeriodCommitCount: 6, previousPeriodCommitCount: 4, delta: 0.5, direction: 'accelerating' } }) },
    },
    inclusiveNamingResult: INCLUSIVE_NAMING_CLEAN,
    ...overrides,
  })
}

describe('ActivityView', () => {
  it('renders one activity section per successful repository with visible primary values', () => {
    render(<ActivityView results={[buildResult(), buildResult({ repo: 'vercel/next.js', commits30d: 42 })]} />)

    const activityView = screen.getByRole('region', { name: /activity view/i })
    expect(within(activityView).getByText('facebook/react')).toBeInTheDocument()
    expect(within(activityView).getByText('vercel/next.js')).toBeInTheDocument()
    expect(within(activityView).getAllByText(/^commits$/i)).toHaveLength(2)
    expect(within(activityView).getAllByText(/^pull requests$/i)).toHaveLength(2)
    expect(within(activityView).getAllByText(/^issues$/i)).toHaveLength(2)
    expect(within(activityView).getAllByText(/development cadence/i)).toHaveLength(2)
    expect(within(activityView).getAllByText(/^merge rate$/i)).toHaveLength(2)
    expect(within(activityView).getAllByText(/^ranking$/i)).toHaveLength(2)
    expect(within(activityView).getAllByText(/^closure rate$/i)).toHaveLength(2)
    expect(within(activityView).getAllByText('18')).toHaveLength(2)
    expect(within(activityView).getAllByText(/\d+\w{2} percentile/i).length).toBeGreaterThan(0)
    expect(within(activityView).getAllByText(/merge/i).length).toBeGreaterThan(0)
    expect(within(activityView).getAllByText(/\d+\w{2} percentile/i).length).toBeGreaterThan(0)
    expect(within(activityView).getAllByText(/stale issue ratio/i).length).toBeGreaterThan(0)
  })

  it('renders explicit unavailable values instead of hiding them', () => {
    render(
      <ActivityView
        results={[
          buildResult({
            activityMetricsByWindow: {
              30: { commits: 'unavailable', prsOpened: 'unavailable', prsMerged: 'unavailable', issuesOpened: 'unavailable', issuesClosed: 'unavailable', releases: 'unavailable', staleIssueRatio: 'unavailable', medianTimeToMergeHours: 'unavailable', medianTimeToCloseHours: 'unavailable' },
              60: { commits: 'unavailable', prsOpened: 'unavailable', prsMerged: 'unavailable', issuesOpened: 'unavailable', issuesClosed: 'unavailable', releases: 'unavailable', staleIssueRatio: 'unavailable', medianTimeToMergeHours: 'unavailable', medianTimeToCloseHours: 'unavailable' },
              90: { commits: 'unavailable', prsOpened: 'unavailable', prsMerged: 'unavailable', issuesOpened: 'unavailable', issuesClosed: 'unavailable', releases: 'unavailable', staleIssueRatio: 'unavailable', medianTimeToMergeHours: 'unavailable', medianTimeToCloseHours: 'unavailable' },
              180: { commits: 'unavailable', prsOpened: 'unavailable', prsMerged: 'unavailable', issuesOpened: 'unavailable', issuesClosed: 'unavailable', releases: 'unavailable', staleIssueRatio: 'unavailable', medianTimeToMergeHours: 'unavailable', medianTimeToCloseHours: 'unavailable' },
              365: { commits: 'unavailable', prsOpened: 'unavailable', prsMerged: 'unavailable', issuesOpened: 'unavailable', issuesClosed: 'unavailable', releases: 'unavailable', staleIssueRatio: 'unavailable', medianTimeToMergeHours: 'unavailable', medianTimeToCloseHours: 'unavailable' },
            },
          }),
        ]}
      />
    )

    const activityView = screen.getByRole('region', { name: /activity view/i })
    expect(within(activityView).getByText(/^releases$/i)).toBeInTheDocument()
    expect(within(activityView).getByText(/^pull requests$/i)).toBeInTheDocument()
    expect(within(activityView).getAllByText('—').length).toBeGreaterThan(0)
    expect(within(activityView).queryByText(/^missing data$/i)).not.toBeInTheDocument()
    expect(within(activityView).queryByText(/unavailable in selected 90d window/i)).not.toBeInTheDocument()
    expect(within(activityView).queryByText('unavailable')).not.toBeInTheDocument()
  })

  it('shows activity score help and sub-factor details on demand', async () => {
    render(<ActivityView results={[buildResult()]} />)

    expect(screen.getByText(/how is activity scored/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show details/i }))

    expect(screen.getByRole('button', { name: /hide details/i })).toBeInTheDocument()
    expect(screen.getAllByText(/PR flow/i).length).toBeGreaterThan(0)
  })

  it('switches the recent activity window locally', async () => {
    render(<ActivityView results={[buildResult()]} />)

    const activityView = screen.getByRole('region', { name: /activity view/i })
    expect(within(activityView).getByText(/^commits$/i)).toBeInTheDocument()
    expect(within(activityView).getByText('18')).toBeInTheDocument()
    expect(within(activityView).getByText(/development cadence/i)).toBeInTheDocument()
    expect(within(activityView).getAllByText(/\d+\w{2} percentile/i).length).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('button', { name: '30d' }))

    expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(activityView).getByText(/^commits$/i)).toBeInTheDocument()
    expect(within(activityView).getAllByText('3').length).toBeGreaterThan(0)
    expect(within(activityView).getByText('60%')).toBeInTheDocument()
    expect(within(activityView).getByText('20.0%')).toBeInTheDocument()
    expect(within(activityView).getAllByText(/\d+\w{2} percentile/i).length).toBeGreaterThan(0)
    expect(within(activityView).getByText(/prs are not reaching merge/i)).toBeInTheDocument()
    expect(within(activityView).getByText('10.0d')).toBeInTheDocument()
    expect(within(activityView).getByText('20.0d')).toBeInTheDocument()
    expect(within(activityView).getByText(/selected 30d window/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '12 months' }))

    expect(screen.getByRole('button', { name: '12 months' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(activityView).getByText(/^releases$/i)).toBeInTheDocument()
    expect(within(activityView).getAllByText('6').length).toBeGreaterThan(0)
    expect(within(activityView).getByText('75.0%')).toBeInTheDocument()
    expect(within(activityView).getAllByText(/\d+\w{2} percentile/i).length).toBeGreaterThan(0)
    expect(within(activityView).getByText('4.0d')).toBeInTheDocument()
    expect(within(activityView).getByText('6.0d')).toBeInTheDocument()
    expect(within(activityView).getByText(/selected 12 months window/i)).toBeInTheDocument()
  })
})
