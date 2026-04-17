import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InactiveReposPanel } from './InactiveReposPanel'
import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { InactiveReposValue } from '@/lib/org-aggregation/aggregators/types'

function makePanel(override: Partial<AggregatePanel<InactiveReposValue>> = {}): AggregatePanel<InactiveReposValue> {
  return {
    panelId: 'inactive-repos',
    contributingReposCount: 3,
    totalReposInRun: 3,
    status: 'final',
    value: { windowMonths: 12, repos: [] },
    ...override,
  }
}

describe('InactiveReposPanel — honest labeling (issue #300)', () => {
  it('header subtitle clarifies default-branch scope and flags the pushed_at gap', () => {
    render(<InactiveReposPanel panel={makePanel()} />)
    // Subtitle names the signal precisely.
    expect(
      screen.getByText(/no commits on the default branch in the last 90 days/i),
    ).toBeInTheDocument()
    // Subtitle explains why the inventory's "Last pushed" can disagree.
    expect(screen.getByText(/Last pushed/i)).toBeInTheDocument()
  })

  it('inactive count sentence says "default branch", not a bare "no commits"', () => {
    const panel = makePanel({
      value: {
        windowMonths: 12,
        repos: [{ repo: 'vercel/hyper', lastCommitAt: null }],
      },
    })
    render(<InactiveReposPanel panel={panel} />)
    expect(
      screen.getByText(
        /1 repo\(s\) with no commits on the default branch in the last 90 days/i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('vercel/hyper')).toBeInTheDocument()
  })

  it('empty-state sentence also scopes to default-branch activity', () => {
    render(<InactiveReposPanel panel={makePanel()} />)
    expect(
      screen.getByText(/all repos have recent default-branch commit activity/i),
    ).toBeInTheDocument()
  })

  it('unavailable status renders the neutral fallback', () => {
    render(
      <InactiveReposPanel
        panel={makePanel({ status: 'unavailable', value: null })}
      />,
    )
    expect(screen.getByText(/no activity data available/i)).toBeInTheDocument()
  })
})
