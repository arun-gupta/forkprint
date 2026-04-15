import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from './AuthContext'
import { AuthGate } from './AuthGate'

const mockUseSearchParams = vi.fn(() => new URLSearchParams())

// Mock useRouter/useSearchParams — Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => mockUseSearchParams(),
}))

function mockDevSession(response: { enabled: boolean; username?: string }) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/api/auth/dev-session')) {
      return new Response(JSON.stringify(response), { status: 200 })
    }
    return new Response('not-found', { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('AuthGate', () => {
  beforeEach(() => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
    mockDevSession({ enabled: false })
    // Reset location hash before each test
    Object.defineProperty(window, 'location', {
      value: { hash: '', href: 'http://localhost/', replace: vi.fn() },
      writable: true,
    })
  })

  it('shows sign-in button when unauthenticated', () => {
    render(
      <AuthProvider>
        <AuthGate>
          <p>Protected content</p>
        </AuthGate>
      </AuthProvider>,
    )
    expect(screen.getByRole('link', { name: /sign in with github/i })).toBeInTheDocument()
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('shows children when authenticated', () => {
    render(
      <AuthProvider initialSession={{ token: 'gho_abc', username: 'arun-gupta' }}>
        <AuthGate>
          <p>Protected content</p>
        </AuthGate>
      </AuthProvider>,
    )
    expect(screen.getByText('Protected content')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /sign in with github/i })).not.toBeInTheDocument()
  })

  it('auto-signs-in when dev-session endpoint reports enabled (Issue #207)', async () => {
    mockDevSession({ enabled: true, username: 'dev' })
    render(
      <AuthProvider>
        <AuthGate>
          <p>Protected content</p>
        </AuthGate>
      </AuthProvider>,
    )
    await waitFor(() => {
      expect(screen.getByText('Protected content')).toBeInTheDocument()
    })
  })

  it('does not auto-sign-in when dev-session reports disabled', async () => {
    mockDevSession({ enabled: false })
    render(
      <AuthProvider>
        <AuthGate>
          <p>Protected content</p>
        </AuthGate>
      </AuthProvider>,
    )
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign in with github/i })).toBeInTheDocument()
    })
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
  })

  it('shows error message when auth_error query param is present', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('auth_error=access_denied'))
    render(
      <AuthProvider>
        <AuthGate>
          <p>Protected content</p>
        </AuthGate>
      </AuthProvider>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in with github/i })).toBeInTheDocument()
  })
})
