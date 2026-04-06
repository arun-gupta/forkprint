import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepoInputClient } from './RepoInputClient'

describe('RepoInputClient', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('pre-populates the token field from localStorage', () => {
    window.localStorage.setItem('forkprint_github_token', 'ghp_saved')

    render(<RepoInputClient hasServerToken={false} />)

    expect(screen.getByLabelText(/github personal access token/i)).toHaveValue('ghp_saved')
  })

  it('persists the token when repo submission succeeds', async () => {
    const onAnalyze = vi.fn()

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(window.localStorage.getItem('forkprint_github_token')).toBe('ghp_saved')
    expect(onAnalyze).toHaveBeenCalledWith(['facebook/react'], 'ghp_saved')
  })

  it('blocks submission when no client token is present', async () => {
    const onAnalyze = vi.fn()

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(screen.getByTestId('token-error')).toHaveTextContent(/token is required/i)
    expect(onAnalyze).not.toHaveBeenCalled()
  })

  it('treats whitespace-only tokens as empty and clears the error after correction', async () => {
    const onAnalyze = vi.fn()

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), '   ')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(screen.getByTestId('token-error')).toBeInTheDocument()
    expect(onAnalyze).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByLabelText(/github personal access token/i))
    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_fixed')

    expect(screen.queryByTestId('token-error')).not.toBeInTheDocument()
  })

  it('hides the token field when a server token is configured', () => {
    render(<RepoInputClient hasServerToken />)

    expect(screen.queryByLabelText(/github personal access token/i)).not.toBeInTheDocument()
  })

  it('allows submission without a client token when a server token is configured', async () => {
    const onAnalyze = vi.fn()

    render(<RepoInputClient hasServerToken onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(screen.queryByTestId('token-error')).not.toBeInTheDocument()
    expect(onAnalyze).toHaveBeenCalledWith(['facebook/react'], null)
  })

  it('does not persist or use a client token when a server token is configured', async () => {
    const onAnalyze = vi.fn()
    window.localStorage.setItem('forkprint_github_token', 'ghp_stale')

    render(<RepoInputClient hasServerToken onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(onAnalyze).toHaveBeenCalledWith(['facebook/react'], null)
    expect(window.localStorage.getItem('forkprint_github_token')).toBe('ghp_stale')
  })

  it('renders returned analysis results after a successful submission', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [
        {
          repo: 'facebook/react',
          name: 'react',
          description: 'A UI library',
          createdAt: '2013-05-24T16:15:54Z',
          primaryLanguage: 'TypeScript',
          stars: 244295,
          forks: 25,
          watchers: 10,
          commits30d: 7,
          commits90d: 18,
          releases12mo: 'unavailable',
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
            30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 12, medianTimeToCloseHours: 24 },
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
        },
      ],
      failures: [],
      rateLimit: null,
    })

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    const results = await screen.findByRole('region', { name: /analysis results/i })
    const metricCardsOverview = within(results).getByRole('region', { name: /metric cards overview/i })
    expect(within(metricCardsOverview).getByTestId('metric-card-facebook/react')).toBeInTheDocument()
    expect(within(metricCardsOverview).getByText('244,295')).toBeInTheDocument()
    expect(within(metricCardsOverview).getByText(/ecosystem profile/i)).toBeInTheDocument()
    expect(within(results).getAllByText('Insufficient verified public data')).toHaveLength(2)
    expect(within(results).queryByText('Not scored yet')).not.toBeInTheDocument()

    const ecosystemMap = within(results).getByRole('region', { name: /ecosystem map/i })
    expect(within(ecosystemMap).getByText(/ecosystem spectrum/i)).toBeInTheDocument()
    expect(within(ecosystemMap).getByRole('button', { name: /show legend/i })).toBeInTheDocument()
    expect(within(ecosystemMap).queryByText(/^Reach$/)).not.toBeInTheDocument()
    expect(within(ecosystemMap).queryByText('facebook/react')).not.toBeInTheDocument()
  })

  it('renders org inventory results after a successful org submission', async () => {
    const onAnalyzeOrg = vi.fn().mockResolvedValue({
      org: 'facebook',
      summary: {
        totalPublicRepos: 2,
        totalStars: 180,
        mostStarredRepos: [{ repo: 'facebook/react', stars: 100 }],
        mostRecentlyActiveRepos: [{ repo: 'facebook/react', pushedAt: '2026-04-02T00:00:00Z' }],
        languageDistribution: [
          { language: 'TypeScript', repoCount: 1 },
          { language: 'JavaScript', repoCount: 1 },
        ],
        archivedRepoCount: 0,
        activeRepoCount: 2,
      },
      results: [
        {
          repo: 'facebook/react',
          name: 'react',
          description: 'A UI library',
          primaryLanguage: 'TypeScript',
          stars: 100,
          forks: 25,
          watchers: 10,
          openIssues: 5,
          pushedAt: '2026-04-02T00:00:00Z',
          archived: false,
          url: 'https://github.com/facebook/react',
        },
        {
          repo: 'facebook/jest',
          name: 'jest',
          description: 'A testing framework',
          primaryLanguage: 'JavaScript',
          stars: 80,
          forks: 10,
          watchers: 7,
          openIssues: 3,
          pushedAt: '2026-04-01T00:00:00Z',
          archived: false,
          url: 'https://github.com/facebook/jest',
        },
      ],
      rateLimit: null,
      failure: null,
    })

    render(<RepoInputClient hasServerToken={false} onAnalyzeOrg={onAnalyzeOrg} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.click(screen.getByRole('button', { name: /organization/i }))
    await userEvent.type(screen.getByRole('textbox', { name: /organization input/i }), 'facebook')
    await userEvent.click(screen.getByRole('button', { name: /^analyze$/i }))

    const orgInventory = await screen.findByRole('region', { name: /org inventory view/i })
    expect(within(orgInventory).getByText('facebook')).toBeInTheDocument()
    expect(within(orgInventory).getAllByText('facebook/react').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Organization' })).toHaveClass('bg-slate-900')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Contributors' })).not.toBeInTheDocument()
    expect(onAnalyzeOrg).toHaveBeenCalledWith('facebook', 'ghp_saved')
  })

  it('hides org inventory results when switching back to repositories mode', async () => {
    const onAnalyzeOrg = vi.fn().mockResolvedValue({
      org: 'facebook',
      summary: {
        totalPublicRepos: 1,
        totalStars: 100,
        mostStarredRepos: [{ repo: 'facebook/react', stars: 100 }],
        mostRecentlyActiveRepos: [{ repo: 'facebook/react', pushedAt: '2026-04-02T00:00:00Z' }],
        languageDistribution: [{ language: 'TypeScript', repoCount: 1 }],
        archivedRepoCount: 0,
        activeRepoCount: 1,
      },
      results: [
        {
          repo: 'facebook/react',
          name: 'react',
          description: 'A UI library',
          primaryLanguage: 'TypeScript',
          stars: 100,
          forks: 25,
          watchers: 10,
          openIssues: 5,
          pushedAt: '2026-04-02T00:00:00Z',
          archived: false,
          url: 'https://github.com/facebook/react',
        },
      ],
      rateLimit: null,
      failure: null,
    })

    render(<RepoInputClient hasServerToken={false} onAnalyzeOrg={onAnalyzeOrg} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.click(screen.getByRole('button', { name: /organization/i }))
    await userEvent.type(screen.getByRole('textbox', { name: /organization input/i }), 'facebook')
    await userEvent.click(screen.getByRole('button', { name: /^analyze$/i }))

    expect(await screen.findByRole('region', { name: /org inventory view/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Repositories' }))

    expect(screen.queryByRole('region', { name: /org inventory view/i })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Contributors' })).toBeInTheDocument()
  })

  it('switches the empty workspace to organization mode before any org results exist', async () => {
    render(<RepoInputClient hasServerToken />)

    await userEvent.click(screen.getByRole('button', { name: /organization/i }))

    expect(screen.getByRole('button', { name: 'Organization' })).toHaveClass('bg-slate-900')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Contributors' })).not.toBeInTheDocument()
    expect(screen.getByText(/enter a github organization slug or org url above/i)).toBeInTheDocument()
  })

  it('renders repository-specific failures alongside successful results', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [
        {
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
          releases12mo: 'unavailable',
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
          missingFields: [],
        },
      ],
      failures: [{ repo: 'facebook/missing-repo', reason: 'Repository could not be analyzed.', code: 'NOT_FOUND' }],
      rateLimit: null,
    })

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react\nfacebook/missing-repo')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    const results = await screen.findByRole('region', { name: /analysis results/i })
    expect(within(results).getByText(/failed repositories/i)).toBeInTheDocument()
    expect(within(results).getByText(/facebook\/missing-repo:/i)).toBeInTheDocument()
  })

  it('shows loading state while analysis is running and then displays formatted rate-limit metadata', async () => {
    let resolveAnalysis: ((value: {
      results: never[]
      failures: never[]
      rateLimit: { remaining: number; resetAt: string; retryAfter: 'unavailable' }
    }) => void) | null = null
    const onAnalyze = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveAnalysis = resolve
        }),
    )

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    const loadingState = screen.getByRole('region', { name: /analysis loading state/i })
    expect(within(loadingState).getByText(/loading analysis for:/i)).toBeInTheDocument()
    expect(within(loadingState).getByText('facebook/react')).toBeInTheDocument()

    resolveAnalysis?.({
      results: [],
      failures: [],
      rateLimit: { remaining: 4999, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' },
    })

    expect(await screen.findByText(/remaining api calls: 4,999/i)).toBeInTheDocument()
    expect(screen.getByText(/rate limit resets at:/i)).toBeInTheDocument()
    expect(screen.queryByText(/retry after:/i)).not.toBeInTheDocument()
  })

  it('shows retry timing only when GitHub provides it', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [],
      failures: [],
      rateLimit: { remaining: 'unavailable', resetAt: 'unavailable', retryAfter: 60 },
    })

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(await screen.findByText(/retry after: 60s/i)).toBeInTheDocument()
  })

  it('logs diagnostics to the browser console when analysis returns debug details', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [],
      failures: [],
      rateLimit: null,
      diagnostics: [
        {
          level: 'warn',
          repo: 'facebook/react',
          source: 'github-rest:contributors',
          message: 'GitHub REST request failed with status 403',
          status: 403,
          retryAfter: 'unavailable',
        },
      ],
    })

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(warnSpy).toHaveBeenCalledWith('[ForkPrint GitHub diagnostic]', {
      repo: 'facebook/react',
      source: 'github-rest:contributors',
      message: 'GitHub REST request failed with status 403',
      status: 403,
      retryAfter: 'unavailable',
    })
  })

  it('does not call onAnalyze again when switching tabs after a successful analysis', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [
        {
          repo: 'facebook/react',
          name: 'react',
          description: 'A UI library',
          createdAt: '2013-05-24T16:15:54Z',
          primaryLanguage: 'TypeScript',
          stars: 244295,
          forks: 25,
          watchers: 10,
          commits30d: 7,
          commits90d: 18,
          releases12mo: 'unavailable',
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
          missingFields: [],
        },
      ],
      failures: [],
      rateLimit: null,
    })

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    await screen.findByRole('tab', { name: 'Overview' })
    await userEvent.click(screen.getByRole('tab', { name: 'Activity' }))

    expect(onAnalyze).toHaveBeenCalledTimes(1)
  })

  it('renders the Health Ratios tab after a successful analysis without rerunning analysis', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [
        {
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
          releases12mo: 'unavailable',
          prsOpened90d: 4,
          prsMerged90d: 3,
          issuesOpen: 5,
          issuesClosed90d: 6,
          uniqueCommitAuthors90d: 5,
          totalContributors: 12,
          maintainerCount: 'unavailable',
          commitCountsByAuthor: {
            'login:alice': 4,
            'login:bob': 3,
            'login:carol': 2,
            'login:dave': 1,
            'login:erin': 1,
          },
          contributorMetricsByWindow: {
            30: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
            60: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
            90: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
            180: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
            365: { uniqueCommitAuthors: 5, commitCountsByAuthor: { 'login:alice': 4, 'login:bob': 3, 'login:carol': 2, 'login:dave': 1, 'login:erin': 1 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
          },
          activityMetricsByWindow: {
            30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 12, medianTimeToCloseHours: 24 },
            60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2, staleIssueRatio: 0.15, medianTimeToMergeHours: 18, medianTimeToCloseHours: 30 },
            90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 3, staleIssueRatio: 0.2, medianTimeToMergeHours: 24, medianTimeToCloseHours: 36 },
            180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4, staleIssueRatio: 0.3, medianTimeToMergeHours: 48, medianTimeToCloseHours: 72 },
            365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6, staleIssueRatio: 0.4, medianTimeToMergeHours: 96, medianTimeToCloseHours: 144 },
          },
          commitCountsByExperimentalOrg: 'unavailable',
          experimentalAttributedAuthors90d: 'unavailable',
          experimentalUnattributedAuthors90d: 'unavailable',
          issueFirstResponseTimestamps: 'unavailable',
          issueCloseTimestamps: 'unavailable',
          prMergeTimestamps: 'unavailable',
          missingFields: [],
        },
      ],
      failures: [],
      rateLimit: null,
    })

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    await userEvent.click(await screen.findByRole('tab', { name: 'Health Ratios' }))

    expect(screen.getByRole('region', { name: /health ratios view/i })).toBeInTheDocument()
    expect(onAnalyze).toHaveBeenCalledTimes(1)
  })

  it('clears previous results and returns to the overview tab when a new analysis starts', async () => {
    let resolveSecondAnalysis: ((value: {
      results: never[]
      failures: never[]
      rateLimit: null
    }) => void) | null = null

    const onAnalyze = vi
      .fn()
      .mockResolvedValueOnce({
        results: [
          {
            repo: 'facebook/react',
            name: 'react',
            description: 'A UI library',
            createdAt: '2013-05-24T16:15:54Z',
            primaryLanguage: 'TypeScript',
            stars: 244295,
            forks: 25,
            watchers: 10,
            commits30d: 7,
            commits90d: 18,
            releases12mo: 'unavailable',
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
            missingFields: [],
          },
        ],
        failures: [],
        rateLimit: null,
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondAnalysis = resolve
          }),
      )

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    await screen.findByRole('region', { name: /analysis results/i })
    await userEvent.click(screen.getByRole('tab', { name: 'Activity' }))
    expect(screen.getByRole('region', { name: /activity view/i })).toBeInTheDocument()

    const refreshedRepoList = screen.getByRole('textbox', { name: /repository list/i })
    await userEvent.clear(refreshedRepoList)
    await userEvent.type(refreshedRepoList, 'vercel/next.js')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(screen.queryByRole('region', { name: /analysis results/i })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: /analysis loading state/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute('aria-selected', 'false')

    resolveSecondAnalysis?.({
      results: [],
      failures: [],
      rateLimit: null,
    })
  })

  it('renders activity content after a successful analysis', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [
        {
          repo: 'facebook/react',
          name: 'react',
          description: 'A UI library',
          createdAt: '2013-05-24T16:15:54Z',
          primaryLanguage: 'TypeScript',
          stars: 244295,
          forks: 25,
          watchers: 10,
          commits30d: 7,
          commits90d: 18,
          releases12mo: 'unavailable',
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
          missingFields: [],
        },
      ],
      failures: [],
      rateLimit: null,
    })

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    await screen.findByRole('tab', { name: 'Activity' })
    await userEvent.click(screen.getByRole('tab', { name: 'Activity' }))

    const activityView = screen.getByRole('region', { name: /activity view/i })
    expect(activityView).toBeInTheDocument()
    expect(within(activityView).getByText('facebook/react')).toBeInTheDocument()
    expect(within(activityView).getByText(/^commits$/i)).toBeInTheDocument()
    expect(within(activityView).getByText(/^pull requests$/i)).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Metrics' })).not.toBeInTheDocument()
  })

  it('renders available activity values while calling out missing selected-window data', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [
        {
          repo: 'facebook/react',
          name: 'react',
          description: 'A UI library',
          createdAt: '2013-05-24T16:15:54Z',
          primaryLanguage: 'TypeScript',
          stars: 244295,
          forks: 25,
          watchers: 10,
          commits30d: 7,
          commits90d: 18,
          releases12mo: 'unavailable',
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
            30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 12, medianTimeToCloseHours: 24 },
            60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2, staleIssueRatio: 0.15, medianTimeToMergeHours: 18, medianTimeToCloseHours: 30 },
            90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 'unavailable', staleIssueRatio: 'unavailable', medianTimeToMergeHours: 24, medianTimeToCloseHours: 'unavailable' },
            180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4, staleIssueRatio: 0.3, medianTimeToMergeHours: 48, medianTimeToCloseHours: 72 },
            365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6, staleIssueRatio: 0.4, medianTimeToMergeHours: 96, medianTimeToCloseHours: 144 },
          },
          staleIssueRatio: 'unavailable',
          medianTimeToMergeHours: 24,
          medianTimeToCloseHours: 'unavailable',
          issueFirstResponseTimestamps: 'unavailable',
          issueCloseTimestamps: 'unavailable',
          prMergeTimestamps: 'unavailable',
          missingFields: [],
        },
      ],
      failures: [],
      rateLimit: null,
    })

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    await userEvent.click(await screen.findByRole('tab', { name: 'Activity' }))

    const activityView = screen.getByRole('region', { name: /activity view/i })
    expect(within(activityView).getByText('18')).toBeInTheDocument()
    expect(within(activityView).getAllByText('unavailable').length).toBeGreaterThan(0)
    expect(within(activityView).getByText(/^missing data$/i)).toBeInTheDocument()
    expect(within(activityView).getByText(/unavailable in selected 90d window: releases, stale issue ratio, median time to close\./i)).toBeInTheDocument()
  })

  it('does not call onAnalyze again when changing the recent activity window', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [
        {
          repo: 'facebook/react',
          name: 'react',
          description: 'A UI library',
          createdAt: '2013-05-24T16:15:54Z',
          primaryLanguage: 'TypeScript',
          stars: 244295,
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
            30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 12, medianTimeToCloseHours: 24 },
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
        },
      ],
      failures: [],
      rateLimit: null,
    })

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    await userEvent.click(await screen.findByRole('tab', { name: 'Activity' }))
    await userEvent.click(screen.getByRole('button', { name: '30d' }))
    await userEvent.click(screen.getByRole('button', { name: '12 months' }))

    expect(onAnalyze).toHaveBeenCalledTimes(1)
  })

  it('renders contributors content after a successful analysis', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [
        {
          repo: 'facebook/react',
          name: 'react',
          description: 'A UI library',
          createdAt: '2013-05-24T16:15:54Z',
          primaryLanguage: 'TypeScript',
          stars: 244295,
          forks: 25,
          watchers: 10,
          commits30d: 7,
          commits90d: 18,
          releases12mo: 'unavailable',
          prsOpened90d: 4,
          prsMerged90d: 3,
          issuesOpen: 5,
          issuesClosed90d: 6,
          uniqueCommitAuthors90d: 2,
          totalContributors: 1742,
          maintainerCount: 4,
          commitCountsByAuthor: { 'login:alice': 2, 'login:bob': 1 },
          contributorMetricsByWindow: {
            30: { uniqueCommitAuthors: 2, commitCountsByAuthor: { 'login:alice': 2, 'login:bob': 1 }, repeatContributors: 1, newContributors: 1, commitCountsByExperimentalOrg: { meta: 3 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 0 },
            60: { uniqueCommitAuthors: 2, commitCountsByAuthor: { 'login:alice': 2, 'login:bob': 1 }, repeatContributors: 1, newContributors: 1, commitCountsByExperimentalOrg: { meta: 3 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 0 },
            90: { uniqueCommitAuthors: 2, commitCountsByAuthor: { 'login:alice': 2, 'login:bob': 1 }, repeatContributors: 1, newContributors: 1, commitCountsByExperimentalOrg: { meta: 3 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 0 },
            180: { uniqueCommitAuthors: 2, commitCountsByAuthor: { 'login:alice': 2, 'login:bob': 1 }, repeatContributors: 1, newContributors: 1, commitCountsByExperimentalOrg: { meta: 3 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 0 },
            365: { uniqueCommitAuthors: 2, commitCountsByAuthor: { 'login:alice': 2, 'login:bob': 1 }, repeatContributors: 1, newContributors: 1, commitCountsByExperimentalOrg: { meta: 3 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 0 },
          },
          commitCountsByExperimentalOrg: { meta: 3 },
          experimentalAttributedAuthors90d: 2,
          experimentalUnattributedAuthors90d: 0,
          issueFirstResponseTimestamps: 'unavailable',
          issueCloseTimestamps: 'unavailable',
          prMergeTimestamps: 'unavailable',
          missingFields: [],
        },
      ],
      failures: [],
      rateLimit: null,
    })

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    await screen.findByRole('tab', { name: 'Contributors' })
    await userEvent.click(screen.getByRole('tab', { name: 'Contributors' }))

    const contributorsView = screen.getByRole('region', { name: /contributors view/i })
    const corePane = within(contributorsView).getByRole('region', { name: /core contributors pane/i })

    expect(contributorsView).toBeInTheDocument()
    expect(screen.getByText(/top 20% contributor share/i)).toBeInTheDocument()
    expect(within(corePane).getByText(/^Contribution chart$/i)).toBeInTheDocument()
    expect(screen.queryByText(/later sustainability signals/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/missing data/i)).not.toBeInTheDocument()
  })

  it('keeps overview cards summary-only after analysis succeeds', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [
        {
          repo: 'facebook/react',
          name: 'react',
          description: 'A UI library',
          createdAt: '2013-05-24T16:15:54Z',
          primaryLanguage: 'TypeScript',
          stars: 244295,
          forks: 25,
          watchers: 10,
          commits30d: 7,
          commits90d: 18,
          releases12mo: 'unavailable',
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
          missingFields: ['releases12mo'],
        },
      ],
      failures: [],
      rateLimit: null,
    })

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    await screen.findByTestId('metric-card-facebook/react')

    expect(screen.queryByRole('button', { name: /missing data/i })).not.toBeInTheDocument()
    expect(onAnalyze).toHaveBeenCalledTimes(1)
  })
})
