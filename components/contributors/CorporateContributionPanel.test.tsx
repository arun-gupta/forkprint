import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { AnalysisResult, ActivityWindowMetrics, ContributorWindowMetrics } from '@/lib/analyzer/analysis-result'
import { buildResult } from '@/lib/testing/fixtures'
import { CorporateContributionPanel } from './CorporateContributionPanel'

const WINDOW_DAYS_LIST = [30, 60, 90, 180, 365] as const

function makeActivityWindow(commits: number | 'unavailable'): ActivityWindowMetrics {
  return {
    commits,
    prsOpened: 0,
    prsMerged: 0,
    issuesOpened: 0,
    issuesClosed: 0,
    releases: 0,
    staleIssueRatio: 0,
    medianTimeToMergeHours: 0,
    medianTimeToCloseHours: 0,
  }
}

function makeContributorWindow(overrides: Partial<ContributorWindowMetrics> = {}): ContributorWindowMetrics {
  return {
    uniqueCommitAuthors: 'unavailable',
    commitCountsByAuthor: 'unavailable',
    repeatContributors: 'unavailable',
    newContributors: 'unavailable',
    commitCountsByExperimentalOrg: {},
    experimentalAttributedAuthors: 0,
    experimentalUnattributedAuthors: 0,
    commitAuthorsByExperimentalOrg: {},
    commitCountsByEmailDomain: {},
    commitAuthorsByEmailDomain: {},
    ...overrides,
  }
}

function makeResultWithNoMatch(): AnalysisResult {
  const window = makeContributorWindow()
  return buildResult({
    repo: 'owner/repo',
    activityMetricsByWindow: Object.fromEntries(
      WINDOW_DAYS_LIST.map((w) => [w, makeActivityWindow(100)]),
    ) as Record<(typeof WINDOW_DAYS_LIST)[number], ActivityWindowMetrics>,
    contributorMetricsByWindow: Object.fromEntries(
      WINDOW_DAYS_LIST.map((w) => [w, window]),
    ) as Record<(typeof WINDOW_DAYS_LIST)[number], ContributorWindowMetrics>,
  })
}

function makeResultWithMatch(): AnalysisResult {
  const window = makeContributorWindow({
    commitCountsByExperimentalOrg: { microsoft: 5 },
    commitAuthorsByExperimentalOrg: { microsoft: ['login:alice', 'login:bob'] },
    commitCountsByEmailDomain: {},
    commitAuthorsByEmailDomain: {},
  })
  return buildResult({
    repo: 'owner/repo',
    activityMetricsByWindow: Object.fromEntries(
      WINDOW_DAYS_LIST.map((w) => [w, makeActivityWindow(10)]),
    ) as Record<(typeof WINDOW_DAYS_LIST)[number], ActivityWindowMetrics>,
    contributorMetricsByWindow: Object.fromEntries(
      WINDOW_DAYS_LIST.map((w) => [w, window]),
    ) as Record<(typeof WINDOW_DAYS_LIST)[number], ContributorWindowMetrics>,
  })
}

function makeResultWithUnavailableSignals(): AnalysisResult {
  const window = makeContributorWindow({
    commitCountsByExperimentalOrg: 'unavailable',
    commitAuthorsByExperimentalOrg: 'unavailable',
    commitCountsByEmailDomain: 'unavailable',
    commitAuthorsByEmailDomain: 'unavailable',
  })
  return buildResult({
    repo: 'owner/unavailable-repo',
    activityMetricsByWindow: Object.fromEntries(
      WINDOW_DAYS_LIST.map((w) => [w, makeActivityWindow(10)]),
    ) as Record<(typeof WINDOW_DAYS_LIST)[number], ActivityWindowMetrics>,
    contributorMetricsByWindow: Object.fromEntries(
      WINDOW_DAYS_LIST.map((w) => [w, window]),
    ) as Record<(typeof WINDOW_DAYS_LIST)[number], ContributorWindowMetrics>,
  })
}

describe('CorporateContributionPanel', () => {
  it('renders the table immediately when companyName prop is provided', () => {
    render(<CorporateContributionPanel results={[makeResultWithMatch()]} companyName="microsoft" />)

    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('displays the company name in the header', () => {
    render(<CorporateContributionPanel results={[makeResultWithMatch()]} companyName="microsoft" />)

    expect(screen.getByText('microsoft')).toBeInTheDocument()
  })

  it('displays Corporate commits, Corporate authors, Corporate % column headers', () => {
    render(<CorporateContributionPanel results={[makeResultWithMatch()]} companyName="microsoft" />)

    const table = screen.getByRole('table')
    expect(within(table).getByText(/corporate commits/i)).toBeInTheDocument()
    expect(within(table).getByText(/corporate authors/i)).toBeInTheDocument()
    expect(within(table).getByText(/corporate %/i)).toBeInTheDocument()
  })

  it('displays 0 (not "—") when the company matches no commits', () => {
    render(<CorporateContributionPanel results={[makeResultWithNoMatch()]} companyName="microsoft" />)

    const table = screen.getByRole('table')
    const cells = within(table).getAllByRole('cell')
    const commitCell = cells.find((c) => c.textContent === '0')
    expect(commitCell).toBeDefined()
    expect(within(table).queryByText('—')).not.toBeInTheDocument()
  })

  it('displays "—" (not 0) in per-repo rows when attribution data is fully unavailable', () => {
    render(<CorporateContributionPanel results={[makeResultWithUnavailableSignals()]} companyName="microsoft" />)

    const table = screen.getByRole('table')
    const rows = within(table).getAllByRole('row')
    const perRepoRow = rows[1]!
    expect(within(perRepoRow).getAllByText('—').length).toBeGreaterThan(0)
    expect(within(perRepoRow).queryByText('0')).not.toBeInTheDocument()
  })

  it('shows the FR-013 experimental caveat text', () => {
    render(<CorporateContributionPanel results={[makeResultWithMatch()]} companyName="microsoft" />)

    expect(screen.getByText(/experimental/i)).toBeInTheDocument()
  })

  it('shows a summary row with total corporate commits and authors', () => {
    render(<CorporateContributionPanel results={[makeResultWithMatch()]} companyName="microsoft" />)

    expect(screen.getByText(/total/i)).toBeInTheDocument()
  })

  it('updates metrics when the window selector button is clicked', async () => {
    const window30 = makeContributorWindow({
      commitCountsByExperimentalOrg: { microsoft: 2 },
      commitAuthorsByExperimentalOrg: { microsoft: ['login:alice'] },
    })
    const window90 = makeContributorWindow({
      commitCountsByExperimentalOrg: { microsoft: 8 },
      commitAuthorsByExperimentalOrg: { microsoft: ['login:alice', 'login:bob', 'login:carol'] },
    })
    const result = buildResult({
      repo: 'owner/repo',
      activityMetricsByWindow: Object.fromEntries(
        WINDOW_DAYS_LIST.map((w) => [w, makeActivityWindow(10)]),
      ) as Record<(typeof WINDOW_DAYS_LIST)[number], ActivityWindowMetrics>,
      contributorMetricsByWindow: {
        30: window30,
        60: makeContributorWindow(),
        90: window90,
        180: makeContributorWindow(),
        365: makeContributorWindow(),
      } as Record<(typeof WINDOW_DAYS_LIST)[number], ContributorWindowMetrics>,
    })

    render(<CorporateContributionPanel results={[result]} companyName="microsoft" />)

    // Default window is 90d — verify 8 commits shown
    expect(within(screen.getByRole('table')).getAllByText('8').length).toBeGreaterThanOrEqual(1)

    // Switch to 30d via window selector button
    await userEvent.click(screen.getByRole('button', { name: '30d' }))
    expect(within(screen.getByRole('table')).getAllByText('2').length).toBeGreaterThanOrEqual(1)
    expect(within(screen.getByRole('table')).queryByText('8')).not.toBeInTheDocument()
  })
})
