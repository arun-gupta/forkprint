import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TokenInput } from './TokenInput'

describe('TokenInput', () => {
  it('renders a password field and scope guidance', () => {
    render(<TokenInput initialValue="" error={null} onChange={vi.fn()} />)

    const input = screen.getByLabelText(/github personal access token/i)
    expect(input).toHaveAttribute('type', 'password')
    expect(screen.getByText(/required scope:/i)).toBeInTheDocument()
    expect(screen.getByText(/public_repo/i)).toBeInTheDocument()
  })

  it('shows the provided initial value', () => {
    render(<TokenInput initialValue="ghp_saved" error={null} onChange={vi.fn()} />)

    expect(screen.getByLabelText(/github personal access token/i)).toHaveValue('ghp_saved')
  })

  it('calls onChange when the token changes', async () => {
    const onChange = vi.fn()
    render(<TokenInput initialValue="" error={null} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_new')

    expect(onChange).toHaveBeenCalled()
  })

  it('renders an inline error when provided', () => {
    render(<TokenInput initialValue="" error="Token required" onChange={vi.fn()} />)

    expect(screen.getByTestId('token-error')).toHaveTextContent('Token required')
  })
})
