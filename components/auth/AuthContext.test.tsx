import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from './AuthContext'

function TestConsumer() {
  const { session, signOut } = useAuth()
  return (
    <div>
      <p data-testid="username">{session?.username ?? 'none'}</p>
      <p data-testid="token">{session?.token ?? 'none'}</p>
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
})
