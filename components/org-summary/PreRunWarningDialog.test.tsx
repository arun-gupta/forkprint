import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ORG_AGGREGATION_CONFIG } from '@/lib/config/org-aggregation'
import { PreRunWarningDialog } from './PreRunWarningDialog'

describe('PreRunWarningDialog', () => {
  const defaultProps = {
    repoCount: 30,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  it('renders a dialog with role and aria-label', () => {
    render(<PreRunWarningDialog {...defaultProps} />)
    expect(screen.getByRole('dialog', { name: /pre-run warning/i })).toBeInTheDocument()
  })

  it('displays the repo count in the heading', () => {
    render(<PreRunWarningDialog {...defaultProps} repoCount={64} />)
    expect(screen.getByText(/Analyze 64 repositories/i)).toBeInTheDocument()
  })

  it('shows estimated time', () => {
    render(<PreRunWarningDialog {...defaultProps} repoCount={30} />)
    expect(screen.getByText(/Estimated time:/i)).toBeInTheDocument()
  })

  it('warns about keeping the tab open', () => {
    render(<PreRunWarningDialog {...defaultProps} />)
    expect(screen.getByText(/keep this browser tab open/i)).toBeInTheDocument()
  })

  it('has a concurrency input defaulting to config default', () => {
    render(<PreRunWarningDialog {...defaultProps} />)
    const input = screen.getByLabelText(/concurrency/i) as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(Number(input.value)).toBe(ORG_AGGREGATION_CONFIG.concurrency.default)
  })

  it('clamps concurrency to 1-10 range', () => {
    render(<PreRunWarningDialog {...defaultProps} />)
    const input = screen.getByLabelText(/concurrency/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: '15' } })
    expect(Number(input.value)).toBe(ORG_AGGREGATION_CONFIG.concurrency.max)
    fireEvent.change(input, { target: { value: '0' } })
    expect(Number(input.value)).toBe(ORG_AGGREGATION_CONFIG.concurrency.min)
  })

  it('has a notification opt-in toggle defaulting to off', () => {
    render(<PreRunWarningDialog {...defaultProps} />)
    const checkbox = screen.getByLabelText(/completion notification/i) as HTMLInputElement
    expect(checkbox.checked).toBe(false)
  })

  it('calls onConfirm with concurrency and notificationOptIn on confirm click', () => {
    const onConfirm = vi.fn()
    render(<PreRunWarningDialog {...defaultProps} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByLabelText(/completion notification/i))
    fireEvent.click(screen.getByText(/Start analysis/i))
    expect(onConfirm).toHaveBeenCalledWith({
      concurrency: ORG_AGGREGATION_CONFIG.concurrency.default,
      notificationOptIn: true,
    })
  })

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = vi.fn()
    render(<PreRunWarningDialog {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
