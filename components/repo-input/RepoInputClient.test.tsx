import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '@/components/auth/AuthContext'
import { RepoInputClient } from './RepoInputClient'

const mockUseSearchParams = vi.fn(() => new URLSearchParams())

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockUseSearchParams(),
}))

const TEST_SESSION = { token: 'gho_test_token', username: 'test-user' }

function renderWithAuth(ui: React.ReactElement) {
  return render(<AuthProvider initialSession={TEST_SESSION}>{ui}</AuthProvider>)
}

describe('RepoInputClient', () => {
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
          activityMetricsByWindow: activityWindowMetrics(),
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
        },
      ],
      failures: [],
      rateLimit: null,
    })

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(onAnalyze).toHaveBeenCalledWith(['facebook/react'], 'gho_test_token')

    const results = await screen.findByRole('region', { name: /analysis results/i })
    const metricCardsOverview = within(results).getByRole('region', { name: /metric cards overview/i })
    expect(within(metricCardsOverview).getByTestId('metric-card-facebook/react')).toBeInTheDocument()
    expect(within(metricCardsOverview).getByText(/244,295 stars/)).toBeInTheDocument()
  })

  it('populates the Comparison tab when 2+ repos are analyzed', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [
        buildAnalysisResult('facebook/react'),
        buildAnalysisResult('nvidia/topograph', {
          stars: 120,
          forks: 12,
          watchers: 6,
          activityMetricsByWindow: activityWindowMetrics({ prsOpened: 8, prsMerged: 3, staleIssueRatio: 0.35 }),
        }),
      ],
      failures: [],
      rateLimit: null,
    })

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react nvidia/topograph')
    await userEvent.click(screen.getByRole('button', { name: /^analyze$/i }))

    // Comparison is in the overflow menu
    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    await userEvent.click(await screen.findByRole('tab', { name: 'Comparison' }))
    expect(await screen.findByRole('region', { name: /comparison view/i })).toBeInTheDocument()
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
          isFork: false,
          url: 'https://github.com/facebook/react',
        },
      ],
      rateLimit: null,
      failure: null,
    })

    renderWithAuth(<RepoInputClient onAnalyzeOrg={onAnalyzeOrg} />)

    await userEvent.click(screen.getByRole('button', { name: /organization/i }))
    await userEvent.type(screen.getByRole('textbox', { name: /organization input/i }), 'facebook')
    await userEvent.click(screen.getByRole('button', { name: /^analyze$/i }))

    const orgInventory = await screen.findByRole('region', { name: /org inventory view/i })
    expect(within(orgInventory).getByText('facebook')).toBeInTheDocument()
    expect(within(orgInventory).getAllByText('facebook/react').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Organization' })).toHaveClass('bg-slate-900')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Contributors' })).not.toBeInTheDocument()
    expect(onAnalyzeOrg).toHaveBeenCalledWith('facebook', 'gho_test_token')
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
          isFork: false,
          url: 'https://github.com/facebook/react',
        },
      ],
      rateLimit: null,
      failure: null,
    })

    renderWithAuth(<RepoInputClient onAnalyzeOrg={onAnalyzeOrg} />)

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
    renderWithAuth(<RepoInputClient />)

    await userEvent.click(screen.getByRole('button', { name: /organization/i }))

    expect(screen.getByRole('button', { name: 'Organization' })).toHaveClass('bg-slate-900')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Contributors' })).not.toBeInTheDocument()
    expect(screen.getByText(/enter a github organization slug or org url above/i)).toBeInTheDocument()
  })

  it('starts org aggregation from the inventory and auto-shows the org summary', async () => {
    const onAnalyzeOrg = vi.fn().mockResolvedValue({
      org: 'facebook',
      summary: {
        totalPublicRepos: 3,
        totalStars: 180,
        mostStarredRepos: [{ repo: 'facebook/react', stars: 100 }],
        mostRecentlyActiveRepos: [{ repo: 'facebook/react', pushedAt: '2026-04-02T00:00:00Z' }],
        languageDistribution: [{ language: 'TypeScript', repoCount: 3 }],
        archivedRepoCount: 1,
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
          isFork: false,
          url: 'https://github.com/facebook/react',
        },
        {
          repo: 'facebook/jest',
          name: 'jest',
          description: 'Testing framework',
          primaryLanguage: 'TypeScript',
          stars: 80,
          forks: 20,
          watchers: 9,
          openIssues: 4,
          pushedAt: '2026-04-01T00:00:00Z',
          archived: false,
          isFork: false,
          url: 'https://github.com/facebook/jest',
        },
        {
          repo: 'facebook/old',
          name: 'old',
          description: 'Archived repo',
          primaryLanguage: 'TypeScript',
          stars: 5,
          forks: 1,
          watchers: 1,
          openIssues: 0,
          pushedAt: '2025-01-01T00:00:00Z',
          archived: true,
          isFork: false,
          url: 'https://github.com/facebook/old',
        },
      ],
      rateLimit: null,
      failure: null,
    })
    const onAnalyze = vi
      .fn()
      .mockResolvedValueOnce({ results: [buildAnalysisResult('facebook/react')], failures: [], rateLimit: null })
      .mockResolvedValueOnce({ results: [buildAnalysisResult('facebook/jest')], failures: [], rateLimit: null })

    renderWithAuth(<RepoInputClient onAnalyzeOrg={onAnalyzeOrg} onAnalyze={onAnalyze} />)

    await userEvent.click(screen.getByRole('button', { name: /organization/i }))
    await userEvent.type(screen.getByRole('textbox', { name: /organization input/i }), 'facebook')
    await userEvent.click(screen.getByRole('button', { name: /^analyze$/i }))

    await screen.findByRole('region', { name: /org inventory view/i })
    await userEvent.click(screen.getByRole('button', { name: /analyze all/i }))

    // Pre-run dialog appears — confirm to start the run
    await screen.findByRole('dialog', { name: /pre-run warning/i })
    await userEvent.click(screen.getByRole('button', { name: /start analysis/i }))

    await vi.waitFor(() => {
      expect(onAnalyze).toHaveBeenCalledWith(['facebook/react'], 'gho_test_token')
      expect(onAnalyze).toHaveBeenCalledWith(['facebook/jest'], 'gho_test_token')
      expect(onAnalyze).toHaveBeenCalledTimes(2)
    })
  })

  it('shows the comparison tab in the overflow menu before any analysis results exist', async () => {
    renderWithAuth(<RepoInputClient />)
    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    expect(screen.getByRole('tab', { name: 'Comparison' })).toBeInTheDocument()
  })

  it('renders repository-specific failures alongside successful results', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [buildAnalysisResult('facebook/react')],
      failures: [{ repo: 'facebook/missing-repo', reason: 'Repository could not be analyzed.', code: 'NOT_FOUND' }],
      rateLimit: null,
    })

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react\nfacebook/missing-repo')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    const results = await screen.findByRole('region', { name: /analysis results/i })
    expect(within(results).getByText(/failed repositories/i)).toBeInTheDocument()
    expect(within(results).getByText(/facebook\/missing-repo:/i)).toBeInTheDocument()
  })

  it('shows loading state while analysis is running and then displays formatted rate-limit metadata', async () => {
    const settling = { resolve: () => {} }
    const onAnalyze = vi.fn(
      (_repos: string[], _token: string) =>
        new Promise<{ results: never[]; failures: never[]; rateLimit: { limit: number; remaining: number; resetAt: string; retryAfter: 'unavailable' } }>((r) => {
          settling.resolve = () => r({ results: [], failures: [], rateLimit: { limit: 5000, remaining: 800, resetAt: '2026-03-31T23:59:59Z', retryAfter: 'unavailable' } })
        }),
    )

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    const loadingState = screen.getByRole('region', { name: /analysis loading state/i })
    expect(within(loadingState).getByText(/analyzing repositories/i)).toBeInTheDocument()
    expect(within(loadingState).getByText('facebook/react')).toBeInTheDocument()

    settling.resolve()

    expect(await screen.findByText(/remaining api calls: 800/i)).toBeInTheDocument()
    expect(screen.getByText(/rate limit resets at:/i)).toBeInTheDocument()
    expect(screen.queryByText(/retry after:/i)).not.toBeInTheDocument()
  })

  it('shows retry timing only when GitHub provides it', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [],
      failures: [],
      rateLimit: { limit: 5000, remaining: 500, resetAt: '2026-03-31T23:59:59Z', retryAfter: 60 },
    })

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

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

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(warnSpy).toHaveBeenCalledWith('[RepoPulse GitHub diagnostic]', {
      repo: 'facebook/react',
      source: 'github-rest:contributors',
      message: 'GitHub REST request failed with status 403',
      status: 403,
      retryAfter: 'unavailable',
    })
  })

  it('does not call onAnalyze again when switching tabs after a successful analysis', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [buildAnalysisResult('facebook/react')],
      failures: [],
      rateLimit: null,
    })

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    await screen.findByRole('tab', { name: 'Overview' })
    await userEvent.click(screen.getByRole('tab', { name: 'Activity' }))

    expect(onAnalyze).toHaveBeenCalledTimes(1)
  })

  it('clears previous results and returns to the overview tab when a new analysis starts', async () => {
    const settling2 = { resolve: () => {} }
    const onAnalyze = vi
      .fn()
      .mockResolvedValueOnce({
        results: [buildAnalysisResult('facebook/react')],
        failures: [],
        rateLimit: null,
      })
      .mockImplementationOnce(
        (_repos: string[], _token: string) =>
          new Promise<{ results: never[]; failures: never[]; rateLimit: null }>((r) => {
            settling2.resolve = () => r({ results: [], failures: [], rateLimit: null })
          }),
      )

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

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

    settling2.resolve()
  })

  it('renders activity content after a successful analysis', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [buildAnalysisResult('facebook/react')],
      failures: [],
      rateLimit: null,
    })

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

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

  it('renders contributors content after a successful analysis', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [
        buildAnalysisResult('facebook/react', {
          uniqueCommitAuthors90d: 2,
          totalContributors: 1742,
          maintainerCount: 4,
          commitCountsByAuthor: { 'login:alice': 2, 'login:bob': 1 },
          commitCountsByExperimentalOrg: { meta: 3 },
          experimentalAttributedAuthors90d: 2,
          experimentalUnattributedAuthors90d: 0,
          contributorMetricsByWindow: {
            30: { uniqueCommitAuthors: 2, commitCountsByAuthor: { 'login:alice': 2, 'login:bob': 1 }, repeatContributors: 1, newContributors: 1, commitCountsByExperimentalOrg: { meta: 3 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 0 },
            60: { uniqueCommitAuthors: 2, commitCountsByAuthor: { 'login:alice': 2, 'login:bob': 1 }, repeatContributors: 1, newContributors: 1, commitCountsByExperimentalOrg: { meta: 3 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 0 },
            90: { uniqueCommitAuthors: 2, commitCountsByAuthor: { 'login:alice': 2, 'login:bob': 1 }, repeatContributors: 1, newContributors: 1, commitCountsByExperimentalOrg: { meta: 3 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 0 },
            180: { uniqueCommitAuthors: 2, commitCountsByAuthor: { 'login:alice': 2, 'login:bob': 1 }, repeatContributors: 1, newContributors: 1, commitCountsByExperimentalOrg: { meta: 3 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 0 },
            365: { uniqueCommitAuthors: 2, commitCountsByAuthor: { 'login:alice': 2, 'login:bob': 1 }, repeatContributors: 1, newContributors: 1, commitCountsByExperimentalOrg: { meta: 3 }, experimentalAttributedAuthors: 2, experimentalUnattributedAuthors: 0 },
          },
        }),
      ],
      failures: [],
      rateLimit: null,
    })

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    await screen.findByRole('tab', { name: 'Contributors' })
    await userEvent.click(screen.getByRole('tab', { name: 'Contributors' }))

    const contributorsView = screen.getByRole('region', { name: /contributors view/i })
    const corePane = within(contributorsView).getByRole('region', { name: /core contributors pane/i })

    expect(contributorsView).toBeInTheDocument()
    expect(screen.getByText(/top 20% contributor share/i)).toBeInTheDocument()
    expect(within(corePane).getByText(/^Contribution chart$/i)).toBeInTheDocument()
  })

  it('does not call onAnalyze again when changing the recent activity window', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [buildAnalysisResult('facebook/react', { releases12mo: 6 })],
      failures: [],
      rateLimit: null,
    })

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    await userEvent.click(await screen.findByRole('tab', { name: 'Activity' }))
    const activityTab = document.querySelector('[data-tab-content="activity"]')!
    await userEvent.click(within(activityTab as HTMLElement).getByRole('button', { name: '30d' }))
    await userEvent.click(within(activityTab as HTMLElement).getByRole('button', { name: '12 months' }))

    expect(onAnalyze).toHaveBeenCalledTimes(1)
  })

  it('keeps overview cards summary-only after analysis succeeds', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [buildAnalysisResult('facebook/react', { missingFields: ['releases12mo'] })],
      failures: [],
      rateLimit: null,
    })

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    await screen.findByTestId('metric-card-facebook/react')

    expect(screen.queryByRole('button', { name: /missing data/i })).not.toBeInTheDocument()
    expect(onAnalyze).toHaveBeenCalledTimes(1)
  })
})

function buildAnalysisResult(repo: string, overrides: Record<string, unknown> = {}) {
  return {
    repo,
    name: repo.split('/')[1] ?? repo,
    description: 'A repo',
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
    uniqueCommitAuthors90d: 5,
    totalContributors: 12,
    maintainerCount: 3,
    commitCountsByAuthor: { alice: 4, bob: 3, carol: 2 },
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    contributorMetricsByWindow: {
      30: { uniqueCommitAuthors: 5, commitCountsByAuthor: { alice: 4 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      60: { uniqueCommitAuthors: 5, commitCountsByAuthor: { alice: 4 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      90: { uniqueCommitAuthors: 5, commitCountsByAuthor: { alice: 4 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      180: { uniqueCommitAuthors: 5, commitCountsByAuthor: { alice: 4 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
      365: { uniqueCommitAuthors: 5, commitCountsByAuthor: { alice: 4 }, repeatContributors: 3, newContributors: 2, commitCountsByExperimentalOrg: 'unavailable', experimentalAttributedAuthors: 'unavailable', experimentalUnattributedAuthors: 'unavailable' },
    },
    activityMetricsByWindow: activityWindowMetrics(),
    responsivenessMetricsByWindow: {
      30: { issueFirstResponseMedianHours: 12, issueFirstResponseP90Hours: 48, prFirstReviewMedianHours: 24, prFirstReviewP90Hours: 72, issueResolutionMedianHours: 36, issueResolutionP90Hours: 96, prMergeMedianHours: 24, prMergeP90Hours: 72, issueResolutionRate: 0.8, contributorResponseRate: 0.7, botResponseRatio: 0.1, humanResponseRatio: 0.8, staleIssueRatio: 0.1, stalePrRatio: 0.05, prReviewDepth: 3, issuesClosedWithoutCommentRatio: 0.2, openIssueCount: 10, openPullRequestCount: 5 },
      60: { issueFirstResponseMedianHours: 14, issueFirstResponseP90Hours: 50, prFirstReviewMedianHours: 28, prFirstReviewP90Hours: 78, issueResolutionMedianHours: 40, issueResolutionP90Hours: 102, prMergeMedianHours: 28, prMergeP90Hours: 78, issueResolutionRate: 0.82, contributorResponseRate: 0.72, botResponseRatio: 0.12, humanResponseRatio: 0.78, staleIssueRatio: 0.12, stalePrRatio: 0.07, prReviewDepth: 3.2, issuesClosedWithoutCommentRatio: 0.22, openIssueCount: 11, openPullRequestCount: 6 },
      90: { issueFirstResponseMedianHours: 16, issueFirstResponseP90Hours: 52, prFirstReviewMedianHours: 30, prFirstReviewP90Hours: 80, issueResolutionMedianHours: 44, issueResolutionP90Hours: 108, prMergeMedianHours: 30, prMergeP90Hours: 80, issueResolutionRate: 0.84, contributorResponseRate: 0.74, botResponseRatio: 0.15, humanResponseRatio: 0.75, staleIssueRatio: 0.14, stalePrRatio: 0.08, prReviewDepth: 3.4, issuesClosedWithoutCommentRatio: 0.24, openIssueCount: 12, openPullRequestCount: 7 },
      180: { issueFirstResponseMedianHours: 18, issueFirstResponseP90Hours: 56, prFirstReviewMedianHours: 34, prFirstReviewP90Hours: 84, issueResolutionMedianHours: 48, issueResolutionP90Hours: 114, prMergeMedianHours: 34, prMergeP90Hours: 84, issueResolutionRate: 0.86, contributorResponseRate: 0.76, botResponseRatio: 0.16, humanResponseRatio: 0.74, staleIssueRatio: 0.16, stalePrRatio: 0.09, prReviewDepth: 3.6, issuesClosedWithoutCommentRatio: 0.26, openIssueCount: 13, openPullRequestCount: 8 },
      365: { issueFirstResponseMedianHours: 20, issueFirstResponseP90Hours: 60, prFirstReviewMedianHours: 36, prFirstReviewP90Hours: 90, issueResolutionMedianHours: 52, issueResolutionP90Hours: 120, prMergeMedianHours: 36, prMergeP90Hours: 90, issueResolutionRate: 0.88, contributorResponseRate: 0.78, botResponseRatio: 0.18, humanResponseRatio: 0.72, staleIssueRatio: 0.18, stalePrRatio: 0.1, prReviewDepth: 3.8, issuesClosedWithoutCommentRatio: 0.28, openIssueCount: 14, openPullRequestCount: 9 },
    },
    responsivenessMetrics: undefined,
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    staleIssueRatio: 0.2,
    medianTimeToMergeHours: 24,
    medianTimeToCloseHours: 36,
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

function activityWindowMetrics(overrides: Record<string, unknown> = {}) {
  return {
    30: { commits: 7, prsOpened: 2, prsMerged: 1, issuesOpened: 4, issuesClosed: 3, releases: 1, staleIssueRatio: 0.1, medianTimeToMergeHours: 12, medianTimeToCloseHours: 24 },
    60: { commits: 12, prsOpened: 3, prsMerged: 2, issuesOpened: 6, issuesClosed: 5, releases: 2, staleIssueRatio: 0.15, medianTimeToMergeHours: 18, medianTimeToCloseHours: 30 },
    90: { commits: 18, prsOpened: 4, prsMerged: 3, issuesOpened: 8, issuesClosed: 6, releases: 3, staleIssueRatio: 0.2, medianTimeToMergeHours: 24, medianTimeToCloseHours: 36, ...overrides },
    180: { commits: 30, prsOpened: 7, prsMerged: 5, issuesOpened: 10, issuesClosed: 8, releases: 4, staleIssueRatio: 0.3, medianTimeToMergeHours: 48, medianTimeToCloseHours: 72 },
    365: { commits: 55, prsOpened: 12, prsMerged: 9, issuesOpened: 16, issuesClosed: 13, releases: 6, staleIssueRatio: 0.4, medianTimeToMergeHours: 96, medianTimeToCloseHours: 144 },
  }
}

describe('RepoInputClient — shareable URL pre-population', () => {
  it('pre-populates the repo textarea when ?repos= query param is present', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('repos=facebook%2Freact%2Cvercel%2Fnext.js'))
    renderWithAuth(<RepoInputClient />)
    const textarea = screen.getByRole('textbox', { name: /repository list/i })
    expect(textarea).toHaveValue('facebook/react\nvercel/next.js')
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
  })

  it('leaves repo textarea empty when no ?repos= param is present', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
    renderWithAuth(<RepoInputClient />)
    expect(screen.getByRole('textbox', { name: /repository list/i })).toHaveValue('')
  })

  it('auto-triggers analysis when ?repos= query param contains valid repos', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('repos=facebook%2Freact%2Cvercel%2Fnext.js'))
    const onAnalyze = vi.fn().mockResolvedValue({
      results: [buildAnalysisResult('facebook/react'), buildAnalysisResult('vercel/next.js')],
      failures: [],
      rateLimit: null,
    })

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

    await vi.waitFor(() => {
      expect(onAnalyze).toHaveBeenCalledWith(['facebook/react', 'vercel/next.js'], 'gho_test_token')
    })
    expect(onAnalyze).toHaveBeenCalledTimes(1)
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
  })

  it('does not auto-trigger analysis when the param contains an invalid slug', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('repos=facebook%2Freact%2Cnot-a-slug'))
    const onAnalyze = vi.fn()

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

    // Textarea pre-populates even with the malformed entry.
    const textarea = screen.getByRole('textbox', { name: /repository list/i })
    expect(textarea).toHaveValue('facebook/react\nnot-a-slug')

    // Give the mount effect a chance to run — it should not dispatch.
    await new Promise((r) => setTimeout(r, 0))
    expect(onAnalyze).not.toHaveBeenCalled()

    // Clicking Analyze surfaces the validation error inline.
    await userEvent.click(screen.getByRole('button', { name: /^analyze$/i }))
    expect(screen.getByTestId('repo-error')).toHaveTextContent(/not a valid owner\/repo slug/i)
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
  })

  it('does not auto-trigger analysis when no ?repos= param is present', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
    const onAnalyze = vi.fn()

    renderWithAuth(<RepoInputClient onAnalyze={onAnalyze} />)

    await new Promise((r) => setTimeout(r, 0))
    expect(onAnalyze).not.toHaveBeenCalled()
  })
})
