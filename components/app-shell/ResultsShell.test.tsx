import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ResultsShell } from './ResultsShell'

describe('ResultsShell', () => {
  it('keeps the analysis panel visible while switching tabs', async () => {
    render(
      <ResultsShell
        analysisPanel={<div>Analysis panel</div>}
        overview={<div>Overview content</div>}
        contributors={<div>Contributors coming soon</div>}
        activity={<div>Activity coming soon</div>}
        responsiveness={<div>Responsiveness coming soon</div>}
        documentation={<div>Documentation coming soon</div>}
        security={<div>Security coming soon</div>}
        recommendations={<div>Recommendations coming soon</div>}
        comparison={<div>Comparison coming soon</div>}
      />,
    )

    expect(screen.getByText('Analysis panel')).toBeInTheDocument()
    expect(screen.getByText('Overview content')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Contributors' }))

    expect(screen.getByText('Analysis panel')).toBeInTheDocument()
    expect(screen.getByText('Contributors coming soon')).toBeInTheDocument()
  })

  it('renders the GitHub repo link in the header', () => {
    render(
      <ResultsShell
        analysisPanel={<div>Analysis panel</div>}
        overview={<div>Overview content</div>}
        contributors={<div>Contributors coming soon</div>}
        activity={<div>Activity coming soon</div>}
        responsiveness={<div>Responsiveness coming soon</div>}
        documentation={<div>Documentation coming soon</div>}
        security={<div>Security coming soon</div>}
        recommendations={<div>Recommendations coming soon</div>}
        comparison={<div>Comparison coming soon</div>}
      />,
    )

    const link = screen.getByRole('link', { name: /github repository/i })
    expect(link).toHaveAttribute('href', 'https://github.com/arun-gupta/repo-pulse')
  })

  it('describes both repository and organization workflows in the header', () => {
    render(
      <ResultsShell
        analysisPanel={<div>Analysis panel</div>}
        overview={<div>Overview content</div>}
        contributors={<div>Contributors coming soon</div>}
        activity={<div>Activity coming soon</div>}
        responsiveness={<div>Responsiveness coming soon</div>}
        documentation={<div>Documentation coming soon</div>}
        security={<div>Security coming soon</div>}
        recommendations={<div>Recommendations coming soon</div>}
        comparison={<div>Comparison coming soon</div>}
      />,
    )

    const matches = screen.getAllByText(/oss health score/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('supports a custom tab set for alternate workflows like org inventory', () => {
    render(
      <ResultsShell
        analysisPanel={<div>Analysis panel</div>}
        tabs={[{ id: 'overview', label: 'Organization', status: 'implemented', description: 'Org inventory' }]}
        overview={<div>Organization content</div>}
        contributors={<div>Contributors coming soon</div>}
        activity={<div>Activity coming soon</div>}
        responsiveness={<div>Responsiveness coming soon</div>}
        documentation={<div>Documentation coming soon</div>}
        security={<div>Security coming soon</div>}
        recommendations={<div>Recommendations coming soon</div>}
        comparison={<div>Comparison coming soon</div>}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Organization' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('tab', { name: 'Contributors' })).not.toBeInTheDocument()
    expect(screen.getByText('Organization content')).toBeInTheDocument()
  })

  it('resets the active tab when the available tab set changes', async () => {
    const { rerender } = render(
      <ResultsShell
        analysisPanel={<div>Analysis panel</div>}
        overview={<div>Overview content</div>}
        contributors={<div>Contributors content</div>}
        activity={<div>Activity content</div>}
        responsiveness={<div>Responsiveness content</div>}
        documentation={<div>Documentation content</div>}
        security={<div>Security content</div>}
        recommendations={<div>Recommendations content</div>}
        comparison={<div>Comparison content</div>}
      />,
    )

    // Comparison is in the overflow menu
    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    await userEvent.click(screen.getByRole('tab', { name: 'Comparison' }))
    expect(screen.getByText('Comparison content')).toBeInTheDocument()

    rerender(
      <ResultsShell
        analysisPanel={<div>Analysis panel</div>}
        tabs={[{ id: 'overview', label: 'Overview', status: 'implemented', description: 'Org inventory' }]}
        overview={<div>Organization content</div>}
        contributors={<div>Contributors content</div>}
        activity={<div>Activity content</div>}
        responsiveness={<div>Responsiveness content</div>}
        documentation={<div>Documentation content</div>}
        security={<div>Security content</div>}
        recommendations={<div>Recommendations content</div>}
        comparison={<div>Comparison content</div>}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Organization content')).toBeInTheDocument()
    // Comparison content is in the DOM but hidden (parent has display: none)
    expect(screen.getByText('Comparison content').closest('[data-tab-content="comparison"]')).toHaveStyle('display: none')
  })

  it('supports opening on an initial active tab', async () => {
    render(
      <ResultsShell
        initialActiveTab="comparison"
        analysisPanel={<div>Analysis panel</div>}
        overview={<div>Overview content</div>}
        contributors={<div>Contributors content</div>}
        activity={<div>Activity content</div>}
        responsiveness={<div>Responsiveness content</div>}
        documentation={<div>Documentation content</div>}
        security={<div>Security content</div>}
        recommendations={<div>Recommendations content</div>}
        comparison={<div>Comparison content</div>}
      />,
    )

    // Comparison is in the overflow — button shows "Comparison" when active
    await userEvent.click(screen.getByRole('button', { name: /Comparison/ }))
    expect(screen.getByRole('tab', { name: 'Comparison' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Comparison content')).toBeInTheDocument()
  })

  it('renders a governance tab body when the governance tab is provided (#303)', async () => {
    render(
      <ResultsShell
        analysisPanel={<div>Analysis panel</div>}
        tabs={[
          { id: 'overview', label: 'Overview', status: 'implemented', description: 'Org inventory' },
          { id: 'documentation', label: 'Documentation', status: 'implemented', description: 'Org docs' },
          { id: 'governance', label: 'Governance', status: 'implemented', description: 'Org-level hygiene and policy' },
          { id: 'security', label: 'Security', status: 'implemented', description: 'Org security' },
        ]}
        overview={<div>Org overview</div>}
        contributors={null}
        activity={null}
        responsiveness={null}
        documentation={<div>Org documentation</div>}
        governance={<div>Org governance content</div>}
        security={<div>Org security</div>}
        recommendations={null}
        comparison={null}
      />,
    )

    await userEvent.click(screen.getByRole('tab', { name: 'Governance' }))
    expect(screen.getByText('Org governance content')).toBeInTheDocument()
    expect(screen.getByText('Org governance content').closest('[data-tab-content="governance"]')).not.toHaveStyle('display: none')
  })
})
