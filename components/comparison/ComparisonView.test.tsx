import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { ComparisonView } from './ComparisonView'

describe('ComparisonView', () => {
  it('renders the comparison controls and grouped sections', () => {
    render(<ComparisonView results={[buildResult('facebook/react'), buildResult('nvidia/topograph')]} />)

    expect(screen.getByRole('region', { name: /comparison view/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/anchor repo/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Activity' })).toBeInTheDocument()
  })

  it('renders unavailable comparison cells as a muted em dash', () => {
    const { container } = render(
      <ComparisonView results={[buildResult('facebook/react', { totalContributors: 'unavailable' }), buildResult('nvidia/topograph')]} />,
    )

    const mutedDashCells = Array.from(container.querySelectorAll('p')).filter(
      (p) => p.textContent?.trim() === '—' && p.className.includes('text-slate-400'),
    )
    expect(mutedDashCells.length).toBeGreaterThan(0)
  })

  it('lets the user toggle the median column', async () => {
    render(<ComparisonView results={[buildResult('facebook/react'), buildResult('nvidia/topograph')]} />)

    expect(screen.getAllByRole('button', { name: /median/i }).length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('checkbox', { name: /show median column/i }))
    expect(screen.queryAllByRole('button', { name: /median/i })).toHaveLength(0)
  })

  it('lets the user disable a section', async () => {
    render(<ComparisonView results={[buildResult('facebook/react'), buildResult('nvidia/topograph')]} />)

    await userEvent.click(screen.getByRole('button', { name: /sections & attributes/i }))
    await userEvent.click(screen.getAllByRole('checkbox', { name: 'Activity' })[0]!)
    expect(screen.queryByRole('heading', { name: 'Activity' })).not.toBeInTheDocument()
  })

  describe('participants picker', () => {
    it('does not render when only 4 repos are analyzed', () => {
      render(
        <ComparisonView
          results={[
            buildResult('one/repo'),
            buildResult('two/repo'),
            buildResult('three/repo'),
            buildResult('four/repo'),
          ]}
        />,
      )

      expect(screen.queryByRole('group', { name: /comparison participants/i })).not.toBeInTheDocument()
    })

    it('renders when 5+ repos are analyzed, defaulting to the first four checked', () => {
      render(
        <ComparisonView
          results={[
            buildResult('one/repo'),
            buildResult('two/repo'),
            buildResult('three/repo'),
            buildResult('four/repo'),
            buildResult('five/repo'),
            buildResult('six/repo'),
          ]}
        />,
      )

      expect(screen.getByRole('group', { name: /comparison participants/i })).toBeInTheDocument()
      expect(screen.getByLabelText('Include one/repo in comparison')).toBeChecked()
      expect(screen.getByLabelText('Include four/repo in comparison')).toBeChecked()
      expect(screen.getByLabelText('Include five/repo in comparison')).not.toBeChecked()
      expect(screen.getByLabelText('Include six/repo in comparison')).not.toBeChecked()
    })

    it('disables unchecked boxes when four participants are already selected', () => {
      render(
        <ComparisonView
          results={[
            buildResult('one/repo'),
            buildResult('two/repo'),
            buildResult('three/repo'),
            buildResult('four/repo'),
            buildResult('five/repo'),
          ]}
        />,
      )

      const five = screen.getByLabelText('Include five/repo in comparison')
      expect(five).not.toBeChecked()
      expect(five).toBeDisabled()
    })

    it('swaps a participant in by unchecking a current one and checking a new one', async () => {
      render(
        <ComparisonView
          results={[
            buildResult('one/repo'),
            buildResult('two/repo'),
            buildResult('three/repo'),
            buildResult('four/repo'),
            buildResult('five/repo'),
          ]}
        />,
      )

      await userEvent.click(screen.getByLabelText('Include four/repo in comparison'))
      await userEvent.click(screen.getByLabelText('Include five/repo in comparison'))

      expect(screen.getByLabelText('Include four/repo in comparison')).not.toBeChecked()
      expect(screen.getByLabelText('Include five/repo in comparison')).toBeChecked()
      expect(screen.queryByRole('button', { name: /sort by four\/repo/i })).not.toBeInTheDocument()
    })

    it('tops up participants to four when new repos are analyzed after mount', () => {
      const twoResults = [buildResult('one/repo'), buildResult('two/repo')]
      const { rerender } = render(<ComparisonView results={twoResults} />)

      // With 2 results, picker is not shown.
      expect(screen.queryByRole('group', { name: /comparison participants/i })).not.toBeInTheDocument()

      // Grow results to 8. Participants should top up to the first four.
      rerender(
        <ComparisonView
          results={[
            buildResult('one/repo'),
            buildResult('two/repo'),
            buildResult('three/repo'),
            buildResult('four/repo'),
            buildResult('five/repo'),
            buildResult('six/repo'),
            buildResult('seven/repo'),
            buildResult('eight/repo'),
          ]}
        />,
      )

      expect(screen.getByText(/4\/4/)).toBeInTheDocument()
      expect(screen.getByLabelText('Include one/repo in comparison')).toBeChecked()
      expect(screen.getByLabelText('Include two/repo in comparison')).toBeChecked()
      expect(screen.getByLabelText('Include three/repo in comparison')).toBeChecked()
      expect(screen.getByLabelText('Include four/repo in comparison')).toBeChecked()
      expect(screen.getByLabelText('Include five/repo in comparison')).not.toBeChecked()
    })

    it('prevents dropping below two participants', async () => {
      render(
        <ComparisonView
          results={[
            buildResult('one/repo'),
            buildResult('two/repo'),
            buildResult('three/repo'),
            buildResult('four/repo'),
            buildResult('five/repo'),
          ]}
        />,
      )

      await userEvent.click(screen.getByLabelText('Include three/repo in comparison'))
      await userEvent.click(screen.getByLabelText('Include four/repo in comparison'))

      expect(screen.getByLabelText('Include one/repo in comparison')).toBeDisabled()
      expect(screen.getByLabelText('Include two/repo in comparison')).toBeDisabled()
    })
  })
})

function buildResult(repo: string, overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo,
    name: repo.split('/')[1] ?? repo,
    description: 'Repo description',
    createdAt: '2013-05-24T16:15:54Z',
    primaryLanguage: 'TypeScript',
    stars: repo === 'facebook/react' ? 200 : 120,
    forks: repo === 'facebook/react' ? 40 : 12,
    watchers: repo === 'facebook/react' ? 20 : 6,
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
    commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3 },
    contributorMetricsByWindow: {
      30: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      60: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      90: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      180: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      365: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
    },
    activityMetricsByWindow: {
      30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 12, medianTimeToCloseHours: 24 },
      60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2, staleIssueRatio: 0.15, medianTimeToMergeHours: 18, medianTimeToCloseHours: 30 },
      90: { commits: 18, prsOpened: repo === 'facebook/react' ? 10 : 8, prsMerged: repo === 'facebook/react' ? 8 : 3, issuesOpened: 8, issuesClosed: 6, releases: 3, staleIssueRatio: repo === 'facebook/react' ? 0.2 : 0.35, medianTimeToMergeHours: repo === 'facebook/react' ? 24 : 50, medianTimeToCloseHours: 36 },
      180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4, staleIssueRatio: 0.3, medianTimeToMergeHours: 48, medianTimeToCloseHours: 72 },
      365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6, staleIssueRatio: 0.4, medianTimeToMergeHours: 96, medianTimeToCloseHours: 144 },
    },
    responsivenessMetricsByWindow: {
      30: { issueFirstResponseMedianHours: 12, issueFirstResponseP90Hours: 48, prFirstReviewMedianHours: 24, prFirstReviewP90Hours: 72, issueResolutionMedianHours: 36, issueResolutionP90Hours: 96, prMergeMedianHours: 24, prMergeP90Hours: 72, issueResolutionRate: 0.8, contributorResponseRate: 0.7, botResponseRatio: 0.1, humanResponseRatio: 0.8, staleIssueRatio: 0.1, stalePrRatio: 0.05, prReviewDepth: 3, issuesClosedWithoutCommentRatio: 0.2, openIssueCount: 10, openPullRequestCount: 5 },
      60: { issueFirstResponseMedianHours: 14, issueFirstResponseP90Hours: 50, prFirstReviewMedianHours: 28, prFirstReviewP90Hours: 78, issueResolutionMedianHours: 40, issueResolutionP90Hours: 102, prMergeMedianHours: 28, prMergeP90Hours: 78, issueResolutionRate: 0.82, contributorResponseRate: 0.72, botResponseRatio: 0.12, humanResponseRatio: 0.78, staleIssueRatio: 0.12, stalePrRatio: 0.07, prReviewDepth: 3.2, issuesClosedWithoutCommentRatio: 0.22, openIssueCount: 11, openPullRequestCount: 6 },
      90: { issueFirstResponseMedianHours: repo === 'facebook/react' ? 16 : 24, issueFirstResponseP90Hours: 52, prFirstReviewMedianHours: 30, prFirstReviewP90Hours: 80, issueResolutionMedianHours: 44, issueResolutionP90Hours: 108, prMergeMedianHours: repo === 'facebook/react' ? 30 : 50, prMergeP90Hours: 80, issueResolutionRate: repo === 'facebook/react' ? 0.84 : 0.62, contributorResponseRate: 0.74, botResponseRatio: 0.15, humanResponseRatio: 0.75, staleIssueRatio: 0.14, stalePrRatio: repo === 'facebook/react' ? 0.08 : 0.3, prReviewDepth: 3.4, issuesClosedWithoutCommentRatio: 0.24, openIssueCount: 12, openPullRequestCount: 7 },
      180: { issueFirstResponseMedianHours: 18, issueFirstResponseP90Hours: 56, prFirstReviewMedianHours: 34, prFirstReviewP90Hours: 84, issueResolutionMedianHours: 48, issueResolutionP90Hours: 114, prMergeMedianHours: 34, prMergeP90Hours: 84, issueResolutionRate: 0.86, contributorResponseRate: 0.76, botResponseRatio: 0.16, humanResponseRatio: 0.74, staleIssueRatio: 0.16, stalePrRatio: 0.09, prReviewDepth: 3.6, issuesClosedWithoutCommentRatio: 0.26, openIssueCount: 13, openPullRequestCount: 8 },
      365: { issueFirstResponseMedianHours: 20, issueFirstResponseP90Hours: 60, prFirstReviewMedianHours: 36, prFirstReviewP90Hours: 90, issueResolutionMedianHours: 52, issueResolutionP90Hours: 120, prMergeMedianHours: 36, prMergeP90Hours: 90, issueResolutionRate: 0.88, contributorResponseRate: 0.78, botResponseRatio: 0.18, humanResponseRatio: 0.72, staleIssueRatio: 0.18, stalePrRatio: 0.1, prReviewDepth: 3.8, issuesClosedWithoutCommentRatio: 0.28, openIssueCount: 14, openPullRequestCount: 9 },
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
    securityResult: 'unavailable',
    missingFields: [],
    ...overrides,
  }
}
