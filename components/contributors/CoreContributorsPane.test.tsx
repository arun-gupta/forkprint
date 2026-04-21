import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CoreContributorsPane } from './CoreContributorsPane'

describe('CoreContributorsPane', () => {
  it('renders the core contributor metrics and contribution chart with optional names and numbers', async () => {
    const onToggleIncludeBots = vi.fn()

    render(
      <CoreContributorsPane
        metrics={[
          {
            label: 'Contributor composition',
            value: '12',
            secondaryValue: 'GitHub API contributors',
            hoverText:
              "12 contributors from GitHub's repository contributors API, including anonymous contributors when GitHub reports them. This can run higher than the contributor count shown on the GitHub repo page for large repositories. Within that total, 5 contributors made at least one verified commit in the last 90 days: 3 repeat and 2 one-time. 7 were not active in the last 90 days.",
            supportingText: '3 repeat, 2 one-time, 7 inactive',
            breakdown: {
              segments: [
                { label: 'Repeat', value: 3, tone: 'strong' },
                { label: 'One-time', value: 2, tone: 'medium' },
                { label: 'Inactive', value: 7, tone: 'light' },
              ],
            },
          },
        ]}
        heatmap={[
          { contributor: 'alice', commits: 5, commitsLabel: '5 commits', intensity: 'max' },
          { contributor: 'bob', commits: 2, commitsLabel: '2 commits', intensity: 'medium' },
        ]}
        windowDays={90}
        includeBots={false}
        onToggleIncludeBots={onToggleIncludeBots}
      />,
    )

    expect(screen.getByText(/contributor metrics from verified public data for the last 90 days/i)).toBeInTheDocument()
    expect(screen.getByText('Contributor composition')).toBeInTheDocument()
    expect(screen.getByText('GitHub API contributors')).toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByLabelText(/contributor composition help/i))
    expect(screen.getByRole('tooltip')).toHaveTextContent(/12 contributors from GitHub's repository contributors API, including anonymous contributors/i)
    fireEvent.mouseLeave(screen.getByLabelText(/contributor composition help/i))
    expect(screen.queryByText('Active contributors (90d)')).not.toBeInTheDocument()
    expect(screen.queryByText('Repeat contributors (90d)')).not.toBeInTheDocument()
    expect(screen.getByText('3 repeat, 2 one-time, 7 inactive')).toBeInTheDocument()
    expect(screen.getByText('Repeat 3')).toBeInTheDocument()
    expect(screen.getByText('One-time 2')).toBeInTheDocument()
    expect(screen.getByText('Inactive 7')).toBeInTheDocument()
    expect(screen.queryByText('Contribution concentration')).not.toBeInTheDocument()
    expect(screen.getByText(/contribution chart/i)).toBeInTheDocument()
    expect(screen.getByText(/longer bars indicate contributor activity in the last 90 days/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /include bots in chart/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hide names/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show numbers/i })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /contribution activity bars/i })).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByLabelText(/alice 5 commits/i)).toBeInTheDocument()
    expect(screen.queryByText('5 commits')).not.toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /hide names/i }))

    expect(screen.getByRole('button', { name: /show names/i })).toBeInTheDocument()
    expect(screen.queryByText('alice')).not.toBeInTheDocument()
    expect(screen.queryByText(/contributor hidden/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show numbers/i }))

    expect(screen.getByRole('button', { name: /hide numbers/i })).toBeInTheDocument()
    expect(screen.getByText('5 commits')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /include bots in chart/i }))

    expect(onToggleIncludeBots).toHaveBeenCalledTimes(1)
  })

  it('collapses the contribution chart and hides sub-controls when toggled', async () => {
    render(
      <CoreContributorsPane
        metrics={[]}
        heatmap={[
          { contributor: 'alice', commits: 5, commitsLabel: '5 commits', intensity: 'max' },
          { contributor: 'bob', commits: 2, commitsLabel: '2 commits', intensity: 'medium' },
        ]}
        windowDays={90}
        includeBots={false}
        onToggleIncludeBots={vi.fn()}
      />,
    )

    const toggle = screen.getByRole('button', { name: /collapse contribution chart/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('list', { name: /contribution activity bars/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /include bots in chart/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hide names/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show numbers/i })).toBeInTheDocument()

    await userEvent.click(toggle)

    const reopen = screen.getByRole('button', { name: /expand contribution chart/i })
    expect(reopen).toHaveAttribute('aria-pressed', 'false')
    expect(reopen).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list', { name: /contribution activity bars/i })).not.toBeInTheDocument()
    expect(screen.queryByText('alice')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /include bots in chart/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /hide names/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /show numbers/i })).not.toBeInTheDocument()

    await userEvent.click(reopen)

    expect(screen.getByRole('button', { name: /collapse contribution chart/i })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /contribution activity bars/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /include bots in chart/i })).toBeInTheDocument()
  })
})
