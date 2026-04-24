import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '@/lib/analyzer/analysis-result'
import { buildResult as _buildResult } from '@/lib/testing/fixtures'
import { ComparisonView } from './ComparisonView'

describe('ComparisonView', () => {
  it('renders the comparison controls and grouped sections', () => {
    render(<ComparisonView results={[buildResult('facebook/react'), buildResult('nvidia/topograph')]} />)

    expect(screen.getByRole('region', { name: /comparison view/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/anchor repo/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Activity' })).toBeInTheDocument()
  })

  it('renders unavailable comparison cells as a muted em dash', () => {
    const { container } = render(
      <ComparisonView results={[buildResult('facebook/react', { totalContributors: 'unavailable' }), buildResult('nvidia/topograph')]} />,
    )

    const mutedDashCells = Array.from(container.querySelectorAll('p')).filter(
      (p) => p.textContent?.trim() === '—' && p.className.includes('text-slate-400'),
    )
    expect(mutedDashCells.length).toBeGreaterThan(0)
  })

  it('lets the user toggle the median column', async () => {
    render(<ComparisonView results={[buildResult('facebook/react'), buildResult('nvidia/topograph')]} />)

    expect(screen.getAllByRole('button', { name: /^median$/i }).length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('checkbox', { name: /show median column/i }))
    expect(screen.queryAllByRole('button', { name: /^median$/i })).toHaveLength(0)
  })

  it('lets the user disable a section', async () => {
    render(<ComparisonView results={[buildResult('facebook/react'), buildResult('nvidia/topograph')]} />)

    await userEvent.click(screen.getByRole('button', { name: /sections & attributes/i }))
    await userEvent.click(screen.getAllByRole('checkbox', { name: 'Activity' })[0]!)
    expect(screen.queryByRole('heading', { name: 'Activity' })).not.toBeInTheDocument()
  })

  describe('participants picker', () => {
    it('does not render when only 4 repos are analyzed', () => {
      render(
        <ComparisonView
          results={[
            buildResult('one/repo'),
            buildResult('two/repo'),
            buildResult('three/repo'),
            buildResult('four/repo'),
          ]}
        />,
      )

      expect(screen.queryByRole('group', { name: /comparison participants/i })).not.toBeInTheDocument()
    })

    it('renders when 5+ repos are analyzed, defaulting to the first four checked', () => {
      render(
        <ComparisonView
          results={[
            buildResult('one/repo'),
            buildResult('two/repo'),
            buildResult('three/repo'),
            buildResult('four/repo'),
            buildResult('five/repo'),
            buildResult('six/repo'),
          ]}
        />,
      )

      expect(screen.getByRole('group', { name: /comparison participants/i })).toBeInTheDocument()
      expect(screen.getByLabelText('Include one/repo in comparison')).toBeChecked()
      expect(screen.getByLabelText('Include four/repo in comparison')).toBeChecked()
      expect(screen.getByLabelText('Include five/repo in comparison')).not.toBeChecked()
      expect(screen.getByLabelText('Include six/repo in comparison')).not.toBeChecked()
    })

    it('disables unchecked boxes when four participants are already selected', () => {
      render(
        <ComparisonView
          results={[
            buildResult('one/repo'),
            buildResult('two/repo'),
            buildResult('three/repo'),
            buildResult('four/repo'),
            buildResult('five/repo'),
          ]}
        />,
      )

      const five = screen.getByLabelText('Include five/repo in comparison')
      expect(five).not.toBeChecked()
      expect(five).toBeDisabled()
    })

    it('swaps a participant in by unchecking a current one and checking a new one', async () => {
      render(
        <ComparisonView
          results={[
            buildResult('one/repo'),
            buildResult('two/repo'),
            buildResult('three/repo'),
            buildResult('four/repo'),
            buildResult('five/repo'),
          ]}
        />,
      )

      await userEvent.click(screen.getByLabelText('Include four/repo in comparison'))
      await userEvent.click(screen.getByLabelText('Include five/repo in comparison'))

      expect(screen.getByLabelText('Include four/repo in comparison')).not.toBeChecked()
      expect(screen.getByLabelText('Include five/repo in comparison')).toBeChecked()
      expect(screen.queryByRole('button', { name: /sort by four\/repo/i })).not.toBeInTheDocument()
    })

    it('tops up participants to four when new repos are analyzed after mount', () => {
      const twoResults = [buildResult('one/repo'), buildResult('two/repo')]
      const { rerender } = render(<ComparisonView results={twoResults} />)

      // With 2 results, picker is not shown.
      expect(screen.queryByRole('group', { name: /comparison participants/i })).not.toBeInTheDocument()

      // Grow results to 8. Participants should top up to the first four.
      rerender(
        <ComparisonView
          results={[
            buildResult('one/repo'),
            buildResult('two/repo'),
            buildResult('three/repo'),
            buildResult('four/repo'),
            buildResult('five/repo'),
            buildResult('six/repo'),
            buildResult('seven/repo'),
            buildResult('eight/repo'),
          ]}
        />,
      )

      expect(screen.getByText(/4\/4/)).toBeInTheDocument()
      expect(screen.getByLabelText('Include one/repo in comparison')).toBeChecked()
      expect(screen.getByLabelText('Include two/repo in comparison')).toBeChecked()
      expect(screen.getByLabelText('Include three/repo in comparison')).toBeChecked()
      expect(screen.getByLabelText('Include four/repo in comparison')).toBeChecked()
      expect(screen.getByLabelText('Include five/repo in comparison')).not.toBeChecked()
    })

    it('prevents dropping below two participants', async () => {
      render(
        <ComparisonView
          results={[
            buildResult('one/repo'),
            buildResult('two/repo'),
            buildResult('three/repo'),
            buildResult('four/repo'),
            buildResult('five/repo'),
          ]}
        />,
      )

      await userEvent.click(screen.getByLabelText('Include three/repo in comparison'))
      await userEvent.click(screen.getByLabelText('Include four/repo in comparison'))

      expect(screen.getByLabelText('Include one/repo in comparison')).toBeDisabled()
      expect(screen.getByLabelText('Include two/repo in comparison')).toBeDisabled()
    })
  })
})

function buildResult(repo: string, overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return _buildResult({ repo, ...overrides })
}
