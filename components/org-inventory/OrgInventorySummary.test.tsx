import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { OrgInventorySummary } from './OrgInventorySummary'

describe('OrgInventorySummary', () => {
  it('collapses language distribution to the top 5 languages with a show-more control', async () => {
    render(
      <OrgInventorySummary
        summary={{
          totalPublicRepos: 12,
          totalStars: 120,
          mostStarredRepos: [{ repo: 'facebook/react', stars: 100 }],
          mostRecentlyActiveRepos: [{ repo: 'facebook/react', pushedAt: '2026-04-02T00:00:00Z' }],
          languageDistribution: Array.from({ length: 12 }, (_, index) => ({
            language: `Language ${index + 1}`,
            repoCount: 12 - index,
          })),
          archivedRepoCount: 1,
          activeRepoCount: 11,
        }}
      />,
    )

    expect(screen.getByText('Language 5')).toBeInTheDocument()
    expect(screen.queryByText('Language 6')).not.toBeInTheDocument()
    expect(screen.getByText('7 more languages hidden')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show more languages/i }))

    expect(screen.getByText('Language 11')).toBeInTheDocument()
    expect(screen.getByText('Language 12')).toBeInTheDocument()
    expect(screen.getByText('Showing all 12 languages')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show fewer languages/i }))

    expect(screen.queryByText('Language 6')).not.toBeInTheDocument()
  })
})
