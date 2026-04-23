import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FoundationInputSection } from './FoundationInputSection'

const defaultProps = {
  foundationTarget: 'cncf-sandbox' as const,
  onFoundationTargetChange: vi.fn(),
  inputValue: '',
  onInputChange: vi.fn(),
  error: null,
}

describe('FoundationInputSection — picker', () => {
  it('renders CNCF Sandbox as active (not disabled)', () => {
    render(<FoundationInputSection {...defaultProps} />)
    const sandboxBtn = screen.getByRole('button', { name: /cncf sandbox/i })
    expect(sandboxBtn).not.toBeDisabled()
    expect(sandboxBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders CNCF Incubating as disabled', () => {
    render(<FoundationInputSection {...defaultProps} />)
    const btn = screen.getByRole('button', { name: /cncf incubating/i })
    expect(btn).toBeDisabled()
  })

  it('renders CNCF Graduation as disabled', () => {
    render(<FoundationInputSection {...defaultProps} />)
    const btn = screen.getByRole('button', { name: /cncf graduation/i })
    expect(btn).toBeDisabled()
  })

  it('renders Apache Incubator as disabled', () => {
    render(<FoundationInputSection {...defaultProps} />)
    const btn = screen.getByRole('button', { name: /apache incubator/i })
    expect(btn).toBeDisabled()
  })

  it('does not call onFoundationTargetChange when a disabled option is clicked', async () => {
    const onChange = vi.fn()
    render(<FoundationInputSection {...defaultProps} onFoundationTargetChange={onChange} />)
    const btn = screen.getByRole('button', { name: /cncf incubating/i })
    await userEvent.click(btn)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('calls onFoundationTargetChange when an active option is clicked', async () => {
    const onChange = vi.fn()
    render(<FoundationInputSection {...defaultProps} onFoundationTargetChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /cncf sandbox/i }))
    expect(onChange).toHaveBeenCalledWith('cncf-sandbox')
  })
})

describe('FoundationInputSection — input field', () => {
  it('renders a textarea for the smart input', () => {
    render(<FoundationInputSection {...defaultProps} inputValue="owner/repo" />)
    expect(screen.getByRole('textbox')).toHaveValue('owner/repo')
  })

  it('calls onInputChange when the textarea value changes', async () => {
    const onInputChange = vi.fn()
    render(<FoundationInputSection {...defaultProps} onInputChange={onInputChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'k')
    expect(onInputChange).toHaveBeenCalled()
  })

  it('shows inline error when error prop is set', () => {
    render(<FoundationInputSection {...defaultProps} error="Please enter a valid input." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid input.')
  })

  it('does not render error element when error is null', () => {
    render(<FoundationInputSection {...defaultProps} error={null} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('FoundationInputSection — info tooltip', () => {
  it('renders an info icon button', () => {
    render(<FoundationInputSection {...defaultProps} />)
    expect(screen.getByRole('button', { name: /accepted input formats/i })).toBeInTheDocument()
  })

  it('shows tooltip with repo formats on hover', () => {
    render(<FoundationInputSection {...defaultProps} />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: /accepted input formats/i }))
    expect(screen.getByTestId('format-tooltip')).toHaveTextContent(/owner\/repo/i)
  })

  it('shows tooltip with org format on hover', () => {
    render(<FoundationInputSection {...defaultProps} />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: /accepted input formats/i }))
    expect(screen.getByTestId('format-tooltip')).toHaveTextContent(/org/i)
  })

  it('does NOT mention Projects board in the tooltip', () => {
    render(<FoundationInputSection {...defaultProps} />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: /accepted input formats/i }))
    expect(screen.getByTestId('format-tooltip')).not.toHaveTextContent(/projects board/i)
  })
})

describe('FoundationInputSection — picker tooltips', () => {
  it('renders a tooltip for the CNCF Sandbox picker', () => {
    render(<FoundationInputSection {...defaultProps} />)
    const tooltips = screen.getAllByRole('tooltip')
    const sandboxTooltip = tooltips.find((t) => /cncf sandbox/i.test(t.textContent ?? ''))
    expect(sandboxTooltip).toBeDefined()
  })

  it('CNCF Sandbox tooltip mentions readiness score', () => {
    render(<FoundationInputSection {...defaultProps} />)
    const tooltips = screen.getAllByRole('tooltip')
    const sandboxTooltip = tooltips.find((t) => /cncf sandbox/i.test(t.textContent ?? ''))
    expect(sandboxTooltip?.textContent).toMatch(/score/i)
  })

  it('renders a tooltip for each disabled picker with "coming soon" text', () => {
    render(<FoundationInputSection {...defaultProps} />)
    const tooltips = screen.getAllByRole('tooltip')
    const comingSoon = tooltips.filter((t) => /coming soon/i.test(t.textContent ?? ''))
    expect(comingSoon.length).toBeGreaterThanOrEqual(3)
  })
})
