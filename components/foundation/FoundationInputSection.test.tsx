import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
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

  it('mentions Projects board in the tooltip', () => {
    render(<FoundationInputSection {...defaultProps} />)
    fireEvent.mouseEnter(screen.getByRole('button', { name: /accepted input formats/i }))
    expect(screen.getByTestId('format-tooltip')).toHaveTextContent(/projects board/i)
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

describe('FoundationInputSection — board URL button', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('clicking the board URL button calls onInputChange with the board URL', () => {
    const onInputChange = vi.fn()
    render(<FoundationInputSection {...defaultProps} onInputChange={onInputChange} />)
    fireEvent.click(screen.getByRole('button', { name: /use this board url/i }))
    expect(onInputChange).toHaveBeenCalledWith('https://github.com/orgs/cncf/projects/14')
  })

  it('shows "Used" feedback immediately after clicking the board URL button', () => {
    render(<FoundationInputSection {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /use this board url/i }))
    expect(screen.getByText('Used')).toBeInTheDocument()
  })

  it('resets "Used" feedback after 1.5 seconds', () => {
    render(<FoundationInputSection {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /use this board url/i }))
    expect(screen.getByText('Used')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(1500)
    })
    expect(screen.queryByText('Used')).not.toBeInTheDocument()
  })

  it('resets the timer when the button is clicked multiple times in quick succession', () => {
    render(<FoundationInputSection {...defaultProps} />)
    const btn = screen.getByRole('button', { name: /use this board url/i })

    // t=0: first click
    fireEvent.click(btn)
    // t=800ms: halfway through the 1500ms timeout — click again to reset
    act(() => { vi.advanceTimersByTime(800) })
    fireEvent.click(btn)
    // t=1600ms (800ms after second click): original timeout would have fired but second click cancelled it
    act(() => { vi.advanceTimersByTime(800) })
    expect(screen.getByText('Used')).toBeInTheDocument()
    // t=2300ms (1500ms after second click): new timeout fires and resets the label
    act(() => { vi.advanceTimersByTime(700) })
    expect(screen.queryByText('Used')).not.toBeInTheDocument()
  })
})

describe('FoundationInputSection — verify repos checkbox', () => {
  it('renders the verify repos checkbox', () => {
    render(<FoundationInputSection {...defaultProps} />)
    expect(screen.getByRole('checkbox', { name: /verify repos before analyzing/i })).toBeInTheDocument()
  })

  it('checkbox is unchecked by default', () => {
    render(<FoundationInputSection {...defaultProps} />)
    expect(screen.getByRole('checkbox', { name: /verify repos before analyzing/i })).not.toBeChecked()
  })

  it('checkbox is disabled when no onVerifyReposChange handler is provided', () => {
    render(<FoundationInputSection {...defaultProps} />)
    expect(screen.getByRole('checkbox', { name: /verify repos before analyzing/i })).toBeDisabled()
  })

  it('checkbox is enabled when onVerifyReposChange handler is provided', () => {
    render(<FoundationInputSection {...defaultProps} onVerifyReposChange={vi.fn()} />)
    expect(screen.getByRole('checkbox', { name: /verify repos before analyzing/i })).toBeEnabled()
  })

  it('calls onVerifyReposChange when the checkbox is toggled', async () => {
    const onVerifyReposChange = vi.fn()
    render(<FoundationInputSection {...defaultProps} onVerifyReposChange={onVerifyReposChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: /verify repos before analyzing/i }))
    expect(onVerifyReposChange).toHaveBeenCalledWith(true)
  })
})
