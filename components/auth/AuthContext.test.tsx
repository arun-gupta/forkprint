import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthContext'

function TestConsumer() {
  const { session, signOut, hasScope } = useAuth()
  return (
    <div>
      <p data-testid="username">{session?.username ?? 'none'}</p>
      <p data-testid="token">{session?.token ?? 'none'}</p>
      <p data-testid="scopes">{(session?.scopes ?? []).join(',') || 'none'}</p>
      <p data-testid="hasReadOrg">{String(hasScope('read:org'))}</p>
      <p data-testid="hasPublicRepo">{String(hasScope('public_repo'))}</p>
      <button onClick={signOut}>Sign out</button>
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

  it('defaults scopes to [public_repo] when none are supplied', () => {
    render(
      <AuthProvider initialSession={{ token: 'gho_abc', username: 'arun-gupta' }}>
        <TestConsumer />
      </AuthProvider>,
    )
    expect(screen.getByTestId('scopes')).toHaveTextContent('public_repo')
    expect(screen.getByTestId('hasPublicRepo')).toHaveTextContent('true')
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
})
