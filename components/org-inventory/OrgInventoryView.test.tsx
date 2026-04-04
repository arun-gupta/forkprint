import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrgInventoryView } from './OrgInventoryView'

describe('OrgInventoryView', () => {
  it('renders org summary and repo rows', () => {
    render(
      <OrgInventoryView
        org="facebook"
        summary={{
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
        }}
        results={[
          buildRepo('facebook/react', { stars: 100 }),
          buildRepo('facebook/jest', { stars: 80, primaryLanguage: 'JavaScript' }),
        ]}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    const view = screen.getByRole('region', { name: /org inventory view/i })
    expect(within(view).getByText('facebook')).toBeInTheDocument()
    expect(within(view).getByText('Total public repos')).toBeInTheDocument()
    expect(within(view).getByText('180')).toBeInTheDocument()
    expect(within(view).getByText('Most starred repos')).toBeInTheDocument()
    expect(within(view).getByText('Most recently active')).toBeInTheDocument()
    expect(within(view).getByText('Language distribution')).toBeInTheDocument()
    expect(within(view).getAllByText('facebook/react').length).toBeGreaterThan(0)
    expect(within(view).getAllByText('facebook/jest').length).toBeGreaterThan(0)
  })

  it('routes a row-level analyze action through the provided callback', async () => {
    const onAnalyzeRepo = vi.fn()

    render(
      <OrgInventoryView
        org="facebook"
        summary={{
          totalPublicRepos: 1,
          totalStars: 100,
          mostStarredRepos: [{ repo: 'facebook/react', stars: 100 }],
          mostRecentlyActiveRepos: [{ repo: 'facebook/react', pushedAt: '2026-04-02T00:00:00Z' }],
          languageDistribution: [{ language: 'TypeScript', repoCount: 1 }],
          archivedRepoCount: 0,
          activeRepoCount: 1,
        }}
        results={[buildRepo('facebook/react')]}
        rateLimit={null}
        onAnalyzeRepo={onAnalyzeRepo}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /analyze facebook\/react/i }))
    expect(onAnalyzeRepo).toHaveBeenCalledWith('facebook/react')
  })

  it('supports visible-column changes, local sorting, and bulk analyze', async () => {
    const onAnalyzeSelected = vi.fn()

    render(
      <OrgInventoryView
        org="facebook"
        summary={{
          totalPublicRepos: 2,
          totalStars: 180,
          mostStarredRepos: [{ repo: 'facebook/react', stars: 100 }],
          mostRecentlyActiveRepos: [{ repo: 'facebook/react', pushedAt: '2026-04-02T00:00:00Z' }],
          languageDistribution: [{ language: 'TypeScript', repoCount: 2 }],
          archivedRepoCount: 0,
          activeRepoCount: 2,
        }}
        results={[
          buildRepo('facebook/react', { stars: 100, description: 'React UI library' }),
          buildRepo('facebook/jest', { stars: 80, description: 'Jest testing framework' }),
        ]}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={onAnalyzeSelected}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /stars/i }))
    await userEvent.click(screen.getByRole('button', { name: /stars/i }))

    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('facebook/react')

    await userEvent.click(screen.getByLabelText('Description'))
    expect(screen.getByText('React UI library')).toBeInTheDocument()
    expect(screen.getByText('Jest testing framework')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Description'))
    expect(screen.queryByText('React UI library')).not.toBeInTheDocument()
    expect(screen.queryByText('Jest testing framework')).not.toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Select facebook/react'))
    await userEvent.click(screen.getByRole('button', { name: /analyze selected/i }))
    expect(onAnalyzeSelected).toHaveBeenCalledWith(['facebook/react'])
  })

  it('trims selected repos deterministically when the slider limit is lowered', async () => {
    render(
      <OrgInventoryView
        org="facebook"
        summary={{
          totalPublicRepos: 3,
          totalStars: 240,
          mostStarredRepos: [{ repo: 'facebook/react', stars: 100 }],
          mostRecentlyActiveRepos: [{ repo: 'facebook/react', pushedAt: '2026-04-02T00:00:00Z' }],
          languageDistribution: [{ language: 'TypeScript', repoCount: 3 }],
          archivedRepoCount: 0,
          activeRepoCount: 3,
        }}
        results={[
          buildRepo('facebook/react'),
          buildRepo('facebook/jest'),
          buildRepo('facebook/relay'),
        ]}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByLabelText('Select facebook/react'))
    await userEvent.click(screen.getByLabelText('Select facebook/jest'))
    await userEvent.click(screen.getByLabelText('Select facebook/relay'))

    const slider = screen.getByLabelText('Bulk selection limit')
    fireEvent.change(slider, { target: { value: '2' } })
    expect(screen.getByText('Selection trimmed to the first 2 repositories.')).toBeInTheDocument()
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    expect(screen.getByLabelText('Select facebook/react')).toBeChecked()
    expect(screen.getByLabelText('Select facebook/jest')).toBeChecked()
    expect(screen.getByLabelText('Select facebook/relay')).not.toBeChecked()
  })

  it('shows a clear no-match state when local filters remove every repo', async () => {
    render(
      <OrgInventoryView
        org="facebook"
        summary={{
          totalPublicRepos: 1,
          totalStars: 100,
          mostStarredRepos: [{ repo: 'facebook/react', stars: 100 }],
          mostRecentlyActiveRepos: [{ repo: 'facebook/react', pushedAt: '2026-04-02T00:00:00Z' }],
          languageDistribution: [{ language: 'TypeScript', repoCount: 1 }],
          archivedRepoCount: 0,
          activeRepoCount: 1,
        }}
        results={[buildRepo('facebook/react')]}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.type(screen.getByPlaceholderText('Filter by repo name'), 'missing')

    expect(screen.getByText('No matching repositories')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('supports local table pagination and page-size changes', async () => {
    const repos = Array.from({ length: 30 }, (_, index) =>
      buildRepo(`facebook/repo-${String(index + 1).padStart(2, '0')}`, { name: `repo-${String(index + 1).padStart(2, '0')}` }),
    )

    render(
      <OrgInventoryView
        org="facebook"
        summary={{
          totalPublicRepos: 30,
          totalStars: 300,
          mostStarredRepos: [{ repo: 'facebook/repo-30', stars: 25 }],
          mostRecentlyActiveRepos: [{ repo: 'facebook/repo-30', pushedAt: '2026-04-02T00:00:00Z' }],
          languageDistribution: [{ language: 'TypeScript', repoCount: 30 }],
          archivedRepoCount: 0,
          activeRepoCount: 30,
        }}
        results={repos}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    expect(screen.getByText('Showing 1-25 of 30 matching repositories')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.queryByText('facebook/repo-26')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('facebook/repo-26')).toBeInTheDocument()
    expect(screen.getByText('Showing 26-30 of 30 matching repositories')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '50')
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(screen.getByText('Showing 1-30 of 30 matching repositories')).toBeInTheDocument()
    expect(screen.getByText('facebook/repo-26')).toBeInTheDocument()
  })

  it('shows the remaining API-call footer when rate-limit metadata is available', () => {
    render(
      <OrgInventoryView
        org="facebook"
        summary={{
          totalPublicRepos: 1,
          totalStars: 100,
          mostStarredRepos: [{ repo: 'facebook/react', stars: 100 }],
          mostRecentlyActiveRepos: [{ repo: 'facebook/react', pushedAt: '2026-04-02T00:00:00Z' }],
          languageDistribution: [{ language: 'TypeScript', repoCount: 1 }],
          archivedRepoCount: 0,
          activeRepoCount: 1,
        }}
        results={[buildRepo('facebook/react')]}
        rateLimit={{ remaining: 4963, resetAt: '2026-04-03T00:50:00Z', retryAfter: 'unavailable' }}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    expect(screen.getAllByText('Remaining API calls: 4,963')).toHaveLength(1)
    expect(screen.getByText(/rate limit resets at:/i)).toBeInTheDocument()
  })
})

function buildRepo(repo: string, overrides: Record<string, unknown> = {}) {
  return {
    repo,
    name: repo.split('/')[1] ?? repo,
    description: 'Repo description',
    primaryLanguage: 'TypeScript',
    stars: 25,
    forks: 10,
    watchers: 5,
    openIssues: 2,
    pushedAt: '2026-03-31T00:00:00Z',
    archived: false,
    url: `https://github.com/${repo}`,
    ...overrides,
  }
}
