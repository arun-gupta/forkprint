import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { OrgRepoSummary } from '@/lib/analyzer/org-inventory'
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

    await userEvent.click(screen.getByLabelText('Select facebook/react'))
    await userEvent.click(screen.getByRole('button', { name: /analyze selected/i }))
    expect(onAnalyzeSelected).toHaveBeenCalledWith(['facebook/react'])
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

    await userEvent.type(screen.getByRole('textbox', { name: /structured search/i }), 'missing')

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

    expect(screen.getByText(/Showing 1–10 of 30/)).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    expect(screen.queryByText('facebook/repo-11')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
    expect(screen.getByText('facebook/repo-11')).toBeInTheDocument()
    expect(screen.getByText(/Showing 11–20 of 30/)).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '50')
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(screen.getByText(/Showing 1–30 of 30/)).toBeInTheDocument()
    expect(screen.getByText('facebook/repo-26')).toBeInTheDocument()
  })

  it('shows the remaining API-call footer only when rate limit is low (<= 25%)', () => {
    const { rerender } = render(
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
        rateLimit={{ limit: 5000, remaining: 4963, resetAt: '2026-04-03T00:50:00Z', retryAfter: 'unavailable' }}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    // Above 25% — hidden
    expect(screen.queryByText(/remaining api calls/i)).not.toBeInTheDocument()

    rerender(
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
        rateLimit={{ limit: 5000, remaining: 800, resetAt: '2026-04-03T00:50:00Z', retryAfter: 'unavailable' }}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    // At or below 25% — visible
    expect(screen.getAllByText('Remaining API calls: 800')).toHaveLength(1)
    expect(screen.getByText(/rate limit resets at:/i)).toBeInTheDocument()
  })

  it('shows only the explicit empty state for organizations with no public repositories', () => {
    render(
      <OrgInventoryView
        org="__empty__"
        summary={{
          totalPublicRepos: 0,
          totalStars: 'unavailable',
          mostStarredRepos: [],
          mostRecentlyActiveRepos: [],
          languageDistribution: [],
          archivedRepoCount: 0,
          activeRepoCount: 0,
        }}
        results={[]}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    expect(screen.getByText('No public repositories found')).toBeInTheDocument()
    expect(screen.queryByText('Total public repos')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('repo name lang:go stars:>500 archived:false')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('removes the language, archived, and fork controls in favor of structured search', () => {
    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary([buildRepo('facebook/react')])}
        results={[buildRepo('facebook/react')]}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    expect(screen.getAllByRole('combobox')).toHaveLength(1)
    expect(screen.queryByLabelText('Exclude archived repos')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Exclude forks')).not.toBeInTheDocument()
    expect(screen.getByText(/Prefixes:/)).toBeInTheDocument()
  })

  it('defaults Analyze all to active non-forks and lets the query override that behavior', async () => {
    const onAnalyzeAllActive = vi.fn()

    render(
      <OrgInventoryView
        org="facebook"
        summary={{
          totalPublicRepos: 4,
          totalStars: 180,
          mostStarredRepos: [{ repo: 'facebook/react', stars: 100 }],
          mostRecentlyActiveRepos: [{ repo: 'facebook/react', pushedAt: '2026-04-02T00:00:00Z' }],
          languageDistribution: [{ language: 'TypeScript', repoCount: 4 }],
          archivedRepoCount: 1,
          activeRepoCount: 3,
        }}
        results={[
          buildRepo('facebook/react'),
          buildRepo('facebook/jest', { archived: true }),
          buildRepo('facebook/relay', { isFork: true }),
          buildRepo('facebook/rocksdb'),
        ]}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
        onAnalyzeAllActive={onAnalyzeAllActive}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /analyze all/i }))

    expect(onAnalyzeAllActive).toHaveBeenCalledWith(['facebook/react', 'facebook/rocksdb'])

    await userEvent.type(screen.getByPlaceholderText('repo name lang:go stars:>500 archived:false'), ' archived:true')
    await userEvent.click(screen.getByRole('button', { name: /analyze all/i }))

    expect(onAnalyzeAllActive).toHaveBeenLastCalledWith(['facebook/jest'])
  })

  it('US1 — Selected only collapses the table to exactly the selected repos', async () => {
    const results = Array.from({ length: 6 }, (_, i) =>
      buildRepo(`facebook/repo-${i + 1}`, { name: `repo-${i + 1}` }),
    )

    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary(results)}
        results={results}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByLabelText('Select facebook/repo-1'))
    await userEvent.click(screen.getByLabelText('Select facebook/repo-3'))
    await userEvent.click(screen.getByLabelText('Select facebook/repo-5'))

    await userEvent.click(screen.getByLabelText('Show only selected repositories'))

    const rows = screen.getAllByRole('row').slice(1)
    const rowSlugs = rows.map((row) => row.textContent ?? '')
    expect(rowSlugs.some((text) => text.includes('facebook/repo-1'))).toBe(true)
    expect(rowSlugs.some((text) => text.includes('facebook/repo-3'))).toBe(true)
    expect(rowSlugs.some((text) => text.includes('facebook/repo-5'))).toBe(true)
    expect(rowSlugs.some((text) => text.includes('facebook/repo-2'))).toBe(false)
    expect(rowSlugs.some((text) => text.includes('facebook/repo-4'))).toBe(false)
    expect(rowSlugs.some((text) => text.includes('facebook/repo-6'))).toBe(false)
    expect(rows).toHaveLength(3)
  })

  it('US1 — counter still reports the full selection size when Selected only is on', async () => {
    const results = [
      buildRepo('facebook/react'),
      buildRepo('facebook/jest'),
      buildRepo('facebook/relay'),
      buildRepo('facebook/rocksdb'),
    ]

    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary(results)}
        results={results}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByLabelText('Select facebook/react'))
    await userEvent.click(screen.getByLabelText('Select facebook/jest'))
    await userEvent.click(screen.getByLabelText('Select facebook/relay'))

    await userEvent.click(screen.getByLabelText('Show only selected repositories'))

    expect(screen.getByText(/3 selected ·/)).toBeInTheDocument()
  })

  it('US1 — deselecting a visible row while Selected only is on removes it and decrements the counter', async () => {
    const results = [
      buildRepo('facebook/react'),
      buildRepo('facebook/jest'),
      buildRepo('facebook/relay'),
    ]

    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary(results)}
        results={results}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByLabelText('Select facebook/react'))
    await userEvent.click(screen.getByLabelText('Select facebook/jest'))
    await userEvent.click(screen.getByLabelText('Select facebook/relay'))

    await userEvent.click(screen.getByLabelText('Show only selected repositories'))

    expect(screen.getAllByRole('row').slice(1)).toHaveLength(3)

    await userEvent.click(screen.getByLabelText('Select facebook/jest'))

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(screen.getByText(/2 selected ·/)).toBeInTheDocument()
  })

  it('US1 — turning Selected only off restores prior filter state and preserves the full selection', async () => {
    const results = [
      buildRepo('facebook/react', { name: 'react' }),
      buildRepo('facebook/jest', { name: 'jest' }),
      buildRepo('facebook/relay', { name: 'relay' }),
      buildRepo('facebook/cursor', { name: 'cursor' }),
    ]

    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary(results)}
        results={results}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByLabelText('Select facebook/jest'))
    await userEvent.click(screen.getByLabelText('Select facebook/relay'))

    const toggle = screen.getByLabelText('Show only selected repositories')
    await userEvent.click(toggle)
    expect(screen.getAllByRole('row').slice(1)).toHaveLength(2)

    await userEvent.click(toggle)

    expect(screen.getAllByRole('row').slice(1)).toHaveLength(4)
    expect(screen.getByLabelText('Select facebook/jest')).toBeChecked()
    expect(screen.getByLabelText('Select facebook/relay')).toBeChecked()
    expect(screen.getByLabelText('Select facebook/react')).not.toBeChecked()
    expect(screen.getByLabelText('Select facebook/cursor')).not.toBeChecked()
  })

  it('US1 — toggling Selected only resets currentPage to 1', async () => {
    const results = Array.from({ length: 22 }, (_, i) =>
      buildRepo(`facebook/repo-${String(i + 1).padStart(2, '0')}`, { name: `repo-${String(i + 1).padStart(2, '0')}` }),
    )

    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary(results)}
        results={results}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '10')
    await userEvent.click(screen.getByLabelText('Select facebook/repo-01'))
    await userEvent.click(screen.getByLabelText('Select facebook/repo-02'))
    await userEvent.click(screen.getByLabelText('Select facebook/repo-03'))

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(/Page 2 of /)).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Show only selected repositories'))

    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })

  it('US1 — Analyze selected sends the full selection regardless of Selected only state', async () => {
    const onAnalyzeSelected = vi.fn()
    const results = [
      buildRepo('facebook/react'),
      buildRepo('facebook/jest'),
      buildRepo('facebook/relay'),
    ]

    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary(results)}
        results={results}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={onAnalyzeSelected}
      />,
    )

    await userEvent.click(screen.getByLabelText('Select facebook/react'))
    await userEvent.click(screen.getByLabelText('Select facebook/jest'))
    await userEvent.click(screen.getByLabelText('Select facebook/relay'))

    await userEvent.click(screen.getByLabelText('Show only selected repositories'))

    await userEvent.click(screen.getByRole('button', { name: /analyze selected/i }))

    expect(onAnalyzeSelected).toHaveBeenCalledWith(['facebook/react', 'facebook/jest', 'facebook/relay'])
  })

  it('US1 — sort column changes still work while Selected only is on', async () => {
    const results = [
      buildRepo('facebook/jest', { stars: 80 }),
      buildRepo('facebook/react', { stars: 200 }),
      buildRepo('facebook/relay', { stars: 50 }),
      buildRepo('facebook/rocksdb', { stars: 150 }),
    ]

    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary(results)}
        results={results}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByLabelText('Select facebook/jest'))
    await userEvent.click(screen.getByLabelText('Select facebook/react'))
    await userEvent.click(screen.getByLabelText('Select facebook/relay'))

    await userEvent.click(screen.getByLabelText('Show only selected repositories'))

    // Sort by stars descending (click twice)
    await userEvent.click(screen.getByRole('button', { name: /^Stars/ }))
    await userEvent.click(screen.getByRole('button', { name: /^Stars/ }))

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)
    expect(rows[0].textContent).toContain('facebook/react')
    expect(rows[1].textContent).toContain('facebook/jest')
    expect(rows[2].textContent).toContain('facebook/relay')
  })

  it('US2 — Selected only with zero selected shows the nothing-selected empty state', async () => {
    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary([buildRepo('facebook/react'), buildRepo('facebook/jest')])}
        results={[buildRepo('facebook/react'), buildRepo('facebook/jest')]}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByLabelText('Show only selected repositories'))

    expect(screen.getByText(/no repositories are currently selected/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /turn off selected only/i })).toBeInTheDocument()
  })

  it('US2 — clicking the empty-state affordance turns off Selected only', async () => {
    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary([buildRepo('facebook/react'), buildRepo('facebook/jest')])}
        results={[buildRepo('facebook/react'), buildRepo('facebook/jest')]}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    const toggle = screen.getByLabelText('Show only selected repositories')
    await userEvent.click(toggle)

    await userEvent.click(screen.getByRole('button', { name: /turn off selected only/i }))

    expect(toggle).not.toBeChecked()
    expect(screen.getAllByRole('row').slice(1)).toHaveLength(2)
  })

  it('US2 — deselecting the last visible row transitions into the nothing-selected empty state', async () => {
    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary([buildRepo('facebook/react')])}
        results={[buildRepo('facebook/react')]}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByLabelText('Select facebook/react'))
    await userEvent.click(screen.getByLabelText('Show only selected repositories'))

    expect(screen.getAllByRole('row').slice(1)).toHaveLength(1)

    await userEvent.click(screen.getByLabelText('Select facebook/react'))

    expect(screen.getByText(/no repositories are currently selected/i)).toBeInTheDocument()
  })

  it('US2 — Selected only with intersection empty shows the filters-hide-all variant', async () => {
    const results = [
      buildRepo('facebook/react', { name: 'react' }),
      buildRepo('facebook/jest', { name: 'jest' }),
    ]

    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary(results)}
        results={results}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByLabelText('Select facebook/react'))
    await userEvent.click(screen.getByLabelText('Select facebook/jest'))
    await userEvent.click(screen.getByLabelText('Show only selected repositories'))

    await userEvent.type(screen.getByPlaceholderText('repo name lang:go stars:>500 archived:false'), 'zzznomatch')

    expect(screen.getByText(/filters hide every selected repository/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /turn off selected only/i })).toBeInTheDocument()
  })

  it('US3 — Selected only composes with the archived filter (intersection)', async () => {
    const results = [
      buildRepo('facebook/react', { archived: false }),
      buildRepo('facebook/jest', { archived: false }),
      buildRepo('facebookarchive/old', { archived: true }),
    ]

    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary(results)}
        results={results}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByLabelText('Select facebook/react'))
    await userEvent.click(screen.getByLabelText('Select facebook/jest'))
    await userEvent.click(screen.getByLabelText('Select facebookarchive/old'))

    await userEvent.click(screen.getByLabelText('Show only selected repositories'))

    await userEvent.type(screen.getByPlaceholderText('repo name lang:go stars:>500 archived:false'), 'archived:false')

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('facebook/jest')
    expect(rows[1].textContent).toContain('facebook/react')
    expect(screen.getByText(/3 selected ·/)).toBeInTheDocument()
  })

  it('US3 — Selected only composes with a name search and counter stays at full selection size', async () => {
    const results = [
      buildRepo('facebook/react', { name: 'react' }),
      buildRepo('facebook/jest', { name: 'jest' }),
      buildRepo('facebook/relay', { name: 'relay' }),
      buildRepo('facebook/rocksdb', { name: 'rocksdb' }),
    ]

    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary(results)}
        results={results}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByLabelText('Select facebook/react'))
    await userEvent.click(screen.getByLabelText('Select facebook/jest'))
    await userEvent.click(screen.getByLabelText('Select facebook/relay'))
    await userEvent.click(screen.getByLabelText('Select facebook/rocksdb'))

    await userEvent.click(screen.getByLabelText('Show only selected repositories'))
    await userEvent.type(screen.getByPlaceholderText('repo name lang:go stars:>500 archived:false'), 're')

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.textContent).some((t) => t?.includes('facebook/react'))).toBe(true)
    expect(rows.map((r) => r.textContent).some((t) => t?.includes('facebook/relay'))).toBe(true)
    expect(screen.getByText(/4 selected ·/)).toBeInTheDocument()
  })

  it('US3 — turning Selected only off preserves other active filters', async () => {
    const results = [
      buildRepo('facebook/react', { name: 'react' }),
      buildRepo('facebook/jest', { name: 'jest' }),
      buildRepo('facebook/relay', { name: 'relay' }),
    ]

    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary(results)}
        results={results}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByLabelText('Select facebook/jest'))
    await userEvent.click(screen.getByLabelText('Show only selected repositories'))
    await userEvent.type(screen.getByPlaceholderText('repo name lang:go stars:>500 archived:false'), 'jest')

    const toggle = screen.getByLabelText('Show only selected repositories')
    await userEvent.click(toggle)

    expect(screen.getByPlaceholderText('repo name lang:go stars:>500 archived:false')).toHaveValue('jest')
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain('facebook/jest')
  })

  it('disables analyze-all when the pre-filters exclude every repo', () => {
    render(
      <OrgInventoryView
        org="facebook"
        summary={{
          totalPublicRepos: 2,
          totalStars: 180,
          mostStarredRepos: [{ repo: 'facebook/react', stars: 100 }],
          mostRecentlyActiveRepos: [{ repo: 'facebook/react', pushedAt: '2026-04-02T00:00:00Z' }],
          languageDistribution: [{ language: 'TypeScript', repoCount: 2 }],
          archivedRepoCount: 1,
          activeRepoCount: 1,
        }}
        results={[
          buildRepo('facebook/jest', { archived: true }),
          buildRepo('facebook/relay', { isFork: true }),
        ]}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
        onAnalyzeAllActive={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /analyze all/i })).toBeDisabled()
  })

  it('supports selecting an unlimited number of repos via row checkboxes', async () => {
    const results = Array.from({ length: 8 }, (_, i) => buildRepo(`facebook/repo-${i + 1}`))

    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary(results)}
        results={results}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    for (let i = 1; i <= 8; i += 1) {
      await userEvent.click(screen.getByLabelText(`Select facebook/repo-${i}`))
    }

    expect(screen.getByText(/8 selected ·/)).toBeInTheDocument()
    expect(screen.queryByText(/you can select up to/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Bulk selection limit')).not.toBeInTheDocument()
  })

  it('filters repos with structured prefixes and shows invalid token feedback', async () => {
    const results = [
      buildRepo('facebook/react', {
        primaryLanguage: 'TypeScript',
        stars: 230,
        archived: false,
        isFork: false,
        topics: ['ui'],
        sizeKb: 800,
        visibility: 'public',
        licenseSpdxId: 'MIT',
        pushedAt: '2026-04-02T00:00:00Z',
      }),
      buildRepo('facebook/jest', {
        primaryLanguage: 'JavaScript',
        stars: 80,
        archived: true,
        isFork: true,
        topics: ['testing'],
        sizeKb: 200,
        visibility: 'public',
        licenseSpdxId: 'Apache-2.0',
        pushedAt: '2025-01-01T00:00:00Z',
      }),
    ]

    render(
      <OrgInventoryView
        org="facebook"
        summary={makeSummary(results)}
        results={results}
        rateLimit={null}
        onAnalyzeRepo={vi.fn()}
        onAnalyzeSelected={vi.fn()}
      />,
    )

    const input = screen.getByPlaceholderText('repo name lang:go stars:>500 archived:false')
    await userEvent.type(input, 'lang:typescript stars:>100 archived:false fork:false topic:ui size:>=500 visibility:public license:mit pushed:>=2026-04-01')

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('facebook/react')

    await userEvent.clear(input)
    await userEvent.type(input, 'stars:abc')

    expect(screen.getByText(/Ignored invalid token/i)).toBeInTheDocument()
  })
})

function buildRepo(repo: string, overrides: Record<string, unknown> = {}): OrgRepoSummary {
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
    isFork: false,
    topics: [],
    sizeKb: 100,
    visibility: 'public',
    licenseSpdxId: 'unavailable',
    licenseName: 'unavailable',
    url: `https://github.com/${repo}`,
    ...overrides,
  }
}

function makeSummary(results: ReturnType<typeof buildRepo>[]) {
  return {
    totalPublicRepos: results.length,
    totalStars: results.reduce(
      (sum, r) => (typeof r.stars === 'number' ? sum + r.stars : sum),
      0,
    ),
    mostStarredRepos: results
      .slice()
      .sort((a, b) => (typeof b.stars === 'number' ? b.stars : 0) - (typeof a.stars === 'number' ? a.stars : 0))
      .slice(0, 3)
      .map((r) => ({ repo: r.repo, stars: typeof r.stars === 'number' ? r.stars : 0 })),
    mostRecentlyActiveRepos: results.slice(0, 3).map((r) => ({
      repo: r.repo,
      pushedAt: typeof r.pushedAt === 'string' ? r.pushedAt : '2026-04-02T00:00:00Z',
    })),
    languageDistribution: [{ language: 'TypeScript', repoCount: results.length }],
    archivedRepoCount: results.filter((r) => r.archived).length,
    activeRepoCount: results.filter((r) => !r.archived).length,
  }
}
