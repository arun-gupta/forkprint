import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepoInputClient } from './RepoInputClient'

describe('RepoInputClient', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('pre-populates the token field from localStorage', () => {
    window.localStorage.setItem('forkprint_github_token', 'ghp_saved')

    render(<RepoInputClient hasServerToken={false} />)

    expect(screen.getByLabelText(/github personal access token/i)).toHaveValue('ghp_saved')
  })

  it('persists the token when repo submission succeeds', async () => {
    const onAnalyze = vi.fn()

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_saved')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(window.localStorage.getItem('forkprint_github_token')).toBe('ghp_saved')
    expect(onAnalyze).toHaveBeenCalledWith(['facebook/react'], 'ghp_saved')
  })

  it('blocks submission when no client token is present', async () => {
    const onAnalyze = vi.fn()

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(screen.getByTestId('token-error')).toHaveTextContent(/token is required/i)
    expect(onAnalyze).not.toHaveBeenCalled()
  })

  it('treats whitespace-only tokens as empty and clears the error after correction', async () => {
    const onAnalyze = vi.fn()

    render(<RepoInputClient hasServerToken={false} onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByLabelText(/github personal access token/i), '   ')
    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(screen.getByTestId('token-error')).toBeInTheDocument()
    expect(onAnalyze).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByLabelText(/github personal access token/i))
    await userEvent.type(screen.getByLabelText(/github personal access token/i), 'ghp_fixed')

    expect(screen.queryByTestId('token-error')).not.toBeInTheDocument()
  })

  it('hides the token field when a server token is configured', () => {
    render(<RepoInputClient hasServerToken />)

    expect(screen.queryByLabelText(/github personal access token/i)).not.toBeInTheDocument()
  })

  it('allows submission without a client token when a server token is configured', async () => {
    const onAnalyze = vi.fn()

    render(<RepoInputClient hasServerToken onAnalyze={onAnalyze} />)

    await userEvent.type(screen.getByRole('textbox', { name: /repository list/i }), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))

    expect(screen.queryByTestId('token-error')).not.toBeInTheDocument()
    expect(onAnalyze).toHaveBeenCalledWith(['facebook/react'], null)
  })
})
