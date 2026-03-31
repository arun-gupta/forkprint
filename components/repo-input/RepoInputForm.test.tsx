import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepoInputForm } from './RepoInputForm'

describe('RepoInputForm — US1 (valid input)', () => {
  it('renders a textarea and submit button', () => {
    render(<RepoInputForm onSubmit={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument()
  })

  it('calls onSubmit with parsed slugs on valid input', async () => {
    const onSubmit = vi.fn()
    render(<RepoInputForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox'), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(onSubmit).toHaveBeenCalledWith(['facebook/react'])
  })

  it('does not call onSubmit when textarea is empty', async () => {
    const onSubmit = vi.fn()
    render(<RepoInputForm onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('RepoInputForm — US2 (invalid input)', () => {
  it('shows inline error on empty submission', async () => {
    render(<RepoInputForm onSubmit={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows inline error for malformed slug', async () => {
    render(<RepoInputForm onSubmit={vi.fn()} />)
    await userEvent.type(screen.getByRole('textbox'), 'notaslug')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('clears error on subsequent valid submission', async () => {
    render(<RepoInputForm onSubmit={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox'), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
