import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider } from './AuthContext'
import { AuthGate } from './AuthGate'

const mockUseSearchParams = vi.fn(() => new URLSearchParams())
const mockRouterReplace = vi.fn()

// Mock useRouter/useSearchParams — Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockRouterReplace }),
  useSearchParams: () => mockUseSearchParams(),
}))

describe('AuthGate', () => {
  beforeEach(() => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams())
    mockRouterReplace.mockReset()
    // Reset location hash before each test
    Object.defineProperty(window, 'location', {
      value: { hash: '', href: 'http://localhost/', replace: vi.fn() },
      writable: true,
    })
    sessionStorage.clear()
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

  it('sign-in link always uses baseline scope (no scope-tier picker on sign-in page)', () => {
    render(
      <AuthProvider>
        <AuthGate>
          <p>Protected content</p>
        </AuthGate>
      </AuthProvider>,
    )
    const link = screen.getByRole('link', { name: /sign in with github/i })
    expect(link.getAttribute('href')).toBe('/api/auth/login')
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('performs a hard reload via window.location.replace when oauth_return_search is non-empty', async () => {
    const locationReplace = vi.fn()
    Object.defineProperty(window, 'location', {
      value: {
        hash: '#token=gho_abc&username=testuser&scopes=repo',
        href: 'http://localhost/',
        replace: locationReplace,
      },
      writable: true,
    })
    sessionStorage.setItem('oauth_return_search', '?mode=foundation&foundation=cncf-sandbox')

    await act(async () => {
      render(
        <AuthProvider>
          <AuthGate>
            <p>Protected content</p>
          </AuthGate>
        </AuthProvider>,
      )
    })

    expect(locationReplace).toHaveBeenCalledWith('/?mode=foundation&foundation=cncf-sandbox')
    expect(mockRouterReplace).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('oauth_return_search')).toBeNull()
  })

  it('uses router.replace when oauth_return_search is empty', async () => {
    const locationReplace = vi.fn()
    Object.defineProperty(window, 'location', {
      value: {
        hash: '#token=gho_abc&username=testuser&scopes=repo',
        href: 'http://localhost/',
        replace: locationReplace,
      },
      writable: true,
    })
    // No savedSearch set in sessionStorage

    await act(async () => {
      render(
        <AuthProvider>
          <AuthGate>
            <p>Protected content</p>
          </AuthGate>
        </AuthProvider>,
      )
    })

    expect(locationReplace).not.toHaveBeenCalled()
    expect(mockRouterReplace).toHaveBeenCalledWith('/', { scroll: false })
  })
})
