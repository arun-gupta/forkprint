import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthContext'

function TestConsumer() {
  const { session, signOut, hasScope, elevatedScopes, bannerDismissed, dismissBanner } = useAuth()
  return (
    <div>
      <p data-testid="username">{session?.username ?? 'none'}</p>
      <p data-testid="token">{session?.token ?? 'none'}</p>
      <p data-testid="scopes">{(session?.scopes ?? []).join(',') || 'none'}</p>
      <p data-testid="hasReadOrg">{String(hasScope('read:org'))}</p>
      <p data-testid="hasPublicRepo">{String(hasScope('public_repo'))}</p>
      <p data-testid="elevatedScopes">{elevatedScopes.join(',') || 'none'}</p>
      <p data-testid="bannerDismissed">{String(bannerDismissed)}</p>
      <button onClick={signOut}>Sign out</button>
      <button onClick={dismissBanner}>Dismiss banner</button>
    </div>
  )
}

describe('AuthContext', () => {
  it('starts with no session', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('username')).toHaveTextContent('none')
    expect(screen.getByTestId('token')).toHaveTextContent('none')
  })

  it('provides session when initialSession is supplied', () => {
    render(
      <AuthProvider initialSession={{ token: 'gho_abc', username: 'arun-gupta' }}>
        <TestConsumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('username')).toHaveTextContent('arun-gupta')
    expect(screen.getByTestId('token')).toHaveTextContent('gho_abc')
  })

  it('signOut clears the session', async () => {
    render(
      <AuthProvider initialSession={{ token: 'gho_abc', username: 'arun-gupta' }}>
        <TestConsumer />
      </AuthProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(screen.getByTestId('username')).toHaveTextContent('none')
    expect(screen.getByTestId('token')).toHaveTextContent('none')
  })

  it('defaults scopes to [] when none are supplied', () => {
    render(
      <AuthProvider initialSession={{ token: 'gho_abc', username: 'arun-gupta' }}>
        <TestConsumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('scopes')).toHaveTextContent('none')
    expect(screen.getByTestId('hasPublicRepo')).toHaveTextContent('false')
    expect(screen.getByTestId('hasReadOrg')).toHaveTextContent('false')
  })

  it('stores scopes supplied at sign-in and exposes them via hasScope()', () => {
    render(
      <AuthProvider
        initialSession={{
          token: 'gho_abc',
          username: 'arun-gupta',
          scopes: ['public_repo', 'read:org'],
        }}
      >
        <TestConsumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('scopes')).toHaveTextContent('public_repo,read:org')
    expect(screen.getByTestId('hasReadOrg')).toHaveTextContent('true')
    expect(screen.getByTestId('hasPublicRepo')).toHaveTextContent('true')
  })

  it('hasScope returns false when there is no session', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('hasReadOrg')).toHaveTextContent('false')
    expect(screen.getByTestId('hasPublicRepo')).toHaveTextContent('false')
  })

  it('elevatedScopes is empty on a baseline session (no scope)', () => {
    render(
      <AuthProvider
        initialSession={{ token: 'gho_abc', username: 'arun-gupta', scopes: [] }}
      >
        <TestConsumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('elevatedScopes')).toHaveTextContent('none')
  })

  it('elevatedScopes lists only known elevated scopes (read:org, admin:org), not public_repo', () => {
    render(
      <AuthProvider
        initialSession={{
          token: 'gho_abc',
          username: 'arun-gupta',
          scopes: ['public_repo', 'read:org', 'admin:org'],
        }}
      >
        <TestConsumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('elevatedScopes')).toHaveTextContent('read:org,admin:org')
  })

  it('dismissBanner flips bannerDismissed; signOut resets it', async () => {
    render(
      <AuthProvider
        initialSession={{
          token: 'gho_abc',
          username: 'arun-gupta',
          scopes: ['public_repo', 'read:org'],
        }}
      >
        <TestConsumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('bannerDismissed')).toHaveTextContent('false')
    await userEvent.click(screen.getByRole('button', { name: /dismiss banner/i }))
    expect(screen.getByTestId('bannerDismissed')).toHaveTextContent('true')
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(screen.getByTestId('bannerDismissed')).toHaveTextContent('false')
  })
})
