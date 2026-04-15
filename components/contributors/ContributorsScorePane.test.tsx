import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ContributorsScorePane } from './ContributorsScorePane'

describe('ContributorsScorePane', () => {
  it('renders score details and the non-duplicative contributor metrics', async () => {
    render(
      <ContributorsScorePane
        section={{
          repo: 'facebook/react',
          coreMetrics: [],
          contributorsScore: {
            value: 45,
            tone: 'warning',
            description: 'Contributor concentration ranks at the 45th percentile among Growing (100–999 stars) repositories.',
            percentile: 45,
            bracketLabel: 'Growing (100–999 stars)',
            concentration: 0.625,
            topContributorCount: 1,
            contributorCount: 5,
          },
          contributorsMetrics: [
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
            { contributor: 'meta', commits: 7, commitsLabel: '7 commits', intensity: 'max' },
            { contributor: 'openai', commits: 3, commitsLabel: '3 commits', intensity: 'high' },
          ],
          experimentalWarning:
            'Based on verified public GitHub organization memberships only. Contributors without public org membership appear as "Unaffiliated." Affiliations reflect current membership at analysis time — not historical employment at the time each commit was made. Contributors who change employers will show under their current organization.',
          missingData: ['Total contributors', 'New contributors (90d)'],
        }}
      />,
    )

    expect(screen.getByText(/how is this scored/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show details/i })).toBeInTheDocument()
    expect(screen.getAllByText(/45th percentile/i).length).toBeGreaterThan(0)
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
    expect(screen.getByText(/verified public GitHub organization memberships/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /chaoss elephant factor reference/i })).toHaveAttribute(
      'href',
      'https://chaoss.community/kb/metric-elephant-factor/',
    )
    expect(screen.getByText('Elephant Factor')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Single-vendor dependency ratio')).toBeInTheDocument()
    expect(screen.getByText('68.0%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /expand organization chart/i })).toBeInTheDocument()
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
    expect(screen.queryByText(/^Missing data$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/later contributor signals/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/grouped areas/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show details/i }))

    expect(screen.getByRole('button', { name: /hide details/i })).toBeInTheDocument()
    expect(screen.getByText(/top-20% contributor share/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /expand organization chart/i }))

    expect(screen.getByRole('button', { name: /collapse organization chart/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hide names/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show numbers/i })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /organization contribution bars/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/meta 7 commits/i)).toBeInTheDocument()
    expect(screen.getByText('meta')).toBeInTheDocument()
    expect(screen.queryByText('7 commits')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /show numbers/i }))

    expect(screen.getByRole('button', { name: /hide numbers/i })).toBeInTheDocument()
    expect(screen.getByText('7 commits')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /hide names/i }))

    expect(screen.getByRole('button', { name: /show names/i })).toBeInTheDocument()
    expect(screen.queryByText('meta')).not.toBeInTheDocument()
  })

  it('does not render a missing-data panel', () => {
    render(
      <ContributorsScorePane
        section={{
          repo: 'facebook/react',
          coreMetrics: [],
          contributorsScore: {
            value: 82,
            tone: 'success',
            description: 'Contributor concentration ranks at the 82nd percentile among Growing (100–999 stars) repositories.',
            percentile: 82,
            bracketLabel: 'Growing (100–999 stars)',
            concentration: 0.4,
            topContributorCount: 1,
            contributorCount: 5,
          },
          contributorsMetrics: [{ label: 'Top 20% contributor share', value: '40.0%', supportingText: '1 of 5 active contributors' }],
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
