import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SustainabilityPane } from './SustainabilityPane'

describe('SustainabilityPane', () => {
  it('renders score details and the non-duplicative sustainability metrics', async () => {
    render(
      <SustainabilityPane
        section={{
          repo: 'facebook/react',
          coreMetrics: [],
          sustainabilityScore: {
            value: 'Medium',
            tone: 'warning',
            description: 'Contributor activity is somewhat concentrated and may indicate moderate resilience risk.',
            concentration: 0.625,
            topContributorCount: 1,
            contributorCount: 5,
          },
          sustainabilityMetrics: [
            { label: 'Top 20% contributor share', value: '62.5%', supportingText: '1 of 5 active contributors' },
            {
              label: 'Maintainer count',
              value: '4',
              hoverText:
                '4 maintainers or owners parsed from supported public repository files such as OWNERS, MAINTAINERS, CODEOWNERS, or GOVERNANCE.md.',
            },
            {
              label: 'Types of contributions',
              value: 'Commits, Pull requests, Issues',
              hoverText: 'Observed from verified recent repository activity: Commits, Pull requests, Issues.',
            },
          ],
          experimentalMetrics: [
            {
              label: 'Elephant Factor',
              value: '2',
              hoverText:
                '2 guessed organization(s) account for at least 50% of experimentally attributed recent commits. Higher is generally healthier because contributor dependence is spread across more organizations. Attributed authors: 4. Unattributed authors: 1.',
            },
            {
              label: 'Single-vendor dependency ratio',
              value: '68.0%',
              hoverText:
                '68.0% of experimentally attributed recent commits are attributable to the largest guessed public organization. Lower is generally healthier because less activity depends on a single organization. Attributed authors: 4. Unattributed authors: 1.',
            },
          ],
          experimentalHeatmap: [
            { contributor: 'meta', commits: 7, commitsLabel: '7 attributed commits', intensity: 'max' },
            { contributor: 'openai', commits: 3, commitsLabel: '3 attributed commits', intensity: 'high' },
          ],
          experimentalWarning:
            'Best-effort estimate. Uses heuristic public GitHub organization attribution and may be incomplete or inaccurate.',
          missingData: ['Total contributors', 'New contributors (90d)'],
        }}
      />,
    )

    expect(screen.getByText(/how is this scored/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show thresholds/i })).toBeInTheDocument()
    expect(screen.getByText(/^High$/i)).toBeInTheDocument()
    expect(screen.getByText(/^<= 50%$/i)).toBeInTheDocument()
    expect(screen.getAllByText(/^Medium$/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/^<= 75%$/i)).toBeInTheDocument()
    expect(screen.queryByText(/broadly distributed across the most active authors/i)).not.toBeInTheDocument()
    expect(screen.getByText('Top 20% contributor share')).toBeInTheDocument()
    expect(screen.getByText('62.5%')).toBeInTheDocument()
    expect(screen.getByText('1 of 5 active contributors')).toBeInTheDocument()
    expect(screen.queryByText(/scored contributor group/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/what was scored/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Inactive contributors')).not.toBeInTheDocument()
    expect(screen.getByText('Maintainer count')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.queryByText('Occasional contributors')).not.toBeInTheDocument()
    expect(screen.getByText('Types of contributions')).toBeInTheDocument()
    expect(screen.getByText('Commits, Pull requests, Issues')).toBeInTheDocument()
    expect(screen.getByText(/best-effort estimate/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /chaoss elephant factor reference/i })).toHaveAttribute(
      'href',
      'https://chaoss.community/kb/metric-elephant-factor/',
    )
    expect(screen.getByText('Elephant Factor')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Single-vendor dependency ratio')).toBeInTheDocument()
    expect(screen.getByText('68.0%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show chart/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /hide names/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /show numbers/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /attributed organization bars/i })).not.toBeInTheDocument()
    expect(
      screen.getByLabelText(
        /Maintainer count\. 4 maintainers or owners parsed from supported public repository files such as OWNERS, MAINTAINERS, CODEOWNERS, or GOVERNANCE\.md\./i,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(/Types of contributions\. Observed from verified recent repository activity: Commits, Pull requests, Issues\./i),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(
        /Elephant Factor\. 2 guessed organization\(s\) account for at least 50% of experimentally attributed recent commits\. Higher is generally healthier/i,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(
        /Single-vendor dependency ratio\. 68.0% of experimentally attributed recent commits are attributable to the largest guessed public organization\. Lower is generally healthier/i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/missing data/i)).toBeInTheDocument()
    expect(screen.queryByText(/later sustainability signals/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/grouped areas/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show thresholds/i }))

    expect(screen.getByRole('button', { name: /hide thresholds/i })).toBeInTheDocument()
    expect(screen.getByText(/broadly distributed across the most active authors/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show chart/i }))

    expect(screen.getByRole('button', { name: /hide chart/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hide names/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show numbers/i })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /attributed organization bars/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/meta 7 attributed commits/i)).toBeInTheDocument()
    expect(screen.getByText('meta')).toBeInTheDocument()
    expect(screen.queryByText('7 attributed commits')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show numbers/i }))

    expect(screen.getByRole('button', { name: /hide numbers/i })).toBeInTheDocument()
    expect(screen.getByText('7 attributed commits')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /hide names/i }))

    expect(screen.getByRole('button', { name: /show names/i })).toBeInTheDocument()
    expect(screen.queryByText('meta')).not.toBeInTheDocument()
  })

  it('hides the missing-data panel when no fields are missing', () => {
    render(
      <SustainabilityPane
        section={{
          repo: 'facebook/react',
          coreMetrics: [],
          sustainabilityScore: {
            value: 'High',
            tone: 'success',
            description: 'Contributor activity is broadly distributed across the most active authors.',
            concentration: 0.4,
            topContributorCount: 1,
            contributorCount: 5,
          },
          sustainabilityMetrics: [{ label: 'Top 20% contributor share', value: '40.0%', supportingText: '1 of 5 active contributors' }],
          experimentalMetrics: [],
          experimentalHeatmap: [],
          experimentalWarning:
            'Best-effort estimate. Uses heuristic public GitHub organization attribution and may be incomplete or inaccurate.',
          missingData: [],
        }}
      />,
    )

    expect(screen.queryByText(/^Missing data$/i)).not.toBeInTheDocument()
  })
})
