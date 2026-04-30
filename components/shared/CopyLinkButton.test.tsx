import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyLinkButton } from './CopyLinkButton'

describe('CopyLinkButton', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost:3000/?mode=repos&repos=facebook%2Freact' },
      writable: true,
    })
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('renders a "Copy link" button', () => {
    render(<CopyLinkButton />)
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument()
  })

  it('copies window.location.href to clipboard on click', async () => {
    render(<CopyLinkButton />)
    await userEvent.click(screen.getByRole('button', { name: /copy link/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'http://localhost:3000/?mode=repos&repos=facebook%2Freact',
    )
  })

  it('shows "Copied!" after successful clipboard write', async () => {
    render(<CopyLinkButton />)
    await userEvent.click(screen.getByRole('button', { name: /copy link/i }))
    expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
  })

  it('stays silent when clipboard API fails', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    render(<CopyLinkButton />)
    await userEvent.click(screen.getByRole('button', { name: /copy link/i }))
    // Button should still be present, no fallback input
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
