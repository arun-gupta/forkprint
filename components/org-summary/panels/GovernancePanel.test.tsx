import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GovernancePanel } from './GovernancePanel'
import type { AggregatePanel } from '@/lib/org-aggregation/types'
import type { GovernanceValue } from '@/lib/org-aggregation/aggregators/types'

function makePanel(
  override: Partial<AggregatePanel<GovernanceValue>> = {},
): AggregatePanel<GovernanceValue> {
  return {
    panelId: 'governance',
    contributingReposCount: 3,
    totalReposInRun: 3,
    status: 'final',
    value: {
      orgLevel: null,
      perRepo: [
        { repo: 'acme/a', present: true },
        { repo: 'acme/b', present: false },
        { repo: 'acme/c', present: false },
      ],
    },
    ...override,
  }
}

describe('GovernancePanel — panel-level chevron (#336)', () => {
  it('starts expanded with the body visible and aria-expanded=true', () => {
    render(<GovernancePanel panel={makePanel()} />)
    const toggle = screen.getByTestId('governance-panel-toggle')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-label', 'Collapse GOVERNANCE.md coverage')
    expect(screen.getByText('acme/a')).toBeInTheDocument()
  })

  it('collapses on click — body hides, aria-expanded flips, aria-label updates', async () => {
    const user = userEvent.setup()
    render(<GovernancePanel panel={makePanel()} />)
    const toggle = screen.getByTestId('governance-panel-toggle')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute('aria-label', 'Expand GOVERNANCE.md coverage')
    expect(screen.queryByText('acme/a')).not.toBeInTheDocument()
  })

  it('re-expands on a second click', async () => {
    const user = userEvent.setup()
    render(<GovernancePanel panel={makePanel()} />)
    const toggle = screen.getByTestId('governance-panel-toggle')

    await user.click(toggle)
    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAttribute('aria-label', 'Collapse GOVERNANCE.md coverage')
    expect(screen.getByText('acme/a')).toBeInTheDocument()
  })

  it('renders the panel title "GOVERNANCE.md coverage" (not "Governance") and section aria-label', () => {
    render(<GovernancePanel panel={makePanel()} />)
    expect(
      screen.getByRole('heading', { level: 3, name: 'GOVERNANCE.md coverage' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'GOVERNANCE.md coverage' })).toBeInTheDocument()
  })

  it('keeps the summary pill visible in both collapsed and expanded states', async () => {
    const user = userEvent.setup()
    render(<GovernancePanel panel={makePanel()} />)
    const pill = screen.getByTestId('governance-panel-summary')
    expect(pill).toHaveTextContent('1 of 3 repos')

    await user.click(screen.getByTestId('governance-panel-toggle'))

    expect(screen.getByTestId('governance-panel-summary')).toHaveTextContent('1 of 3 repos')
  })

  it('colors the summary pill emerald when every repo has GOVERNANCE.md', () => {
    const panel = makePanel({
      value: {
        orgLevel: null,
        perRepo: [
          { repo: 'acme/a', present: true },
          { repo: 'acme/b', present: true },
        ],
      },
    })
    render(<GovernancePanel panel={panel} />)
    const pill = screen.getByTestId('governance-panel-summary')
    expect(pill).toHaveTextContent('2 of 2 repos')
    expect(pill.className).toMatch(/emerald/)
  })

  it('omits the summary pill entirely when panel has no value', () => {
    render(<GovernancePanel panel={makePanel({ status: 'unavailable', value: null })} />)
    expect(screen.queryByTestId('governance-panel-summary')).not.toBeInTheDocument()
  })
})
