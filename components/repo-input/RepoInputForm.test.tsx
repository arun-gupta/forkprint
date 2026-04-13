import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepoInputForm } from './RepoInputForm'

describe('RepoInputForm — US1 (valid input)', () => {
  it('renders a textarea and submit button', () => {
    render(<RepoInputForm onSubmitRepos={vi.fn()} onSubmitOrg={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument()
  })

  it('shows seeded examples for the accepted repository input styles', () => {
    render(<RepoInputForm onSubmitRepos={vi.fn()} onSubmitOrg={vi.fn()} />)

    expect(screen.getByRole('textbox')).toHaveAttribute(
      'placeholder',
      'facebook/react ollama/ollama\ngithub.com/kubernetes/kubernetes\nhttps://github.com/pytorch/pytorch',
    )
  })

  it('calls onSubmit with parsed slugs on valid input', async () => {
    const onSubmit = vi.fn()
    render(<RepoInputForm onSubmitRepos={onSubmit} onSubmitOrg={vi.fn()} />)
    await userEvent.type(screen.getByRole('textbox'), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(onSubmit).toHaveBeenCalledWith(['facebook/react'])
  })

  it('does not call onSubmit when textarea is empty', async () => {
    const onSubmit = vi.fn()
    render(<RepoInputForm onSubmitRepos={onSubmit} onSubmitOrg={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows the Analyze button with a descriptive title', () => {
    render(<RepoInputForm onSubmitRepos={vi.fn()} onSubmitOrg={vi.fn()} />)

    expect(screen.getByRole('button', { name: /^analyze$/i })).toHaveAttribute('title', expect.stringContaining('health dashboard'))
  })
})

describe('RepoInputForm — format tooltip', () => {
  it('renders an info button for accepted formats', () => {
    render(<RepoInputForm onSubmitRepos={vi.fn()} onSubmitOrg={vi.fn()} />)
    expect(screen.getByRole('button', { name: /accepted input formats/i })).toBeInTheDocument()
  })

  it('shows tooltip on hover with accepted formats', async () => {
    render(<RepoInputForm onSubmitRepos={vi.fn()} onSubmitOrg={vi.fn()} />)
    const infoBtn = screen.getByRole('button', { name: /accepted input formats/i })
    await userEvent.hover(infoBtn)
    const tooltip = screen.getByTestId('format-tooltip')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveTextContent('owner/repo')
    expect(tooltip).toHaveTextContent('https://github.com/owner/repo')
    expect(tooltip).toHaveTextContent('.git')
  })

  it('hides tooltip on unhover', async () => {
    render(<RepoInputForm onSubmitRepos={vi.fn()} onSubmitOrg={vi.fn()} />)
    const infoBtn = screen.getByRole('button', { name: /accepted input formats/i })
    await userEvent.hover(infoBtn)
    expect(screen.getByTestId('format-tooltip')).toBeInTheDocument()
    await userEvent.unhover(infoBtn)
    expect(screen.queryByTestId('format-tooltip')).not.toBeInTheDocument()
  })

  it('closes tooltip when clicking outside', async () => {
    render(<RepoInputForm onSubmitRepos={vi.fn()} onSubmitOrg={vi.fn()} />)
    const infoBtn = screen.getByRole('button', { name: /accepted input formats/i })
    await userEvent.hover(infoBtn)
    expect(screen.getByTestId('format-tooltip')).toBeInTheDocument()
    await userEvent.click(document.body)
    expect(screen.queryByTestId('format-tooltip')).not.toBeInTheDocument()
  })

  it('does not show tooltip in organization mode', async () => {
    render(<RepoInputForm onSubmitRepos={vi.fn()} onSubmitOrg={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /organization/i }))
    expect(screen.queryByRole('button', { name: /accepted input formats/i })).not.toBeInTheDocument()
  })
})

describe('RepoInputForm — US2 (invalid input)', () => {
  it('shows inline error on empty submission', async () => {
    render(<RepoInputForm onSubmitRepos={vi.fn()} onSubmitOrg={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(screen.getByTestId('repo-error')).toBeInTheDocument()
  })

  it('shows inline error for malformed slug', async () => {
    render(<RepoInputForm onSubmitRepos={vi.fn()} onSubmitOrg={vi.fn()} />)
    await userEvent.type(screen.getByRole('textbox'), 'notaslug')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(screen.getByTestId('repo-error')).toBeInTheDocument()
  })

  it('clears error on subsequent valid submission', async () => {
    render(<RepoInputForm onSubmitRepos={vi.fn()} onSubmitOrg={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(screen.getByTestId('repo-error')).toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox'), 'facebook/react')
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }))
    expect(screen.queryByTestId('repo-error')).not.toBeInTheDocument()
  })
})
