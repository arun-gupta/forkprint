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
})
