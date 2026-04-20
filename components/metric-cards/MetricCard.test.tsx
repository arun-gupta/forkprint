import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildMetricCardViewModels } from '@/lib/metric-cards/view-model'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { MetricCard } from './MetricCard'

describe('MetricCard', () => {
  it('renders unified scorecard with all 6 dimensions', () => {
    const card = buildMetricCardViewModels([buildResult()])[0]!

    render(<MetricCard card={card} />)

    expect(screen.getByText('facebook/react')).toBeInTheDocument()
    expect(screen.getByText(/oss health score/i)).toBeInTheDocument()

    // All 6 dimensions present
    expect(screen.getByText(/^Reach$/)).toBeInTheDocument()
    expect(screen.getByText(/^Attention$/)).toBeInTheDocument()
    expect(screen.getByText(/^Engagement$/)).toBeInTheDocument()
    expect(screen.getByText(/^Activity$/)).toBeInTheDocument()
    expect(screen.getByText(/^Responsiveness$/)).toBeInTheDocument()
    expect(screen.getByText(/^Contributors$/)).toBeInTheDocument()
    expect(screen.getByText(/^Documentation$/)).toBeInTheDocument()
    expect(screen.getByText(/^Security$/)).toBeInTheDocument()

    // Supporting details inline
    expect(screen.getByText(/244,295 stars/)).toBeInTheDocument()
    expect(screen.getByText(/20.8% fork rate/i)).toBeInTheDocument()
    expect(screen.getByText(/2.7% watcher rate/i)).toBeInTheDocument()

    // Percentile labels present
    expect(screen.getAllByText(/\d+\w{2} percentile/).length).toBeGreaterThanOrEqual(3)
  })

  it('shows insufficient data label for scores without data', () => {
    const card = buildMetricCardViewModels([buildResult()])[0]!

    render(<MetricCard card={card} />)

    // Both Contributors (no commit data) and Community (no known signals)
    // can surface as insufficient; assert at least one is rendered.
    expect(screen.getAllByText('Insufficient verified public data').length).toBeGreaterThanOrEqual(1)
  })

  it('renders repo description below header', () => {
    const card = buildMetricCardViewModels([buildResult()])[0]!

    render(<MetricCard card={card} />)

    expect(screen.getAllByText('The library for web and native user interfaces.').length).toBeGreaterThanOrEqual(1)
  })

  it('renders maturity details in the visible card details panel', () => {
    const card = buildMetricCardViewModels([
      buildResult({
        ageInDays: 365 * 5,
        starsPerYear: 48.2,
        contributorsPerYear: 12.4,
        commitsPerMonthLifetime: 31.6,
        growthTrajectory: 'accelerating',
      }),
    ])[0]!

    render(<MetricCard card={card} />)

    expect(screen.getByText(/^Age$/)).toBeInTheDocument()
    expect(screen.getByText('5.0 yr')).toBeInTheDocument()
    expect(screen.getByText('Stars / year')).toBeInTheDocument()
    expect(screen.getByText('48.2 /yr')).toBeInTheDocument()
    expect(screen.getByText('Contributors / year')).toBeInTheDocument()
    expect(screen.getByText('12.4 /yr')).toBeInTheDocument()
    expect(screen.getByText('Commits / month')).toBeInTheDocument()
    expect(screen.getByText('31.6 /mo')).toBeInTheDocument()
    expect(screen.getByText('Growth trajectory')).toBeInTheDocument()
    expect(screen.getByText('Accelerating')).toBeInTheDocument()
    expect(screen.queryByText('Commits (30d)')).not.toBeInTheDocument()
    expect(screen.queryByText('PRs opened (90d)')).not.toBeInTheDocument()
    expect(screen.queryByText('Total contributors')).not.toBeInTheDocument()
  })

  it('shows fallback for unavailable description', () => {
    const card = buildMetricCardViewModels([buildResult({ description: 'unavailable' })])[0]!

    render(<MetricCard card={card} />)

    expect(screen.getByText('No description found')).toBeInTheDocument()
  })

  it('renders lens pills as non-clickable spans when no onTagChange is provided', () => {
    const card = buildMetricCardViewModels([buildResult(sparseCommunityOverrides())])[0]!
    render(<MetricCard card={card} />)
    const communityLabel = screen.getByText(/^Community$/i)
    expect(communityLabel.closest('button')).toBeNull()
  })

  it('renders lens pills as buttons and toggles activeTag when clicked', () => {
    const card = buildMetricCardViewModels([buildResult(sparseCommunityOverrides())])[0]!
    const onTagChange = vi.fn()

    const { rerender } = render(<MetricCard card={card} activeTag={null} onTagChange={onTagChange} />)
    const communityButton = screen.getByRole('button', { name: /community/i })
    expect(communityButton).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(communityButton)
    expect(onTagChange).toHaveBeenCalledWith('community')

    rerender(<MetricCard card={card} activeTag="community" onTagChange={onTagChange} />)
    const active = screen.getByRole('button', { name: /community/i })
    expect(active).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(active)
    expect(onTagChange).toHaveBeenLastCalledWith(null)
  })

  it('renders score-badge tiles as buttons that navigate to the matching tab', () => {
    const card = buildMetricCardViewModels([buildResult()])[0]!

    // Fake results-shell tabs present in the DOM so the click-proxy finds them.
    const tabs = document.createElement('div')
    tabs.innerHTML = `
      <button role="tab" data-tab-id="contributors"></button>
      <button role="tab" data-tab-id="activity"></button>
      <button role="tab" data-tab-id="responsiveness"></button>
      <button role="tab" data-tab-id="documentation"></button>
      <button role="tab" data-tab-id="security"></button>
    `
    document.body.appendChild(tabs)
    const clicks: string[] = []
    tabs.querySelectorAll('[role="tab"]').forEach((t) => {
      t.addEventListener('click', () => clicks.push(t.getAttribute('data-tab-id')!))
    })

    try {
      render(<MetricCard card={card} />)

      for (const dim of ['Activity', 'Responsiveness', 'Documentation', 'Security', 'Contributors'] as const) {
        const btn = screen.getByRole('button', { name: `Open ${dim} tab` })
        expect(btn.tagName).toBe('BUTTON')
        fireEvent.click(btn)
      }

      expect(clicks).toEqual(['activity', 'responsiveness', 'documentation', 'security', 'contributors'])
    } finally {
      tabs.remove()
    }
  })

  describe('solo-project profile (#214)', () => {
    const soloOverrides: Partial<AnalysisResult> = {
      totalContributors: 1,
      uniqueCommitAuthors90d: 1,
      maintainerCount: 'unavailable',
      documentationResult: 'unavailable',
    }

    it('renders solo banner and hides Contributors + Responsiveness cells for a solo repo', () => {
      const card = buildMetricCardViewModels([buildResult(soloOverrides)])[0]!

      render(<MetricCard card={card} />)

      expect(screen.getByTestId(`solo-profile-banner-${card.repo}`)).toBeInTheDocument()
      expect(screen.getByText(/solo-maintained project/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Open Contributors tab' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Open Responsiveness tab' })).not.toBeInTheDocument()
      // Remaining scored dimensions still visible
      expect(screen.getByRole('button', { name: 'Open Activity tab' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Open Documentation tab' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Open Security tab' })).toBeInTheDocument()
    })

    it('toggles back to community scoring when the override button is clicked', () => {
      const card = buildMetricCardViewModels([buildResult(soloOverrides)])[0]!

      render(<MetricCard card={card} />)

      const toggle = screen.getByTestId(`solo-profile-toggle-${card.repo}`)
      expect(toggle).toHaveTextContent(/use community scoring/i)

      fireEvent.click(toggle)

      // Contributors + Responsiveness cells return
      expect(screen.getByRole('button', { name: 'Open Contributors tab' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Open Responsiveness tab' })).toBeInTheDocument()
      // Banner flips copy
      expect(screen.getByText(/community scoring override active/i)).toBeInTheDocument()
      expect(screen.getByTestId(`solo-profile-toggle-${card.repo}`)).toHaveTextContent(/use solo scoring/i)
    })

    it('does not render solo banner for a community repo', () => {
      const card = buildMetricCardViewModels([buildResult()])[0]!

      render(<MetricCard card={card} />)

      expect(screen.queryByTestId(`solo-profile-banner-${card.repo}`)).not.toBeInTheDocument()
    })
  })

  it('handles unavailable ecosystem metrics gracefully', () => {
    const card = buildMetricCardViewModels([
      buildResult({ stars: 'unavailable', forks: 'unavailable', watchers: 'unavailable' }),
    ])[0]!

    render(<MetricCard card={card} />)

    // No ecosystem profile rows when data is unavailable
    expect(screen.queryByText(/^Reach$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Engagement$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Attention$/)).not.toBeInTheDocument()
  })
})

function sparseCommunityOverrides(): Partial<AnalysisResult> {
  return {
    hasFundingConfig: true,
    hasDiscussionsEnabled: false,
  }
}

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    repo: 'facebook/react',
    name: 'react',
    description: 'The library for web and native user interfaces.',
    createdAt: '2013-05-24T16:15:54Z',
    primaryLanguage: 'TypeScript',
    stars: 244295,
    forks: 50872,
    watchers: 6660,
    commits30d: 7,
    commits90d: 18,
    releases12mo: 6,
    prsOpened90d: 4,
    prsMerged90d: 3,
    issuesOpen: 5,
    issuesClosed90d: 6,
    activityMetricsByWindow: {
      30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 12, medianTimeToCloseHours: 24 },
      60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2, staleIssueRatio: 0.15, medianTimeToMergeHours: 18, medianTimeToCloseHours: 30 },
      90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 3, staleIssueRatio: 0.2, medianTimeToMergeHours: 24, medianTimeToCloseHours: 36 },
      180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4, staleIssueRatio: 0.3, medianTimeToMergeHours: 48, medianTimeToCloseHours: 72 },
      365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6, staleIssueRatio: 0.4, medianTimeToMergeHours: 96, medianTimeToCloseHours: 144 },
    },
    staleIssueRatio: 0.2,
    medianTimeToMergeHours: 24,
    medianTimeToCloseHours: 36,
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
