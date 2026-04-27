import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { buildMetricCardViewModels } from '@/lib/metric-cards/view-model'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildResult as _buildResult, INCLUSIVE_NAMING_CLEAN } from '@/lib/testing/fixtures'
import { MetricCard } from './MetricCard'

function buildResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return _buildResult({
    repo: 'facebook/react',
    description: 'The library for web and native user interfaces.',
    createdAt: '2013-05-24T16:15:54Z',
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
      issueFirstResponseMedianHours: 4, issueFirstResponseP90Hours: 20, prFirstReviewMedianHours: 8, prFirstReviewP90Hours: 24, issueResolutionMedianHours: 48, issueResolutionP90Hours: 120, prMergeMedianHours: 36, prMergeP90Hours: 96, issueResolutionRate: 0.92, contributorResponseRate: 0.88, botResponseRatio: 0.1, humanResponseRatio: 0.9, staleIssueRatio: 0.12, stalePrRatio: 0.08, prReviewDepth: 2.4, issuesClosedWithoutCommentRatio: 0.08, openIssueCount: 22, openPullRequestCount: 11,
    },
    inclusiveNamingResult: INCLUSIVE_NAMING_CLEAN,
    ...overrides,
  })
}

describe('MetricCard', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders unified scorecard with all 6 dimensions', () => {
    const card = buildMetricCardViewModels([buildResult()])[0]!

    render(<MetricCard card={card} />)

    expect(screen.getByText('facebook/react')).toBeInTheDocument()
    expect(screen.getByText(/oss health score/i)).toBeInTheDocument()

    // Ecosystem tiles (primary tier)
    expect(screen.getByText(/^Reach$/)).toBeInTheDocument()
    expect(screen.getByText(/^Attention$/)).toBeInTheDocument()
    expect(screen.getByText(/^Engagement$/)).toBeInTheDocument()

    // Supporting details inline (primary tier)
    expect(screen.getByText(/244,295 stars/)).toBeInTheDocument()
    expect(screen.getByText(/20.8% fork rate/i)).toBeInTheDocument()
    expect(screen.getByText(/2.7% watcher rate/i)).toBeInTheDocument()

    // Percentile rank header shown in primary tier
    expect(screen.getAllByText('percentile rank').length).toBeGreaterThanOrEqual(1)

    // Expand to see health-dimension tiles (secondary tier)
    fireEvent.click(screen.getByTestId(`details-toggle-${card.repo}`))

    expect(screen.getByText(/^Activity$/)).toBeInTheDocument()
    expect(screen.getByText(/^Responsiveness$/)).toBeInTheDocument()
    expect(screen.getByText(/^Contributors$/)).toBeInTheDocument()
    expect(screen.getByText(/^Documentation$/)).toBeInTheDocument()
    expect(screen.getByText(/^Security$/)).toBeInTheDocument()
    expect(screen.getAllByText(/^\d+\w{2}$/).length).toBeGreaterThanOrEqual(3)
  })

  it('shows insufficient data label for scores without data', () => {
    const card = buildMetricCardViewModels([buildResult()])[0]!

    render(<MetricCard card={card} />)
    // Expand to reveal secondary tier where insufficient labels appear
    fireEvent.click(screen.getByTestId(`details-toggle-${card.repo}`))

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
    // Details panel is in secondary tier — expand first
    fireEvent.click(screen.getByTestId(`details-toggle-${card.repo}`))

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
    // Lenses are in secondary tier — expand first
    fireEvent.click(screen.getByTestId(`details-toggle-${card.repo}`))
    const communityLabel = screen.getByText(/^Community$/i)
    expect(communityLabel.closest('button')).toBeNull()
  })

  it('renders lens pills as buttons and toggles activeTag when clicked', () => {
    const card = buildMetricCardViewModels([buildResult(sparseCommunityOverrides())])[0]!
    const onTagChange = vi.fn()

    const { rerender } = render(<MetricCard card={card} activeTag={null} onTagChange={onTagChange} />)
    // Lenses are in secondary tier — expand first
    fireEvent.click(screen.getByTestId(`details-toggle-${card.repo}`))
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
      // Score cells are in secondary tier — expand first
      fireEvent.click(screen.getByTestId(`details-toggle-${card.repo}`))

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

      // Expand to check score cells (secondary tier)
      fireEvent.click(screen.getByTestId(`details-toggle-${card.repo}`))

      expect(screen.queryByRole('button', { name: 'Open Contributors tab' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Open Responsiveness tab' })).not.toBeInTheDocument()
      // Remaining scored dimensions still visible in secondary tier
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

      // Expand secondary tier to see the score cells
      fireEvent.click(screen.getByTestId(`details-toggle-${card.repo}`))

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

  describe('copy score to clipboard (#90)', () => {
    let writeText: ReturnType<typeof vi.fn>

    beforeEach(() => {
      writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      })
    })

    it('renders a copy button on the OSS Health Score banner', () => {
      const card = buildMetricCardViewModels([buildResult()])[0]!
      render(<MetricCard card={card} />)
      expect(screen.getByTestId(`copy-score-${card.repo}`)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /copy score to clipboard/i })).toBeInTheDocument()
    })

    it('copies a formatted score string to clipboard on click', async () => {
      const card = buildMetricCardViewModels([buildResult()])[0]!
      render(<MetricCard card={card} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /copy score to clipboard/i }))
      })

      expect(writeText).toHaveBeenCalledOnce()
      const [text] = writeText.mock.calls[0] as [string]
      expect(text).toMatch(/^RepoPulse: facebook\/react — /)
      expect(text).toMatch(/Activity:/)
      expect(text).toMatch(/Responsiveness:/)
      // ecosystem section is included since stars/forks/watchers are available
      expect(text).toMatch(/Ecosystem:/)
      expect(text).toMatch(/Reach:/)
      expect(text).toMatch(/Attention:/)
      expect(text).toMatch(/Engagement:/)
    })

    it('includes maturity details in the copy string when available', async () => {
      const card = buildMetricCardViewModels([buildResult({
        primaryLanguage: 'TypeScript',
        ageInDays: 365 * 5,
        starsPerYear: 1200,
        contributorsPerYear: 42,
        commitsPerMonthLifetime: 25,
        growthTrajectory: 'accelerating',
      })])[0]!
      render(<MetricCard card={card} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /copy score to clipboard/i }))
      })

      expect(writeText).toHaveBeenCalledOnce()
      const [text] = writeText.mock.calls[0] as [string]
      expect(text).toMatch(/Primary language: TypeScript/)
      expect(text).toMatch(/Age:/)
      expect(text).toMatch(/Stars \/ year:/)
      expect(text).toMatch(/Contributors \/ year:/)
      expect(text).toMatch(/Commits \/ month:/)
      expect(text).toMatch(/Growth trajectory: Accelerating/)
    })

    it('shows "Copied!" feedback after click and resets after 2s', async () => {
      vi.useFakeTimers()
      try {
        const card = buildMetricCardViewModels([buildResult()])[0]!
        render(<MetricCard card={card} />)

        await act(async () => {
          fireEvent.click(screen.getByRole('button', { name: /copy score to clipboard/i }))
        })

        expect(screen.getByText('Copied!')).toBeInTheDocument()

        await act(async () => { vi.advanceTimersByTime(2000) })
        expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    })

    it('omits hidden buckets from the copy string for solo repos', async () => {
      const card = buildMetricCardViewModels([buildResult({
        totalContributors: 1,
        uniqueCommitAuthors90d: 1,
        maintainerCount: 'unavailable',
        documentationResult: 'unavailable',
      })])[0]!
      render(<MetricCard card={card} />)

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /copy score to clipboard/i }))
      })

      expect(writeText).toHaveBeenCalledOnce()
      const [text] = writeText.mock.calls[0] as [string]
      expect(text).not.toMatch(/Responsiveness:/)
      expect(text).not.toMatch(/Contributors:/)
    })
  })
})

describe('progressive disclosure', () => {
  let mockStore: Record<string, string>

  beforeEach(() => {
    mockStore = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, value: string) => { mockStore[key] = value },
      removeItem: (key: string) => { delete mockStore[key] },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('T003: health score and ecosystem tiles visible by default', () => {
    const card = buildMetricCardViewModels([buildResult()])[0]!
    render(<MetricCard card={card} />)
    expect(screen.getByText(/oss health score/i)).toBeInTheDocument()
    expect(screen.getByText(/^Reach$/)).toBeInTheDocument()
    expect(screen.getByText(/^Attention$/)).toBeInTheDocument()
    expect(screen.getByText(/^Engagement$/)).toBeInTheDocument()
  })

  it('T004: secondary content hidden by default', () => {
    const card = buildMetricCardViewModels([buildResult()])[0]!
    render(<MetricCard card={card} />)
    expect(screen.queryByText(/^Activity$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Responsiveness$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Contributors$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Security$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Lenses$/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /facebook\/react details/i })).not.toBeInTheDocument()
  })

  it('T005: Show details affordance present with aria-expanded=false', () => {
    const card = buildMetricCardViewModels([buildResult()])[0]!
    render(<MetricCard card={card} />)
    const toggle = screen.getByTestId('details-toggle-facebook/react')
    expect(toggle).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveTextContent(/show details/i)
  })

  it('T011: click Show details reveals secondary content', () => {
    const card = buildMetricCardViewModels([buildResult()])[0]!
    render(<MetricCard card={card} />)
    const toggle = screen.getByTestId('details-toggle-facebook/react')
    fireEvent.click(toggle)
    expect(screen.getByText(/^Activity$/)).toBeInTheDocument()
    expect(screen.getByText(/^Responsiveness$/)).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveTextContent(/hide details/i)
  })

  it('T012: expand then collapse hides secondary content again', () => {
    const card = buildMetricCardViewModels([buildResult()])[0]!
    render(<MetricCard card={card} />)
    const toggle = screen.getByTestId('details-toggle-facebook/react')
    fireEvent.click(toggle)
    fireEvent.click(toggle)
    expect(screen.queryByText(/^Activity$/)).not.toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveTextContent(/show details/i)
  })

  it('T013: expanded state: lens pill click triggers onTagChange', () => {
    const card = buildMetricCardViewModels([buildResult(sparseCommunityOverrides())])[0]!
    const onTagChange = vi.fn()
    render(<MetricCard card={card} activeTag={null} onTagChange={onTagChange} />)
    fireEvent.click(screen.getByTestId('details-toggle-facebook/react'))
    const communityButton = screen.getByRole('button', { name: /community/i })
    fireEvent.click(communityButton)
    expect(onTagChange).toHaveBeenCalledWith('community')
  })

  it('T018: card starts expanded when localStorage has true', () => {
    mockStore['repopulse:card-expanded:facebook/react'] = 'true'
    const card = buildMetricCardViewModels([buildResult()])[0]!
    render(<MetricCard card={card} />)
    expect(screen.getByText(/^Activity$/)).toBeInTheDocument()
    const toggle = screen.getByTestId('details-toggle-facebook/react')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveTextContent(/hide details/i)
  })

  it('T019: card starts collapsed when localStorage has false', () => {
    mockStore['repopulse:card-expanded:facebook/react'] = 'false'
    const card = buildMetricCardViewModels([buildResult()])[0]!
    render(<MetricCard card={card} />)
    expect(screen.queryByText(/^Activity$/)).not.toBeInTheDocument()
  })

  it('T020: toggle writes new state to localStorage', () => {
    const card = buildMetricCardViewModels([buildResult()])[0]!
    render(<MetricCard card={card} />)
    const toggle = screen.getByTestId('details-toggle-facebook/react')
    fireEvent.click(toggle)
    expect(mockStore['repopulse:card-expanded:facebook/react']).toBe('true')
    fireEvent.click(toggle)
    expect(mockStore['repopulse:card-expanded:facebook/react']).toBe('false')
  })

  it('T021: localStorage throws on read → defaults to collapsed', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new DOMException('QuotaExceededError') },
      setItem: () => { throw new DOMException('QuotaExceededError') },
    })
    const card = buildMetricCardViewModels([buildResult()])[0]!
    render(<MetricCard card={card} />)
    expect(screen.queryByText(/^Activity$/)).not.toBeInTheDocument()
  })
})

describe('CNCF header badge (US4)', () => {
  const mockAspirantResult = {
    foundationTarget: 'cncf-sandbox' as const,
    readinessScore: 75,
    autoFields: [],
    humanOnlyFields: [],
    readyCount: 5,
    totalAutoCheckable: 8,
    alreadyInLandscape: false,
    tagRecommendation: { primaryTag: null, matchedSignals: [], fallbackNote: null },
    sandboxApplication: null,
  }

  it('T025: CNCF badge visible in header when aspirantResult is set', () => {
    const card = buildMetricCardViewModels([buildResult({ aspirantResult: mockAspirantResult })])[0]!
    render(<MetricCard card={card} />)
    const badge = screen.getByTestId('cncf-badge-facebook/react')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('75')
  })

  it('T026: CNCF badge absent when aspirantResult is null', () => {
    const card = buildMetricCardViewModels([buildResult({ aspirantResult: null })])[0]!
    render(<MetricCard card={card} />)
    expect(screen.queryByTestId('cncf-badge-facebook/react')).not.toBeInTheDocument()
  })

  it('T027: CNCF badge visible without expanding details (primary tier)', () => {
    const card = buildMetricCardViewModels([buildResult({ aspirantResult: mockAspirantResult })])[0]!
    render(<MetricCard card={card} />)
    expect(screen.getByTestId('cncf-badge-facebook/react')).toBeInTheDocument()
    // Confirm secondary tier is closed (badge is not behind the gate)
    expect(screen.queryByText(/^Activity$/)).not.toBeInTheDocument()
  })
})

function sparseCommunityOverrides(): Partial<AnalysisResult> {
  return {
    hasFundingConfig: true,
    hasDiscussionsEnabled: false,
  }
}
