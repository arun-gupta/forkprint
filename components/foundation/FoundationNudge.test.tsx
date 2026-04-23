import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FoundationNudge } from './FoundationNudge'

describe('FoundationNudge', () => {
  it('renders a callout with the provided label', () => {
    render(
      <FoundationNudge
        label="Check CNCF Sandbox readiness for cncf"
        prefillValue="cncf"
        onActivate={vi.fn()}
      />,
    )
    expect(screen.getByText(/check cncf sandbox readiness for cncf/i)).toBeInTheDocument()
  })

  it('calls onActivate with the prefillValue when clicked', async () => {
    const onActivate = vi.fn()
    render(
      <FoundationNudge
        label="Check foundation readiness"
        prefillValue="facebook/react"
        onActivate={onActivate}
      />,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onActivate).toHaveBeenCalledWith('facebook/react')
  })

  it('calls onActivate exactly once per click', async () => {
    const onActivate = vi.fn()
    render(
      <FoundationNudge
        label="Check foundation readiness"
        prefillValue="owner/repo"
        onActivate={onActivate}
      />,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onActivate).toHaveBeenCalledTimes(1)
  })
})
