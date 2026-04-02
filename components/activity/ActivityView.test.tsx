import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ActivityView } from './ActivityView'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'

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
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    missingFields: [],
    ...overrides,
  }
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
    expect(within(activityView).getAllByText(/^merge rate$/i)).toHaveLength(2)
    expect(within(activityView).getAllByText(/^closure rate$/i)).toHaveLength(2)
    expect(within(activityView).getAllByText('18')).toHaveLength(2)
    expect(within(activityView).getAllByText(/^high$/i).length).toBeGreaterThan(0)
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
    expect(within(activityView).getAllByText('unavailable').length).toBeGreaterThan(0)
    expect(within(activityView).getByText(/^missing data$/i)).toBeInTheDocument()
    expect(within(activityView).getByText(/unavailable in selected 90d window/i)).toBeInTheDocument()
    expect(within(activityView).getByText(/activity score is waiting on:/i)).toBeInTheDocument()
  })

  it('shows activity score help and threshold details on demand', async () => {
    render(<ActivityView results={[buildResult()]} />)

    expect(screen.getByText(/how is activity scored/i)).toBeInTheDocument()
    expect(screen.queryByText(/weighted score >= 80/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show thresholds/i }))

    expect(screen.getByRole('button', { name: /hide thresholds/i })).toBeInTheDocument()
    expect(screen.getByText(/weighted score >= 80/i)).toBeInTheDocument()
  })

  it('switches the recent activity window locally', async () => {
    render(<ActivityView results={[buildResult()]} />)

    const activityView = screen.getByRole('region', { name: /activity view/i })
    expect(within(activityView).getByText(/^commits$/i)).toBeInTheDocument()
    expect(within(activityView).getByText('18')).toBeInTheDocument()
    expect(within(activityView).getByText(/^high$/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '30d' }))

    expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(activityView).getByText(/^commits$/i)).toBeInTheDocument()
    expect(within(activityView).getByText('3')).toBeInTheDocument()
    expect(within(activityView).getByText('75.0%')).toBeInTheDocument()
    expect(within(activityView).getByText('10.0d')).toBeInTheDocument()
    expect(within(activityView).getByText('20.0d')).toBeInTheDocument()
    expect(within(activityView).getByText(/^low$/i)).toBeInTheDocument()
    expect(within(activityView).getByText(/selected 30d window/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '12 months' }))

    expect(screen.getByRole('button', { name: '12 months' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(activityView).getByText(/^releases$/i)).toBeInTheDocument()
    expect(within(activityView).getByText('6')).toBeInTheDocument()
    expect(within(activityView).getByText('40.0%')).toBeInTheDocument()
    expect(within(activityView).getByText('4.0d')).toBeInTheDocument()
    expect(within(activityView).getByText('6.0d')).toBeInTheDocument()
    expect(within(activityView).getByText(/^medium$/i)).toBeInTheDocument()
    expect(within(activityView).getByText(/selected 12 months window/i)).toBeInTheDocument()
  })
})
