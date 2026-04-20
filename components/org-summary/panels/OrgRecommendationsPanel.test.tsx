import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { OrgRecommendationsPanel } from './OrgRecommendationsPanel'
import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { OrgRecommendationsValue } from '@/lib/org-aggregation/aggregators/types'

function makePanel(
  override: Partial<AggregatePanel<OrgRecommendationsValue>> = {},
): AggregatePanel<OrgRecommendationsValue> {
  return {
    panelId: 'org-recommendations',
    contributingReposCount: 2,
    totalReposInRun: 2,
    status: 'final',
    value: { items: [], analyzedReposCount: 2 },
    ...override,
  }
}

describe('OrgRecommendationsPanel — US1 / US2 render', () => {
  it('in-progress + null value → renders EmptyState (FR-013)', () => {
    const panel = makePanel({ status: 'in-progress', value: null, contributingReposCount: 0 })
    render(<OrgRecommendationsPanel panel={panel} />)
    expect(screen.getByRole('status')).toHaveTextContent(/waiting for first result/i)
  })

  it('empty items → empty-state message references analyzedReposCount (FR-012)', () => {
    const panel = makePanel({
      value: { items: [], analyzedReposCount: 5 },
      contributingReposCount: 5,
      totalReposInRun: 5,
    })
    render(<OrgRecommendationsPanel panel={panel} />)
    expect(
      screen.getByText(/no systemic issues found across the 5 analyzed repos/i),
    ).toBeInTheDocument()
  })

  it('renders each entry with catalog ID, title, and "N of M repos" (FR-004)', () => {
    const panel = makePanel({
      value: {
        items: [
          {
            id: 'DOC-5',
            bucket: 'Documentation',
            title: 'Add SECURITY.md',
            affectedRepoCount: 2,
            affectedRepos: ['o/alpha', 'o/bravo'],
          },
        ],
        analyzedReposCount: 2,
      },
    })
    render(<OrgRecommendationsPanel panel={panel} />)
    expect(screen.getByText('DOC-5')).toBeInTheDocument()
    expect(screen.getByText('Add SECURITY.md')).toBeInTheDocument()
    expect(screen.getByText(/2 of 2 repos/i)).toBeInTheDocument()
  })

  it('renders bucket headings in ORG_RECOMMENDATION_BUCKET_ORDER; skips empty buckets (FR-006, FR-008)', () => {
    const panel = makePanel({
      value: {
        items: [
          // Security bucket last in registry order — in DOM order it must follow Activity.
          {
            id: 'SEC-3',
            bucket: 'Security',
            title: 'Branch protection',
            affectedRepoCount: 1,
            affectedRepos: ['o/a'],
          },
          {
            id: 'ACT-1',
            bucket: 'Activity',
            title: 'PR flow',
            affectedRepoCount: 1,
            affectedRepos: ['o/a'],
          },
        ],
        analyzedReposCount: 1,
      },
    })
    render(<OrgRecommendationsPanel panel={panel} />)
    const headings = screen.getAllByRole('heading', { level: 4 })
    const texts = headings.map((h) => h.textContent)
    // Activity must precede Security; Responsiveness/Contributors/Documentation absent.
    expect(texts).toEqual(['Activity', 'Security'])
  })

  it('US3 drill-down: expanding an entry reveals affectedRepos in stored order', () => {
    const panel = makePanel({
      value: {
        items: [
          {
            id: 'DOC-5',
            bucket: 'Documentation',
            title: 'Add SECURITY.md',
            affectedRepoCount: 3,
            affectedRepos: ['o/alpha', 'o/bravo', 'o/charlie'],
          },
        ],
        analyzedReposCount: 3,
      },
    })
    render(<OrgRecommendationsPanel panel={panel} />)

    // The drill-down toggle is an expand button per entry.
    const toggle = screen.getByRole('button', { name: /show affected repos/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('o/alpha')).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    // All three repos render in the drill list, in stored order.
    const drill = screen.getByTestId('org-recommendations-drill-DOC-5')
    expect(within(drill).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'o/alpha',
      'o/bravo',
      'o/charlie',
    ])

    // Re-collapse and re-expand — same order.
    fireEvent.click(toggle)
    expect(screen.queryByTestId('org-recommendations-drill-DOC-5')).not.toBeInTheDocument()
    fireEvent.click(toggle)
    const drill2 = screen.getByTestId('org-recommendations-drill-DOC-5')
    expect(within(drill2).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'o/alpha',
      'o/bravo',
      'o/charlie',
    ])
  })
})
