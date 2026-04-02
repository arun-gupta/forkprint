import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CoreContributorsPane } from './CoreContributorsPane'

describe('CoreContributorsPane', () => {
  it('renders the core contributor metrics and compact heatmap with optional names and numbers', async () => {
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
          { contributor: 'alice', commitsLabel: '5 commits', intensity: 'max' },
          { contributor: 'bob', commitsLabel: '2 commits', intensity: 'medium' },
        ]}
        windowDays={90}
        includeBots={false}
        onToggleIncludeBots={() => {}}
      />,
    )

    expect(screen.getByText(/contributor metrics from verified public data for the last 90 days/i)).toBeInTheDocument()
    expect(screen.getByText('Contributor composition')).toBeInTheDocument()
    expect(screen.getByText('GitHub API contributors')).toBeInTheDocument()
    expect(
      screen.getByLabelText(
        /Contributor composition\. 12 contributors from GitHub's repository contributors API, including anonymous contributors/i,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Active contributors (90d)')).not.toBeInTheDocument()
    expect(screen.queryByText('Repeat contributors (90d)')).not.toBeInTheDocument()
    expect(screen.getByText('3 repeat, 2 one-time, 7 inactive')).toBeInTheDocument()
    expect(screen.getByText('Repeat 3')).toBeInTheDocument()
    expect(screen.getByText('One-time 2')).toBeInTheDocument()
    expect(screen.getByText('Inactive 7')).toBeInTheDocument()
    expect(screen.queryByText('Contribution concentration')).not.toBeInTheDocument()
    expect(screen.getByText(/contribution heatmap/i)).toBeInTheDocument()
    expect(screen.getByText(/darker bubbles indicate contributor activity in the last 90 days/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /include bots in heatmap/i })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /contribution heatmap tiles/i })).toBeInTheDocument()
    expect(screen.queryByText('alice')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show names/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show numbers/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/alice 5 commits/i)).toBeInTheDocument()
    expect(screen.queryByText('5 commits')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show names/i }))

    expect(screen.getByRole('button', { name: /hide names/i })).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show numbers/i }))

    expect(screen.getByRole('button', { name: /hide numbers/i })).toBeInTheDocument()
    expect(screen.getByText('5 commits')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })
})
