import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from './AuthContext'
import { UserBadge } from './UserBadge'

describe('UserBadge', () => {
  it('displays the signed-in username', () => {
    render(
      <AuthProvider initialSession={{ token: 'gho_abc', username: 'arun-gupta' }}>
        <UserBadge />
      </AuthProvider>,
    )
    expect(screen.getByText('arun-gupta')).toBeInTheDocument()
  })

  it('renders a sign-out button', () => {
    render(
      <AuthProvider initialSession={{ token: 'gho_abc', username: 'arun-gupta' }}>
        <UserBadge />
      </AuthProvider>,
    )
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('calls signOut when sign-out button is clicked', async () => {
    const signOut = vi.fn()
    render(
      <AuthProvider initialSession={{ token: 'gho_abc', username: 'arun-gupta' }}>
        <UserBadge onSignOut={signOut} />
      </AuthProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(signOut).toHaveBeenCalled()
  })

  it('does not render an elevated-scope chip on a baseline session', () => {
    render(
      <AuthProvider
        initialSession={{ token: 'gho_abc', username: 'arun-gupta', scopes: ['public_repo'] }}
      >
        <UserBadge />
      </AuthProvider>,
    )
    expect(screen.queryByTestId('elevated-scope-chip')).not.toBeInTheDocument()
  })

  it('renders an elevated-scope chip enumerating non-baseline scopes in its hover tooltip', () => {
    render(
      <AuthProvider
        initialSession={{
          token: 'gho_abc',
          username: 'arun-gupta',
          scopes: ['public_repo', 'read:org'],
        }}
      >
        <UserBadge />
      </AuthProvider>,
    )
    const chip = screen.getByTestId('elevated-scope-chip')
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveAttribute('title', expect.stringContaining('read:org'))
    expect(chip).toHaveAttribute('aria-label', expect.stringContaining('read:org'))
  })
})
