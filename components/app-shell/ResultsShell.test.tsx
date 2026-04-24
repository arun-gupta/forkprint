import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ResultsShell } from './ResultsShell'

const BASE_SLOTS = {
  overview: <div>Overview content</div>,
  contributors: <div>Contributors coming soon</div>,
  activity: <div>Activity coming soon</div>,
  responsiveness: <div>Responsiveness coming soon</div>,
  documentation: <div>Documentation coming soon</div>,
  security: <div>Security coming soon</div>,
  recommendations: <div>Recommendations coming soon</div>,
  comparison: <div>Comparison coming soon</div>,
}

describe('ResultsShell', () => {
  it('keeps the analysis panel visible while switching tabs', async () => {
    render(
      <ResultsShell
        analysisPanel={<div>Analysis panel</div>}
        slots={BASE_SLOTS}
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
        slots={BASE_SLOTS}
      />,
    )

    const link = screen.getByRole('link', { name: /github repository/i })
    expect(link).toHaveAttribute('href', 'https://github.com/arun-gupta/repo-pulse')
  })

  it('describes both repository and organization workflows in the header', () => {
    render(
      <ResultsShell
        analysisPanel={<div>Analysis panel</div>}
        slots={BASE_SLOTS}
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
        slots={{ ...BASE_SLOTS, overview: <div>Organization content</div> }}
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
        slots={BASE_SLOTS}
      />,
    )

    // Comparison is in the overflow menu
    await userEvent.click(screen.getByRole('button', { name: /More/ }))
    await userEvent.click(screen.getByRole('tab', { name: 'Comparison' }))
    expect(screen.getByText('Comparison coming soon')).toBeInTheDocument()

    rerender(
      <ResultsShell
        analysisPanel={<div>Analysis panel</div>}
        tabs={[{ id: 'overview', label: 'Overview', status: 'implemented', description: 'Org inventory' }]}
        slots={{ ...BASE_SLOTS, overview: <div>Organization content</div> }}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Organization content')).toBeInTheDocument()
    // Comparison content is in the DOM but hidden (parent has display: none)
    expect(screen.getByText('Comparison coming soon').closest('[data-tab-content="comparison"]')).toHaveStyle('display: none')
  })

  it('supports opening on an initial active tab', async () => {
    render(
      <ResultsShell
        initialActiveTab="comparison"
        analysisPanel={<div>Analysis panel</div>}
        slots={BASE_SLOTS}
      />,
    )

    // Comparison is in the overflow — button shows "Comparison" when active
    await userEvent.click(screen.getByRole('button', { name: /Comparison/ }))
    expect(screen.getByRole('tab', { name: 'Comparison' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Comparison coming soon')).toBeInTheDocument()
  })

  it('renders a governance tab body when the governance slot is provided (#303)', async () => {
    render(
      <ResultsShell
        analysisPanel={<div>Analysis panel</div>}
        tabs={[
          { id: 'overview', label: 'Overview', status: 'implemented', description: 'Org inventory' },
          { id: 'documentation', label: 'Documentation', status: 'implemented', description: 'Org docs' },
          { id: 'governance', label: 'Governance', status: 'implemented', description: 'Org-level hygiene and policy' },
          { id: 'security', label: 'Security', status: 'implemented', description: 'Org security' },
        ]}
        slots={{
          overview: <div>Org overview</div>,
          documentation: <div>Org documentation</div>,
          governance: <div>Org governance content</div>,
          security: <div>Org security</div>,
        }}
      />,
    )

    await userEvent.click(screen.getByRole('tab', { name: 'Governance' }))
    expect(screen.getByText('Org governance content')).toBeInTheDocument()
    expect(screen.getByText('Org governance content').closest('[data-tab-content="governance"]')).not.toHaveStyle('display: none')
  })

  it('renders a slot in its matching tab container', async () => {
    render(
      <ResultsShell
        analysisPanel={<div>Analysis panel</div>}
        slots={{ ...BASE_SLOTS, security: <div>Security tab body</div> }}
      />,
    )

    await userEvent.click(screen.getByRole('tab', { name: 'Security' }))
    const container = screen.getByText('Security tab body').closest('[data-tab-content="security"]')
    expect(container).not.toHaveStyle('display: none')
  })
})
