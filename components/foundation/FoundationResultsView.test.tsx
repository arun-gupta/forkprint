import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FoundationResultsView } from './FoundationResultsView'
import type { FoundationResult } from './FoundationResultsView'

vi.mock('@/components/cncf-readiness/CNCFReadinessTab', () => ({
  CNCFReadinessTab: ({ repoSlug }: { repoSlug?: string }) => (
    <div data-testid="cncf-readiness-tab">{repoSlug}</div>
  ),
}))

vi.mock('@/components/cncf-candidacy/CNCFCandidacyPanel', () => ({
  CNCFCandidacyPanel: ({ org }: { org: string }) => (
    <div data-testid="cncf-candidacy-panel">{org}</div>
  ),
}))

vi.mock('@/components/auth/AuthContext', () => ({
  useAuth: () => ({ session: { token: 'test-token', username: 'test-user' } }),
}))

function makeAspirantResult() {
  return {
    foundationTarget: 'cncf-sandbox' as const,
    readinessScore: 80,
    autoFields: [],
    humanOnlyFields: [],
    readyCount: 8,
    totalAutoCheckable: 10,
    alreadyInLandscape: false,
    tagRecommendation: { primaryTag: null, matchedSignals: [], fallbackNote: null },
    sandboxApplication: null,
  }
}

function makeRepoStub(repo: string) {
  return {
    repo,
    aspirantResult: makeAspirantResult(),
    name: repo.split('/')[1],
    description: 'test',
    createdAt: '2020-01-01T00:00:00Z',
    primaryLanguage: 'TypeScript',
    stars: 100,
    forks: 10,
    watchers: 5,
    commits30d: 5,
    commits90d: 15,
    releases12mo: 'unavailable',
    prsOpened90d: 3,
    prsMerged90d: 2,
    issuesOpen: 1,
    issuesClosed90d: 1,
    uniqueCommitAuthors90d: 'unavailable',
    totalContributors: 'unavailable',
    maintainerCount: 'unavailable',
    commitCountsByAuthor: 'unavailable',
    commitCountsByExperimentalOrg: 'unavailable',
    experimentalAttributedAuthors90d: 'unavailable',
    experimentalUnattributedAuthors90d: 'unavailable',
    activityMetricsByWindow: 'unavailable',
    staleIssueRatio: 0.1,
    medianTimeToMergeHours: 24,
    medianTimeToCloseHours: 36,
    issueFirstResponseTimestamps: 'unavailable',
    issueCloseTimestamps: 'unavailable',
    prMergeTimestamps: 'unavailable',
    documentationResult: 'unavailable',
    licensingResult: 'unavailable',
    defaultBranchName: 'main',
    topics: [],
    inclusiveNamingResult: 'unavailable',
    securityResult: 'unavailable',
    landscapeOverride: false,
    landscapeStatus: undefined,
    diagnostics: [],
    missingFields: [],
  }
}

function makeReposResult(repos: string[]): FoundationResult {
  return {
    kind: 'repos',
    results: {
      results: repos.map(makeRepoStub),
      failures: [],
      rateLimit: null,
    },
  } as unknown as FoundationResult
}

describe('FoundationResultsView — error state', () => {
  it('renders an error message when error is set', () => {
    render(<FoundationResultsView result={null} error="Something went wrong" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
  })
})

describe('FoundationResultsView — null result (empty state)', () => {
  it('renders nothing (empty state) when result is null', () => {
    const { container } = render(<FoundationResultsView result={null} error={null} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('FoundationResultsView — repos branch', () => {
  it('renders CNCFReadinessTab for each result', () => {
    const result = makeReposResult(['facebook/react', 'vercel/next.js'])
    render(<FoundationResultsView result={result} error={null} />)
    const tabs = screen.getAllByTestId('cncf-readiness-tab')
    expect(tabs).toHaveLength(2)
  })

  it('renders CNCFReadinessTab with correct repoSlug', () => {
    const result = makeReposResult(['facebook/react'])
    render(<FoundationResultsView result={result} error={null} />)
    expect(screen.getByTestId('cncf-readiness-tab')).toHaveTextContent('facebook/react')
  })

  it('renders per-repo error when a result has no aspirantResult and is in failures', () => {
    const failResult = {
      kind: 'repos',
      results: {
        results: [],
        failures: [{ repo: 'bad/repo', reason: 'Not found', code: 'NOT_FOUND' }],
        rateLimit: null,
      },
    } as unknown as FoundationResult
    render(<FoundationResultsView result={failResult} error={null} />)
    expect(screen.getByText(/bad\/repo/)).toBeInTheDocument()
  })

  it('renders both successes and failures with per-repo isolation', () => {
    const mixedResult = {
      kind: 'repos',
      results: {
        results: [makeRepoStub('good/repo')],
        failures: [{ repo: 'bad/repo', reason: 'Not found', code: 'NOT_FOUND' }],
        rateLimit: null,
      },
    } as unknown as FoundationResult
    render(<FoundationResultsView result={mixedResult} error={null} />)
    expect(screen.getByTestId('cncf-readiness-tab')).toBeInTheDocument()
    expect(screen.getByText(/bad\/repo/)).toBeInTheDocument()
  })
})

describe('FoundationResultsView — org branch', () => {
  it('renders CNCFCandidacyPanel when kind is org', () => {
    const result = {
      kind: 'org',
      inventory: {
        org: 'cncf',
        results: [],
        summary: {
          totalPublicRepos: 0,
          totalStars: 0,
          mostStarredRepos: [],
          mostRecentlyActiveRepos: [],
          languageDistribution: [],
          archivedRepoCount: 0,
          activeRepoCount: 0,
        },
        rateLimit: null,
        failure: null,
      },
    } as unknown as FoundationResult
    render(<FoundationResultsView result={result} error={null} />)
    expect(screen.getByTestId('cncf-candidacy-panel')).toHaveTextContent('cncf')
  })
})

describe('FoundationResultsView — projects-board branch', () => {
  it('renders a coming-soon message for projects-board results', () => {
    const result: FoundationResult = { kind: 'projects-board', url: 'https://github.com/orgs/cncf/projects/14' }
    render(<FoundationResultsView result={result} error={null} />)
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })
})
