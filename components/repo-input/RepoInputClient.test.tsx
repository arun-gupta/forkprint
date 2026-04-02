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
    expect(within(results).getByText('Insufficient verified public data')).toBeInTheDocument()
    expect(within(results).getAllByText('Not scored yet')).toHaveLength(2)

    const ecosystemMap = within(results).getByRole('region', { name: /ecosystem map/i })
    expect(within(ecosystemMap).getByText(/ecosystem spectrum/i)).toBeInTheDocument()
    expect(within(ecosystemMap).getByRole('button', { name: /show legend/i })).toBeInTheDocument()
    expect(within(ecosystemMap).queryByText(/^Reach$/)).not.toBeInTheDocument()
    expect(within(ecosystemMap).queryByText('facebook/react')).not.toBeInTheDocument()
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
    await userEvent.click(screen.getByRole('tab', { name: 'Contributors' }))

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
    expect(within(corePane).getByText(/^Contribution heatmap$/i)).toBeInTheDocument()
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
