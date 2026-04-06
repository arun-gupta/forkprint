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
        healthRatios={<div>Health ratios coming soon</div>}
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
        healthRatios={<div>Health ratios coming soon</div>}
        comparison={<div>Comparison coming soon</div>}
      />,
    )

    const link = screen.getByRole('link', { name: /github repository/i })
    expect(link).toHaveAttribute('href', 'https://github.com/arun-gupta/forkprint')
  })

  it('describes both repository and organization workflows in the header', () => {
    render(
      <ResultsShell
        analysisPanel={<div>Analysis panel</div>}
        overview={<div>Overview content</div>}
        contributors={<div>Contributors coming soon</div>}
        activity={<div>Activity coming soon</div>}
        responsiveness={<div>Responsiveness coming soon</div>}
        healthRatios={<div>Health ratios coming soon</div>}
        comparison={<div>Comparison coming soon</div>}
      />,
    )

    expect(
      screen.getByText(
        /chaoss-aligned github health analyzer for repository analysis and organization inventory browsing/i,
      ),
    ).toBeInTheDocument()
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
        healthRatios={<div>Health ratios coming soon</div>}
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
        healthRatios={<div>Health ratios content</div>}
        comparison={<div>Comparison content</div>}
      />,
    )

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
        healthRatios={<div>Health ratios content</div>}
        comparison={<div>Comparison content</div>}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Organization content')).toBeInTheDocument()
    expect(screen.queryByText('Comparison content')).not.toBeInTheDocument()
  })
})
