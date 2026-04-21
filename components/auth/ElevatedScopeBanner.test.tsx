import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from './AuthContext'
import { ElevatedScopeBanner } from './ElevatedScopeBanner'

describe('ElevatedScopeBanner', () => {
  it('renders nothing when there is no session', () => {
    render(
      <AuthProvider>
        <ElevatedScopeBanner />
      </AuthProvider>,
    )
    expect(screen.queryByTestId('elevated-scope-banner')).not.toBeInTheDocument()
  })

  it('renders nothing when session has no elevated scopes (baseline: no scope)', () => {
    render(
      <AuthProvider
        initialSession={{ token: 'gho_abc', username: 'arun-gupta', scopes: [] }}
      >
        <ElevatedScopeBanner />
      </AuthProvider>,
    )
    expect(screen.queryByTestId('elevated-scope-banner')).not.toBeInTheDocument()
  })

  it('renders and enumerates scopes verbatim when session carries an elevated scope', () => {
    render(
      <AuthProvider
        initialSession={{
          token: 'gho_abc',
          username: 'arun-gupta',
          scopes: ['public_repo', 'read:org'],
        }}
      >
        <ElevatedScopeBanner />
      </AuthProvider>,
    )
    expect(screen.getByTestId('elevated-scope-banner')).toBeInTheDocument()
    expect(screen.getByTestId('elevated-scope-banner-scopes')).toHaveTextContent('read:org')
  })

  it('enumerates all non-baseline scopes, not just the first', () => {
    render(
      <AuthProvider
        initialSession={{
          token: 'gho_abc',
          username: 'arun-gupta',
          scopes: ['public_repo', 'read:org', 'admin:org'],
        }}
      >
        <ElevatedScopeBanner />
      </AuthProvider>,
    )
    expect(screen.getByTestId('elevated-scope-banner-scopes')).toHaveTextContent('read:org, admin:org')
  })

  it('hides the banner when the dismiss button is clicked', async () => {
    render(
      <AuthProvider
        initialSession={{
          token: 'gho_abc',
          username: 'arun-gupta',
          scopes: ['public_repo', 'read:org'],
        }}
      >
        <ElevatedScopeBanner />
      </AuthProvider>,
    )
    expect(screen.getByTestId('elevated-scope-banner')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /dismiss elevated permissions banner/i }))
    expect(screen.queryByTestId('elevated-scope-banner')).not.toBeInTheDocument()
  })

  it('clears the session when "Sign out to revert" is clicked', async () => {
    render(
      <AuthProvider
        initialSession={{
          token: 'gho_abc',
          username: 'arun-gupta',
          scopes: ['public_repo', 'read:org'],
        }}
      >
        <ElevatedScopeBanner />
      </AuthProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: /sign out to revert/i }))
    expect(screen.queryByTestId('elevated-scope-banner')).not.toBeInTheDocument()
  })

  it('shows "Personal Access Token active" heading for PAT sessions', () => {
    render(
      <AuthProvider
        initialSession={{
          token: 'ghp_abc',
          username: 'arun-gupta',
          scopes: ['read:org'],
          isPAT: true,
        }}
      >
        <ElevatedScopeBanner />
      </AuthProvider>,
    )
    expect(screen.getByTestId('elevated-scope-banner')).toBeInTheDocument()
    expect(screen.getByText(/personal access token active/i)).toBeInTheDocument()
  })

  it('shows "Sign out" (not "Sign out to revert") for PAT sessions', () => {
    render(
      <AuthProvider
        initialSession={{
          token: 'ghp_abc',
          username: 'arun-gupta',
          scopes: ['read:org'],
          isPAT: true,
        }}
      >
        <ElevatedScopeBanner />
      </AuthProvider>,
    )
    expect(screen.getByRole('button', { name: /^sign out$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign out to revert/i })).not.toBeInTheDocument()
  })

  it('shows "Sign out to revert" for OAuth elevated sessions', () => {
    render(
      <AuthProvider
        initialSession={{
          token: 'gho_abc',
          username: 'arun-gupta',
          scopes: ['read:org'],
        }}
      >
        <ElevatedScopeBanner />
      </AuthProvider>,
    )
    expect(screen.getByRole('button', { name: /sign out to revert/i })).toBeInTheDocument()
  })
})
