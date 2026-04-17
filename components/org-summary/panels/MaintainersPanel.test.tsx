import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MaintainersPanel } from './MaintainersPanel'
import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { MaintainersValue } from '@/lib/org-aggregation/aggregators/types'

function makePanel(
  override: Partial<AggregatePanel<MaintainersValue>> = {},
): AggregatePanel<MaintainersValue> {
  return {
    panelId: 'maintainers',
    contributingReposCount: 2,
    totalReposInRun: 2,
    status: 'final',
    value: {
      projectWide: [
        { token: 'alice', kind: 'user', reposListed: ['acme/a', 'acme/b'] },
        { token: '@acme/core', kind: 'team', reposListed: ['acme/a'] },
      ],
      perRepo: [],
    },
    ...override,
  }
}

describe('MaintainersPanel — panel-level chevron (#336)', () => {
  it('starts expanded with the body visible and aria-expanded=true', () => {
    render(<MaintainersPanel panel={makePanel()} />)
    const toggle = screen.getByTestId('maintainers-panel-toggle')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-label', 'Collapse Maintainers')
    // Body content (a maintainer row) is rendered.
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('collapses on click — body hides, aria-expanded flips, aria-label updates', async () => {
    const user = userEvent.setup()
    render(<MaintainersPanel panel={makePanel()} />)
    const toggle = screen.getByTestId('maintainers-panel-toggle')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-label', 'Expand Maintainers')
    expect(screen.queryByText('alice')).not.toBeInTheDocument()
  })

  it('re-expands on a second click', async () => {
    const user = userEvent.setup()
    render(<MaintainersPanel panel={makePanel()} />)
    const toggle = screen.getByTestId('maintainers-panel-toggle')

    await user.click(toggle)
    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-label', 'Collapse Maintainers')
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('keeps the summary pill visible in both collapsed and expanded states', async () => {
    const user = userEvent.setup()
    render(<MaintainersPanel panel={makePanel()} />)
    const pill = screen.getByTestId('maintainers-panel-summary')
    // Expanded: pill present with both user + team breakdown.
    expect(pill).toHaveTextContent('2 maintainers · 1 team')

    await user.click(screen.getByTestId('maintainers-panel-toggle'))

    // Collapsed: same pill still rendered (summary-at-a-glance).
    expect(screen.getByTestId('maintainers-panel-summary')).toHaveTextContent(
      '2 maintainers · 1 team',
    )
  })

  it('omits the team breakdown when there are no team handles', () => {
    const panel = makePanel({
      value: {
        projectWide: [{ token: 'alice', kind: 'user', reposListed: ['acme/a'] }],
        perRepo: [],
      },
    })
    render(<MaintainersPanel panel={panel} />)
    expect(screen.getByTestId('maintainers-panel-summary')).toHaveTextContent(
      '1 maintainer',
    )
    expect(
      screen.getByTestId('maintainers-panel-summary').textContent,
    ).not.toMatch(/team/)
  })

  it('omits the summary pill entirely when panel has no value', () => {
    render(<MaintainersPanel panel={makePanel({ status: 'unavailable', value: null })} />)
    expect(screen.queryByTestId('maintainers-panel-summary')).not.toBeInTheDocument()
  })
})
